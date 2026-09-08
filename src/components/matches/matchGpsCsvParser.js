// Local preview uses the same parsing rules as resolveMatchGpsCSV. No network request is needed to read a file.
const SUM_FIELDS = ["total_duration","total_distance","distance_hsr","distance_14_19","sprint_distance","sprint_efforts","accelerations","decelerations","player_load","rhie"];
const MAX_FIELDS = ["max_velocity","max_velocity_percentage"];
function normalizeName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ");
}
function matchColumn(raw) {
  const h=normalizeName(raw).replace(/^\uFEFF/,"");
  const c=h.replace(/\s+/g,"").replace(/,/g,".");
  if (["name","jugador","player","nombre","athlete"].includes(h)) return "player_name";
  if (["period","periodo","period name","period name (short)","period name (long)","period name/label","period name label","period name:","period name ","period name","periodo nombre","tiempo","period name (full)"].includes(h)) return "period_label";
  if (["total duration","tot dur","duration"].includes(h)) return "total_duration";
  if (h.includes("total distance") || ["tot dist","tot dist (m)"].includes(h)) return "total_distance";
  if (/^d/.test(c) && /14(?:\.0)?-19(?:\.8)?/.test(c)) return "distance_14_19";
  if (/^d/.test(c) && /19(?:\.8)?-25(?:\.0)?/.test(c)) return "distance_hsr";
  if (/^d\+/.test(c) && c.includes("25")) return "sprint_distance";
  if (["sprint efforts","sprint effs"].includes(h)) return "sprint_efforts";
  if (/^acc/.test(c) && /eff/.test(c) && !/dist/.test(c) && /\+3/.test(c)) return "accelerations";
  if (/^dec/.test(c) && /eff/.test(c) && !/dist/.test(c) && /\+3/.test(c)) return "decelerations";
  if (["total player load","tot pl","player load"].includes(h)) return "player_load";
  if (h.includes("maximum velocity") || ["max vel (km/h)","max velocity (km/h)"].includes(h)) return "max_velocity";
  if (h.includes("max vel") && h.includes("%")) return "max_velocity_percentage";
  if (["metros x min","m/min","meters per minute"].includes(h)) return "meters_per_minute";
  if (h==="rhie total bouts") return "rhie";
  return null;
}
function parseNum(value) {
  if (value==null || String(value).trim()==="" || value==="-") return null;
  let s=String(value).trim();
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(s) || /^\d+,\d+$/.test(s)) s=s.replace(/\./g,"").replace(",",".");
  const n=Number(s);
  return Number.isFinite(n) && n>=0 ? n : null;
}
function parseDuration(value) {
  const s=String(value||"").trim();
  if (!s.includes(":")) return parseNum(s);
  const p=s.split(":").map(Number);
  if (![2,3].includes(p.length) || p.some(n=>!Number.isFinite(n)||n<0) || p.at(-1)>=60 || (p.length===3 && p[1]>=60)) return null;
  return p.length===3 ? p[0]*60+p[1]+p[2]/60 : p[0]+p[1]/60;
}
function splitCSVLine(line,sep) {
  const result=[]; let cur="",quotes=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"' && quotes && line[i+1]==='"'){cur+='"';i++;}
    else if(ch==='"') quotes=!quotes;
    else if(ch===sep && !quotes){result.push(cur.trim());cur="";}
    else cur+=ch;
  }
  result.push(cur.trim()); return result;
}
function periodCode(label) {
  const p=normalizeName(label).replace(/[º°ª.]/g,"").replace(/\s+/g,"");
  if (["primertiempo","primertiempo1","1ertiempo","1tiempo","1t","pt","firsthalf","1sthalf","half1","h1","primerperiodo","1erperiodo","1periodo","1per","periodo1","p1"].includes(p)) return "first_half";
  if (["segundotiempo","2dotiempo","2tiempo","2t","st","secondhalf","2ndhalf","half2","h2","segundoperiodo","2doperiodo","2periodo","2per","periodo2","p2"].includes(p)) return "second_half";
  if (["","total","partidocompleto","fullmatch","match","partido","entiresession","totalsession","sesioncompleta","partidocomp"].includes(p)) return "total";
  if (/^1/.test(p)&&p.length<=4) return "first_half";
  if (/^2/.test(p)&&p.length<=4) return "second_half";
  return null;
}
export function parseCatapultCSV(text) {
  const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(l=>l.trim());
  let header=-1,fields=[],sep=",";
  for(let i=0;i<Math.min(lines.length,20);i++){
    for(const delimiter of [",",";","\t"]){
      const mapped=splitCSVLine(lines[i],delimiter).map(matchColumn);
      if(mapped.includes("player_name") && mapped.filter(Boolean).length>=2){header=i;fields=mapped;sep=delimiter;break;}
    }
    if(header>=0)break;
  }
  if(header<0) return {error:"No se encontró una cabecera con jugador y métricas GPS."};
  const mapped=fields.filter(Boolean);
  if(new Set(mapped).size!==mapped.length) return {error:"Hay columnas duplicadas para una misma métrica. Revisá los encabezados."};
  const groups=new Map(), warnings=[]; let rawCount=0;
  for(let i=header+1;i<lines.length;i++){
    const cols=splitCSVLine(lines[i],sep), row=Object.fromEntries([...SUM_FIELDS,...MAX_FIELDS,"meters_per_minute"].map(f=>[f,null]));
    fields.forEach((f,j)=>{if(f)row[f]=["player_name","period_label"].includes(f)?cols[j]||"":f==="total_duration"?parseDuration(cols[j]):parseNum(cols[j]);});
    let name=String(row.player_name||"").trim();
    if(!name || ["total","promedio","average","team","totals"].includes(normalizeName(name)))continue;
    let label=row.period_label;
    const suffix=name.match(/^(.*?)\s+[-–—]\s+(.+)$/);
    if(suffix){name=suffix[1].trim();label=label||suffix[2];}
    const period=periodCode(label);
    if(!period){warnings.push("Fila "+(i+1)+": período excluido («"+label+"»).");continue;}
    const key=normalizeName(name);
    if(!groups.has(key))groups.set(key,{name,rows:new Map()});
    if(groups.get(key).rows.has(period))return {error:"Más de una fila de "+name+" para "+(label||"Total")+". No se sumaron períodos potencialmente superpuestos."};
    row.player_name=name;row.period=period;delete row.period_label;
    // Duration is GPS exposure, not official minutes or ball-in-play time.
    if(row.total_duration>0 && row.total_distance!=null)row.meters_per_minute=row.total_distance/row.total_duration;
    groups.get(key).rows.set(period,row);rawCount++;
  }
  const rows=[];
  for(const {name,rows:periods} of groups.values()){
    const halves=["first_half","second_half"].map(p=>periods.get(p)).filter(Boolean);
    const explicit=periods.get("total");
    let total;
    if(explicit) total={...explicit,total_source:"csv_total"};
    else{
      total={player_name:name,period:"total",total_source:halves.length===2?"sum_halves":"observed_half"};
      for(const f of SUM_FIELDS) total[f]=halves.every(r=>r[f]!=null)?halves.reduce((sum,r)=>sum+r[f],0):null;
      for(const f of MAX_FIELDS){const v=halves.map(r=>r[f]).filter(n=>n!=null);total[f]=v.length?Math.max(...v):null;}
      total.meters_per_minute=total.total_duration>0 && total.total_distance!=null?total.total_distance/total.total_duration:null;
    }
    if(explicit && halves.length){
      warnings.push(name+": se conserva el Total del CSV; los tiempos no se suman otra vez.");
      if(halves.length===2 && explicit.total_distance!=null && halves.every(r=>r.total_distance!=null)){
        const diff=explicit.total_distance-halves.reduce((s,r)=>s+r.total_distance,0);
        if(Math.abs(diff)>1)warnings.push(name+": diferencia Total vs suma de tiempos: "+diff.toFixed(1)+" m.");
      }
    }
    total.periods=halves;
    rows.push(total);
  }
  if(!rows.length)return {error:"No se encontraron registros de Total, Primer tiempo o Segundo tiempo."};
  return {rows,warnings,raw_count:rawCount};
}