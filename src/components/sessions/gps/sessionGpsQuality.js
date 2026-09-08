export function findSessionGpsDuplicates(rows = []) {
  const byPlayer = new Map();
  rows.forEach((row) => {
    if (!row.player_id) return;
    if (!byPlayer.has(row.player_id)) byPlayer.set(row.player_id, []);
    byPlayer.get(row.player_id).push(row);
  });
  return [...byPlayer.entries()]
    .filter(([, playerRows]) => playerRows.length > 1)
    .map(([playerId, playerRows]) => ({
      playerId,
      playerName: playerRows[0]?.player_name || playerRows[0]?.player_name_original || "Jugador",
      rows: playerRows,
    }));
}

export function validSessionGpsRows(rows = []) {
  const duplicatedIds = new Set(findSessionGpsDuplicates(rows).map((item) => item.playerId));
  return rows.filter((row) => row.player_id && !duplicatedIds.has(row.player_id));
}

export function findExerciseGpsDuplicates(rows = []) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!row.exercise_id || !row.player_id) return;
    const block = Number(row.block_number) || 1;
    const key = `${row.exercise_id}::${row.player_id}::${block}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.entries()]
    .filter(([, groupRows]) => groupRows.length > 1)
    .map(([key, groupRows]) => ({
      key,
      exerciseId: groupRows[0]?.exercise_id,
      playerId: groupRows[0]?.player_id,
      playerName: groupRows[0]?.player_name || groupRows[0]?.player_name_original || "Jugador",
      blockNumber: Number(groupRows[0]?.block_number) || 1,
      rows: groupRows,
    }));
}

export function validExerciseGpsRows(rows = []) {
  const duplicatedKeys = new Set(findExerciseGpsDuplicates(rows).map((item) => item.key));
  return rows.filter((row) => {
    if (!row.exercise_id || !row.player_id) return false;
    const key = `${row.exercise_id}::${row.player_id}::${Number(row.block_number) || 1}`;
    return !duplicatedKeys.has(key);
  });
}
