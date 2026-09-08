export const MATCH_METRICS = [
  {key:"total_distance",label:"Distancia total",unit:"m"},
  {key:"distance_14_19",label:"D 14–19,8",unit:"m"},
  {key:"distance_hsr",label:"D 19,8–25",unit:"m"},
  {key:"sprint_distance",label:"D >25",unit:"m"},
  {key:"player_load",label:"Player Load",unit:"UA"},
  {key:"max_velocity",label:"Velocidad máxima",unit:"km/h",peak:true},
  {key:"accelerations",label:"ACC >3 m/s²",unit:"esf."},
  {key:"decelerations",label:"DEC >3 m/s² (magnitud)",unit:"esf."},
  {key:"sprint_efforts",label:"Sprints",unit:"esf."},
  {key:"rhie",label:"RHIE",unit:"bout"},
];
export const PERIODS = {total:"Total observado",first_half:"Primer tiempo",second_half:"Segundo tiempo"};
export const number = v => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
export const fmt = v => number(v) === null ? "Sin dato" : Number(v).toLocaleString("es-AR",{maximumFractionDigits:1});
export function periodRow(row,period) {
  return period==="total" ? row : (row.periods || []).find(p=>p.period===period) || null;
}
export function metricValue(row,key,mode="absolute") {
  if (!row) return null;
  const v=number(row[key]);
  if (v===null) return null;
  if (mode==="absolute" || MATCH_METRICS.find(m=>m.key===key)?.peak) return v;
  const duration=number(row.total_duration);
  return duration>0 ? v/duration : null;
}
export const metricUnit = (metric,mode) => metric.unit+(mode==="relative"&&!metric.peak?"/min":"");
export function pairedRows(rows,key,mode,minMinutes=0) {
  return rows.map(r=>{
    const first=periodRow(r,"first_half"),second=periodRow(r,"second_half");
    const a=metricValue(first,key,mode), b=metricValue(second,key,mode);
    const eligible=a!==null && b!==null && first.total_duration>=minMinutes && second.total_duration>=minMinutes;
    return {...r,first:a,second:b,firstMinutes:first?.total_duration??null,secondMinutes:second?.total_duration??null,eligible,
      delta:eligible?b-a:null,percent:eligible&&a>0?(b-a)/a*100:null};
  });
}
export const mean = values => {const v=values.map(number).filter(n=>n!==null);return v.length?v.reduce((s,n)=>s+n,0)/v.length:null;};
export function radarRows(rows,mode) {
  const metrics=MATCH_METRICS.filter(m=>["total_distance","sprint_distance","player_load","accelerations","max_velocity"].includes(m.key));
  return metrics.map(m=>{
    const values=rows.map(r=>metricValue(r,m.key,mode));
    const valid=values.filter(v=>v!==null),maximum=valid.length?Math.max(...valid):null;
    return {metric:m.label,reference:maximum,unit:metricUnit(m,mode),...Object.fromEntries(values.map((v,i)=>["p"+i,v===null||maximum===null||maximum===0?null:v/maximum*100]))};
  });
}
