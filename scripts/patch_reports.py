from pathlib import Path
p=Path('src/lib/exports/pdfExportKit.js')
s=p.read_text().replace('import { jsPDF } from "jspdf";','import { jsPDF } from "jspdf";\nimport { contrastText } from "@/lib/clubBrandResolver";')
s=s.replace('  const number = Number(value);\n  if (!Number.isFinite(number)) return fallback;', '  if (value == null || (typeof value === "string" && !value.trim())) return fallback;\n  const number = Number(value);\n  if (!Number.isFinite(number)) return fallback;')
s=s.replace('export function resolvePdfBrand(brand = {}) {\n  const colors', 'export function resolvePdfBrand(brand = {}) {\n  brand = brand || {};\n  const colors')
s=s.replace('    squadName: brand.squadName || "",','    squadName: brand.squadName || "",\n    footerText: brand.footerText || "",\n    showPerformancePitchBrand: brand.showPerformancePitchBrand !== false,')
s=s.replace('fetch(url, { mode: "cors", credentials: "omit" })','fetch(url, { mode: "cors", credentials: "omit", signal: AbortSignal.timeout(10000) })')
s=s.replace('    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, width, height, alias, "FAST");','    const info = doc.getImageProperties(dataUrl);\n    const scale = Math.min(width / info.width, height / info.height);\n    const w = info.width * scale, h = info.height * scale;\n    doc.addImage(dataUrl, imageFormat(dataUrl), x + (width - w) / 2, y + (height - h) / 2, w, h, alias, "FAST");')
s=s.replace('doc.setTextColor(255, 255, 255);', 'doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));')
s=s.replace('doc.setTextColor(225, 231, 239);','doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));')
s=s.replace('      ensureSpace(lineH + 1);\n      doc.text(line', '      ensureSpace(lineH + 1);\n      setFont(doc, bold);\n      doc.setFontSize(fontSize);\n      doc.setTextColor(r, g, b);\n      doc.text(line')
s=s.replace('    const gap = 3;\n    const availableW', '    columns = Math.max(1, Math.min(8, Math.floor(Number(columns) || 4)));\n    const gap = 3;\n    const availableW')
s=s.replace('      const values = row.map', '      setFont(doc, true);\n      doc.setFontSize(options.valueFontSize || 9.5);\n      const values = row.map')
start=s.index('      const maxLines = Math.max(1, ...cellLines.map')
end=s.index('\n    });\n    y += 3;',start)
s=s[:start]+'''      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
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
          doc.text(cellLines[index].slice(offset, offset + count), tx, y + rowPadding + fontSize * 0.35 + 1.2, { align });
          x += colWidths[index];
        });
        y += rowH;
        offset += count;
      }''' + s[end:]
s=s.replace('    ensureSpace(height + (caption ? 9 : 3));','    const ratio = Math.min(1, (pageW - margin * 2) / width, (bodyBottom - bodyTop - (caption ? 9 : 3)) / height);\n    width *= ratio; height *= ratio;\n    ensureSpace(height + (caption ? 9 : 3));')
s=s.replace('doc.text(`${brand.name} · ${footerLabel}`, margin, pageH - 5.2);','doc.text(fitText(doc, brand.footerText || [brand.name, brand.showPerformancePitchBrand ? footerLabel : ""].filter(Boolean).join(" · "), pageW - margin * 2 - 40, 1), margin, pageH - 5.2);')
s=s.replace('  const y = pdf.getY();\n  pdf.ensureSpace(27);','  pdf.ensureSpace(27);\n  const y = pdf.getY();')
s=s.replace('    pdf.doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));','    pdf.doc.setTextColor(...hexToRgb(contrastText(pdf.brand.colors.secondary)));')
p.write_text(s)
p=Path('src/lib/clubBrandResolver.js');s=p.read_text();s=s.replace('return luminance(bgHex) > 0.55 ? "#0F172A" : "#FFFFFF";', 'const lum = luminance(bgHex);\n  const darkContrast = (lum + 0.05) / (luminance("#0F172A") + 0.05);\n  const lightContrast = 1.05 / (lum + 0.05);\n  return darkContrast >= lightContrast ? "#0F172A" : "#FFFFFF";');p.write_text(s)
p=Path('src/reports/components/ReportPrimitives.jsx');s=p.read_text().replace('import React from "react";', 'import React from "react";\nimport { contrastText } from "@/lib/clubBrandResolver";');s=s.replace('  const number = Number(value);','  if (value == null || (typeof value === "string" && !value.trim())) return REPORT_EMPTY;\n  const number = Number(value);');s=s.replace('<Text style={styles.eyebrow}>','<Text style={[styles.eyebrow, { color: contrastText(primary) }]}>').replace(' · PerformancePitch Reports</Text>','{brand.showPerformancePitchBrand === false ? "" : " · PerformancePitch Reports"}</Text>').replace('<Text style={styles.title}>','<Text style={[styles.title, { color: contrastText(primary) }]}>').replace('<Text style={styles.subtitle}>','<Text style={[styles.subtitle, { color: contrastText(primary) }]}>').replace('<Text style={styles.metaLine}>','<Text style={[styles.metaLine, { color: contrastText(primary) }]}>');s=s.replace('{ flexGrow: column.width || 1, flexBasis: 0, textAlign: column.align || "left" }', '{ flexGrow: column.width || 1, flexBasis: 0, textAlign: column.align || "left", color: contrastText(primary) }');p.write_text(s)
print('Shared PDF helpers updated')
