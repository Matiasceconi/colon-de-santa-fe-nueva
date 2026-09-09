import * as XLSX from "xlsx";

// Fuente única de columnas para la planilla de jugadores: la usan tanto la
// plantilla de importación como la exportación (mismo layout, así el archivo
// exportado se puede reimportar tal cual) y la detección de columnas al leer
// un Excel subido por el usuario.
//
// El backend (base44/functions/importPlayersFromExcel) corre en otro runtime
// (Deno) y no puede importar este archivo, pero cada columna usa como `key`
// el mismo nombre de propiedad que ese backend ya lee de cada fila — si se
// agrega o renombra una columna acá, hay que reflejarlo también ahí.

export function normalizeSpreadsheetText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const PLAYER_STATUS_OPTIONS = [
  "Disponible", "Lesionado", "En recuperación", "Suspendido", "Permiso",
  "Selección", "Subio a primera", "Bajo a juveniles", "Subieron de juveniles",
  "Bajo de primera", "Sparring",
];

export const PLAYER_CONTRACT_STATUS_OPTIONS = ["Sin información", "Con contrato", "Sin contrato"];

// `detect`: claves normalizadas a buscar en el encabezado. Se prueban todas
// en modo EXACTO primero (útil para separar columnas parecidas, ej. "Nro.
// documento" vs "Tipo de documento", que comparten la palabra "documento") y
// solo si ninguna matchea exacto se cae a modo parcial (substring).
export const PLAYER_COLUMNS = [
  { key: "squad", label: "Plantel / Categoría *", required: true, width: 22, detect: ["plantel categoria", "plantel", "categoria", "division", "equipo"] },
  { key: "document_type", label: "Tipo de documento *", required: true, width: 18, detect: ["tipo de documento", "tipo doc"] },
  { key: "dni", label: "Nro. documento", required: false, width: 16, detect: ["nro documento", "nro de documento", "documento", "dni"] },
  { key: "last_name", label: "Apellido *", required: true, width: 16, detect: ["apellido"] },
  { key: "first_name", label: "Nombre *", required: true, width: 16, detect: ["nombre", "nombres"] },
  { key: "birth_date", label: "Fecha de nacimiento *", required: true, width: 18, detect: ["fecha de nacimiento", "f de nacimiento", "f nac", "nacimiento", "f de nac"] },
  { key: "birth_place", label: "Lugar de nacimiento", required: false, width: 20, detect: ["lugar de nacimiento", "lugar nacimiento"] },
  { key: "nationality", label: "Nacionalidad", required: false, width: 16, detect: ["nacionalidad", "nac"] },
  { key: "residence_zone", label: "Zona de residencia", required: false, width: 18, detect: ["zona de residencia", "residencia", "residence"] },
  { key: "province", label: "Provincia", required: false, width: 16, detect: ["provincia"] },
  { key: "city", label: "Ciudad", required: false, width: 16, detect: ["ciudad", "localidad"] },
  { key: "full_address", label: "Domicilio completo", required: false, width: 26, detect: ["domicilio completo", "domicilio", "direccion"] },
  { key: "housing_type", label: "Tipo de pensión", required: false, width: 16, detect: ["tipo de pension", "pension"] },
  { key: "phone_number", label: "Celular", required: false, width: 18, detect: ["celular", "telefono", "phone"] },
  { key: "leg", label: "Perfil / pierna hábil *", required: true, width: 18, detect: ["perfil pierna habil", "perfil", "pierna", "habil"] },
  { key: "position", label: "Posición *", required: true, width: 22, detect: ["posicion"] },
  { key: "secondary_position", label: "Posición secundaria", required: false, width: 20, detect: ["posicion secundaria", "segunda posicion"] },
  { key: "jersey_number", label: "Número de camiseta", required: false, width: 16, detect: ["numero de camiseta", "n de camiseta", "camiseta", "numero", "nro"] },
  { key: "contract_status", label: "Situación contractual", required: false, width: 18, detect: ["situacion contractual", "contrato"] },
  { key: "status", label: "Estado", required: false, width: 16, detect: ["estado"] },
  { key: "notes", label: "Notas", required: false, width: 24, detect: ["notas", "observaciones"] },
  { key: "control", label: "Control automático", required: false, width: 22, detect: [], formula: true },
];

export const PLAYER_DATA_COLUMNS = PLAYER_COLUMNS.filter((c) => !c.formula);
export const PLAYER_CONTROL_COLUMN_INDEX = PLAYER_COLUMNS.findIndex((c) => c.formula);
const REQUIRED_KEYS = PLAYER_DATA_COLUMNS.filter((c) => c.required).map((c) => c.key);

