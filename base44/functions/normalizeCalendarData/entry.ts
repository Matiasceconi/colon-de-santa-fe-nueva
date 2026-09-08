import { createClientFromRequest } from 'npm:@base44/sdk';

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalType(event: any) {
  const text = normalizeText(`${event.event_type || ''} ${event.type || ''} ${event.title || ''} ${event.location || ''}`);
  if (text.includes('partido') || text.includes(' vs ')) return 'Partido';
  if (text.includes('descanso') || text.includes('libre')) return 'Descanso';
  if (text.includes('viaje') || text.includes('traslado') || text.includes('llegada')) return 'Viaje';
  if (text.includes('desayuno') || text.includes('almuerzo') || text.includes('cena') || text.includes('comida')) return 'Comida';
  if (text.includes('video')) return 'Video';
  if (text.includes('gimnasio') || text.includes('fuerza') || text.includes('gym')) return 'Gimnasio';
  if (text.includes('reunion') || text.includes('charla') || text.includes('auditorio')) return 'Reunión';
  if (text.includes('evaluacion') || text.includes('control') || text.includes('test')) return 'Evaluación';
  if (text.includes('cancha') || text.includes('entrenamiento')) return 'Entrenamiento';
  return 'Otro';
}

function startTime(event: any) {
  return String(event.start_time || event.time || '').trim();
}

function sourceKind(event: any) {
  if (event.training_session_id) return 'training_session';
  if (event.match_id || event.sync_source === 'matches') return 'match_report';
  if (event.sync_source === 'competition_integration') return 'competition_integration';
  if (event.created_by_ai) return 'ai_import';
  return 'manual';
}

function canonicalKey(event: any) {
  const type = canonicalType(event);
  if (event.match_id) return `match:${event.match_id}`;
  if (event.training_session_id) return `session:${event.training_session_id}`;
  if (event.import_key) return `import:${event.import_key}`;
  return [
    'event', event.squad_id || '', event.date || '', startTime(event), normalizeText(type),
    normalizeText(event.rival || event.title || ''), normalizeText(event.location || ''),
  ].join(':');
}

function isTraining(event: any) {
  return canonicalType(event) === 'Entrenamiento';
}

