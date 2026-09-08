import React,{useEffect,useMemo,useState} from "react";
import moment from "moment";
import {base44} from "@/api/base44Client";
import {Link} from "react-router-dom";
import {ResponsiveContainer,BarChart,Bar,CartesianGrid,XAxis,YAxis,Tooltip,Legend} from "recharts";
import {LOAD_METRICS,number,minutes,metricValue,aggregate,referenceStats,shiftDate} from "./individualLoadModel";
import {dedupeRows} from "./externalGpsSources";
import SessionGpsAnalysisStudio from "@/components/sessions/gps/SessionGpsAnalysisStudio";
import SessionGPSReportModal from "@/components/sessions/gpsReport/SessionGPSReportModal";

const field="w-full rounded-lg border border-zinc-600 bg-zinc-950 p-2 text-sm text-zinc-100";
const fmt=v=>v==null?"Sin registro":Number(v).toLocaleString("es-AR",{maximumFractionDigits:1});
const rehab=r=>["diferenciado","kinesiologia","reintegro","lesion"].includes(r.gps_group)||["diferenciado","kinesiologia","reintegro","lesion"].includes(r.exclusion_reason);
function Box({title,children,subtitle}){return <section className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5 space-y-4"><div><h3 className="text-lg font-bold text-white">{title}</h3>{subtitle&&<p className="text-xs text-slate-300 mt-1">{subtitle}</p>}</div>{children}</section>;}

export default function GpsReturnToTeamTab({sessions=[],gpsBySession={},playerMap={},medicalEpisodes=[],squadId,seasonId}){
 const [playerId,setPlayerId]=useState("");
 const [episodeId,setEpisodeId]=useState("");
 const [date,setDate]=useState(moment().format("YYYY-MM-DD"));
 const [sessionId,setSessionId]=useState("");
 const [metricKey,setMetricKey]=useState("total_distance");
 const [showHistory,setShowHistory]=useState(false);
 const [report,setReport]=useState(false);
 const [clinical,setClinical]=useState({participation:null,wellness:[],loading:false,error:""});
 const [note,setNote]=useState("");
 const [saving,setSaving]=useState(false);
 const [saveMessage,setSaveMessage]=useState("");
 const [refresh,setRefresh]=useState(0);
 const rows=useMemo(()=>sessions.flatMap(s=>dedupeRows(gpsBySession[s.id]||[]).filter(r=>r.exclusion_reason!=="error_gps").map(r=>({...r,date:s.date,session:s,session_id:s.id}))).filter(r=>r.date),[sessions,gpsBySession]);
 const episodes=medicalEpisodes.filter(e=>e.player_id && (!e.squad_id||e.squad_id===squadId)&&(!seasonId||!e.season_id||e.season_id===seasonId));
 const candidates=useMemo(()=>{
  const ids=new Set(episodes.filter(e=>(!e.fecha_inicio_tto||e.fecha_inicio_tto<=date)&&(showHistory||((!e.fecha_final_tto||e.fecha_final_tto>=date)&&e.medical_status!=="alta"))).map(e=>e.player_id));
  rows.filter(r=>r.date<=date&&r.date>=shiftDate(date,-27)&&rehab(r)).forEach(r=>ids.add(r.player_id));
  return [...ids].map(id=>({id,name:playerMap[id]?.full_name||episodes.find(e=>e.player_id===id)?.player_name_original||rows.find(r=>r.player_id===id)?.player_name||"Jugador"})).sort((a,b)=>a.name.localeCompare(b.name));
 },[episodes,showHistory,date,rows,playerMap]);
 const player=candidates.find(p=>p.id===playerId)||candidates[0];
 const playerEpisodes=episodes.filter(e=>e.player_id===player?.id&&(!e.fecha_inicio_tto||e.fecha_inicio_tto<=date)).sort((a,b)=>(b.fecha_inicio_tto||"").localeCompare(a.fecha_inicio_tto||""));
 const episode=playerEpisodes.find(e=>e.id===episodeId)||playerEpisodes.find(e=>e.medical_status!=="alta"&&(!e.fecha_final_tto||e.fecha_final_tto>=date))||playerEpisodes[0];
 const start=episode?.fecha_inicio_tto||"";
 const playerRows=rows.filter(r=>r.player_id===player?.id&&r.date<=date);
 const periodRows=playerRows.filter(r=>r.date>=(start||shiftDate(date,-27)));
 const dayRows=periodRows.filter(r=>r.date===date);
 const current=dayRows.find(r=>r.session_id===sessionId)||dayRows[0];
 const metric=LOAD_METRICS.find(m=>m.key===metricKey);
 const baseline=start?playerRows.filter(r=>r.date<start&&r.date>=shiftDate(start,-56)&&r.include_in_session_average!==false&&(!r.gps_group||r.gps_group==="principal")&&(!current?.session.match_day_code||r.session.match_day_code===current.session.match_day_code)):[];
 const recent=periodRows.filter(r=>r.date>=shiftDate(date,-6));
 const dates=[...new Set(periodRows.filter(r=>r.date>=shiftDate(date,-27)).map(r=>r.date))].sort();
 const chart=dates.map(d=>{const rs=periodRows.filter(r=>r.date===d);return {date:d.slice(5),individual:aggregate(rs.filter(rehab),metric),team:aggregate(rs.filter(r=>!rehab(r)),metric)};});
 const todayWellness=clinical.wellness.find(w=>w.response_date===date);
 const nextWellness=clinical.wellness.find(w=>w.response_date===shiftDate(date,1));
 const baselineSpeed=aggregate(baseline,LOAD_METRICS.find(m=>m.key==="smax"));
 const rpe=number(clinical.participation?.rpe);
 useEffect(()=>{
  let cancelled=false;
  setClinical({participation:null,wellness:[],loading:true,error:""});setNote("");setSaveMessage("");
  if(!player){setClinical({participation:null,wellness:[],loading:false,error:""});return;}
  Promise.allSettled([
   current?base44.entities.SessionPlayer.filter({player_id:player.id,session_id:current.session_id},"-created_date",100):Promise.resolve([]),
   base44.entities.WellnessResponse.filter({player_id:player.id,response_date:{$gte:date,$lte:shiftDate(date,1)}},"-updated_at",100)
  ]).then(result=>{
   if(cancelled)return;
   setClinical({participation:result[0].status==="fulfilled"?result[0].value[0]||null:null,
    wellness:result[1].status==="fulfilled"?result[1].value.filter(w=>(!w.squad_id||w.squad_id===squadId)&&(!seasonId||!w.season_id||w.season_id===seasonId)):[],
    loading:false,error:result.some(r=>r.status==="rejected")?"No se pudo consultar parte de RPE/Wellness. Revisá permisos o reintentá.":""});
  });
  return()=>{cancelled=true;};
 },[player?.id,current?.session_id,date,squadId,seasonId,refresh]);
 async function saveNote(){
  if(!clinical.participation?.id||!note.trim())return;
  setSaving(true);setSaveMessage("");
  try{
   const record=await base44.entities.SessionPlayer.get(clinical.participation.id);
   if(record.player_id!==player.id||record.session_id!==current.session_id)throw new Error("El registro no corresponde al jugador y sesión seleccionados.");
   const user=await base44.auth.me();
   const entry="Retorno al equipo · "+new Date().toISOString()+" · "+(user.full_name||user.email||"Profesional")+"\n"+note.trim();
   const notes=[record.notes,entry].filter(Boolean).join("\n\n");
   await base44.entities.SessionPlayer.update(record.id,{notes});
   setClinical(c=>({...c,participation:{...c.participation,notes}}));setNote("");setSaveMessage("Observación guardada en el registro compartido de la sesión.");
  }catch(e){setSaveMessage("No se pudo guardar: "+e.message);}finally{setSaving(false);}
 }
 const reasons=[];
 if(!start)reasons.push("Falta fecha de inicio del episodio: no se calcula referencia previa.");
 if(!current)reasons.push("Sin GPS del jugador en la fecha elegida. No significa ausencia de trabajo.");
 if(!baseline.length)reasons.push("Sin sesiones previas comparables para referencia.");
 if(todayWellness?.has_pain)reasons.push("Dolor reportado hoy: "+(todayWellness.pain_zone||"zona sin indicar")+" · "+fmt(todayWellness.pain_intensity)+"/10.");
 if(nextWellness?.has_pain)reasons.push("Dolor reportado al día siguiente: "+(nextWellness.pain_zone||"zona sin indicar")+" · "+fmt(nextWellness.pain_intensity)+"/10.");
 if(current&&rpe==null)reasons.push("RPE sin registro para la sesión.");
 return <div className="text-slate-100 space-y-5">
  <Box title="Retorno al equipo" subtitle="Seguimiento compartido de carga, tolerancia e integración al entrenamiento · Kinesiología + Preparación Física">
   <div className="grid md:grid-cols-3 gap-3"><label className="text-xs">Jugador<select disabled={saving} className={field} value={player?.id||""} onChange={e=>{setPlayerId(e.target.value);setEpisodeId("");setSessionId("");setReport(false);}}>{!candidates.length&&<option value="">Sin jugadores en seguimiento</option>}{candidates.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="text-xs">Fecha<input disabled={saving} className={field} type="date" value={date} max={moment().format("YYYY-MM-DD")} onChange={e=>{if(e.target.value){setDate(e.target.value);setSessionId("");setReport(false);}}}/></label><label className="text-xs">Episodio<select disabled={saving} className={field} value={episode?.id||""} onChange={e=>{setEpisodeId(e.target.value);setReport(false);}}>{!playerEpisodes.length&&<option value="">Sin episodio vinculado</option>}{playerEpisodes.map(e=><option key={e.id} value={e.id}>{e.fecha_inicio_tto||"Sin fecha"} · {e.lesion_consulta} · {e.medical_status||"sin clasificar"}</option>)}</select></label></div>
   <label className="text-xs text-slate-300"><input type="checkbox" disabled={saving} checked={showHistory} onChange={e=>setShowHistory(e.target.checked)}/> Incluir episodios históricos / altas</label>
  </Box>
  {!player?<p className="p-6 text-slate-300">No hay episodios médicos pendientes ni GPS diferenciado reciente. Podés incluir el historial. Los jugadores lesionados aparecen aunque no tengan GPS.</p>:<>
   <div className="grid md:grid-cols-4 gap-3">{[["Jugador",player.name],["Motivo de seguimiento",episode?.lesion_consulta||"GPS diferenciado; revisar vínculo médico"],["Etapa clínica registrada",episode?.etapa_rhb||"Sin etapa registrada"],["Inicio / alta registrada",(start||"Sin fecha")+" / "+(episode?.fecha_final_tto||"Sin alta registrada")]].map(([k,v])=><div key={k} className="rounded-xl border border-zinc-700 bg-zinc-950 p-4"><p className="text-xs text-slate-300">{k}</p><p className="text-base font-semibold text-white mt-2">{v}</p></div>)}</div>
   <Box title="Puntos para revisar" subtitle="La carga GPS describe exposición. El cambio de etapa y el alta requieren valoración profesional; no se infieren de un porcentaje ni del aumento de distancia.">
    {clinical.loading?<p>Consultando respuesta del jugador…</p>:reasons.length?reasons.map(r=><p key={r} className="text-sm text-amber-200">{r}</p>):<p className="text-sm">Sin avisos en los datos consultados. Revisar criterios clínicos y funcionales.</p>}
    {clinical.error&&<p role="alert" className="text-amber-200">{clinical.error} <button className="underline" onClick={()=>setRefresh(n=>n+1)}>Reintentar</button></p>}
    <Link className="text-cyan-300 underline text-sm" to={"/performance/medical?player_id="+encodeURIComponent(player.id)}>Abrir seguimiento médico del jugador</Link>
   </Box>
   <Box title="Carga actual y referencia previa al episodio" subtitle="Referencia: ocho semanas antes del inicio del tratamiento, grupo principal, mismo MD cuando está registrado. Mediana descriptiva; menos de seis registros = provisional.">
    <div className="flex flex-wrap gap-3"><select disabled={saving} aria-label="Sesión analizada" className={field+" md:max-w-md"} value={current?.session_id||""} onChange={e=>{setSessionId(e.target.value);setReport(false);}}>{!dayRows.length&&<option value="">Sin GPS en esta fecha</option>}{dayRows.map(r=><option key={r.session_id} value={r.session_id}>{r.session.title||"Sesión "+r.session.session_number} · {r.gps_group||"principal"} · {fmt(minutes(r))} min</option>)}</select>
    {!current&&periodRows.length>0&&<button disabled={saving} className="text-cyan-300 underline text-sm" onClick={()=>setDate([...periodRows].sort((a,b)=>b.date.localeCompare(a.date))[0].date)}>Ver última carga registrada</button>}</div>
    <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-slate-300"><tr>{["Parámetro","Sesión actual","Mediana previa","Actual / referencia","n","7 días observados"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{LOAD_METRICS.map(m=>{const ref=referenceStats(baseline,m),v=current?metricValue(current,m):null;return <tr key={m.key} className="border-t border-zinc-700"><td className="p-3">{m.label} · {m.unit}</td><td className="p-3 text-white font-semibold">{fmt(v)}</td><td className="p-3">{fmt(ref.median)}</td><td className="p-3 text-cyan-300">{v!=null&&ref.median>0?fmt(v/ref.median*100)+"%":"Sin referencia"}</td><td className="p-3">{ref.n}{ref.n>0&&ref.n<6?" · provisional":""}</td><td className="p-3">{fmt(aggregate(recent,m))}</td></tr>;})}</tbody></table></div>
    <p className="text-xs text-slate-300">Sumas para volumen y acciones; máximo para Smax; promedio ponderado por duración para tasas. No se asigna un porcentaje de recuperación. La fecha de inicio de tratamiento puede diferir de la fecha de lesión.</p>
   </Box>
   <Box title="Evolución de exposición e integración" subtitle="Últimos 28 días dentro del período seleccionado. Incluye la carga del jugador cuando vuelve al grupo principal; no desaparece al dejar de figurar como diferenciado.">
    <select aria-label="Métrica de evolución" className={field+" md:max-w-xs"} value={metricKey} onChange={e=>setMetricKey(e.target.value)}>{LOAD_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select>
    {chart.length?<ResponsiveContainer width="100%" height={290}><BarChart data={chart}><CartesianGrid stroke="#475569" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fill:"#cbd5e1",fontSize:11}}/><YAxis tick={{fill:"#cbd5e1",fontSize:11}}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #64748b",color:"#f8fafc"}} formatter={fmt}/><Legend wrapperStyle={{color:"#f8fafc"}}/><Bar dataKey="individual" name="Diferenciado / reintegro" fill="#fbbf24"/><Bar dataKey="team" name="Otros grupos GPS (incluye principal)" fill="#38bdf8"/></BarChart></ResponsiveContainer>:<p className="text-sm text-slate-300">Sin mediciones GPS en este período.</p>}
    <p className="text-xs text-slate-300">La clasificación depende del grupo GPS registrado. No acredita participación completa con el equipo. Acumulados parciales si faltan sesiones; esta vista analiza sesiones de entrenamiento, no competencia.</p>
   </Box>
   <Box title="Velocidad y respuesta a la sesión">
    <div className="grid md:grid-cols-4 gap-3">{[["Smax actual",fmt(current?.smax)+" km/h"],["Máximo previo observado",fmt(baselineSpeed)+" km/h"],["RPE",fmt(rpe)+(rpe!=null?"/10":"")],["Duración GPS",fmt(current?minutes(current):null)+" min"]].map(([k,v])=><div key={k}><p className="text-xs text-slate-300">{k}</p><p className="text-xl text-white font-bold">{v}</p></div>)}</div>
    <div className="grid md:grid-cols-2 gap-3">{[[date,todayWellness], [shiftDate(date,1),nextWellness]].map(([d,w])=><div key={d} className="border border-zinc-700 rounded-lg p-3"><p className="text-sm font-bold">Wellness · {d}</p><p className="text-sm">{w?fmt(w.wellness_score)+(w.wellness_scale_version==="negative_1_10_v2"?" /10 · mayor = peor":" /100 · legado, mayor = mejor"):"Sin respuesta"}</p><p className="text-xs text-slate-300">{w?.has_pain?"Dolor: "+fmt(w.pain_intensity)+"/10 · "+(w.pain_zone||"sin zona"):"Dolor: "+(w?"no reportado":"sin información")}</p><p className="text-xs mt-1">{w?.comment||""}</p></div>)}</div>
    <p className="text-xs text-slate-300">La respuesta del día siguiente es contexto de tolerancia, no una prueba causal. El máximo previo observado no reemplaza un test validado ni permite contar esfuerzos de sprint.</p>
   </Box>
   <Box title="Revisión conjunta · kinesiólogo y PF" subtitle="Marco de análisis inspirado en el continuo control–caos. Etapas orientativas: no se asignan ni avanzan automáticamente.">
    <div className="grid md:grid-cols-3 gap-3">{[
     ["Control de la tarea","Carrera prevista, velocidad regulada, cambios de dirección anticipados."],
     ["Mayor variabilidad","Aceleraciones, frenadas, pelota y respuestas a estímulos."],
     ["Integración específica","Acciones reactivas, demandas posicionales y participación progresiva con el equipo."]
    ].map(([title,text])=><div className="p-3 border border-zinc-700 rounded-xl" key={title}><p className="font-bold text-cyan-200">{title}</p><p className="text-xs text-slate-300 mt-2">{text}</p></div>)}</div>
    <p className="text-sm">Revisar conjuntamente: objetivo y restricciones del día; dosis realizada; síntomas y respuesta posterior; evaluaciones de fuerza/función; confianza del jugador; complejidad de las tareas y decisión del equipo tratante.</p>
    {episode?.observaciones&&<div className="rounded-lg border border-zinc-700 p-3"><p className="text-xs text-slate-300">Observaciones del episodio médico</p><p className="text-sm whitespace-pre-wrap">{episode.observaciones}</p></div>}
    {clinical.participation?.notes&&<div className="rounded-lg border border-zinc-700 p-3 max-h-64 overflow-auto"><p className="text-xs text-slate-300">Notas compartidas de la sesión</p><p className="text-sm whitespace-pre-wrap">{clinical.participation.notes}</p></div>}
    <textarea disabled={saving||!clinical.participation} className={field} rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Objetivo y restricciones / trabajo realizado / respuesta inmediata y posterior / criterios pendientes / decisión consensuada y responsables"/>
    <button disabled={saving||!clinical.participation||!note.trim()} className="rounded-lg bg-cyan-400 text-slate-950 font-bold px-4 py-2 disabled:opacity-40" onClick={saveNote}>{saving?"Guardando…":"Agregar observación compartida"}</button>
    {!clinical.participation&&<p className="text-xs text-slate-300">Para guardar una observación, el jugador debe estar registrado en la asistencia de la sesión seleccionada.</p>}
    {saveMessage&&<p role="status" className="text-sm">{saveMessage}</p>}
   </Box>
   {current&&<Box title="Ejercicios, bloques e informe"><button className="text-cyan-300 underline" onClick={()=>setReport(true)}>Abrir informe GPS del jugador</button><SessionGpsAnalysisStudio key={player.id+":"+current.session_id+":"+report} session={current.session} gpsRows={[current]} allowedPlayerIds={[player.id]}/>{report&&<SessionGPSReportModal session={current.session} sessionPlayers={clinical.participation?[clinical.participation]:[]} visiblePlayerIds={[player.id]} onClose={()=>setReport(false)}/>}</Box>}
  </>}
  <Box title="Base científica y límites de interpretación"><p className="text-sm">El retorno es un proceso multidimensional: recuperar participación, deporte y rendimiento. La carga GPS se interpreta junto con síntomas, función y demandas específicas. Estos marcos orientan la discusión profesional; no validan automáticamente los criterios ni la interfaz de esta aplicación.</p><div className="flex flex-wrap gap-4 text-sm text-cyan-300"><a href="https://pubmed.ncbi.nlm.nih.gov/27226389/" target="_blank" rel="noreferrer">Consenso de Bern · Ardern 2016</a><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6818668/" target="_blank" rel="noreferrer">Control–caos · Taberner 2019</a><a href="https://doi.org/10.1136/bmjsem-2023-001849" target="_blank" rel="noreferrer">Rehabilitación en campo · Stathas 2024</a></div></Box>
 </div>;
}
