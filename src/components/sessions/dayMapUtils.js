const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const aliases = {
  arq: "arquero", gk: "arquero", portero: "arquero", goalkeeper: "arquero", golero: "arquero", guardameta: "arquero",
  defensor: "defensor central", carrilero: "lateral derecho",
  mediocampista: "mediocampista central", volante: "mediocampista central",
  extremo: "extremo derecho", delantero: "delantero centro",
};

export const MAP_ROWS = [
  [["Delantero Centro", 1]],
  [["Extremo Izquierdo", 0], ["Extremo Derecho", 2]],
  [["Volante Interno", 1]],
  [["Mediocampista Central", 1]],
  [["Lateral Izquierdo", 0], ["Defensor Central", 1], ["Lateral Derecho", 2]],
  [["Arquero", 1]],
];

const known = new Map(MAP_ROWS.flat().map(([name]) => [normalize(name), name]));

/**
 * El mapa usa attendance como fuente operativa del trabajo realizado ese día.
 * status_at_session aporta contexto/alerta, pero no mueve automáticamente al jugador
 * de un grupo a otro una vez que el staff definió su trabajo.
 */
export function buildDayMap(players = []) {
  const groups = Object.fromEntries([...known.values()].map(name => [name, []]));
  const unknown = [];
  const diferenciados = [];
  const kinesiologia = [];
  const excluded = [];
  const seen = new Set();

  for (const p of players) {
    const key = p.player_id || p.id;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    const attendance = normalize(p.attendance) || "presente";
    if (attendance === "diferenciado") { diferenciados.push(p); continue; }
    if (attendance === "kinesiologia") { kinesiologia.push(p); continue; }
    if (["ausente", "no_entrena", "descanso"].includes(attendance)) { excluded.push(p); continue; }

    const entry = { ...p, _warning: ["molestia", "reintegro", "lesionado"].includes(normalize(p.status_at_session)) };
    const pos = normalize(p.position);
    const group = known.get(aliases[pos] || pos);
    if (group) groups[group].push(entry); else unknown.push(entry);
  }

  for (const list of [...Object.values(groups), unknown, diferenciados, kinesiologia, excluded]) {
    list.sort((a,b) => (a.player_name || "").localeCompare(b.player_name || "", "es"));
  }

  let y = 132;
  const bands = MAP_ROWS.map(zones => {
    const height = Math.max(100, 60 + Math.max(...zones.map(([name]) => groups[name].length)) * 42);
    const band = { zones, y, height };
    y += height;
    return band;
  });

  const pitchBottom = y + 12;
  const teamCount = Object.values(groups).reduce((n,list)=>n+list.length,0) + unknown.length;
  const totalAssigned = teamCount + diferenciados.length + kinesiologia.length + excluded.length;
  const specialRows = Math.max(1, diferenciados.length, kinesiologia.length);

  return {
    groups,
    unknown,
    excluded,
    diferenciados,
    kinesiologia,
    bands,
    pitchBottom,
    height: pitchBottom + 150 + unknown.length * 24 + specialRows * 4,
    count: teamCount,
    totalAssigned,
  };
}