export function playerColumnLabels() {
  return PLAYER_COLUMNS.map((c) => c.label);
}

export function playerColumnWidths() {
  return PLAYER_COLUMNS.map((c) => ({ wch: c.width }));
}

const EXAMPLE_ROW_VALUES = {
  squad: "Reserva",
  document_type: "DNI",
  dni: 40123456,
  last_name: "Pérez",
  first_name: "Juan",
  birth_date: "15/03/2005",
  birth_place: "Santa Fe",
  nationality: "Argentina",
  residence_zone: "INTERIOR",
  province: "Santa Fe",
  city: "Santa Fe",
  housing_type: "Sin pensión",
  leg: "Diestro",
  position: "Mediocampista Central",
};

export function playerExampleRowArray() {
  return [...PLAYER_DATA_COLUMNS.map((c) => EXAMPLE_ROW_VALUES[c.key] ?? ""), ""];
}

// Para cada columna, busca el índice del encabezado real que le corresponde.
export function detectPlayerColumns(headers) {
  const normalizedHeaders = headers.map((h) => normalizeSpreadsheetText(h));
  const indexByKey = {};
  for (const column of PLAYER_DATA_COLUMNS) {
    let found = -1;
    for (const key of column.detect) {
      const exact = normalizedHeaders.findIndex((header) => header === key);
      if (exact !== -1) { found = exact; break; }
    }
    if (found === -1) {
      for (const key of column.detect) {
        const partial = normalizedHeaders.findIndex((header) => header.includes(key));
        if (partial !== -1) { found = partial; break; }
      }
    }
    indexByKey[column.key] = found;
  }
  return indexByKey;
}

function colLetter(key) {
  return XLSX.utils.encode_col(PLAYER_COLUMNS.findIndex((c) => c.key === key));
}

// "Control automático": revisa que estén los campos obligatorios (los marcados
// con *) y, si además falta el documento, avisa que el jugador se importará
// pero sin acceso al portal en vez de bloquearlo directamente.
export function controlAutoFormula(rowNumber) {
  const requiredRefs = REQUIRED_KEYS.map((key) => `${colLetter(key)}${rowNumber}<>""`).join(",");
  const dniRef = `${colLetter("dni")}${rowNumber}`;
  return `IF(AND(${requiredRefs}),IF(${dniRef}<>"",\"OK - Listo\",\"Alerta - Sin DNI (sin portal)\"),\"Falta - Datos obligatorios\")`;
}

export function writeControlAutoFormulas(sheet, firstRow, lastRow) {
  for (let r = firstRow; r <= lastRow; r += 1) {
    const ref = XLSX.utils.encode_cell({ r: r - 1, c: PLAYER_CONTROL_COLUMN_INDEX });
    sheet[ref] = { t: "str", f: controlAutoFormula(r) };
  }
}

export function extendSheetRange(sheet, lastRow, lastCol) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  if (lastRow - 1 > range.e.r) range.e.r = lastRow - 1;
  if (lastCol > range.e.c) range.e.c = lastCol;
  sheet["!ref"] = XLSX.utils.encode_range(range);
}

// Arma la fila de datos (en el mismo orden que PLAYER_DATA_COLUMNS) para un
// jugador ya existente, usada tanto en la exportación como en la vista previa.
export function playerToRowValues(player, squadName) {
  return {
    squad: squadName || player.division || "",
    document_type: player.document_type || "",
    dni: player.dni || player.document_number || "",
    last_name: player.last_name || "",
    first_name: player.first_name || "",
    birth_date: player.birth_date || "",
    birth_place: player.birth_place || "",
    nationality: player.nationality || "",
    residence_zone: player.residence_zone || player.current_residence || "",
    province: player.province || "",
    city: player.city || "",
    full_address: player.full_address || "",
    housing_type: player.housing_type || "",
    phone_number: player.phone_number || "",
    leg: player.dominant_leg || "",
    position: player.position || "",
    secondary_position: player.secondary_position || "",
    jersey_number: player.jersey_number ?? "",
    contract_status: player.contract_status || "",
    status: player.status || "",
    notes: player.notes || "",
  };
}

export function playerExportRowArray(player, squadName) {
  const values = playerToRowValues(player, squadName);
  return [...PLAYER_DATA_COLUMNS.map((c) => values[c.key] ?? ""), ""];
}
