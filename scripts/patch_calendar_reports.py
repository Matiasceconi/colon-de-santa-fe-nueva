from pathlib import Path
p=Path('src/components/schedule/ScheduleExportModal.jsx');s=p.read_text().replace('import { resolveBrand } from "@/lib/clubBrandResolver";','import { useWorkspace } from "@/lib/WorkspaceContext";\nimport { assertExportAllowed } from "@/lib/exports/exportSecurity";\nimport { buildExportFileName } from "@/lib/exports/pdfExportKit";');s=s.replace('  const [format, setFormat]', '  const { clubBrand: brand, can } = useWorkspace();\n  const [format, setFormat]');s=s.replace('  const brand = useMemo(() => resolveBrand(activeSquad || {}), [activeSquad]);\n','');start=s.index('  const configKey =');end=s.index('  useEffect(() => () =>',start);block=s[start:end];s=s[:start]+s[end:];block=block.replace('squad: activeSquad?.id','squad: activeSquad?.id, brand, events: allEvents');s=s.replace('  async function generate() {',block+'\n  async function generate() {');s=s.replace('    try {\n      if (output', '    try {\n      assertExportAllowed(can, "/schedule");\n      if (!daysToExport.length || daysToExport.some(d=>!d.isValid())) throw new Error("Revisá las fechas seleccionadas.");\n      if (output');s=s.replace('    if (!previewCurrent || generating) return;', '    if (!previewCurrent || generating) return;\n    try { assertExportAllowed(can, "/schedule"); } catch(e) { setError(e.message); return; }');s=s.replace('    link.download = `${baseName}.${output === "pdf" ? "pdf" : "png"}`;', '    link.download = buildExportFileName(baseName, [brand.name, activeSquad?.name], output === "pdf" ? "pdf" : "png");');p.write_text(s)
for filename in ['dailySchedulePdf.js','monthSchedulePdf.js','professionalSchedulePdf.js']:
 p=Path('src/components/schedule')/filename;s=p.read_text();s='import { appendScheduleDetails } from "./schedulePdfDetails";\n'+s
 if filename=='dailySchedulePdf.js':
  s=s.replace('  return doc;','  await appendScheduleDetails(doc, { brand, days:[day], eventsForDate:()=>events });\n  return doc;')
 elif filename=='monthSchedulePdf.js':
  s=s.replace('  return doc;','  await appendScheduleDetails(doc, { brand, days:days.filter(d=>d.isSame(month, "month")), eventsForDate });\n  return doc;')
 else:
  start=s.index('  setFill(doc, "#F6F8F2");',s.index('export async function buildProfessionalWeekSchedulePDF'))
  end=s.index('\n  return doc;',start)
  block=s[start:end]
  block=block.replace('drawHeader(doc, days,','drawHeader(doc, chunk,').replace('drawScheduleGrid(doc, days,','drawScheduleGrid(doc, chunk,')
  s=s[:start]+'  for(let offset=0;offset<days.length;offset+=7) {\n    const chunk=days.slice(offset,offset+7);\n    if(offset)doc.addPage();\n'+block+'\n  }\n  await appendScheduleDetails(doc, {brand,days,eventsForDate});\n'+s[end:]
 p.write_text(s)
print('Calendar institutional brand, permissions, complete event appendix and 7-day pagination applied.')
