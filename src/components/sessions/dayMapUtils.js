const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const aliases = {
  arq: "arquero", gk: "arquero", portero: "arquero", goalkeeper: "arquero", golero: "arquero", guardameta: "arquero",
  defensor: "defensor central",
  mediocampista: "mediocampista central", volante: "mediocampista central",
  delantero: "delantero centro",
};

// Posiciones genéricas sin lado definido (no dicen si es izquierdo o derecho):
// se reparten alternadamente entre ambos costados para no amontonar a todos
// del mismo lado de la cancha, que era lo que pasaba antes.
const SIDED_ALIASES = {
  carrilero: ["lateral izquierdo", "lateral derecho"],
  extremo: ["extremo izquierdo", "extremo derecho"],
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

// Envuelve una lista de nombres en varias líneas en vez de truncarla: evita que
// el conteo mostrado (ej. "Kinesiología (8)") no coincida con los nombres visibles.
function wrapNames(names, maxCharsPerLine = 70) {
  const lines = [];
  let current = "";
  for (const name of names) {
    const candidate = current ? `${current} · ${name}` : name;
    if (current && candidate.length > maxCharsPerLine) {
      lines.push(current);
      current = name;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

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
  const sidedCounters = {};

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
    let group = known.get(aliases[pos] || pos);
    if (!group && SIDED_ALIASES[pos]) {
      const sides = SIDED_ALIASES[pos];
      const seenOfKind = sidedCounters[pos] || 0;
      group = known.get(sides[seenOfKind % sides.length]);
      sidedCounters[pos] = seenOfKind + 1;
    }
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

  // Listas completas (sin truncar) para el detalle de Diferenciado/Kinesiología,
  // más las posiciones Y donde va cada bloque de texto dentro del SVG, calculadas
  // acá una sola vez para que el alto del mapa (height) siempre alcance.
  const diferenciadosLines = wrapNames(diferenciados.map(p => p.player_name).filter(Boolean));
  const kinesiologiaLines = wrapNames(kinesiologia.map(p => p.player_name).filter(Boolean));

  let cursor = Math.max(73 + unknown.length * 26, 73) + 32;
  const diferenciadosHeaderY = cursor;
  cursor += 24 + diferenciadosLines.length * 22 + 32;
  const kinesiologiaHeaderY = cursor;
  cursor += 24 + kinesiologiaLines.length * 22 + 30;

  return {
    groups,
    unknown,
    excluded,
    diferenciados,
    kinesiologia,
    diferenciadosLines,
    kinesiologiaLines,
    diferenciadosHeaderY,
    kinesiologiaHeaderY,
    bands,
    pitchBottom,
    height: pitchBottom + cursor,
    count: teamCount,
    totalAssigned,
  };
}
