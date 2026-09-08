import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireModulePermission } from '../../shared/modulePermission.ts';

const MODULE_ID = 'minutos_jugados';
function clean(value:any) { return String(value || '').trim(); }
function tournamentLabel(match:any) {
  const value = clean(match?.competition).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (value.includes('apertura')) return 'Proyección Apertura';
  if (value.includes('clausura')) return 'Clausura';
  if (value.includes('copa argentina')) return 'Copa Argentina';
  if (value.includes('juven')) return 'Juveniles';
  if (value.includes('amist')) return 'Amistosos';
  if (value.includes('regional')) return 'Torneo Regional';
  return 'Otro';
}
function playerName(player:any) { return player?.full_name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim(); }

export default async function(req:Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'No autenticado' }, { status:401 });
    const body = await req.json().catch(() => ({}));
    const operation = clean(body.operation || 'save');
    if (operation !== 'save') return Response.json({ error:'Operación inválida' }, { status:400 });
    const matchId = clean(body.match_id);
    const playerId = clean(body.player_id);
    if (!matchId || !playerId) return Response.json({ error:'Elegí partido y jugador' }, { status:400 });

    const [match, player] = await Promise.all([
      base44.asServiceRole.entities.MatchReport.get(matchId).catch(() => null),
      base44.asServiceRole.entities.Player.get(playerId).catch(() => null),
    ]);
    if (!match || ['archivado','cancelado'].includes(match.status)) return Response.json({ error:'Partido no disponible' }, { status:404 });
    if (!player) return Response.json({ error:'Jugador no encontrado' }, { status:404 });
    const permission = await requireModulePermission(base44, user, MODULE_ID, 'can_edit') || await requireModulePermission(base44, user, MODULE_ID, 'can_create');
    if (!permission) return Response.json({ error:'No tenés permiso para cargar minutos' }, { status:403 });
    if (user.role !== 'admin' && permission?.access && permission.access.all_squads !== true && !(permission.access.squad_ids || []).includes(match.squad_id)) {
      return Response.json({ error:'No tenés acceso a este plantel' }, { status:403 });
    }

    const minutes = Number(body.minutes);
    const suppliedDuration = Number(body.match_duration_minutes || 0);
    const currentDuration = Number(match.total_duration_minutes || 0);
    const duration = suppliedDuration > 0 ? suppliedDuration : currentDuration;
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 180) return Response.json({ error:'Los minutos deben estar entre 0 y 180' }, { status:400 });
    if (!duration || duration <= 0 || duration > 180) return Response.json({ error:'Definí una duración válida del partido' }, { status:400 });
    if (minutes > duration) return Response.json({ error:`Los minutos (${minutes}') no pueden superar la duración del partido (${duration}')` }, { status:400 });
    const lineupRole = body.lineup_role === 'suplente' ? 'suplente' : 'titular';
    const actor = String(user.email || user.id || '');
    const now = new Date().toISOString();
    const fullName = playerName(player);
    const number = Number(player.jersey_number || 0) || null;
    const matchLabel = `vs ${match.rival || 'Rival'} ${String(match.date || '').split('-').reverse().join('/')}`;
    const canonicalKey = `${match.id}:${player.id}`;

    if (suppliedDuration > 0 && suppliedDuration !== currentDuration) {
      await base44.asServiceRole.entities.MatchReport.update(match.id, {
        total_duration_minutes: suppliedDuration,
        duration_source: 'manual',
        duration_confirmed_at: now,
        duration_review_status: 'Duración manual',
      });
    }

    const minutePayload:any = {
      match_id: match.id,
      player_id: player.id,
      match_player_key: canonicalKey,
      squad_id: match.squad_id || '',
      season_id: match.season_id || '',
      competition_id: match.competition_id || '',
      competition: match.competition || '',
      tournament: tournamentLabel(match),
      match_date: match.date,
      match_label: matchLabel,
      rival: match.rival || '',
      player_name: fullName,
      player_number: number,
      lineup_role: lineupRole,
      started: lineupRole === 'titular',
      entered: lineupRole === 'titular' || minutes > 0,
      entered_minute: null,
      entered_minute_label: '',
      exit_minute: null,
      exit_minute_label: '',
      match_duration_minutes: duration,
      minutes_calculated: minutes,
      minutes_played: minutes,
      manual_override: true,
      manual_reason: clean(body.reason) || 'Carga manual desde Minutos Jugados',
      source: 'manual_entry',
      data_source: 'performance_minutes_manual',
      official_confirmed: true,
      updated_at: now,
    };
    const currentRows = await base44.asServiceRole.entities.MatchPlayerMinutes.filter({ match_id:match.id, player_id:player.id }, '-updated_at', 20).catch(() => []);
    let savedMinute;
    if (currentRows[0]) {
      savedMinute = await base44.asServiceRole.entities.MatchPlayerMinutes.update(currentRows[0].id, minutePayload);
      for (const duplicate of currentRows.slice(1)) await base44.asServiceRole.entities.MatchPlayerMinutes.delete(duplicate.id).catch(() => null);
    } else savedMinute = await base44.asServiceRole.entities.MatchPlayerMinutes.create(minutePayload);

    // Mantener la convocatoria canónica coherente. Si no existía, la carga manual la crea explícitamente.
    const callups = await base44.asServiceRole.entities.MatchCallup.filter({ match_id:match.id, player_id:player.id }, '-updated_at', 20).catch(() => []);
    const callupPayload:any = {
      match_id: match.id,
      player_id: player.id,
      squad_id: match.squad_id || '',
      club_id: player.club_id || '',
      status: 'convocado',
      callup_status: 'convocado',
      callup_key: canonicalKey,
      lineup_role: lineupRole,
      shirt_number: number,
      source: callups[0]?.source || 'manual_minutes',
      player_name: fullName,
      player_number: number,
      player_position: player.position || '',
      updated_at: now,
      created_at: callups[0]?.created_at || now,
    };
    if (callups[0]) {
      await base44.asServiceRole.entities.MatchCallup.update(callups[0].id, callupPayload);
      for (const duplicate of callups.slice(1)) await base44.asServiceRole.entities.MatchCallup.delete(duplicate.id).catch(() => null);
    } else await base44.asServiceRole.entities.MatchCallup.create(callupPayload);

    // Compatibilidad histórica: una sola fila legacy. La fuente oficial sigue siendo MatchPlayerMinutes.
    const legacyPayload:any = {
      player_id:player.id,
      player_name:fullName,
      player_number:number,
      match_id:match.id,
      squad_id:match.squad_id || '',
      competition_id:match.competition_id || '',
      hidden_from_reports:false,
      is_starter:lineupRole === 'titular',
      sub_in_minute:null,
      tournament:tournamentLabel(match),
      match_label:matchLabel,
      match_date:match.date,
      rival:match.rival || '',
      minutes,
      notes:'Compatibilidad · carga manual canónica en MatchPlayerMinutes',
    };
    const legacyRows = await base44.asServiceRole.entities.MinutesRecord.filter({ match_id:match.id, player_id:player.id }, '-created_date', 20).catch(() => []);
    if (legacyRows[0]) {
      await base44.asServiceRole.entities.MinutesRecord.update(legacyRows[0].id, legacyPayload);
      for (const duplicate of legacyRows.slice(1)) await base44.asServiceRole.entities.MinutesRecord.delete(duplicate.id).catch(() => null);
    } else await base44.asServiceRole.entities.MinutesRecord.create(legacyPayload);

    return Response.json({ ok:true, record:savedMinute, match_duration_minutes:duration, actor });
  } catch (error:any) {
    console.error('manageManualMatchMinutes error', error);
    return Response.json({ error:error?.message || 'Error interno' }, { status:error?.status || 500 });
  }
}
