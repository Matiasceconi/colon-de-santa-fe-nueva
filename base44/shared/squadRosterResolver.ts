// Resolución central del plantel operativo real para una fecha.
// Usa SquadMembership (status: "activo", effective_from/effective_to).
// No utiliza Player.squad_id como fuente definitiva.
// (DailySquadStatus removido — la gestión de estados ahora vive en SessionPlayer)

// Resuelve el contexto operativo de un jugador para una fecha:
// plantel efectivo, temporada y organización.
export async function resolvePlayerContextForDate(base44: any, playerId: string, date: string) {
  if (!playerId || !date) return null;

  const player = await base44.asServiceRole.entities.Player.get(playerId).catch(() => null);
  if (!player) return null;

  // 1. Membresía vigente en la fecha
  const memberships = await base44.asServiceRole.entities.SquadMembership.filter(
    { player_id: playerId, status: 'activo' },
    '-effective_from',
    50
  );
  const validMembership = memberships.find((m: any) => {
    if (m.effective_from && m.effective_from > date) return false;
    if (m.effective_to && m.effective_to < date) return false;
    return true;
  });

  const effectiveSquadId = validMembership?.squad_id || player.squad_id || '';
  let effectiveSquadName = validMembership?.squad_name || '';

  // 3. Temporada del plantel efectivo
  let seasonId = '';
  if (effectiveSquadId) {
    const squad = await base44.asServiceRole.entities.Squad.get(effectiveSquadId).catch(() => null);
    if (squad) {
      effectiveSquadName = effectiveSquadName || squad.name;
      seasonId = squad.season || '';
    }
  }

  return {
    player,
    squad_id: effectiveSquadId,
    squad_name: effectiveSquadName,
    season_id: seasonId,
    organization_id: player.club_id || '',
    ds: null,
    membership: validMembership || null,
  };
}

// Resuelve la lista de jugadores de un plantel para una fecha
// (membresías estables vigentes).
export async function resolveSquadRosterForDate(base44: any, squadId: string, date: string) {
  if (!squadId || !date) return [];

  const memberships = await base44.asServiceRole.entities.SquadMembership.filter(
    { squad_id: squadId, status: 'activo' },
    '-effective_from',
    500
  );

  // Membresías estables vigentes en la fecha
  const stableMembers = memberships.filter((m: any) => {
    if (m.effective_from && m.effective_from > date) return false;
    if (m.effective_to && m.effective_to < date) return false;
    return true;
  });

  const allPlayerIds = new Set<string>();
  stableMembers.forEach((m: any) => allPlayerIds.add(m.player_id));

  // Fetch jugadores por ids (en lotes)
  const idList = Array.from(allPlayerIds);
  const playerMap: Record<string, any> = {};
  for (let i = 0; i < idList.length; i += 100) {
    const batch = idList.slice(i, i + 100);
    const rows = await base44.asServiceRole.entities.Player.filter(
      { id: { $in: batch }, active: { $ne: false } },
      'last_name',
      500
    );
    rows.forEach((p: any) => { playerMap[p.id] = p; });
  }

  const result: any[] = [];
  stableMembers.forEach((m: any) => {
    const player = playerMap[m.player_id];
    if (!player) return;
    result.push({ player, ds: null, membership: m });
  });

  return result;
}