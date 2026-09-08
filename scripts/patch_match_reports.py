from pathlib import Path
for file in ['MatchGpsAnalysisStudioV3.jsx','MatchGpsAnalysisStudio.jsx']:
 p=Path('src/components/matches')/file;s=p.read_text()
 s='import { assertExportAllowed } from "@/lib/exports/exportSecurity";\n'+s
 s=s.replace('const {clubBrand,user}=useWorkspace()', 'const {clubBrand,user,can}=useWorkspace()').replace('const {clubBrand}=useWorkspace()', 'const {clubBrand,can}=useWorkspace()')
 s=s.replace('try{await exportMatchGpsPDF(', 'try{assertExportAllowed(can,"/matches");await exportMatchGpsPDF(')
 s=s.replace('    try {\n      await exportMatchGpsPDF(', '    try {\n      assertExportAllowed(can,"/matches");\n      await exportMatchGpsPDF(')
 s=s.replace('rows:visible,pairs,metric', 'rows:visible,sourceRows:scope,pairs,metric')
 s=s.replace('charts:charts.filter(c=>c.include).map(c=>({...c,element:refs.current[c.id]}))', 'charts:charts.filter(c=>c.include)')
 p.write_text(s)
p=Path('src/lib/exports/vectorChart.js');s=p.read_text().replace('showAverage = true })','showAverage = true, referenceLabel = "Color: sesión · Gris: referencia", showLabels = true })')
s=s.replace('if(type==="line") { if(prev) doc.line(prev.x,prev.y,x,y); doc.circle(x,y,.9,"F"); }','''if(type==="line" || type==="area") {
          if(type==="area" && prev) {
            const rgb=hexToRgb(color || pdf.brand.colors.accent).map(v=>Math.round(v*.3+255*.7));
            doc.setFillColor(...rgb);
            doc.lines([[x-prev.x,y-prev.y],[0,py(0)-y],[prev.x-x,0],[0,prev.y-py(0)]],prev.x,prev.y,[1,1],"F",true);
            doc.setFillColor(...hexToRgb(color || pdf.brand.colors.accent));
          }
          if(prev) doc.line(prev.x,prev.y,x,y); doc.circle(x,y,.9,"F");
        }''')
s=s.replace('doc.setTextColor(15,23,42); doc.text(formatExportNumber(p.value,{decimals}),x,y-2,{align:"center"});','doc.setTextColor(15,23,42); if(showLabels) doc.text(formatExportNumber(p.value,{decimals}),x,y-2,{align:"center"});')
s=s.replace('      prev=y===null?null:{x,y};','      if(y===null) { doc.setTextColor(71,85,105); doc.text("—",x,bottom-2,{align:"center"}); }\n      prev=y===null?null:{x,y};')
s=s.replace('hasReference ? "Color: sesión · Gris: referencia"','hasReference ? referenceLabel')
p.write_text(s)
print('Match chart export now uses selected records instead of DOM capture.')
