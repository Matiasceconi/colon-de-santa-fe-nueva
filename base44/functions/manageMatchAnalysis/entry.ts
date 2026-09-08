import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireModulePermission } from '../../shared/modulePermission.ts';

const MODULE_ID = 'partidos';
const EVENT_TYPES = new Set(['goal','own_goal','penalty_goal','penalty_missed','yellow_card','second_yellow','red_card','substitution','injury','var','kickoff','halftime','fulltime','other']);
const PERIODS = new Set(['1T','2T','ET1','ET2','PEN','PRE','POST']);
const TEAM_SIDES = new Set(['own','rival','neutral']);

function nowIso() { return new Date().toISOString(); }
function cleanString(value:any) { return String(value || '').trim(); }
function cleanNumber(value:any) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function manualEventKey(matchId:string) {
  return `manual:${matchId}:${crypto.randomUUID()}`;
}
function eventSortValue(row:any) {
  const periodRank:any = { PRE:0, '1T':1, '2T':2, ET1:3, ET2:4, PEN:5, POST:6 };
  return (periodRank[row.period] ?? 9) * 1000000 + Number(row.minute || 0) * 1000 + Number(row.added_minute || 0) * 10 + Number(row.sort_second || 0);
}

async function requireMatchPermission(base44:any, user:any, match:any, action:string) {
  const allowed = await requireModulePermission(base44, user, MODULE_ID, action);
  if (!allowed) throw Object.assign(new Error('No tenés permiso para esta acción en Partidos'), { status: 403 });
  if (!match?.squad_id) throw Object.assign(new Error('El partido no tiene plantel vinculado'), { status: 400 });
  if (user?.role === 'admin') return;
  const access = allowed?.access;
  if (access && access.all_squads !== true && !(access.squad_ids || []).includes(match.squad_id)) {
    throw Object.assign(new Error('No tenés acceso a este plantel'), { status: 403 });
  }
}

function eventPayload(match:any, input:any, actor:string, existing:any = null) {
  const period = PERIODS.has(input.period) ? input.period : '1T';
  const eventType = EVENT_TYPES.has(input.event_type) ? input.event_type : 'other';
  const teamSide = TEAM_SIDES.has(input.team_side) ? input.team_side : 'own';
  const source = input.source === 'integration' ? 'integration' : 'manual';
  const provider = cleanString(input.provider);
  const externalEventId = cleanString(input.external_event_id);
  const eventKey = existing?.event_key || (source === 'integration' && provider && externalEventId
    ? `integration:${match.id}:${provider}:${externalEventId}`
    : manualEventKey(match.id));
  return {
    match_id: match.id,
    squad_id: match.squad_id || '',
    season_id: match.season_id || '',
    event_key: eventKey,
    period,
    minute: Math.max(0, cleanNumber(input.minute) ?? 0),
    added_minute: Math.max(0, cleanNumber(input.added_minute) ?? 0),
    sort_second: Math.max(0, cleanNumber(input.sort_second) ?? 0),
    event_type: eventType,
    team_side: teamSide,
    player_id: cleanString(input.player_id),
    player_name: cleanString(input.player_name),
    secondary_player_id: cleanString(input.secondary_player_id),
    secondary_player_name: cleanString(input.secondary_player_name),
    player_in_id: cleanString(input.player_in_id),
    player_in_name: cleanString(input.player_in_name),
    player_out_id: cleanString(input.player_out_id),
    player_out_name: cleanString(input.player_out_name),
    rival_player_name: cleanString(input.rival_player_name),
    title: cleanString(input.title),
    notes: cleanString(input.notes),
    source,
    provider,
    external_event_id: externalEventId,
    external_match_id: cleanString(input.external_match_id),
    review_status: input.review_status === 'needs_review' ? 'needs_review' : 'confirmed',
    imported_at: source === 'integration' ? (existing?.imported_at || nowIso()) : '',
    updated_at: nowIso(),
    updated_by: actor,
  };
}

const STANDARD_STAT_FIELDS = [
  'possession_pct','shots','shots_on_target','shots_off_target','blocked_shots','corners','fouls','offsides','yellow_cards','red_cards','passes','accurate_passes','pass_accuracy_pct','xg','field_tilt_pct','ppda','recoveries','turnovers','progressive_passes','final_third_entries','box_entries'
];
function statsPayload(match:any, input:any, actor:string) {
  const teamSide = input.team_side === 'rival' ? 'rival' : 'own';
  const source = input.source === 'integration' ? 'integration' : 'manual';
  const payload:any = {
    match_id: match.id,
    squad_id: match.squad_id || '',
    season_id: match.season_id || '',
    team_side: teamSide,
    stats_key: `${match.id}:${teamSide}`,
    advanced_metrics: input.advanced_metrics && typeof input.advanced_metrics === 'object' ? input.advanced_metrics : {},
    source,
    provider: cleanString(input.provider),
    external_match_id: cleanString(input.external_match_id),
    review_status: input.review_status === 'needs_review' ? 'needs_review' : 'confirmed',
    imported_at: source === 'integration' ? (cleanString(input.imported_at) || nowIso()) : '',
    updated_at: nowIso(),
    updated_by: actor,
  };
  for (const field of STANDARD_STAT_FIELDS) payload[field] = cleanNumber(input[field]);
  return payload;
}

