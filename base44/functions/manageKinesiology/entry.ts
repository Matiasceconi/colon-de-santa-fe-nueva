import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireModulePermission } from '../../shared/modulePermission.ts';
import { resolveSquadRosterForDate } from '../../shared/squadRosterResolver.ts';
import { getTodayInTimezone } from '../../shared/playerAccessUtils.ts';

const ACTIVE_MEDICAL = new Set(['lesionado', 'en_recuperacion', 'kinesiologia', 'seguimiento']);

async function requirePermission(base44, user, action) {
  const permission = await requireModulePermission(base44, user, 'kinesiologia', action);
  if (!permission) return Response.json({ error: 'Sin permisos para Kinesiología' }, { status: 403 });
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'getData');

    if (action === 'getData') {
      const denied = await requirePermission(base44, user, 'can_view');
      if (denied) return denied;
      const squadId = String(body.squad_id || '');
      if (!squadId) return Response.json({ error: 'Plantel requerido' }, { status: 400 });
      const today = getTodayInTimezone();

      const [rosterRows, statuses, cases] = await Promise.all([
        resolveSquadRosterForDate(base44, squadId, today),
        base44.asServiceRole.entities.MedicalCurrentStatus.filter({ squad_id: squadId }, '-updated_at', 500),
        base44.asServiceRole.entities.KinesiologyCase.filter({ squad_id: squadId }, '-last_review_at', 500),
      ]);
      const roster = rosterRows.map((r) => r.player);
      const episodeIds = [...new Set(statuses.map((s) => s.active_episode_id).filter(Boolean))];
      const episodes = [];
      for (let i = 0; i < episodeIds.length; i += 50) {
        const rows = await base44.asServiceRole.entities.MedicalEpisode.filter({ id: { $in: episodeIds.slice(i, i + 50) } }, '-fecha_inicio_tto', 200);
        episodes.push(...rows);
      }
      const episodeById = Object.fromEntries(episodes.map((e) => [e.id, e]));
      const playerById = Object.fromEntries(roster.map((p) => [p.id, p]));

      const caseIds = cases.map((c) => c.id);
      let sessions = [];
      for (let i = 0; i < caseIds.length; i += 50) {
        const rows = await base44.asServiceRole.entities.KinesiologySession.filter({ case_id: { $in: caseIds.slice(i, i + 50) } }, '-session_date', 1000);
        sessions.push(...rows);
      }
      const lastSessionByCase = {};
      sessions.forEach((s) => { if (!lastSessionByCase[s.case_id]) lastSessionByCase[s.case_id] = s; });

      const candidates = statuses
        .filter((s) => ACTIVE_MEDICAL.has(s.current_status) && s.active_episode_id)
        .map((s) => {
          const episode = episodeById[s.active_episode_id];
          const player = playerById[s.player_id];
          return {
            player_id: s.player_id,
            player_name: player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : episode?.player_name_original || '',
            photo_url: player?.photo_url || '',
            position: player?.position || '',
            current_status: s.current_status,
            medical_episode_id: s.active_episode_id,
            diagnosis: episode?.lesion_consulta || '',
            affected_area: episode?.mmii_afectado || '',
            medical_stage: episode?.etapa_rhb || '',
            start_date: episode?.fecha_inicio_tto || '',
            target_return_date: episode?.fecha_final_tto || '',
          };
        });

      const enrichedCases = cases.map((c) => {
        const episode = episodeById[c.medical_episode_id];
        const player = playerById[c.player_id];
        const status = statuses.find((s) => s.player_id === c.player_id);
        return {
          ...c,
          player_name: c.player_name || (player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : episode?.player_name_original || ''),
          photo_url: player?.photo_url || '',
          position: player?.position || '',
          diagnosis: episode?.lesion_consulta || '',
          affected_area: episode?.mmii_afectado || '',
          medical_status: status?.current_status || '',
          medical_stage: episode?.etapa_rhb || '',
          medical_start_date: episode?.fecha_inicio_tto || '',
          medical_target_return_date: episode?.fecha_final_tto || '',
          last_session: lastSessionByCase[c.id] || null,
          sessions: sessions.filter((s) => s.case_id === c.id),
        };
      });

      return Response.json({ ok: true, today, roster, candidates, cases: enrichedCases });
    }

    if (action === 'saveCase') {
      const denied = await requirePermission(base44, user, body.case?.id ? 'can_edit' : 'can_create');
      if (denied) return denied;
      const input = body.case || {};
      if (!input.player_id || !input.medical_episode_id || !input.squad_id) return Response.json({ error: 'Jugador, episodio médico y plantel son obligatorios' }, { status: 400 });
      const episode = await base44.asServiceRole.entities.MedicalEpisode.get(input.medical_episode_id).catch(() => null);
      if (!episode || episode.player_id !== input.player_id) return Response.json({ error: 'El episodio médico no corresponde al jugador' }, { status: 400 });
      if (!input.id) {
        const existing = await base44.asServiceRole.entities.KinesiologyCase.filter({ medical_episode_id: input.medical_episode_id, status: { $in: ['active', 'paused'] } }, '-created_date', 5);
        if (existing[0]) return Response.json({ error: 'Ya existe un caso kinésico activo para este episodio' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const payload = {
        organization_id: input.organization_id || '',
        squad_id: input.squad_id,
        player_id: input.player_id,
        player_name: input.player_name || episode.player_name_original || '',
        medical_episode_id: input.medical_episode_id,
        status: input.status || 'active',
        stage: input.stage || 'initial',
        start_date: input.start_date || episode.fecha_inicio_tto || getTodayInTimezone(),
        target_return_date: input.target_return_date || episode.fecha_final_tto || null,
        responsible_name: input.responsible_name || '',
        goals: Array.isArray(input.goals) ? input.goals : [],
        restrictions: Array.isArray(input.restrictions) ? input.restrictions : [],
        progression_criteria: Array.isArray(input.progression_criteria) ? input.progression_criteria : [],
        notes: input.notes || '',
        shared_with_pf: input.shared_with_pf !== false,
        last_review_at: now,
        closed_at: input.status === 'completed' ? (input.closed_at || now) : null,
        created_by_name: input.created_by_name || user.full_name || user.email || '',
      };
      const saved = input.id
        ? await base44.asServiceRole.entities.KinesiologyCase.update(input.id, payload)
        : await base44.asServiceRole.entities.KinesiologyCase.create(payload);
      return Response.json({ ok: true, case: saved });
    }

    if (action === 'saveSession') {
      const denied = await requirePermission(base44, user, body.session?.id ? 'can_edit' : 'can_create');
      if (denied) return denied;
      const input = body.session || {};
      if (!input.case_id || !input.player_id || !input.session_date) return Response.json({ error: 'Caso, jugador y fecha son obligatorios' }, { status: 400 });
      const kinCase = await base44.asServiceRole.entities.KinesiologyCase.get(input.case_id).catch(() => null);
      if (!kinCase || kinCase.player_id !== input.player_id) return Response.json({ error: 'Caso kinésico inválido' }, { status: 400 });
      const payload = {
        organization_id: input.organization_id || kinCase.organization_id || '',
        case_id: input.case_id,
        player_id: input.player_id,
        session_date: input.session_date,
        session_type: input.session_type || 'treatment',
        stage: input.stage || kinCase.stage || '',
        objective: input.objective || '',
        treatment_notes: input.treatment_notes || '',
        exercise_notes: input.exercise_notes || '',
        pain_pre: input.pain_pre === '' || input.pain_pre == null ? null : Number(input.pain_pre),
        pain_post: input.pain_post === '' || input.pain_post == null ? null : Number(input.pain_post),
        tolerance: input.tolerance || 'good',
        field_minutes: input.field_minutes === '' || input.field_minutes == null ? null : Number(input.field_minutes),
        running_minutes: input.running_minutes === '' || input.running_minutes == null ? null : Number(input.running_minutes),
        max_speed_pct: input.max_speed_pct === '' || input.max_speed_pct == null ? null : Number(input.max_speed_pct),
        training_session_id: input.training_session_id || '',
        gps_session_id: input.gps_session_id || '',
        notes: input.notes || '',
        status: input.status || 'completed',
        created_by_name: user.full_name || user.email || '',
      };
      const saved = input.id
        ? await base44.asServiceRole.entities.KinesiologySession.update(input.id, payload)
        : await base44.asServiceRole.entities.KinesiologySession.create(payload);
      await base44.asServiceRole.entities.KinesiologyCase.update(input.case_id, { last_review_at: new Date().toISOString() });
      return Response.json({ ok: true, session: saved });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    console.error('manageKinesiology error:', error);
    return Response.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
