from pathlib import Path
for filename in ['nutritionPdf.js','matchReportPdf.js']:
 p=Path('src/lib/reports')/filename
 s=p.read_text().replace('let activeBrand = DEFAULT_BRAND;', 'const documentBrands = new WeakMap();\nfunction getDocumentBrand(doc) { return documentBrands.get(doc) || DEFAULT_BRAND; }')
 s=s.replace('  activeBrand = clubBrand || DEFAULT_BRAND;\n','')
 s=s.replace('  activeBrand = brand;','  documentBrands.set(doc, brand);')
 if filename=='nutritionPdf.js':
  s=s.replace('  const logo = await imageToDataUrl(activeBrand.logoUrl);','  documentBrands.set(doc, { ...DEFAULT_BRAND, ...clubBrand, colors: { ...DEFAULT_BRAND.colors, ...clubBrand?.colors } });\n  const logo = await imageToDataUrl(getDocumentBrand(doc).logoUrl);')
 s=s.replace('activeBrand.', 'getDocumentBrand(doc).')
 p.write_text(s)
p=Path('src/lib/clubBrandResolver.js');s=p.read_text().replace('    squadName,\n    colors:', '    squadName,\n    footerText: institution?.export_footer_text || "",\n    showPerformancePitchBrand: institution?.show_performancepitch_brand !== false,\n    colors:');p.write_text(s)
p=Path('src/components/sessions/gpsReport/sessionGpsReportData.js');s=p.read_text().replace('import { avg } from "@/components/performance/externalGpsLoadUtils";\n','').replace('avg(principal.map((r) => r[m.key]).filter((v) => v != null))','metricAverage(principal, m.key)').replace('avg(weekPrincipal.map((r) => r[m.key]).filter((v) => v != null))','metricAverage(weekPrincipal, m.key)');p.write_text(s)
p=Path('src/lib/exports/vectorChart.js');s=p.read_text().replace('hasReference?.28:.6','hasReference ? .28 : .6');p.write_text(s)
p=Path('src/lib/exports/fileExport.js');s=p.read_text().replace('  const text = value == null ? "" : String(value);','  let text = value == null ? "" : String(value);\n  if (typeof value === "string" && /^[\\s]*[=+@-]/.test(text)) text = String.fromCharCode(39) + text;');p.write_text(s)
p=Path('src/lib/exports/exportSecurity.js');s=p.read_text().replace('  const path = String(pathname || "").split("?")[0];','  const path = String(pathname || "").split(/[?#]/)[0].replace(/\\/$/, "");').replace('  if (path === "/gps")', '  if (/^\\/tactical\\//.test(path)) return "/tactical";\n  if (/^\\/sessions\\//.test(path)) return "/sessions";\n  if (path === "/gps")');p.write_text(s)
print('Isolated brand per document; no module-global mutable identity. Missing GPS averages and CSV cells corrected.')
