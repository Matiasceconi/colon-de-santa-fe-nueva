import * as XLSX from "xlsx";
import {
  PLAYER_COLUMNS,
  PLAYER_DATA_COLUMNS,
  playerColumnLabels,
  playerColumnWidths,
  playerExampleRowArray,
  detectPlayerColumns,
  normalizeSpreadsheetText,
  writeControlAutoFormulas,
  extendSheetRange,
  playerExportRowArray,
} from "./src/lib/playerSpreadsheet.js";

// --- 1. Build the template exactly like downloadTemplate() does ---
function buildHeaderRows(clubName) {
  return [
    [`${clubName.toUpperCase()} · IMPORTACIÓN DE JUGADORES`],
    ["Plantilla oficial"],
    ["Nota"],
    ["Formato"],
    ["Completá desde la fila 7."],
  ];
}
const labels = playerColumnLabels();
const aoa = [...buildHeaderRows("Colón de Santa Fe"), labels, playerExampleRowArray()];
const sheet = XLSX.utils.aoa_to_sheet(aoa);
sheet["!cols"] = playerColumnWidths();
const lastCol = PLAYER_COLUMNS.length - 1;
writeControlAutoFormulas(sheet, 7, 306);
extendSheetRange(sheet, 306, lastCol);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheet, "Carga de jugadores");
XLSX.writeFile(wb, "/tmp/template_test.xlsx");
console.log("Template written.");

// --- 2. Add a second real data row manually (simulating a user filling the sheet) ---
const wb2 = XLSX.readFile("/tmp/template_test.xlsx");
const sh2 = wb2.Sheets["Carga de jugadores"];
// Row 8 (0-based row 7) = second player, filled by "hand"
const rowValues = ["Primera", "DNI", "38555111", "Gómez", "Lucía", "01/01/2000", "Rosario", "Argentina", "AMBA", "", "", "", "Interna", "", "Zurdo", "Arquero", "", "1", "Con contrato", "Lesionado", "Ojo lesionado", ""];
rowValues.forEach((val, c) => {
  const ref = XLSX.utils.encode_cell({ r: 7, c });
  sh2[ref] = { t: typeof val === "number" ? "n" : "s", v: val };
});
const range = XLSX.utils.decode_range(sh2["!ref"]);
if (7 > range.e.r) { range.e.r = 7; sh2["!ref"] = XLSX.utils.encode_range(range); }
XLSX.writeFile(wb2, "/tmp/template_test.xlsx");

// --- 3. Now simulate PlayerImportDialog's parseRows() against this file ---
const buf = XLSX.readFileSync ? null : null;
const fileBuf = (await import("node:fs")).readFileSync("/tmp/template_test.xlsx");
const workbook = XLSX.read(fileBuf, { type: "buffer", cellDates: true });
const sheetName = workbook.SheetNames.includes("Carga de jugadores") ? "Carga de jugadores" : workbook.SheetNames[0];
const sheet3 = workbook.Sheets[sheetName];
const refRange = XLSX.utils.decode_range(sheet3["!ref"] || "A1");
let maxRow = refRange.e.r;
for (const key of Object.keys(sheet3)) {
  if (key[0] === "!") continue;
  const cellRef = XLSX.utils.decode_cell(key);
  if (cellRef.r > maxRow) maxRow = cellRef.r;
}
if (maxRow > refRange.e.r) { refRange.e.r = maxRow; sheet3["!ref"] = XLSX.utils.encode_range(refRange); }
const aoa3 = XLSX.utils.sheet_to_json(sheet3, { header: 1, raw: true, defval: "" });

let headerIndex = -1;
for (let i = 0; i < Math.min(aoa3.length, 15); i += 1) {
  const cells = aoa3[i].map((c) => normalizeSpreadsheetText(c));
  if (cells.some((c) => c.includes("apellido")) && cells.some((c) => c.includes("posicion") && !c.includes("secundaria"))) {
    headerIndex = i;
    break;
  }
}
console.log("\nheaderIndex found at row (0-based):", headerIndex, "-> should be 5");

const headers3 = aoa3[headerIndex];
const idx = detectPlayerColumns(headers3);
console.log("detected idx:", idx);

const rows = [];
for (let r = headerIndex + 1; r < aoa3.length; r += 1) {
  const cells = aoa3[r];
  if (!cells || cells.every((c) => c === "" || c === null)) continue;
  const get = (colIdx) => (colIdx === undefined || colIdx === -1 ? "" : cells[colIdx] ?? "");
  const firstName = String(get(idx.first_name)).trim();
  const lastName = String(get(idx.last_name)).trim();
  if (!firstName && !lastName) continue;
  rows.push({
    squad: String(get(idx.squad)).trim(),
    document_type: String(get(idx.document_type)).trim(),
    dni: get(idx.dni),
    last_name: lastName,
    first_name: firstName,
    birth_date: get(idx.birth_date),
    status: String(get(idx.status)).trim(),
    contract_status: String(get(idx.contract_status)).trim(),
    jersey_number: get(idx.jersey_number) === "" ? undefined : get(idx.jersey_number),
    notes: String(get(idx.notes)).trim(),
  });
}
console.log("\nParsed rows:", JSON.stringify(rows, null, 2));

const example = rows[0];
const manual = rows[1];
console.log("\n=== CHECKS ===");
console.log("Row1 (example) DNI is number 40123456, not 'DNI' text:", example.dni === 40123456);
console.log("Row2 (manual) DNI parsed correctly as '38555111', not 'DNI' text:", manual.dni === "38555111");
console.log("Row2 status parsed as 'Lesionado':", manual.status === "Lesionado");
console.log("Row2 contract_status parsed as 'Con contrato':", manual.contract_status === "Con contrato");
console.log("Row2 jersey_number parsed as '1':", manual.jersey_number === "1" || manual.jersey_number === 1);
console.log("Row2 notes parsed as 'Ojo lesionado':", manual.notes === "Ojo lesionado");
