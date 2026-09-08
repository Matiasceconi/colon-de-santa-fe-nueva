import React,{useEffect,useMemo,useState} from "react";
import moment from "moment";
import {base44} from "@/api/base44Client";
import {ResponsiveContainer,BarChart,Bar,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend} from "recharts";
import {Activity,Settings2,ChevronDown,FileDown,AlertCircle} from "lucide-react";
import {normalizeMatchGpsRows} from "./matchGpsAdapter";
import {dedupeRows} from "./externalGpsSources";
import {LOAD_METRICS,number,minutes,metricValue,aggregate,shiftDate,comparableRows,referenceStats,dailySeries} from "./individualLoadModel";
import SessionGpsAnalysisStudio from "@/components/sessions/gps/SessionGpsAnalysisStudio";
import SessionGPSReportModal from "@/components/sessions/gpsReport/SessionGPSReportModal";
const fmt=v=>v==null?"Sin registro":Number(v).toLocaleString("es-AR",{maximumFractionDigits:1});
const input="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white w-full";
function Panel({title,subtitle,children}){return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4"><div><h3 className="font-bold text-white">{title}</h3>{subtitle&&<p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}</div>{children}</section>;}
async function allRows(entity,query,sort){
 const result=[];for(let skip=0;;skip+=500){const page=await entity.filter(query,sort,500,skip);result.push(...page);if(page.length<500)return result;}
}
export default function GpsIndividualLoadMonitor(props){
 const [playerId,setPlayerId]=useState("");
 const players=props.players||[];
 const selected=players.find(p=>p.id===playerId)||players[0];
 return <div className="space-y-5 text-zinc-100">
  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
   <Activity className="text-emerald-400"/><div className="flex-1"><p className="text-xs uppercase tracking-widest text-emerald-400">Control individual de carga externa</p><h2 className="text-xl font-bold text-white">La carga que recibe cada jugador</h2></div>
   <select aria-label="Seleccionar jugador" className={input+" sm:max-w-sm"} value={selected?.id||""} onChange={e=>setPlayerId(e.target.value)}>{!players.length&&<option>Sin jugadores en el plantel</option>}{players.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
  </div>
  {selected&&<PlayerMonitor key={props.squadId+":"+selected.id} {...props} player={selected}/>}
 </div>;
}
function PlayerMonitor({player,sessions=[],gpsBySession={},matchReports=[],matchGpsByMatch={},squadId,seasonId}){
 
 const color="#34d399";
 const [date,setDate]=useState(moment().format("YYYY-MM-DD"));
 const [sessionId,setSessionId]=useState("");
 const [metricKey,setMetricKey]=useState("total_distance");
 const [weeks,setWeeks]=useState(8);
 const [responses,setResponses]=useState({wellness:[],participation:[],errors:[]});
 const [loading,setLoading]=useState(false);
 const [reload,setReload]=useState(0);
 const [report,setReport]=useState(false);
 const storageKey="individual-load-v1:"+squadId+":"+seasonId+":"+player.id;
 const [config,setConfig]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"{}");}catch{return {};}});
 const [storageError,setStorageError]=useState("");
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(config));setStorageError("");}catch{setStorageError("No se pudo guardar la configuración en este navegador.");}},[config,storageKey]);
 const patch=values=>setConfig(c=>({...c,...values}));
 const rows=useMemo(()=>{
  const train=sessions.flatMap(s=>dedupeRows(gpsBySession[s.id]||[]).filter(r=>r.player_id===player.id&&r.exclusion_reason!=="error_gps").map(r=>({...r,date:s.date,source:"training",eventId:s.id,title:s.title||"Sesión "+(s.session_number||""),md:s.match_day_code||s.microcycle_day||"",objective:s.session_objective||""})));
  const matches=matchReports.flatMap(m=>dedupeRows(normalizeMatchGpsRows(m,matchGpsByMatch[m.id]||[])).filter(r=>r.player_id===player.id).map(r=>({...r,distance_19_8:null,date:m.date,source:"match",eventId:m.id,title:"Partido vs "+(m.rival||"rival"),md:"MD",objective:"Partido"})));
  return [...train,...matches].filter(r=>r.date).sort((a,b)=>b.date.localeCompare(a.date));
 },[sessions,gpsBySession,matchReports,matchGpsByMatch,player.id]);
 const daySessions=sessions.filter(s=>s.date===date);
 const currentSession=daySessions.find(s=>s.id===sessionId)||daySessions[0];
 const current=rows.find(r=>r.source==="training"&&r.eventId===currentSession?.id);
 const metric=LOAD_METRICS.find(m=>m.key===metricKey)||LOAD_METRICS[0];
 const history=comparableRows(rows,current,weeks);
 const weekRows=rows.filter(r=>r.date>=shiftDate(date,-6)&&r.date<=date);
 const series=dailySeries(rows,date,metric);
 const recentWellness=responses.wellness.find(w=>w.response_date===date);
 const sessionPlayer=responses.participation.find(p=>p.session_id===currentSession?.id);
 const goals=config.goals?.[currentSession?.id]||{};
 const setGoal=(key,bound,value)=>patch({goals:{...config.goals,[currentSession.id]:{...goals,[key]:{...goals[key],[bound]:value}}}});
 const stats=referenceStats(history,metric);
 const latestRows=rows.filter(r=>r.date<=date);
 const speed=number(config.speed);
 const speedValid=speed>0 && config.speedDate && config.speedDate<=date && String(config.speedSource||"").trim();
 const threshold=number(config.speedThreshold)||90;
 const speedRows=latestRows.filter(r=>r.date>=config.speedDate&&number(r.smax)!=null);
 const lastExposure=speedValid?speedRows.find(r=>number(r.smax)>=speed*threshold/100):null;
 const observedMax=latestRows.length?aggregate(latestRows,LOAD_METRICS.find(m=>m.key==="smax")):null;
 const dayMax=aggregate(rows.filter(r=>r.date===date),LOAD_METRICS.find(m=>m.key==="smax"));
 const peak=[...series.slice(-7)].filter(d=>d.total!=null).sort((a,b)=>b.total-a.total)[0];
 const rpe=number(sessionPlayer?.rpe);
 const duration=number(sessionPlayer?.minutes);
 const internal=rpe!=null&&duration>0?rpe*duration:null;
 const alerts=[];
 if(!current)alerts.push("Sin GPS individual de sesión en la fecha seleccionada.");
 LOAD_METRICS.forEach(m=>{
  const v=current?metricValue(current,m):null,g=goals[m.key],lo=number(g?.min),hi=number(g?.max);
  if(lo!=null&&hi!=null&&lo>hi){alerts.push(m.label+": rango objetivo inválido (mínimo mayor que máximo).");return;}
  if(v!=null&&((lo!=null&&v<lo)||(hi!=null&&v>hi)))alerts.push(m.label+": "+fmt(v)+" "+m.unit+" fuera del objetivo "+(lo??"sin mínimo")+"–"+(hi??"sin máximo")+".");
  const ref=referenceStats(history,m);
  if(v!=null&&ref.n>=6&&(v<ref.low||v>ref.high))alerts.push(m.label+": "+fmt(v)+" frente a P10–P90 "+fmt(ref.low)+"–"+fmt(ref.high)+" de "+ref.n+" sesiones comparables. Valor inusual; revisar contexto.");
 });
 if(recentWellness?.has_pain)alerts.push("Dolor reportado: "+(recentWellness.pain_zone||"zona no indicada")+" · intensidad "+fmt(recentWellness.pain_intensity)+"/10.");
 if(!recentWellness)alerts.push("Wellness sin respuesta en esta fecha.");
 if(rpe==null&&currentSession)alerts.push("RPE pendiente o sin registro para esta sesión.");
 if(speedValid&&!lastExposure)alerts.push("No hay exposición registrada ≥"+threshold+"% desde la fecha de referencia. Revisar cobertura y planificación.");
 const competitionRows=rows.filter(r=>r.source==="match"&&r.date<date&&r.date>=shiftDate(date,-weeks*7)&&minutes(r)>=80);
 const competition=referenceStats(competitionRows,metric);
 useEffect(()=>{
  let cancelled=false;setLoading(true);setResponses({wellness:[],participation:[],errors:[]});
  Promise.allSettled([
   allRows(base44.entities.WellnessResponse,{player_id:player.id,response_date:{$gte:shiftDate(date,-56),$lte:date}},"-response_date"),
   allRows(base44.entities.SessionPlayer,{player_id:player.id},"-created_date")
  ]).then(results=>{
   if(cancelled)return;
   const ids=new Set(sessions.map(s=>s.id));
   setResponses({wellness:results[0].status==="fulfilled"?results[0].value.filter(r=>(!r.squad_id||r.squad_id===squadId)&&(!seasonId||!r.season_id||r.season_id===seasonId)):[],participation:results[1].status==="fulfilled"?dedupeParticipation(results[1].value.filter(r=>ids.has(r.session_id))):[],errors:results.flatMap((r,i)=>r.status==="rejected"?["No se pudo consultar "+(i===0?"Wellness":"RPE y asistencia")+". Verificá acceso o reintentá."]:[])});
   setLoading(false);
  });return()=>{cancelled=true;};
 },[player.id,date,squadId,seasonId,sessions,reload]);
 return <div className="space-y-5 text-zinc-100">
  <div className="grid md:grid-cols-4 gap-4 rounded-2xl p-5 border border-zinc-700" style={{borderTopColor:color}}>
   <div><p className="text-xl font-bold text-white">{player.full_name}</p><p className="text-sm text-zinc-400">{player.position||"Posición sin registro"}</p></div>
   <label className="text-xs text-zinc-400">Fecha de análisis<input type="date" className={input} value={date} max={moment().format("YYYY-MM-DD")} onChange={e=>{if(e.target.value){setDate(e.target.value);setSessionId("");setReport(false);}}}/></label>
   <label className="text-xs text-zinc-400">Sesión del día<select className={input} value={currentSession?.id||""} onChange={e=>{setSessionId(e.target.value);setReport(false);}}><option value="">Seleccionar sesión</option>{daySessions.map(s=><option key={s.id} value={s.id}>{s.title||"Sesión "+s.session_number}</option>)}</select></label>
   <div className="text-sm text-zinc-300"><p>{current?.md||currentSession?.match_day_code||"MD sin definir"} · {current?.objective||currentSession?.session_objective||"Objetivo sin definir"}</p><p className="mt-2">{sessionPlayer?.attendance||current?.gps_group||"Participación sin confirmar"} · {fmt(current?minutes(current):null)} min GPS</p></div>
  </div>
  {!current&&latestRows.find(r=>r.source==="training")&&<button className="text-sm text-emerald-400 underline" onClick={()=>setDate(latestRows.find(r=>r.source==="training").date)}>Ir a la última sesión con GPS del jugador</button>}
  {storageError&&<p role="alert" className="text-amber-400">{storageError}</p>}
  {responses.errors.map(e=><p role="alert" key={e} className="text-amber-400">{e} <button onClick={()=>setReload(v=>v+1)}>Reintentar</button></p>)}
  <Panel title="Lectura del día" subtitle="Avisos descriptivos para revisión profesional. No equivalen a riesgo de lesión ni a una prescripción automática.">
   {loading?<p className="text-sm text-zinc-400">Consultando Wellness y RPE…</p>:<div className="grid md:grid-cols-2 gap-2">{alerts.length?alerts.map((a,i)=><p key={i} className="text-xs text-amber-100 border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 flex gap-2"><AlertCircle size={14} className="shrink-0"/>{a}</p>):<p className="text-sm text-zinc-400">Sin desvíos detectados en las referencias disponibles.</p>}</div>}
  </Panel>
  <Panel title="Objetivo, historial propio y demanda competitiva" subtitle={"Historial: mismo MD, objetivo y grupo/condición GPS; "+weeks+" semanas anteriores. P10–P90 descriptivo. Menos de 6 observaciones: referencia provisional."}>
   <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-zinc-400"><tr>{["Parámetro","Realizado","Objetivo profesional","Mediana propia","Rango P10–P90","n"].map(h=><th className="text-left p-3" key={h}>{h}</th>)}</tr></thead><tbody>{LOAD_METRICS.map(m=>{const ref=referenceStats(history,m),g=goals[m.key];return <tr key={m.key} className="border-t border-zinc-800"><td className="p-3 font-semibold">{m.label} <span className="text-zinc-400">{m.unit}</span></td><td className="p-3">{fmt(current?metricValue(current,m):null)}</td><td className="p-3">{number(g?.min)==null&&number(g?.max)==null?"Sin definir":(g?.min||"—")+" a "+(g?.max||"—")}</td><td className="p-3">{fmt(ref.median)}</td><td className="p-3">{ref.n?fmt(ref.low)+"–"+fmt(ref.high):"Sin referencia"}</td><td className="p-3">{ref.n}{ref.n>0&&ref.n<6?" · provisional":""}</td></tr>;})}</tbody></table></div>
   <p className="text-xs text-zinc-400">El historial comparable usa la condición GPS registrada; revisá asistencia y duración antes de interpretar diferencias. Las cargas de diferenciados y trabajos individuales se conservan.</p>
  </Panel>
  <Panel title="Evolución y carga de los últimos 7 días" subtitle="Entrenamientos y partidos con GPS, deduplicados por evento. Acumulados observados: los registros faltantes no se convierten en cero.">
   <div className="flex flex-wrap gap-3"><select aria-label="Parámetro de evolución" className={input+" sm:max-w-xs"} value={metricKey} onChange={e=>setMetricKey(e.target.value)}>{LOAD_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select><label className="text-xs text-zinc-400">Referencia histórica<select className={input} value={weeks} onChange={e=>setWeeks(Number(e.target.value))}>{[4,8,12].map(n=><option key={n} value={n}>{n} semanas</option>)}</select></label></div>
   <div className="grid md:grid-cols-4 gap-3">{[
    [metric.kind==="sum"?"Acumulado observado 7 días":metric.kind==="max"?"Máximo 7 días":"Promedio ponderado 7 días",fmt(aggregate(weekRows,metric))+" "+metric.unit],
    ["Día de mayor valor",peak?peak.date+" · "+fmt(peak.total):"Sin registro"],
    ["Eventos con GPS",weekRows.filter(r=>metricValue(r,metric)!=null).length+" de "+weekRows.length+" con esta métrica"],
    ["Mediana competitiva",fmt(competition.median)+" · n="+competition.n]
   ].map(([label,value])=><div key={label} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800"><p className="text-xs text-zinc-400">{label}</p><p className="text-lg font-bold mt-2" style={{color}}>{value}</p></div>)}</div>
   <div className="grid lg:grid-cols-2 gap-5"><div><p className="text-xs text-zinc-400 mb-3">Valores diarios · {metric.unit}</p><ResponsiveContainer width="100%" height={260}><BarChart data={series}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="label" tick={{fontSize:10,fill:"#cbd5e1"}}/><YAxis tick={{fontSize:10,fill:"#cbd5e1"}}/><Tooltip formatter={fmt} contentStyle={{background:"#18181b",border:"1px solid #64748b",color:"#f8fafc"}}/><Legend wrapperStyle={{color:"#e2e8f0"}}/><Bar dataKey="training" name="Entrenamiento" fill={color}/><Bar dataKey="match" name="Partido" fill="#60a5fa"/></BarChart></ResponsiveContainer></div>
   <div><p className="text-xs text-zinc-400 mb-3">{metric.kind==="sum"?"Acumulación móvil":metric.kind==="max"?"Máximo móvil":"Promedio ponderado móvil"} · ventanas de 7 días</p><ResponsiveContainer width="100%" height={260}><LineChart data={series}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="label" tick={{fontSize:10,fill:"#cbd5e1"}}/><YAxis tick={{fontSize:10,fill:"#cbd5e1"}}/><Tooltip formatter={fmt} contentStyle={{background:"#18181b",color:"#f8fafc"}}/><Line dataKey="rolling" name={metric.label} stroke={color} strokeWidth={2} dot={false} connectNulls={false}/></LineChart></ResponsiveContainer></div></div>
   <p className="text-xs text-zinc-400">Referencia competitiva: partidos anteriores con ≥80 minutos GPS, ventana seleccionada; n&lt;6 es provisional. No se extrapolan participaciones cortas. D 19,8–25 no se combina con HSR de partidos sin confirmar sus umbrales.</p>
   <p className="text-xs text-zinc-400">Hoy frente a mediana competitiva: {current&&competition.median>0?fmt(metricValue(current,metric)!=null?metricValue(current,metric)/competition.median*100:null)+"%":"Sin comparación"} · Mediana de sesiones comparables: {fmt(stats.median)} {metric.unit}.</p>
  </Panel>
  <Panel title="Exposición a velocidad" subtitle="Referencia validada por el profesional. Se distingue capacidad declarada de máximo observado en el historial.">
   <div className="grid md:grid-cols-4 gap-3">{[["Máximo observado",fmt(observedMax)+" km/h"],["Máximo del día",fmt(dayMax)+" km/h"],["% de referencia",speedValid&&dayMax!=null?fmt(dayMax/speed*100)+"%":"Referencia pendiente"],["Última exposición ≥"+threshold+"%",lastExposure?lastExposure.date+" · "+lastExposure.source:"Sin registro comparable"]].map(([k,v])=><div key={k} className="p-3 rounded-xl border border-zinc-700"><p className="text-xs text-zinc-400">{k}</p><p className="text-base font-semibold mt-2">{v}</p></div>)}</div>
   {speedValid&&<p className="text-xs text-zinc-400">Referencia: {speed} km/h · {config.speedDate} · {config.speedSource}. {lastExposure?moment(date).diff(moment(lastExposure.date),"days")+" días desde la exposición registrada.":""}</p>}
   <p className="text-xs text-zinc-400">Smax permite confirmar que se alcanzó un umbral, pero no el número de esfuerzos ni metros por encima de él. Picos de 1/3/5 minutos requieren series temporales; no se calculan desde totales.</p>
  </Panel>
  <Panel title="Respuesta del jugador · Wellness y RPE" subtitle={"Datos correspondientes a "+date+". Se respetan las distintas versiones de la escala."}>
   <div className="grid md:grid-cols-3 gap-4"><div><p className="text-xs text-zinc-400">Wellness</p><p className="text-xl font-bold">{fmt(recentWellness?.wellness_score)}</p><p className="text-xs text-zinc-400">{recentWellness?recentWellness.wellness_scale_version==="negative_1_10_v2"?"Escala 1–10 · mayor = peor":"Escala legado 0–100 · mayor = mejor":"Sin respuesta"}</p></div><div><p className="text-xs text-zinc-400">RPE de la sesión</p><p className="text-xl font-bold">{fmt(rpe)}{rpe!=null?"/10":""}</p><p className="text-xs text-zinc-400">{sessionPlayer?.rpe_comment||""}</p></div><div><p className="text-xs text-zinc-400">Carga interna de la sesión</p><p className="text-xl font-bold">{fmt(internal)} {internal!=null?"UA":""}</p><p className="text-xs text-zinc-400">RPE × minutos realizados registrados</p></div></div>
   {recentWellness?.comment&&<p className="text-sm text-zinc-300">{recentWellness.comment}</p>}
  </Panel>
  <details className="rounded-2xl border border-zinc-700 p-5"><summary className="cursor-pointer font-semibold flex gap-2"><Settings2 size={16}/> Objetivos, referencia de velocidad y observaciones <ChevronDown size={16}/></summary>
   <p className="text-xs text-zinc-400 my-4">Configuración de trabajo guardada en este navegador para jugador, plantel y temporada. Los objetivos y notas corresponden a la sesión elegida.</p>
   {currentSession&&<div className="grid md:grid-cols-3 gap-3">{LOAD_METRICS.map(m=><label key={m.key} className="text-xs text-zinc-400">{m.label} · {m.unit}<div className="flex gap-2"><input aria-label={m.label+" mínimo"} placeholder="Mínimo" type="number" min="0" className={input} value={goals[m.key]?.min??""} onChange={e=>setGoal(m.key,"min",e.target.value)}/><input aria-label={m.label+" máximo"} placeholder="Máximo" type="number" min="0" className={input} value={goals[m.key]?.max??""} onChange={e=>setGoal(m.key,"max",e.target.value)}/></div></label>)}</div>}
   <div className="grid md:grid-cols-4 gap-3 mt-5"><label className="text-xs">Velocidad validada (km/h)<input className={input} type="number" min="1" step=".1" value={config.speed||""} onChange={e=>patch({speed:e.target.value})}/></label><label className="text-xs">Fecha de referencia<input className={input} type="date" max={date} value={config.speedDate||""} onChange={e=>patch({speedDate:e.target.value})}/></label><label className="text-xs">Procedencia / validación<input className={input} value={config.speedSource||""} onChange={e=>patch({speedSource:e.target.value})} placeholder="Test, fecha, profesional"/></label><label className="text-xs">Umbral de seguimiento<select className={input} value={threshold} onChange={e=>patch({speedThreshold:Number(e.target.value)})}>{[85,90,95].map(n=><option value={n} key={n}>{n}%</option>)}</select></label></div>
   {currentSession&&<textarea className={input+" mt-4"} rows={3} placeholder="Interpretación profesional, diferencia planificada, seguimiento o error de datos…" value={config.notes?.[currentSession.id]||""} onChange={e=>patch({notes:{...config.notes,[currentSession.id]:e.target.value}})}/>}
  </details>
  <Panel title="Registro de actividad y cobertura" subtitle="Un día sin GPS no confirma descanso. La asistencia distingue ausencia, trabajo diferenciado y falta de medición.">
   <div className="overflow-x-auto max-h-72"><table className="w-full text-xs"><thead><tr>{["Fecha","Evento","Participación","GPS individual"].map(h=><th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{sessions.filter(s=>s.date>=shiftDate(date,-27)&&s.date<=date).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{const p=responses.participation.find(r=>r.session_id===s.id),r=rows.find(r=>r.source==="training"&&r.eventId===s.id);return <tr key={s.id} className="border-t border-zinc-800 cursor-pointer hover:bg-zinc-800" onClick={()=>{setDate(s.date);setSessionId(s.id);}}><td className="p-2">{s.date}</td><td className="p-2">{s.title||"Sesión "+s.session_number}</td><td className="p-2">{p?.attendance||"Sin confirmación"}</td><td className="p-2">{r?"Con registro · "+(r.gps_group||"principal"):"Sin GPS válido"}</td></tr>;})}</tbody></table></div>
  </Panel>
  {currentSession&&<Panel title="Ejercicios y bloques del jugador" subtitle="Detalle de la sesión seleccionada y comparación con otras tareas.">
   <button className="flex gap-2 rounded-lg px-4 py-2 text-sm bg-emerald-600" onClick={()=>setReport(true)}><FileDown size={16}/>Informe GPS del jugador · sesión</button>
   <SessionGpsAnalysisStudio key={currentSession.id+":"+report} session={currentSession} gpsRows={current?[current]:[]} allowedPlayerIds={[player.id]}/>
   {report&&<SessionGPSReportModal session={currentSession} sessionPlayers={sessionPlayer?[sessionPlayer]:[]} visiblePlayerIds={[player.id]} onClose={()=>setReport(false)}/>}
  </Panel>}
  <details className="text-xs text-zinc-400 border border-zinc-800 rounded-xl p-4"><summary className="cursor-pointer font-semibold">Metodología y bibliografía</summary><p className="mt-3">Configuración operativa: 8 semanas, mismo MD/objetivo/condición, mediana y P10–P90, mínimo 6 observaciones para avisos históricos; partidos ≥80 minutos GPS como referencia provisional. Son criterios ajustables de análisis, no umbrales clínicos validados. No se aplica ACWR como predictor de lesión.</p><div className="flex flex-wrap gap-4 mt-3">{[["Bourdon 2017","https://pubmed.ncbi.nlm.nih.gov/28463642/"],["Rago 2020","https://pubmed.ncbi.nlm.nih.gov/31755307/"],["Ammann 2023","https://doi.org/10.3389/fspor.2023.1151828"],["Gualtieri 2023","https://doi.org/10.3389/fspor.2023.1116293"],["Impellizzeri 2020","https://pubmed.ncbi.nlm.nih.gov/32502973/"]].map(([title,url])=><a key={url} className="underline" href={url} target="_blank" rel="noreferrer">{title}</a>)}</div></details>
 </div>;
}
function dedupeParticipation(rows){
 const map=new Map();rows.forEach(r=>{if(!map.has(r.session_id))map.set(r.session_id,r);});return [...map.values()];
}