async function upsertStats(base44:any, match:any, input:any, actor:string, options:any = {}) {
  const payload = statsPayload(match, input, actor);
  const rows = await base44.asServiceRole.entities.MatchTeamStats.filter({ match_id: match.id, team_side: payload.team_side }, '-updated_at', 20).catch(() => []);
  let saved;
  if (rows[0]) {
    // Una integración nunca pisa una corrección manual confirmada. El staff conserva la última palabra.
    if (options.preserveManual && rows[0].source === 'manual') return rows[0];
    saved = await base44.asServiceRole.entities.MatchTeamStats.update(rows[0].id, payload);
    for (const duplicate of rows.slice(1)) await base44.asServiceRole.entities.MatchTeamStats.delete(duplicate.id).catch(() => null);
  } else {
    saved = await base44.asServiceRole.entities.MatchTeamStats.create(payload);
  }
  return saved;
}

export default async function(req:Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const operation = cleanString(body.operation || 'get');
    const matchId = cleanString(body.match_id || body.matchId);
    if (!matchId) return Response.json({ error: 'Falta match_id' }, { status: 400 });
    const match = await base44.asServiceRole.entities.MatchReport.get(matchId).catch(() => null);
    if (!match || match.status === 'archivado') return Response.json({ error: 'Partido no encontrado' }, { status: 404 });
    const action = operation === 'get' ? 'can_view' : operation.startsWith('delete') ? 'can_delete' : operation.startsWith('create') ? 'can_create' : 'can_edit';
    await requireMatchPermission(base44, user, match, action);
    const actor = String(user.email || user.id || '');

    if (operation === 'get') {
      const [events, teamStats, playerStats] = await Promise.all([
        base44.asServiceRole.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 500).catch(() => []),
        base44.asServiceRole.entities.MatchTeamStats.filter({ match_id: match.id }, 'team_side', 10).catch(() => []),
        base44.asServiceRole.entities.MatchPlayerStats.filter({ match_id: match.id }, 'player_name', 500).catch(() => []),
      ]);
      return Response.json({
        ok: true,
        events: events.sort((a:any,b:any) => eventSortValue(a) - eventSortValue(b)),
        team_stats: teamStats,
        player_stats: playerStats,
        integration: {
          has_integration_data: events.some((e:any) => e.source === 'integration') || teamStats.some((s:any) => s.source === 'integration') || playerStats.some((s:any) => s.source === 'integration'),
          providers: [...new Set([...events, ...teamStats, ...playerStats].map((row:any) => cleanString(row.provider)).filter(Boolean))],
        },
      });
    }

    if (operation === 'save_event') {
      const input = body.event || {};
      let existing = null;
      if (input.id) {
        existing = await base44.asServiceRole.entities.MatchEvent.get(input.id).catch(() => null);
        if (!existing || existing.match_id !== match.id) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });
      }
      const payload = eventPayload(match, input, actor, existing);
      const saved = existing
        ? await base44.asServiceRole.entities.MatchEvent.update(existing.id, payload)
        : await base44.asServiceRole.entities.MatchEvent.create(payload);
      return Response.json({ ok: true, event: saved });
    }

    if (operation === 'delete_event') {
      const id = cleanString(body.id);
      const event = await base44.asServiceRole.entities.MatchEvent.get(id).catch(() => null);
      if (!event || event.match_id !== match.id) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });
      if (event.source === 'integration') return Response.json({ error: 'Los eventos integrados no se eliminan manualmente. Corregilos en el proveedor o marcá revisión.' }, { status: 400 });
      await base44.asServiceRole.entities.MatchEvent.delete(id);
      return Response.json({ ok: true });
    }

    if (operation === 'save_team_stats') {
      const input = body.stats || {};
      const saved = await upsertStats(base44, match, input, actor);
      return Response.json({ ok: true, stats: saved });
    }

    // Punto de entrada preparado para adapters futuros. El proveedor escribe en el modelo canónico;
    // la UI de PerformancePitch no depende de la forma de una API concreta.
    if (operation === 'upsert_integration') {
      const provider = cleanString(body.provider);
      const externalMatchId = cleanString(body.external_match_id);
      if (!provider || !externalMatchId) return Response.json({ error: 'Proveedor e ID externo son obligatorios' }, { status: 400 });
      let eventCount = 0;
      for (const raw of Array.isArray(body.events) ? body.events : []) {
        const externalEventId = cleanString(raw.external_event_id);
        if (!externalEventId) continue;
        const key = `integration:${match.id}:${provider}:${externalEventId}`;
        const existingRows = await base44.asServiceRole.entities.MatchEvent.filter({ event_key: key }, '-updated_at', 5).catch(() => []);
        const payload = eventPayload(match, { ...raw, source:'integration', provider, external_event_id:externalEventId, external_match_id:externalMatchId, review_status: raw.review_status || 'needs_review' }, actor, existingRows[0]);
        if (existingRows[0]) await base44.asServiceRole.entities.MatchEvent.update(existingRows[0].id, payload);
        else await base44.asServiceRole.entities.MatchEvent.create(payload);
        eventCount++;
      }
      let statsCount = 0;
      for (const raw of Array.isArray(body.team_stats) ? body.team_stats : []) {
        if (!['own','rival'].includes(raw.team_side)) continue;
        await upsertStats(base44, match, { ...raw, source:'integration', provider, external_match_id:externalMatchId, review_status: raw.review_status || 'needs_review' }, actor, { preserveManual: true });
        statsCount++;
      }
      return Response.json({ ok:true, events:eventCount, team_stats:statsCount });
    }

    return Response.json({ error: 'Operación inválida' }, { status: 400 });
  } catch (error:any) {
    console.error('manageMatchAnalysis error', error);
    return Response.json({ error: error?.message || 'Error interno' }, { status: error?.status || 500 });
  }
}
