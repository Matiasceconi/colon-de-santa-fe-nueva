import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { aggregateSessionGps } from "./gpsTaskImportUtils";
import { REPORT_METRICS } from "../gpsReport/sessionGpsReportData";
import ExerciseComparisonChart from "./ExerciseComparisonChart";

const mean = (rows,key) => {
  const values=rows.map(r=>r[key]).filter(v=>v!=null && v!=="").map(Number).filter(Number.isFinite);
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
};
export default function ExerciseComparisonExplorer({ session, sessions, exercises, exerciseRows, config, onChange, allowedPlayerIds }) {
  const [referenceId,setReferenceId]=useState(session.id);
  const [reference,setReference]=useState({exercises,rows:exerciseRows});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [a,setA]=useState({exercise:"",block:"all",player:"all"});
  const [b,setB]=useState({exercise:"",block:"all",player:"all"});
  const [type,setType]=useState("bar");
  const [keys,setKeys]=useState(["total_distance","player_load","distance_25","sprints","acc_3","dec_3"]);
  useEffect(()=>{
    let cancelled=false;
    setError("");
    setB({exercise:"",block:"all",player:"all"});
    if(referenceId===session.id){setReference({exercises,rows:exerciseRows});setLoading(false);return;}
    setReference({exercises:[],rows:[]});setLoading(true);
    Promise.all([
      base44.entities.SessionExercise.filter({session_id:referenceId},"order",500),
      base44.entities.ExerciseGPSData.filter({session_id:referenceId},"player_name",5000)
    ]).then(([items,rows])=>{if(!cancelled)setReference({exercises:items,rows});})
      .catch(()=>{if(!cancelled)setError("No se pudo cargar la sesión de referencia. Volvé a seleccionarla para reintentar.");})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[referenceId,session.id,exercises,exerciseRows]);
  const available = (items,rows) => items.filter(e=>rows.some(r=>r.exercise_id===e.id));
  const currentExercises=available(exercises,exerciseRows);
  const referenceExercises=available(reference.exercises,reference.rows);
  function resolve(selection,items,rows) {
    const exercise=items.find(e=>e.id===selection.exercise)||items[0];
    let detail=rows.filter(r=>r.exercise_id===exercise?.id && r.include_in_session_average!==false);
    if(allowedPlayerIds?.length)detail=detail.filter(r=>allowedPlayerIds.includes(r.player_id));
    if(selection.block!=="all")detail=detail.filter(r=>String(r.block_number||1)===selection.block);
    const totals=aggregateSessionGps(detail);
    const scoped=selection.player==="all"?totals:totals.filter(r=>r.player_id===selection.player);
    const values=Object.fromEntries(REPORT_METRICS.map(m=>[m.key,mean(scoped,m.key)]));
    return {exercise,totals,detail,values,count:scoped.length};
  }
  const left=resolve(a,currentExercises,exerciseRows);
  const right=resolve(b,referenceExercises,reference.rows);
  const referenceSession=referenceId===session.id?session:sessions.find(s=>s.id===referenceId);
  const label=(state,result,s)=>[(s?.title||"Sesión")+" · "+s?.date,result.exercise?.name,state.block==="all"?"Total":"Bloque "+state.block,state.player==="all"?"Promedio ("+result.count+")":result.totals.find(r=>r.player_id===state.player)?.player_name||"Sin registro"].join(" · ");
  const chart=useMemo(()=>({
    title:"Comparación de ejercicios",type,metrics:REPORT_METRICS.filter(m=>keys.includes(m.key)),
    series:[{name:label(a,left,session),values:left.values},{name:label(b,right,referenceSession),values:right.values}]
  }),[a,b,left,right,session,referenceSession,keys,type]);
  function controls(state,setState,items,rows,result,title) {
    const blocks=[...new Set(rows.filter(r=>r.exercise_id===result.exercise?.id).map(r=>String(r.block_number||1)))].sort((x,y)=>Number(x)-Number(y));
    const cls="w-full bg-zinc-950 text-white rounded-lg border border-zinc-700 p-2 text-xs";
    return <div className="space-y-2 rounded-xl border border-zinc-700 p-3"><h4 className="font-semibold text-sm">{title}</h4>
      <label className="block text-xs">Ejercicio<select aria-label={title+" ejercicio"} className={cls} value={result.exercise?.id||""} onChange={e=>setState({exercise:e.target.value,block:"all",player:"all"})}>{!items.length&&<option value="">Sin ejercicios con GPS</option>}{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="block text-xs">Bloque<select className={cls} value={state.block} onChange={e=>setState({...state,block:e.target.value,player:"all"})}><option value="all">Total de bloques</option>{blocks.map(x=><option key={x} value={x}>Bloque {x}</option>)}</select></label>
      <label className="block text-xs">Jugador<select className={cls} value={state.player} onChange={e=>setState({...state,player:e.target.value})}><option value="all">Promedio de participantes</option>{result.totals.map(x=><option key={x.player_id} value={x.player_id}>{x.player_name}</option>)}</select></label>
    </div>;
  }
  const saved=config.exerciseComparisons||[];
  return <div className="space-y-4">
    <h4 className="font-bold">Comparar ejercicios y jugadores por bloque</h4>
    <p className="text-xs text-zinc-400">Elegí tareas de esta sesión o de otra del mismo plantel. Cada lado permite comparar un jugador o el promedio de participantes. Los tamaños de grupo y la duración pueden diferir.</p>
    <label className="block text-xs">Sesión para comparar<select className="block w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 mt-1" value={referenceId} onChange={e=>setReferenceId(e.target.value)}><option value={session.id}>Esta sesión · {session.date}</option>{sessions.filter(s=>s.squad_id===session.squad_id && (!session.season_id || s.season_id===session.season_id)).map(s=><option key={s.id} value={s.id}>{s.date} · {s.title||"Sesión "+(s.session_number||"")}</option>)}</select></label>
    {error&&<p role="alert" className="text-amber-400">{error}</p>}
    {loading?<p>Cargando ejercicios…</p>:<div className="grid md:grid-cols-2 gap-3">{controls(a,setA,currentExercises,exerciseRows,left,"A · Sesión actual")}{controls(b,setB,referenceExercises,reference.rows,right,"B · Referencia")}</div>}
    <div className="flex flex-wrap gap-2">{REPORT_METRICS.map(m=><label key={m.key} className="text-xs rounded-full border border-zinc-700 px-2 py-1"><input type="checkbox" checked={keys.includes(m.key)} onChange={e=>setKeys(e.target.checked?[...keys,m.key]:keys.filter(k=>k!==m.key))}/> {m.label}</label>)}</div>
    <div className="flex w-fit rounded-lg border border-zinc-700 bg-zinc-950 p-1"><button onClick={()=>setType("bar")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${type==="bar"?"bg-emerald-600 text-white":"text-zinc-400"}`}>Barras</button><button onClick={()=>setType("line")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${type==="line"?"bg-emerald-600 text-white":"text-zinc-400"}`}>Línea</button></div>
    {keys.length>=1 && left.count>0 && right.count>0 && !loading && !error ? <><ExerciseComparisonChart chart={chart}/><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold" onClick={()=>onChange({...config,exerciseComparisons:[...saved,{...chart,id:Date.now().toString(),includeInReport:true,capturedAt:new Date().toISOString()}]})}>Guardar gráfico para el informe</button></>:<p className="text-xs text-amber-300">Seleccioná datos en ambos lados y al menos 1 parámetro.</p>}
    {saved.map(item=><div key={item.id} className="border border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-3"><input aria-label="Título del gráfico guardado" className="bg-zinc-900 rounded p-2 flex-1" value={item.title} onChange={e=>onChange({...config,exerciseComparisons:saved.map(x=>x.id===item.id?{...x,title:e.target.value}:x)})}/>
      <label className="text-xs"><input type="checkbox" checked={item.includeInReport!==false} onChange={e=>onChange({...config,exerciseComparisons:saved.map(x=>x.id===item.id?{...x,includeInReport:e.target.checked}:x)})}/> Incluir en informe</label>
      <button className="text-xs" onClick={()=>onChange({...config,exerciseComparisons:saved.map(x=>x.id===item.id?{...x,type:x.type==="line"?"bar":"line"}:x)})}>{item.type==="line"?"Usar barras":"Usar línea"}</button>
      <button className="text-xs text-red-400" onClick={()=>onChange({...config,exerciseComparisons:saved.filter(x=>x.id!==item.id)})}>Eliminar</button></div>
      <p className="text-[10px] text-zinc-400">Captura guardada: {new Date(item.capturedAt).toLocaleString("es-AR")}. Si cambian los datos o filtros, generá una nueva comparación.</p>
      <ExerciseComparisonChart chart={item}/>
    </div>)}
  </div>;
}
