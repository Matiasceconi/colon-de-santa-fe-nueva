import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireModulePermission } from '../../shared/modulePermission.ts';

const MODULE_ID = 'calendario';

function isoNow() { return new Date().toISOString(); }
function inRange(date:string, from:string, to:string) { return !!date && (!from || date >= from) && (!to || date <= to); }
function isMembershipActiveOnDate(membership:any, date:string) {
  const status = String(membership?.status || 'activo').toLowerCase().trim();
  if (['fuera_del_plantel','fuera del plantel','inactivo','préstamo','prestamo'].includes(status)) return false;
  if (membership?.effective_from && String(membership.effective_from) > String(date)) return false;
  if (membership?.effective_to && String(membership.effective_to) < String(date)) return false;
  return true;
}
function normalizeTime(value:any) { return String(value || '').slice(0,5); }
function addMinutes(time:string, minutes:number) {
  if (!time || !Number.isFinite(minutes)) return '';
  const [h,m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const total = Math.max(0, Math.min(1439, h * 60 + m + minutes));
  return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function minutesFromIso(value:any) {
  if (!value) return '';
  try { const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; } catch { return ''; }
}
function eventTypeToItemType(type:any) {
  const t = String(type || '').toLowerCase();
  if (t.includes('comida') || t.includes('desay') || t.includes('almuer') || t.includes('cena')) return 'meal';
  if (t.includes('viaje') || t.includes('traslado')) return 'travel';
  if (t.includes('video')) return 'video';
  if (t.includes('reun') || t.includes('charla')) return 'meeting';
  if (t.includes('evalu')) return 'evaluation';
  if (t.includes('gimnas')) return 'training';
  if (t.includes('recuper')) return 'recovery';
  return 'other';
}
function actionForSource(sourceType:string, sourceId:string) {
  if (sourceType === 'training_session') return `/sessions?session=${sourceId}`;
  if (sourceType === 'match_report') return `/matches/${sourceId}`;
  if (sourceType === 'complementary_workout') return '/complementary-strength';
  if (sourceType === 'kinesiology_session') return '/performance/kinesiology';
  if (sourceType === 'equipment_checklist') return '/club-operations/equipment';
  return '';
}

async function ensureSchedule(base44:any, squadId:string, squadName:string, seasonId:string, date:string, actor:string) {
  const existing = await base44.asServiceRole.entities.DailySchedule.filter({ squad_id: squadId, date }, '-updated_date', 5);
  if (existing[0]) {
    const patch:any = { squad_name: squadName || existing[0].squad_name || '', season_id: seasonId || existing[0].season_id || '', last_synced_at: isoNow(), updated_by: actor };
    await base44.asServiceRole.entities.DailySchedule.update(existing[0].id, patch);
    return { ...existing[0], ...patch };
  }
  return await base44.asServiceRole.entities.DailySchedule.create({ squad_id: squadId, squad_name: squadName || '', season_id: seasonId || '', date, status: 'active', last_synced_at: isoNow(), updated_by: actor });
}

async function upsertGenerated(base44:any, schedule:any, sourceType:string, sourceId:string, payload:any) {
  const sourceKey = `${sourceType}:${sourceId}`;
  const rows = await base44.asServiceRole.entities.DailyScheduleItem.filter({ source_key: sourceKey, squad_id: schedule.squad_id }, '-updated_date', 10);
  const base = {
    schedule_id: schedule.id,
    squad_id: schedule.squad_id,
    squad_name: schedule.squad_name || '',
    season_id: schedule.season_id || '',
    date: payload.date || schedule.date,
    source_type: sourceType,
    source_id: sourceId,
    source_key: sourceKey,
    is_generated: true,
    synced_at: isoNow(),
    action_path: actionForSource(sourceType, sourceId),
    ...payload,
  };
  if (rows[0]) {
    const keep = rows[0];
    await base44.asServiceRole.entities.DailyScheduleItem.update(keep.id, base);
    // Duplicate safety: do not delete history; cancel redundant generated duplicates.
    for (const duplicate of rows.slice(1)) {
      if (duplicate.status !== 'cancelled') await base44.asServiceRole.entities.DailyScheduleItem.update(duplicate.id, { status: 'cancelled', notes: [duplicate.notes, 'Duplicado técnico desactivado por sincronización.'].filter(Boolean).join(' · '), synced_at: isoNow() });
    }
    return { ...keep, ...base };
  }
  return await base44.asServiceRole.entities.DailyScheduleItem.create(base);
}

async function syncSources(base44:any, squadId:string, squadName:string, seasonId:string, from:string, to:string, actor:string) {
  const [sessions, matches, events, checklists, kineCases, kineSessions, plans, workouts, assignments] = await Promise.all([
    base44.asServiceRole.entities.TrainingSession.filter({ squad_id: squadId }, 'date', 1500).catch(() => []),
    base44.asServiceRole.entities.MatchReport.filter({ squad_id: squadId }, 'date', 1000).catch(() => []),
    base44.asServiceRole.entities.DayEvent.filter({ squad_id: squadId }, 'date', 1500).catch(() => []),
    base44.asServiceRole.entities.EquipmentChecklist.filter({ squad_id: squadId }, 'event_date', 1000).catch(() => []),
    base44.asServiceRole.entities.KinesiologyCase.filter({ squad_id: squadId }, '-last_review_at', 500).catch(() => []),
    base44.asServiceRole.entities.KinesiologySession.list('-session_date', 1500).catch(() => []),
    base44.asServiceRole.entities.ComplementaryStrengthPlan.filter({ squad_id: squadId, status: 'published' }, '-updated_date', 500).catch(() => []),
    base44.asServiceRole.entities.ComplementaryStrengthWorkout.list('workout_date', 2000).catch(() => []),
    base44.asServiceRole.entities.ComplementaryStrengthPlanAssignment.filter({ squad_id: squadId, status: 'active' }, '-assigned_at', 1000).catch(() => []),
  ]);

  const scheduleCache = new Map<string, any>();
  async function scheduleFor(date:string) {
    if (!scheduleCache.has(date)) scheduleCache.set(date, await ensureSchedule(base44, squadId, squadName, seasonId, date, actor));
    return scheduleCache.get(date);
  }

  let synced = 0;
  const sessionsInRange = sessions.filter((r:any) => inRange(r.date, from, to));
  const sessionsByDate = new Map<string, any[]>();
  for (const s of sessionsInRange) {
    if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
    sessionsByDate.get(s.date)!.push(s);
    const schedule = await scheduleFor(s.date);
    const start = normalizeTime(s.start_time);
    const duration = Number(s.duration_minutes || 0) || null;
    await upsertGenerated(base44, schedule, 'training_session', s.id, {
      title: s.title || 'Sesión', item_type: 'training', start_time: start, end_time: normalizeTime(s.end_time) || (start && duration ? addMinutes(start, duration) : ''), duration_minutes: duration, location: s.location || '', responsible_area: 'rendimiento_fisico', target_type: 'squad', visibility: 'squad_players', status: s.status === 'completed' ? 'completed' : s.status === 'cancelled' ? 'cancelled' : 'planned', completion_source: 'linked_source', notes: [s.match_day_code, s.session_objective || s.session_type].filter(Boolean).join(' · '),
    }); synced++;
  }

  // Wellness/RPE se incorporan al flujo diario como bloques visibles, sin enviar mensajes ni recordatorios.
  // La automatización de notificaciones queda deliberadamente fuera de esta fase.
  for (const [date, daySessions] of sessionsByDate.entries()) {
    const valid = daySessions.filter((s:any) => s.status !== 'cancelled');
    if (!valid.length) continue;
    const schedule = await scheduleFor(date);
    const starts = valid.map((s:any) => normalizeTime(s.start_time)).filter(Boolean).sort();
    const ends = valid.map((s:any) => normalizeTime(s.end_time) || (normalizeTime(s.start_time) && s.duration_minutes ? addMinutes(normalizeTime(s.start_time), Number(s.duration_minutes)) : '')).filter(Boolean).sort();
    const wellnessTime = starts[0] ? addMinutes(starts[0], -60) : '';
    await upsertGenerated(base44, schedule, 'wellness', `${squadId}:${date}`, {
      title: 'Wellness', item_type: 'wellness', start_time: wellnessTime, end_time: '', duration_minutes: 5, location: '', responsible_area: 'rendimiento_fisico', target_type: 'squad', visibility: 'squad_players', status: 'planned', completion_source: 'linked_source', notes: starts[0] ? 'Control previo a la primera actividad del día' : 'Control diario del plantel', action_path: '/performance/internal-load',
    }); synced++;
    const rpeSessions = valid.filter((s:any) => s.rpe_enabled);
    if (rpeSessions.length) {
      const explicit = rpeSessions.map((s:any) => minutesFromIso(s.rpe_available_at)).filter(Boolean).sort();
      const rpeTime = explicit[0] || (ends.length ? addMinutes(ends[ends.length - 1], 60) : '');
      await upsertGenerated(base44, schedule, 'rpe', `${squadId}:${date}`, {
        title: 'RPE post sesión', item_type: 'rpe', start_time: rpeTime, end_time: '', duration_minutes: 5, location: '', responsible_area: 'rendimiento_fisico', target_type: 'squad', visibility: 'squad_players', status: 'planned', completion_source: 'linked_source', notes: `${rpeSessions.length} sesión${rpeSessions.length === 1 ? '' : 'es'} con RPE habilitado`, action_path: '/performance/internal-load',
      }); synced++;
    }
  }

  for (const m of matches.filter((r:any) => inRange(r.date, from, to) && r.status !== 'archivado')) {
    const schedule = await scheduleFor(m.date);
    await upsertGenerated(base44, schedule, 'match_report', m.id, {
      title: `Partido vs ${m.rival || 'Rival'}`, item_type: 'match', start_time: normalizeTime(m.match_time), end_time: '', duration_minutes: Number(m.total_duration_minutes || 0) || null, location: m.match_venue || '', responsible_area: 'cuerpo_tecnico', target_type: 'squad', visibility: 'squad_players', status: m.status === 'finalizado' ? 'completed' : m.status === 'cancelado' ? 'cancelled' : 'planned', completion_source: 'linked_source', notes: [m.location, m.competition_round || m.phase_label || m.competition].filter(Boolean).join(' · '),
    }); synced++;
  }

  for (const e of events.filter((r:any) => inRange(r.date, from, to))) {
    if (e.training_session_id || e.match_id || ['training_session','match_report'].includes(e.source_kind)) continue;
    const schedule = await scheduleFor(e.date);
    const start = normalizeTime(e.start_time || e.time);
    const duration = Number(e.duration_minutes || 0) || null;
    await upsertGenerated(base44, schedule, 'day_event', e.id, {
      title: e.title || 'Actividad', item_type: eventTypeToItemType(e.event_type || e.type), start_time: start, end_time: normalizeTime(e.end_time) || (start && duration ? addMinutes(start,duration) : ''), duration_minutes: duration, location: e.location || '', responsible_area: 'cuerpo_tecnico', target_type: 'squad', visibility: 'squad_players', status: 'planned', completion_source: 'linked_source', notes: e.notes || '', action_path: '/schedule',
    }); synced++;
  }

  for (const c of checklists.filter((r:any) => inRange(r.event_date, from, to))) {
    const schedule = await scheduleFor(c.event_date);
    await upsertGenerated(base44, schedule, 'equipment_checklist', c.id, {
      title: c.title || 'Preparación de utilería', item_type: 'equipment', start_time: '', end_time: '', duration_minutes: null, location: c.location || '', responsible_area: 'utileria', responsible_name: c.responsible_name || '', target_type: 'staff', visibility: 'staff_only', status: c.status === 'closed' ? 'completed' : 'planned', completion_source: 'linked_source', notes: `${(c.items || []).length} ítems · ${c.status || 'borrador'}`,
    }); synced++;
  }

  const caseById = new Map(kineCases.map((c:any) => [c.id, c]));
  for (const ks of kineSessions.filter((r:any) => inRange(r.session_date, from, to))) {
    const kinCase:any = caseById.get(ks.case_id);
    if (!kinCase || kinCase.squad_id !== squadId) continue;
    const schedule = await scheduleFor(ks.session_date);
    await upsertGenerated(base44, schedule, 'kinesiology_session', ks.id, {
      title: `Kinesiología · ${kinCase.player_name || 'Jugador'}`, item_type: 'kinesiology', start_time: '', end_time: '', duration_minutes: Number(ks.field_minutes || 0) || null, location: '', responsible_area: 'kinesiologia', target_type: 'specific_players', player_ids: [ks.player_id], visibility: 'specific_players', status: ks.status === 'completed' ? 'completed' : ks.status === 'cancelled' ? 'cancelled' : 'planned', completion_source: 'linked_source', notes: [ks.objective, ks.session_type].filter(Boolean).join(' · '),
    }); synced++;
  }

  const planById = new Map(plans.map((p:any) => [p.id,p]));
  const assignmentsByPlan = new Map<string, any[]>();
  assignments.forEach((a:any) => { if (!assignmentsByPlan.has(a.plan_id)) assignmentsByPlan.set(a.plan_id, []); assignmentsByPlan.get(a.plan_id)!.push(a); });
  for (const w of workouts.filter((r:any) => inRange(r.workout_date, from, to) && r.status === 'published')) {
    const plan:any = planById.get(w.plan_id); if (!plan) continue;
    const assigned = assignmentsByPlan.get(plan.id) || [];
    const playerIds = [...new Set([plan.player_id, ...assigned.map((a:any) => a.player_id)].filter(Boolean))];
    if (!playerIds.length) continue;
    const schedule = await scheduleFor(w.workout_date);
    await upsertGenerated(base44, schedule, 'complementary_workout', w.id, {
      title: w.title || plan.name || 'Plan individual', item_type: 'complementary', start_time: '', end_time: '', duration_minutes: Number(w.estimated_duration_minutes || 0) || null, location: '', responsible_area: 'rendimiento_fisico', target_type: 'specific_players', player_ids: playerIds, visibility: 'specific_players', status: 'planned', completion_source: 'linked_source', notes: [plan.player_name, w.objective || plan.objective].filter(Boolean).join(' · '),
    }); synced++;
  }

  return { synced, schedules: scheduleCache.size };
}

export default async function(req:Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'get');
    const squadId = String(body.squad_id || '');
    if (!squadId) return Response.json({ error: 'Seleccioná un plantel' }, { status: 400 });

    const permission = action === 'get' || action === 'sync' ? 'can_view' : action === 'delete' ? 'can_delete' : action === 'create' ? 'can_create' : 'can_edit';
    const allowed = await requireModulePermission(base44, user, MODULE_ID, permission);
    if (!allowed) return Response.json({ error: 'No tenés permiso para gestionar el cronograma' }, { status: 403 });

    const actor = String(user?.email || user?.id || '');
    const date = String(body.date || new Date().toISOString().slice(0,10));
    const from = String(body.from || date);
    const to = String(body.to || date);
    const squadName = String(body.squad_name || '');
    const seasonId = String(body.season_id || '');

    if (action === 'sync') {
      const result = await syncSources(base44, squadId, squadName, seasonId, from, to, actor);
      return Response.json({ ok: true, ...result });
    }

    if (action === 'get') {
      if (body.sync !== false) await syncSources(base44, squadId, squadName, seasonId, from, to, actor);
      const schedules = await base44.asServiceRole.entities.DailySchedule.filter({ squad_id: squadId, date: { $gte: from, $lte: to } }, 'date', 60).catch(() => []);
      const items = await base44.asServiceRole.entities.DailyScheduleItem.filter({ squad_id: squadId, date: { $gte: from, $lte: to } }, 'date', 1500).catch(() => []);

      const trainingIds = items.filter((i:any) => i.source_type === 'training_session').map((i:any) => i.source_id).filter(Boolean);
      let sessionPlayers:any[] = [];
      for (let i = 0; i < trainingIds.length; i += 50) {
        const rows = await base44.asServiceRole.entities.SessionPlayer.filter({ session_id: { $in: trainingIds.slice(i, i + 50) } }, '-created_date', 3000).catch(() => []);
        sessionPlayers.push(...rows);
      }
      const sessionMeta:any = {};
      sessionPlayers.forEach((sp:any) => {
        if (!sessionMeta[sp.session_id]) sessionMeta[sp.session_id] = { total:0, team:0, differentiated:0, kinesiology:0, absent:0, rpe_done:0 };
        const meta = sessionMeta[sp.session_id]; meta.total++;
        if (sp.rpe != null) meta.rpe_done++;
        if (sp.attendance === 'presente') meta.team++;
        else if (sp.attendance === 'diferenciado') meta.differentiated++;
        else if (sp.attendance === 'kinesiologia') meta.kinesiology++;
        else if (['ausente','no_entrena'].includes(sp.attendance)) meta.absent++;
      });

      const memberships = await base44.asServiceRole.entities.SquadMembership.filter({ squad_id: squadId }, '-effective_from', 1500).catch(() => []);
      const wellnessRows = await base44.asServiceRole.entities.WellnessResponse.filter({ squad_id: squadId, response_date: { $gte: from, $lte: to } }, '-updated_at', 3000).catch(() => []);
      const dayMetrics:any = {};
      function activeRosterCount(day:string) {
        const ids = new Set(memberships.filter((m:any) => isMembershipActiveOnDate(m, day)).map((m:any) => m.player_id).filter(Boolean));
        return ids.size;
      }
      for (const schedule of schedules) {
        dayMetrics[schedule.date] = { roster_count: activeRosterCount(schedule.date), wellness_done: 0, rpe_required: 0, rpe_done: 0 };
      }
      wellnessRows.forEach((row:any) => { if (dayMetrics[row.response_date]) dayMetrics[row.response_date].wellness_done += 1; });
      const sessionById = new Map((await base44.asServiceRole.entities.TrainingSession.filter({ squad_id: squadId, date: { $gte: from, $lte: to } }, 'date', 1500).catch(() => [])).map((s:any) => [s.id,s]));
      sessionPlayers.forEach((sp:any) => {
        const session:any = sessionById.get(sp.session_id); if (!session || !session.rpe_enabled || !dayMetrics[session.date] || ['ausente','no_entrena'].includes(sp.attendance)) return;
        dayMetrics[session.date].rpe_required += 1; if (sp.rpe != null) dayMetrics[session.date].rpe_done += 1;
      });

      const enriched = items.map((item:any) => {
        let derivedStatus = item.status;
        let meta:any = {};
        if (item.source_type === 'training_session') meta = sessionMeta[item.source_id] || {};
        if (item.source_type === 'wellness') {
          const metrics = dayMetrics[item.date] || {}; meta = { done: metrics.wellness_done || 0, required: metrics.roster_count || 0 };
          if (meta.required > 0 && meta.done >= meta.required) derivedStatus = 'completed'; else if (meta.done > 0) derivedStatus = 'in_progress';
        }
        if (item.source_type === 'rpe') {
          const metrics = dayMetrics[item.date] || {}; meta = { done: metrics.rpe_done || 0, required: metrics.rpe_required || 0 };
          if (meta.required > 0 && meta.done >= meta.required) derivedStatus = 'completed'; else if (meta.done > 0) derivedStatus = 'in_progress';
        }
        return { ...item, derived_status: derivedStatus, meta };
      }).sort((a:any,b:any) => `${a.date}|${a.start_time || '99:99'}|${String(a.sort_order || 0).padStart(5,'0')}`.localeCompare(`${b.date}|${b.start_time || '99:99'}|${String(b.sort_order || 0).padStart(5,'0')}`));
      return Response.json({ ok: true, schedules, items: enriched, day_metrics: dayMetrics });
    }

    if (action === 'create' || action === 'update') {
      const item = body.item || {};
      const schedule = await ensureSchedule(base44, squadId, squadName, seasonId, String(item.date || date), actor);
      const payload:any = {
        schedule_id: schedule.id, squad_id: squadId, squad_name: squadName, season_id: seasonId, date: String(item.date || date), start_time: normalizeTime(item.start_time), end_time: normalizeTime(item.end_time), duration_minutes: item.duration_minutes == null || item.duration_minutes === '' ? null : Number(item.duration_minutes), sort_order: Number(item.sort_order || 0), title: String(item.title || '').trim(), item_type: item.item_type || 'manual', source_type: 'manual', source_id: '', source_key: '', location: String(item.location || ''), responsible_area: item.responsible_area || 'cuerpo_tecnico', responsible_user_id: String(item.responsible_user_id || ''), responsible_name: String(item.responsible_name || ''), target_type: item.target_type || 'squad', player_ids: Array.isArray(item.player_ids) ? item.player_ids : [], staff_user_ids: Array.isArray(item.staff_user_ids) ? item.staff_user_ids : [], visibility: item.visibility || (item.target_type === 'specific_players' ? 'specific_players' : 'staff_only'), status: item.status || 'planned', completion_source: 'manual', notes: String(item.notes || ''), is_generated: false, synced_at: isoNow(), action_path: '',
      };
      if (!payload.title) return Response.json({ error: 'Escribí un título' }, { status: 400 });
      const saved = action === 'update' && item.id ? await base44.asServiceRole.entities.DailyScheduleItem.update(item.id, payload) : await base44.asServiceRole.entities.DailyScheduleItem.create(payload);
      return Response.json({ ok: true, item: saved });
    }

    if (action === 'status') {
      const id = String(body.id || '');
      const status = String(body.status || 'planned');
      const item = await base44.asServiceRole.entities.DailyScheduleItem.get(id).catch(() => null);
      if (!item || item.squad_id !== squadId) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });
      const updated = await base44.asServiceRole.entities.DailyScheduleItem.update(id, { status, completion_source: 'manual', synced_at: isoNow() });
      return Response.json({ ok: true, item: updated });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      const item = await base44.asServiceRole.entities.DailyScheduleItem.get(id).catch(() => null);
      if (!item || item.squad_id !== squadId) return Response.json({ error: 'Actividad no encontrada' }, { status: 404 });
      if (item.is_generated) return Response.json({ error: 'Esta actividad proviene de otra área. Abrí la fuente para cancelarla o modificarla.' }, { status: 409 });
      await base44.asServiceRole.entities.DailyScheduleItem.delete(id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error:any) {
    console.error('manageDailySchedule error:', error);
    return Response.json({ error: error?.message || 'Error al gestionar cronograma', }, { status: error?.status || 500 });
  }
}