function groupBy<T>(rows: T[], fn: (row: T) => string) {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = fn(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(row);
  }
  return out;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') return Response.json({ success: false, error: 'Solo un administrador puede normalizar el calendario.' }, { status: 403 });

    const args = await req.json().catch(() => ({}));
    const squadId = String(args?.squad_id || '');
    const seasonId = String(args?.season_id || '');
    if (!squadId) return Response.json({ success: false, error: 'Falta squad_id.' }, { status: 400 });

    const service = base44.asServiceRole.entities;
    const [eventsAll, matchesAll, sessionsAll, squads, profiles] = await Promise.all([
      service.DayEvent.filter({ squad_id: squadId }, 'date', 5000).catch(() => []),
      service.MatchReport.filter({ squad_id: squadId }, 'date', 3000).catch(() => []),
      service.TrainingSession.filter({ squad_id: squadId }, 'date', 5000).catch(() => []),
      service.Squad.list('name', 200).catch(() => []),
      service.InstitutionProfile.filter({ active: true }, '-updated_at', 1).catch(() => []),
    ]);

    const squad = (squads || []).find((item: any) => item.id === squadId) || null;
    const profile = profiles?.[0] || null;
    const defaultSeason = seasonId || squad?.season || profile?.default_season || '';
    const events = (eventsAll || []).filter((e: any) => !seasonId || !e.season_id || String(e.season_id) === seasonId);
    const matches = (matchesAll || []).filter((m: any) => !seasonId || !m.season_id || String(m.season_id) === seasonId);
    const sessions = (sessionsAll || []).filter((s: any) => !seasonId || !s.season_id || String(s.season_id) === seasonId);

    const matchById = new Map(matches.map((m: any) => [m.id, m]));
    const eventById = new Map(events.map((e: any) => [e.id, e]));
    const sessionsByDate = groupBy(sessions, (s: any) => String(s.date || ''));
    const trainingEventsByDate = groupBy(events.filter(isTraining), (e: any) => String(e.date || ''));

    let normalized = 0;
    let linkedSessions = 0;
    let repairedLinks = 0;
    let review = 0;
    let legacy = 0;

    // Vinculación sesión↔calendario solo cuando la fecha es inequívoca.
    const sessionLinkForEvent = new Map<string, string>();
    for (const [date, daySessions] of sessionsByDate.entries()) {
      const dayEvents = trainingEventsByDate.get(date) || [];
      if (daySessions.length === 1 && dayEvents.length === 1 && !dayEvents[0].training_session_id) {
        sessionLinkForEvent.set(dayEvents[0].id, daySessions[0].id);
      }
    }

    // Detectar grupos de partidos repetidos sin borrar nada.
    const matchGroups = groupBy(events.filter((e: any) => canonicalType(e) === 'Partido'), (e: any) => [
      e.squad_id || '', e.date || '', normalizeText(e.rival || e.title || ''),
    ].join('|'));
    const duplicateIds = new Set<string>();
    for (const group of matchGroups.values()) {
      if (group.length > 1) group.forEach((e: any) => duplicateIds.add(e.id));
    }

    for (const event of events) {
      const type = canonicalType(event);
      const canonicalStart = startTime(event);
      const notes: string[] = [];
      let quality: 'ok' | 'review' | 'legacy' = 'ok';
      let trainingSessionId = event.training_session_id || sessionLinkForEvent.get(event.id) || '';

      if (sessionLinkForEvent.has(event.id)) linkedSessions++;
      if (duplicateIds.has(event.id)) notes.push('Posible duplicado de partido: revisar antes de eliminar o fusionar.');
      if (event.match_id && !matchById.has(event.match_id)) notes.push('El vínculo con Partido apunta a un registro que ya no existe.');
      if (event.time && event.start_time && event.time !== event.start_time) notes.push('time y start_time difieren; start_time se toma como horario canónico.');
      if (!String(event.event_type || event.type || '').trim()) notes.push('El evento no tenía tipo informado y fue clasificado automáticamente.');
      if (event.source_kind === 'legacy_import') {
        quality = 'legacy';
        notes.push('Evento marcado explícitamente como importación histórica.');
        legacy++;
      }
      if (notes.length && quality !== 'legacy') quality = 'review';
      if (quality === 'review') review++;

      const patch: any = {
        event_type: type,
        start_time: canonicalStart,
        time: canonicalStart,
        season_id: event.season_id || defaultSeason,
        training_session_id: trainingSessionId,
        source_kind: sourceKind({ ...event, training_session_id: trainingSessionId }),
        data_quality_status: quality,
        quality_notes: notes,
      };
      patch.canonical_key = canonicalKey({ ...event, ...patch });
      await service.DayEvent.update(event.id, patch);
      normalized++;

      if (event.match_id) {
        const match: any = matchById.get(event.match_id);
        if (match && !match.calendar_event_id) {
          await service.MatchReport.update(match.id, { calendar_event_id: event.id, sync_updated_at: new Date().toISOString() });
          repairedLinks++;
        }
      }
    }

    // Reparar la otra mitad de vínculos MatchReport→DayEvent cuando sea seguro.
    for (const match of matches) {
      if (!match.calendar_event_id) continue;
      const event: any = eventById.get(match.calendar_event_id);
      if (event && !event.match_id) {
        await service.DayEvent.update(event.id, { match_id: match.id, source_kind: 'match_report', canonical_key: `match:${match.id}` });
        repairedLinks++;
      }
    }

    return Response.json({ success: true, normalized, linkedSessions, repairedLinks, review, legacy, duplicateGroups: [...matchGroups.values()].filter((g) => g.length > 1).length });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || 'Error al normalizar calendario.' }, { status: 500 });
  }
}
