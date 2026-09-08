import { base44 } from "@/api/base44Client";
import { defaultAttendanceForStatus, normalizeSessionStatus } from "./sessionPlayerUtils";

function medicalSuggestion(currentStatus) {
  const value = String(currentStatus || "").toLowerCase().trim();
  if (["lesionado", "kinesiologia"].includes(value)) return { status: "lesionado", attendance: "kinesiologia", source: "Área médica" };
  if (["en_recuperacion", "seguimiento"].includes(value)) return { status: "reintegro", attendance: "diferenciado", source: "Área médica" };
  return null;
}

/**
 * Devuelve el plantel activo válido para `date` y una sugerencia operativa para el día.
 * Prioridad de sugerencia: DailySquadStatus de esa fecha → Área médica actual → ficha del jugador.
 * La sugerencia nunca reemplaza la decisión del staff al crear la sesión.
 */
export async function loadSquadRoster(squadId, date) {
  const [allPlayers, memberships, dayStatuses, medicalStatuses] = await Promise.all([
    base44.entities.Player.list("-created_date", 500).catch(() => []),
    base44.entities.SquadMembership.filter({ squad_id: squadId, status: "activo" }, "-effective_from", 500).catch(() => []),
    base44.entities.DailySquadStatus.filter({ date }, "-created_date", 500).catch(() => []),
    base44.entities.MedicalCurrentStatus.list("-updated_at", 2000).catch(() => []),
  ]);
  const playerMap = {};
  allPlayers.filter(p => p.active !== false).forEach(p => { playerMap[p.id] = p; });
  const valid = memberships.filter(m => {
    if (m.effective_from && m.effective_from > date) return false;
    if (m.effective_to && m.effective_to < date) return false;
    return true;
  });
  const dayStatusByPlayer = new Map();
  dayStatuses.forEach((row) => {
    if (row.player_id && !dayStatusByPlayer.has(row.player_id)) dayStatusByPlayer.set(row.player_id, row);
  });
  const medicalByPlayer = new Map();
  medicalStatuses.forEach((row) => {
    if (row.player_id && !medicalByPlayer.has(row.player_id)) medicalByPlayer.set(row.player_id, row);
  });

  const seen = new Set();
  const roster = [];
  valid.forEach(m => {
    if (seen.has(m.player_id)) return;
    const player = playerMap[m.player_id];
    if (!player) return;
    seen.add(m.player_id);

    const daily = dayStatusByPlayer.get(m.player_id);
    const medical = medicalSuggestion(medicalByPlayer.get(m.player_id)?.current_status);
    const baseStatus = normalizeSessionStatus(daily?.status || player.status);
    const suggestion = daily?.status
      ? { status: baseStatus, attendance: defaultAttendanceForStatus(baseStatus), source: "Estado del día" }
      : medical || { status: baseStatus, attendance: defaultAttendanceForStatus(baseStatus), source: player.status ? "Ficha jugador" : "Predeterminado" };

    roster.push({
      player,
      baseSquadId: m.squad_id,
      baseSquadName: m.squad_name || "",
      suggestedStatus: suggestion.status,
      suggestedAttendance: suggestion.attendance,
      statusSource: suggestion.source,
    });
  });
  return roster;
}

/**
 * Busca si el jugador ya está convocado en otra sesión el mismo día.
 * Devuelve { sessionPlayer, session } o null.
 */
export async function findPlayerInOtherSession(playerId, date, excludeSessionId) {
  const sessions = await base44.entities.TrainingSession.filter({ date }, "-created_date", 200).catch(() => []);
  const otherSessions = sessions.filter(s => s.id !== excludeSessionId);
  for (const s of otherSessions) {
    const sp = await base44.entities.SessionPlayer.filter({ session_id: s.id, player_id: playerId }, "player_name", 5).catch(() => []);
    if (sp.length > 0) return { sessionPlayer: sp[0], session: s };
  }
  return null;
}

/**
 * Mueve al jugador: lo quita de la sesión original del día (si estaba en otra).
 * Devuelve la sesión de origen o null.
 */
export async function movePlayerFromOtherSession(playerId, date, excludeSessionId) {
  const found = await findPlayerInOtherSession(playerId, date, excludeSessionId);
  if (!found) return null;
  await base44.entities.SessionPlayer.delete(found.sessionPlayer.id);
  return found;
}