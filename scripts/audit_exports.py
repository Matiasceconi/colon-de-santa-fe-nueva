import json,re
from pathlib import Path
root=Path.cwd();files={str(p):p.read_text() for p in Path('src').rglob('*') if p.suffix in ['.js','.jsx','.ts','.tsx']}
def resolve(base,target):
 p=Path('src')/target[2:] if target.startswith('@/') else Path(base).parent/target
 p=Path(__import__('os').path.normpath(str(p)))
 return next((str(q) for q in [p,Path(str(p)+'.js'),Path(str(p)+'.jsx'),p/'index.js',p/'index.jsx'] if str(q) in files),None)
edges={p:[] for p in files}
for p,s in files.items():
 for target in re.findall(r'(?:from\s*|import\s*\(\s*|import\s*)["\x27]([^"\x27]+)',s):
  if target.startswith(('.', '@/')):
   r=resolve(p,target)
   if r:edges[p].append(r)
reachable=set();queue=['src/main.jsx']
while queue:
 p=queue.pop()
 if p in reachable:continue
 reachable.add(p);queue.extend(edges.get(p,[]))
patterns={'PDF jsPDF':r'new jsPDF|createBrandedPdf','PDF React':r'@react-pdf/renderer','Captura HTML':r'html2canvas','Canvas/imagen':r'toDataURL|toBlob','Impresión navegador':r'window\.print','Excel':r'XLSX\.writeFile','CSV':r'downloadCsv|buildCsv'}
rows=[]
for p,s in files.items():
 kinds=[k for k,v in patterns.items() if re.search(v,s)]
 if kinds and (re.search(r'export|[Pp][Dd][Ff]|[Dd]ownload|[Ii]mprim',s)):
  rows.append({'file':p,'reachable_from_main':p in reachable,'engines':kinds,'permission_reference':bool(re.search(r'can\(["\x27]export|assertExportAllowed|manageReports',s)),'capture_mentions':len(re.findall('html2canvas',s))})
Path('docs/exportables-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps({'total_files':len(rows),'reachable':sum(r['reachable_from_main'] for r in rows),'files':rows},ensure_ascii=False))
