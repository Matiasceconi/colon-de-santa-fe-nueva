import { buildExportFileName, safeExportText } from "@/lib/exports/pdfExportKit";

export function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = String.fromCharCode(39) + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(headers = [], rows = []) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function downloadCsv({ headers, rows, filenameParts = ["Exportacion"], filename }) {
  const csv = "\uFEFF" + buildCsv(headers, rows);
  const name = filename || buildExportFileName(filenameParts[0] || "Exportacion", filenameParts.slice(1), "csv");
  return downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), name);
}

export function exportValue(value) {
  return safeExportText(value, "");
}
