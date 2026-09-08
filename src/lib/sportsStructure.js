export const POSITION_GROUP_OPTIONS = ["Arqueros", "Defensores", "Mediocampistas", "Extremos", "Delanteros"];

export const DEFAULT_POSITION_OPTIONS = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Interno", "Extremo Derecho", "Extremo Izquierdo",
  "Delantero Centro", "Defensor", "Extremo",
];

export const DEFAULT_POSITION_GROUP_BY_POSITION = {
  "Arquero": "Arqueros",
  "Defensor": "Defensores",
  "Defensor Central": "Defensores",
  "Central": "Defensores",
  "Lateral Derecho": "Defensores",
  "Lateral Izquierdo": "Defensores",
  "Carrilero": "Defensores",
  "Mediocampista": "Mediocampistas",
  "Mediocampista Central": "Mediocampistas",
  "Volante": "Mediocampistas",
  "Volante Interno": "Mediocampistas",
  "Extremo": "Extremos",
  "Extremo Derecho": "Extremos",
  "Extremo Izquierdo": "Extremos",
  "Delantero": "Delanteros",
  "Delantero Centro": "Delanteros",
};

export function normalizeStructureText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GROUP_BY_NORMALIZED = new Map(Object.entries(DEFAULT_POSITION_GROUP_BY_POSITION).map(([label, group]) => [normalizeStructureText(label), group]));

export function inferPositionGroup(position) {
  const normalized = normalizeStructureText(position);
  if (!normalized) return "";
  if (GROUP_BY_NORMALIZED.has(normalized)) return GROUP_BY_NORMALIZED.get(normalized);
  if (normalized.includes("arquero") || normalized === "gk" || normalized.includes("goalkeeper")) return "Arqueros";
  if (normalized.includes("defensor") || normalized.includes("central") || normalized.includes("lateral") || normalized.includes("carrilero")) return "Defensores";
  if (normalized.includes("medio") || normalized.includes("volante")) return "Mediocampistas";
  if (normalized.includes("extremo") || normalized.includes("winger")) return "Extremos";
  if (normalized.includes("delantero") || normalized.includes("punta") || normalized.includes("nueve")) return "Delanteros";
  return "";
}

export function positionGroupFromOption(position, options = []) {
  const normalized = normalizeStructureText(position);
  const matched = options.find((option) => normalizeStructureText(option.label) === normalized);
  return matched?.metadata?.position_group || inferPositionGroup(position);
}

export function uniqueOptionLabels(rows = []) {
  const seen = new Set();
  return rows
    .filter((row) => row?.active !== false && row?.label)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter((row) => {
      const key = normalizeStructureText(row.label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
