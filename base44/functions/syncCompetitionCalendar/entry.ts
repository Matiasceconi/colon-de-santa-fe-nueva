import { createClientFromRequest } from 'npm:@base44/sdk';

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sameClub(team, aliases) {
  const value = normalize(team);
  if (!value) return false;
  return aliases.some((alias) => value === alias || (alias.length >= 5 && (value.includes(alias) || alias.includes(value))));
}

function divisionFromExternalCompetition(value = '') {
  const text = normalize(value);
  if (text.includes('proyeccion') || text.includes('reserva')) return 'reserva';
  if (/cuarta|quinta|sexta|septima|octava|novena|juvenil/.test(text)) return 'juveniles';
  if (text.includes('primera') || text.includes('liga profesional') || text.includes('nacional')) return 'primera';
  return '';
}

function matchdayNumber(value = '') {
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function datePlusDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function todayInTimezone(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function competitionCandidatesForSquad(competitions, squadId) {
  return competitions.filter((competition) => (
    competition.active !== false &&
    (competition.squad_id === squadId || (competition.squad_ids || []).includes(squadId))
  ));
}

function resolveInternalCompetition(externalCompetition, candidates, aliasRows, season) {
  const external = normalize(externalCompetition);
  const division = divisionFromExternalCompetition(externalCompetition);
  const aliasByCompetition = new Map();
  aliasRows.filter((row) => row.active !== false).forEach((row) => {
    if (!aliasByCompetition.has(row.competition_id)) aliasByCompetition.set(row.competition_id, []);
    aliasByCompetition.get(row.competition_id).push(normalize(row.normalized_alias || row.alias));
  });

  const scored = candidates.map((competition) => {
    const canonicalNames = [competition.name, competition.short_name, competition.normalized_name].map(normalize).filter(Boolean);
    const aliases = (aliasByCompetition.get(competition.id) || []).filter(Boolean);
    let score = 0;
    if (canonicalNames.some((name) => name === external)) score += 50;
    else if (canonicalNames.some((name) => name.length >= 5 && (name.includes(external) || external.includes(name)))) score += 24;
    if (aliases.some((name) => name === external)) score += 32;
    else if (aliases.some((name) => name.length >= 5 && (name.includes(external) || external.includes(name)))) score += 16;
    if (division && competition.division === division) score += 12;
    // Una vinculación explícita a la temporada pesa más que un alias genérico
    // (ej. "Proyección" puede existir en Apertura y Clausura).
    if (season && String(competition.season_id || '') === String(season)) score += 60;
    if (competition.active !== false) score += 2;
    return { competition, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].competition : null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null); // puede ejecutarse por usuario autenticado o por automatización interna

    const args = await req.json().catch(() => ({}));
    const service = base44.asServiceRole.entities;
    const requestedProvider = args?.provider || '';
    const settingsRows = requestedProvider
      ? await service.CompetitionIntegrationSettings.filter({ provider: requestedProvider, enabled: true }, '-updated_date', 1).catch(() => [])
      : await service.CompetitionIntegrationSettings.filter({ enabled: true }, '-updated_date', 10).catch(() => []);
    const settings = settingsRows?.[0] || null;
    if (!settings?.enabled || !settings?.calendar_sync_enabled) {
      return Response.json({ success: true, disabled: true, message: 'La vinculación de partidos integrados con el calendario está desactivada.' });
    }

    const selectedSquadIds = new Set((settings.calendar_sync_squad_ids || []).filter(Boolean));
    const requestedSquadId = args?.squad_id || '';
    if (requestedSquadId && !selectedSquadIds.has(requestedSquadId)) {
      return Response.json({ success: true, disabled: true, message: 'Este plantel no tiene activada la vinculación con el calendario.' });
    }

    const [profiles, squads, competitions, aliases, matches, events] = await Promise.all([
      service.InstitutionProfile.filter({ active: true }, '-updated_at', 1).catch(() => []),
      service.Squad.list('name', 200).catch(() => []),
      service.Competitions.list('name', 300).catch(() => []),
      service.CompetitionAliases.list('competition_id', 1000).catch(() => []),
      service.UpcomingMatch.list('matchDate', 5000).catch(() => []),
      service.DayEvent.list('-date', 5000).catch(() => []),
    ]);

    const profile = profiles?.[0] || null;
    const clubAliases = [profile?.official_name, profile?.short_name, profile?.abbreviation]
      .map(normalize)
      .filter((value) => value && value !== 'club');
    const timezone = profile?.timezone || 'America/Argentina/Buenos_Aires';
    const today = todayInTimezone(timezone);
    const horizon = datePlusDays(today, Number(settings.calendar_lookahead_days || 90));
    const squadMap = new Map((squads || []).map((squad) => [squad.id, squad]));
    const eventByImportKey = new Map((events || []).filter((event) => event.import_key).map((event) => [event.import_key, event]));

    const targetSquadIds = requestedSquadId
      ? [requestedSquadId]
      : [...selectedSquadIds];
    let created = 0;
    let updated = 0;
    let skippedManual = 0;
    let skippedUnmapped = 0;

    for (const squadId of targetSquadIds) {
      const squad = squadMap.get(squadId);
      if (!squad) continue;
      const candidates = competitionCandidatesForSquad(competitions || [], squadId);
      if (!candidates.length) {
        skippedUnmapped++;
        continue;
      }

      for (const match of (matches || [])) {
        if (match.status !== 'scheduled') continue;
        if (!match.matchDate || match.matchDate < today || match.matchDate > horizon) continue;
        if (!sameClub(match.homeTeam, clubAliases) && !sameClub(match.awayTeam, clubAliases)) continue;

        const internalCompetition = resolveInternalCompetition(match.competition, candidates, aliases || [], match.season || profile?.default_season || squad.season || '');
        if (!internalCompetition) continue;
        const home = sameClub(match.homeTeam, clubAliases);
        const rival = home ? match.awayTeam : match.homeTeam;
        const rivalLogo = home ? match.awayLogo : match.homeLogo;
        const stablePart = match.external_key || `${normalize(match.competition)}:${match.matchDate}:${normalize(match.homeTeam)}:${normalize(match.awayTeam)}`;
        const importKey = `competition:${stablePart}:${squadId}`;
        const payload = {
          squad_id: squadId,
          squad_name: squad.name || '',
          season_id: internalCompetition.season_id || squad.season || profile?.default_season || '',
          date: match.matchDate,
          time: match.matchTime || '',
          start_time: match.matchTime || '',
          title: rival ? `Partido vs ${rival}` : 'Partido',
          type: 'Partido',
          event_type: 'Partido',
          color: 'red',
          duration_minutes: 105,
          location: match.venue || '',
          notes: 'Partido vinculado desde la integración de competencias. Si se edita manualmente, deja de ser administrado automáticamente por la integración.',
          rival: rival || '',
          rival_logo_url: rivalLogo || '',
          home_away: home ? 'Local' : 'Visitante',
          competition: internalCompetition.name || match.competition || '',
          competition_id: internalCompetition.id || '',
          competition_round: match.round || '',
          matchday_number: matchdayNumber(match.round),
          phase_label: match.round || '',
          import_key: importKey,
          canonical_key: importKey,
          source_kind: 'competition_integration',
          data_quality_status: 'ok',
          quality_notes: [],
          sync_source: 'competition_integration',
          sync_updated_at: new Date().toISOString(),
        };

        const current = eventByImportKey.get(importKey);
        if (current) {
          if (current.sync_source && current.sync_source !== 'competition_integration') {
            skippedManual++;
            continue;
          }
          await service.DayEvent.update(current.id, payload);
          updated++;
        } else {
          const createdEvent = await service.DayEvent.create(payload);
          eventByImportKey.set(importKey, createdEvent);
          created++;

          if (settings.calendar_auto_create_match_reports) {
            const createdReport = await service.MatchReport.create({
              calendar_event_id: createdEvent.id,
              upcoming_match_id: match.id,
              external_match_key: match.external_key || '',
              integration_source: match.source || 'competition_integration',
              squad_id: squadId,
              squad_name: squad.name || '',
              season_id: payload.season_id,
              date: match.matchDate,
              match_time: match.matchTime || '',
              match_venue: match.venue || '',
              rival: rival || 'Rival a confirmar',
              rival_logo_url: rivalLogo || '',
              location: home ? 'Local' : 'Visitante',
              competition: internalCompetition.name || match.competition || '',
              competition_id: internalCompetition.id || '',
              competition_round: match.round || '',
              matchday_number: matchdayNumber(match.round),
              phase_label: match.round || '',
              status: 'activo',
              sync_source: 'competition_integration',
              sync_updated_at: new Date().toISOString(),
            });
            if (createdReport?.id) {
              await service.DayEvent.update(createdEvent.id, { match_id: createdReport.id, source_kind: 'match_report', canonical_key: `match:${createdReport.id}` });
            }
          }
        }
      }
    }

    await service.CompetitionIntegrationSettings.update(settings.id, {
      last_calendar_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return Response.json({ success: true, created, updated, skippedManual, skippedUnmapped, horizon, squads: targetSquadIds.length });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Error al sincronizar calendario' }, { status: 500 });
  }
}
