import * as XLSX from "xlsx";
import {
  PLAYER_COLUMNS,
  playerColumnLabels,
  playerColumnWidths,
  playerExampleRowArray,
  detectPlayerColumns,
  normalizeSpreadsheetText,
  writeControlAutoFormulas,
  extendSheetRange,
} from "./src/lib/playerSpreadsheet.js";

// --- 1. Build the template exactly like downloadTemplate() does (in-memory, no file I/O) ---
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

// --- 2. Add a second real data row manually (simulating a user filling the sheet) ---
const rowValues = ["Primera", "DNI", "38555111", "Gómez", "Lucía", "01/01/2000", "Rosario", "Argentina", "AMBA", "", "", "", "Interna", "", "Zurdo", "Arquero", "", "1", "Con contrato", "Lesionado", "Ojo lesionado", ""];
rowValues.forEach((val, c) => {
  const ref = XLSX.utils.encode_cell({ r: 7, c }); // fila 8 (0-based 7)
  sheet[ref] = { t: typeof val === "number" ? "n" : "s", v: val };
});
extendSheetRange(sheet, 8, lastCol);

// --- 3. Simulate PlayerImportDialog's parseRows() against this sheet ---
const aoa3 = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

let headerIndex = -1;
for (let i = 0; i < Math.min(aoa3.length, 15); i += 1) {
  const cells = aoa3[i].map((c) => normalizeSpreadsheetText(c));
  if (cells.some((c) => c.includes("apellido")) && cells.some((c) => c.includes("posicion") && !c.includes("secundaria"))) {
    headerIndex = i;
    break;
  }
}
console.log("headerIndex found at row (0-based):", headerIndex, "-> should be 5");

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
