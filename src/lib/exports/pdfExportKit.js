import { jsPDF } from "jspdf";
import { contrastText } from "@/lib/clubBrandResolver";
import pdfFontRegularUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import pdfFontBoldUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?url";

export const EXPORT_EMPTY = "—";
const imageCache = new Map();
const fontCache = new Map();

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function normalizeHex(value, fallback = "#1E293B") {
  const raw = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) return `#${raw.slice(1).split("").map((c) => c + c).join("")}`.toUpperCase();
  return fallback;
}

export function hexToRgb(value, fallback = "#1E293B") {
  const hex = normalizeHex(value, fallback).slice(1);
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function safeExportText(value, fallback = EXPORT_EMPTY) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  return String(value);
}

export function formatExportNumber(value, { decimals = 0, suffix = "", fallback = EXPORT_EMPTY } = {}) {
  if (value == null || (typeof value === "string" && !value.trim())) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return `${number.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

export function sanitizeExportFilePart(value, fallback = "informe") {
  const clean = String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return clean || fallback;
}

export function buildExportFileName(prefix, parts = [], extension = "pdf") {
  const values = [prefix, ...parts].map((part, index) => sanitizeExportFilePart(part, index === 0 ? "Informe" : "")).filter(Boolean);
  return `${values.join("_")}.${String(extension || "pdf").replace(/^\./, "")}`;
}

export function resolvePdfBrand(brand = {}) {
  brand = brand || {};
  const colors = brand.colors || {};
  const primary = normalizeHex(colors.primary || colors.green || brand.primaryColor || "#1E293B");
  const secondary = normalizeHex(colors.secondary || brand.secondaryColor || "#475569", "#475569");
  const accent = normalizeHex(colors.accent || colors.yellow || colors.gold || brand.accentColor || "#0EA5E9", "#0EA5E9");
  return {
    name: brand.name || brand.official_name || brand.shortName || "Club",
    shortName: brand.shortName || brand.short_name || "CLUB",
    logoUrl: brand.logoUrl || brand.shield_url || "",
    season: brand.season || "",
    squadName: brand.squadName || "",
    footerText: brand.footerText || "",
    showPerformancePitchBrand: brand.showPerformancePitchBrand !== false,
    colors: { primary, secondary, accent, ink: "#0F172A", muted: "#64748B", line: "#E2E8F0", panel: "#F8FAFC", white: "#FFFFFF" },
  };
}

async function urlToBase64(url) {
  if (!url) return "";
  if (String(url).startsWith("data:")) return String(url);
  if (!imageCache.has(url)) {
    imageCache.set(url, (async () => {
      try {
        const response = await fetch(url, { mode: "cors", credentials: "omit", signal: AbortSignal.timeout(10000) });
        if (!response.ok) return "";
        const blob = await response.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        });
      } catch { return ""; }
    })());
  }
  return imageCache.get(url);
}

export async function loadExportImage(url) { return urlToBase64(url); }

function imageFormat(dataUrl) {
  const value = String(dataUrl || "").toLowerCase();
  if (value.includes("image/jpeg") || value.includes("image/jpg")) return "JPEG";
  if (value.includes("image/webp")) return "WEBP";
  return "PNG";
}

export function addImageSafe(doc, dataUrl, x, y, width, height, alias = undefined) {
  if (!dataUrl) return false;
  try {
    const info = doc.getImageProperties(dataUrl);
    const scale = Math.min(width / info.width, height / info.height);
    const w = info.width * scale, h = info.height * scale;
    doc.addImage(dataUrl, imageFormat(dataUrl), x + (width - w) / 2, y + (height - h) / 2, w, h, alias, "FAST");
    return true;
  } catch { return false; }
}

async function loadFontBase64(url) {
  if (!url) return "";
  if (!fontCache.has(url)) {
    fontCache.set(url, (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return "";
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        return btoa(binary);
      } catch { return ""; }
    })());
  }
  return fontCache.get(url);
}

export async function registerPdfFonts(doc) {
  try {
    const [regular, bold] = await Promise.all([loadFontBase64(pdfFontRegularUrl), loadFontBase64(pdfFontBoldUrl)]);
    if (!regular || !bold) return false;
    doc.addFileToVFS("PP-Regular.ttf", regular);
    doc.addFileToVFS("PP-Bold.ttf", bold);
    doc.addFont("PP-Regular.ttf", "PP", "normal");
    doc.addFont("PP-Bold.ttf", "PP", "bold");
    doc.setFont("PP", "normal");
    return true;
  } catch { return false; }
}

function setFont(doc, bold = false) {
  const fonts = doc.getFontList?.() || {};
  const family = fonts.PP ? "PP" : "helvetica";
  doc.setFont(family, bold ? "bold" : "normal");
}

function fitText(doc, value, width, maxLines = 2) {
  const lines = doc.splitTextToSize(safeExportText(value), width);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1];
  while (last.length > 1 && doc.getTextWidth(`${last}…`) > width) last = last.slice(0, -1);
  clipped[maxLines - 1] = `${last}…`;
  return clipped;
}

export async function createBrandedPdf({
  orientation = "portrait",
  format = "a4",
  brand: rawBrand = {},
  title = "Informe",
  subtitle = "",
  meta = [],
  footerLabel = "PerformancePitch",
  margin = 12,
  compress = true,
} = {}) {
  const brand = resolvePdfBrand(rawBrand);
  const doc = new jsPDF({ orientation, unit: "mm", format, compress });
  await registerPdfFonts(doc);
  const logo = await loadExportImage(brand.logoUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const headerH = orientation === "landscape" ? 31 : 34;
  const footerH = 10;
  const bodyTop = headerH + 5;
  const bodyBottom = pageH - footerH - 4;
  let y = bodyTop;

  function drawFallbackShield(x, yy, size) {
    const [r, g, b] = hexToRgb(brand.colors.primary);
    doc.setFillColor(r, g, b);
    doc.roundedRect(x, yy, size, size, 2, 2, "F");
    setFont(doc, true);
    doc.setFontSize(Math.max(7, size * 0.42));
    doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));
    doc.text(String(brand.shortName || brand.name || "CL").slice(0, 3).toUpperCase(), x + size / 2, yy + size * 0.62, { align: "center" });
  }

  function drawHeader() {
    const [pr, pg, pb] = hexToRgb(brand.colors.primary);
    const [ar, ag, ab] = hexToRgb(brand.colors.accent);
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, 0, pageW, headerH, "F");
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, headerH - 2.2, pageW, 2.2, "F");

    const shieldSize = orientation === "landscape" ? 17 : 19;
    const shieldY = 5;
    if (!addImageSafe(doc, logo, margin, shieldY, shieldSize, shieldSize, "club-logo")) drawFallbackShield(margin, shieldY, shieldSize);

    const textX = margin + shieldSize + 5;
    setFont(doc, true);
    doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));
    doc.setFontSize(orientation === "landscape" ? 14 : 15);
    doc.text(fitText(doc, title, pageW - textX - margin, 1), textX, 11);
    setFont(doc, false);
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));
    const sub = [brand.name, subtitle].filter(Boolean).join(" · ");
    doc.text(fitText(doc, sub, pageW - textX - margin, 1), textX, 16.3);

    if (meta?.length) {
      doc.setFontSize(7);
      const metaText = meta.filter(Boolean).map((item) => typeof item === "string" ? item : `${item.label}: ${safeExportText(item.value)}`).join("  |  ");
      doc.text(fitText(doc, metaText, pageW - textX - margin, 1), textX, 21.2);
    }
    y = bodyTop;
  }

  function addPage() {
    doc.addPage(format, orientation);
    drawHeader();
    return y;
  }

  function ensureSpace(height = 10) {
    if (y + height > bodyBottom) addPage();
    return y;
  }

  function sectionTitle(value, options = {}) {
    const height = options.height || 9;
    ensureSpace(height + 2);
    const [r, g, b] = hexToRgb(options.color || brand.colors.primary);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 1, pageW - margin * 2, height, 1.7, 1.7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y - 1, pageW - margin * 2, height, 1.7, 1.7, "S");
    doc.setFillColor(r, g, b);
    doc.rect(margin, y - 1, 1.8, height, "F");
    setFont(doc, true);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(fitText(doc, value, pageW - margin * 2 - 8, 1), margin + 5, y + height * 0.55);
    y += height + 3;
    return y;
  }

  function paragraph(value, { fontSize = 8.5, color = "#334155", indent = 0, gap = 3, bold = false, maxWidth } = {}) {
    const width = maxWidth || pageW - margin * 2 - indent;
    setFont(doc, bold);
    doc.setFontSize(fontSize);
    const [r, g, b] = hexToRgb(color, "#334155");
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(safeExportText(value), width);
    const lineH = fontSize * 0.42;
    for (const line of lines) {
      ensureSpace(lineH + 1);
      setFont(doc, bold);
      doc.setFontSize(fontSize);
      doc.setTextColor(r, g, b);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += gap;
    return y;
  }

  function keyValueGrid(items = [], columns = 4, options = {}) {
    if (!items.length) return y;
    columns = Math.max(1, Math.min(8, Math.floor(Number(columns) || 4)));
    const gap = 3;
    const availableW = pageW - margin * 2;
    const cellW = (availableW - gap * (columns - 1)) / columns;
    const rows = [];
    for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
    for (const row of rows) {
      setFont(doc, true);
      doc.setFontSize(options.valueFontSize || 9.5);
      const values = row.map((item) => safeExportText(item?.value));
      const heights = values.map((value) => Math.max(16, 10 + doc.splitTextToSize(value, cellW - 6).length * 4.2));
      const h = Math.max(...heights);
      ensureSpace(h + 3);
      row.forEach((item, index) => {
        const x = margin + index * (cellW + gap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cellW, h, 2, 2, "FD");
        setFont(doc, true);
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(String(item?.label || "").toUpperCase(), x + 3, y + 5);
        setFont(doc, true);
        doc.setFontSize(options.valueFontSize || 9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(safeExportText(item?.value), cellW - 6), x + 3, y + 11);
      });
      y += h + 3;
    }
    return y;
  }

  function table({ columns = [], rows = [], widths = [], fontSize = 7.2, headerFontSize = 6.8, rowPadding = 2, repeatHeader = true, emptyLabel = "Sin datos para exportar", rowFill } = {}) {
    if (!columns.length) return y;
    const availableW = pageW - margin * 2;
    const rawWidths = widths.length === columns.length ? widths : columns.map((column) => column.width || 1);
    const sum = rawWidths.reduce((acc, width) => acc + Number(width || 0), 0) || columns.length;
    const colWidths = rawWidths.map((width) => availableW * Number(width || 1) / sum);
    const headerH = 8;

    function drawHeaderRow() {
      ensureSpace(headerH + 2);
      let x = margin;
      const [pr, pg, pb] = hexToRgb(brand.colors.primary);
      doc.setFillColor(pr, pg, pb);
      doc.rect(margin, y, availableW, headerH, "F");
      setFont(doc, true);
      doc.setFontSize(headerFontSize);
      doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));
      columns.forEach((column, index) => {
        const align = column.align || "left";
        const tx = align === "right" ? x + colWidths[index] - 2 : align === "center" ? x + colWidths[index] / 2 : x + 2;
        doc.text(fitText(doc, column.label || column.key || "", colWidths[index] - 4, 1), tx, y + 5.2, { align });
        x += colWidths[index];
      });
      y += headerH;
    }

    drawHeaderRow();
    if (!rows.length) {
      ensureSpace(13);
      setFont(doc, false);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, availableW, 12, "F");
      doc.text(emptyLabel, margin + 3, y + 7.5);
      y += 15;
      return y;
    }

    rows.forEach((row, rowIndex) => {
      const cellLines = columns.map((column, index) => {
        const value = typeof column.value === "function" ? column.value(row, rowIndex) : row?.[column.key];
        setFont(doc, column.bold === true);
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(safeExportText(value), colWidths[index] - 4);
      });
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const lineH = fontSize * 0.42;
      const paddingH = rowPadding * 2 + 1;
      let offset = 0;
      while (offset < maxLines) {
        const remainingH = (maxLines - offset) * lineH + paddingH;
        const fullPageH = bodyBottom - bodyTop - (repeatHeader ? headerH : 0);
        if (y + Math.min(remainingH, fullPageH) > bodyBottom) {
          addPage();
          if (repeatHeader) drawHeaderRow();
        }
        const capacity = Math.max(1, Math.floor((bodyBottom - y - paddingH) / lineH));
        const count = Math.min(maxLines - offset, capacity);
        const rowH = Math.max(7.5, count * lineH + paddingH);
        const fill = typeof rowFill === "function" ? rowFill(row, rowIndex) : rowIndex % 2 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(...fill);
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, availableW, rowH, "FD");
        let x = margin;
        columns.forEach((column, index) => {
          const align = column.align || "left";
          const tx = align === "right" ? x + colWidths[index] - 2 : align === "center" ? x + colWidths[index] / 2 : x + 2;
          setFont(doc, column.bold === true);
          doc.setFontSize(fontSize);
          doc.setTextColor(30, 41, 59);
          doc.text(offset > 0 && cellLines[index].length <= count ? cellLines[index] : cellLines[index].slice(offset, offset + count), tx, y + rowPadding + fontSize * 0.35 + 1.2, { align });
          x += colWidths[index];
        });
        y += rowH;
        offset += count;
      }
    });
    y += 3;
    return y;
  }

  function image(dataUrl, { width, height, x, caption, background = false } = {}) {
    if (!dataUrl || !width || !height) return false;
    const ratio = Math.min(1, (pageW - margin * 2) / width, (bodyBottom - bodyTop - (caption ? 9 : 3)) / height);
    width *= ratio; height *= ratio;
    ensureSpace(height + (caption ? 9 : 3));
    const xx = x ?? margin + (pageW - margin * 2 - width) / 2;
    if (background) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(xx - 2, y - 2, width + 4, height + 4, 2, 2, "F");
    }
    const ok = addImageSafe(doc, dataUrl, xx, y, width, height);
    y += height + 2;
    if (caption) paragraph(caption, { fontSize: 7, color: "#64748B", gap: 2 });
    return ok;
  }

  function getY() { return y; }
  function setY(value) { y = clamp(Number(value) || bodyTop, bodyTop, bodyBottom); }
  function pageBreak() { addPage(); }

  function finalize() {
    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      doc.setPage(page);
      const [r, g, b] = hexToRgb(brand.colors.primary);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 9.5, pageW - margin, pageH - 9.5);
      setFont(doc, false);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(fitText(doc, brand.footerText || [brand.name, brand.showPerformancePitchBrand ? footerLabel : ""].filter(Boolean).join(" · "), pageW - margin * 2 - 40, 1), margin, pageH - 5.2);
      doc.setTextColor(71, 85, 105);
      doc.text(`Página ${page} de ${total}`, pageW - margin, pageH - 5.2, { align: "right" });
    }
    return doc;
  }

  drawHeader();
  return { doc, brand, logo, pageW, pageH, margin, bodyTop, bodyBottom, getY, setY, ensureSpace, addPage, pageBreak, sectionTitle, paragraph, keyValueGrid, table, image, finalize };
}

export async function drawPlayerHeader(pdf, { player, subtitle = "" } = {}) {
  const photoUrl = player?.photo_url || player?.avatar_url || "";
  const photo = await loadExportImage(photoUrl);
  pdf.ensureSpace(27);
  const y = pdf.getY();
  const x = pdf.margin;
  const size = 20;
  const initials = safeExportText(player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador", "J").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  if (!addImageSafe(pdf.doc, photo, x, y, size, size)) {
    const [r, g, b] = hexToRgb(pdf.brand.colors.secondary);
    pdf.doc.setFillColor(r, g, b);
    pdf.doc.circle(x + size / 2, y + size / 2, size / 2, "F");
    setFont(pdf.doc, true);
    pdf.doc.setTextColor(...hexToRgb(contrastText(pdf.brand.colors.secondary)));
    pdf.doc.setFontSize(8);
    pdf.doc.text(initials || "J", x + size / 2, y + 12, { align: "center" });
  }
  setFont(pdf.doc, true);
  pdf.doc.setFontSize(12);
  pdf.doc.setTextColor(15, 23, 42);
  pdf.doc.text(fitText(pdf.doc, player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador", pdf.pageW - x - size - pdf.margin - 6, 1), x + size + 5, y + 7);
  setFont(pdf.doc, false);
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(100, 116, 139);
  const detail = [player?.position, player?.squad_name, subtitle].filter(Boolean).join(" · ");
  pdf.doc.text(fitText(pdf.doc, detail || "Perfil individual", pdf.pageW - x - size - pdf.margin - 6, 2), x + size + 5, y + 13);
  pdf.setY(y + 25);
}

export function drawMatchHeader(pdf, { match = {}, system = "" } = {}) {
  return pdf.keyValueGrid([
    { label: "Rival", value: match.rival || match.opponent },
    { label: "Fecha", value: match.date },
    { label: "Hora", value: match.match_time },
    { label: "Condición", value: match.location || match.home_away || match.condition },
    { label: "Competencia", value: match.competition },
    { label: "Jornada", value: match.competition_round || match.phase_label || match.matchday_number },
    { label: "Sede", value: match.match_venue },
    { label: "Sistema", value: system || match.tactical_system },
  ], 4);
}

export function drawSessionHeader(pdf, { session = {} } = {}) {
  return pdf.keyValueGrid([
    { label: "Fecha", value: session.date },
    { label: "Plantel", value: session.squad_name },
    { label: "MD", value: session.match_day_code },
    { label: "Objetivo", value: session.session_objective || session.physical_objective },
    { label: "Tipo", value: session.session_type },
    { label: "Duración", value: session.duration_minutes != null ? `${session.duration_minutes} min` : "" },
    { label: "Hora", value: session.start_time },
    { label: "Lugar", value: session.location },
  ], 4);
}

export function savePdfDocument(doc, filename) {
  doc.save(filename);
  return filename;
}
