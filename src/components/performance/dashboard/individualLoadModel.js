export const LOAD_METRICS = [
 {key:"total_distance",label:"Distancia total",unit:"m",kind:"sum"},
 {key:"player_load",label:"Player Load",unit:"UA",kind:"sum"},
 {key:"distance_19_8",label:"D 19,8–25",unit:"m",kind:"sum"},
 {key:"distance_25",label:"D >25",unit:"m",kind:"sum"},
 {key:"sprints",label:"Sprints",unit:"",kind:"sum"},
 {key:"acc_3",label:"ACC >3",unit:"acciones",kind:"sum"},
 {key:"dec_3",label:"DEC <−3",unit:"acciones",kind:"sum"},
 {key:"m_min",label:"m/min",unit:"m/min",kind:"rate",numerator:"total_distance"},
 {key:"player_load_per_min",label:"PL/min",unit:"UA/min",kind:"rate",numerator:"player_load"},
 {key:"smax",label:"Velocidad máxima",unit:"km/h",kind:"max"}
];
export function number(value) {
 if(value==null || value==="")return null;
 const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;
}
export function minutes(row) {
 const n=number(row.duration_minutes);if(n!=null)return n;
 if(typeof row.duration==="string" && row.duration.includes(":")){
  const parts=row.duration.split(":").map(Number);
  if(parts.some(n=>!Number.isFinite(n)||n<0))return null;
  if(parts.length===3)return parts[0]*60+parts[1]+parts[2]/60;
  if(parts.length===2)return parts[0]+parts[1]/60;
 }
 return null;
}
export function metricValue(row,metric) {
 const direct=number(row[metric.key]);if(direct!=null)return direct;
 const duration=minutes(row), numerator=number(row[metric.numerator]);
 return metric.kind==="rate" && duration>0 && numerator!=null?numerator/duration:null;
}
export function aggregate(rows,metric) {
 const usable=rows.map(row=>({row,value:metricValue(row,metric)})).filter(x=>x.value!=null);
 if(!usable.length)return null;
 if(metric.kind==="max")return Math.max(...usable.map(x=>x.value));
 if(metric.kind==="rate"){
  const weighted=usable.map(x=>({...x,duration:minutes(x.row)})).filter(x=>x.duration>0);
  if(weighted.length!==usable.length)return null;
  return weighted.reduce((a,x)=>a+x.value*x.duration,0)/weighted.reduce((a,x)=>a+x.duration,0);
 }
 return usable.reduce((a,x)=>a+x.value,0);
}
export function quantile(values,p) {
 const v=values.filter(x=>x!=null).sort((a,b)=>a-b);if(!v.length)return null;
 const index=(v.length-1)*p,lo=Math.floor(index),hi=Math.ceil(index);
 return v[lo]+(v[hi]-v[lo])*(index-lo);
}
export function shiftDate(date,days) {
 const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
export function comparableRows(rows,current,weeks=8) {
 if(!current?.md || !current?.objective)return [];
 return rows.filter(r=>r.source==="training" && r.date<current.date && r.date>=shiftDate(current.date,-weeks*7) && r.md===current.md && r.objective===current.objective && (r.gps_group||"principal")===(current.gps_group||"principal") && (r.exclusion_reason||"")===(current.exclusion_reason||""));
}
export function referenceStats(rows,metric) {
 const values=rows.map(r=>metricValue(r,metric)).filter(v=>v!=null);
 return {n:values.length,median:quantile(values,.5),low:quantile(values,.1),high:quantile(values,.9)};
}
export function dailySeries(rows,date,metric,count=28) {
 return Array.from({length:count},(_,i)=>{
  const day=shiftDate(date,i-count+1), selected=rows.filter(r=>r.date===day);
  const training=selected.filter(r=>r.source==="training"),match=selected.filter(r=>r.source==="match");
  const window=rows.filter(r=>r.date>=shiftDate(day,-6)&&r.date<=day);
  return {date:day,label:day.slice(5),training:aggregate(training,metric),match:aggregate(match,metric),rolling:aggregate(window,metric),total:aggregate(selected,metric),n:selected.length};
 });
}
