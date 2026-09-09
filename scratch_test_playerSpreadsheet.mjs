import { PLAYER_COLUMNS, PLAYER_DATA_COLUMNS, playerColumnLabels, playerExampleRowArray, detectPlayerColumns, controlAutoFormula, writeControlAutoFormulas, extendSheetRange, playerExportRowArray, normalizeSpreadsheetText } from "./src/lib/playerSpreadsheet.js";
import * as XLSX from "xlsx";

console.log("normalizeSpreadsheetText test:", JSON.stringify(normalizeSpreadsheetText("Fecha de Nacimiento *")));
console.log("Total columns:", PLAYER_COLUMNS.length, "data columns:", PLAYER_DATA_COLUMNS.length);

const headers = playerColumnLabels();
console.log("Labels:", headers);

const idx = detectPlayerColumns(headers);
console.log("\nDetected indices:", idx);

const values = Object.values(idx);
const nonNeg = values.filter((v) => v !== -1);
const dupes = nonNeg.filter((v, i) => nonNeg.indexOf(v) !== i);
console.log("\nDuplicate indices (should be empty array):", dupes);
console.log("Unmatched columns (should be empty array):", PLAYER_DATA_COLUMNS.filter(c => idx[c.key] === -1).map(c => c.key));

console.log("\ndni index:", idx.dni, "-> header:", JSON.stringify(headers[idx.dni]));
console.log("document_type index:", idx.document_type, "-> header:", JSON.stringify(headers[idx.document_type]));
console.log("BUG CHECK (dni must NOT equal document_type index):", idx.dni !== idx.document_type);

console.log("\nControl formula row 7:", controlAutoFormula(7));

const aoa = [headers, playerExampleRowArray()];
const sheet = XLSX.utils.aoa_to_sheet(aoa);
writeControlAutoFormulas(sheet, 2, 5);
extendSheetRange(sheet, 5, PLAYER_COLUMNS.length - 1);
console.log("\nSheet !ref after extend:", sheet["!ref"]);
console.log("Control cell at row2:", sheet[XLSX.utils.encode_cell({r:1,c:PLAYER_COLUMNS.length-1})]);

const fakePlayer = { division: "Reserva", document_type: "DNI", dni: "40123456", last_name: "Pérez", first_name: "Juan", birth_date: "2005-03-15", nationality: "Argentina", residence_zone: "INTERIOR", dominant_leg: "Derecha", position: "Mediocampista Central", status: "Lesionado", jersey_number: 8 };
const exportRow = playerExportRowArray(fakePlayer, "Reserva");
console.log("\nExport row array:", exportRow);
console.log("Export row length matches header length:", exportRow.length === headers.length);
