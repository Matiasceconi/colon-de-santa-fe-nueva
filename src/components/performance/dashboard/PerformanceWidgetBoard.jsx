import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import moment from "moment";
import {ArrowUp,ArrowDown,RefreshCw,Settings2,X,Maximize2} from "lucide-react";
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ScatterChart,Scatter,ZAxis} from "recharts";
import {base44} from "@/api/base44Client";
import {evaluationsGateway} from "@/lib/evaluationsApi";
import PlayerPhoto from "@/components/player/PlayerPhoto";
const n=v=>v==null||v===""||!Number.isFinite(Number(v))?null:Number(v);
const fmt=v=>n(v)==null?"Sin registro":Number(v).toLocaleString("es-AR",{maximumFractionDigits:1});
const name=p=>p.full_name||[p.first_name,p.last_name].filter(Boolean).join(" ")||"Jugador";
const sum=(list,key)=>{const values=list.map(r=>n(r[key])).filter(v=>v!=null);return values.length?values.reduce((a,b)=>a+b,0):null;};
const input="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 focus:border-sky-600 outline-none";
const PATH={gps:"/performance/external-load",internal:"/performance/internal-load",medical:"/performance/medical",minutes:"/performance/minutes",nutrition:"/performance/nutrition",strength:"/evaluations"};
const CATALOG=[
 {id:"attention",title:"Atención interdisciplinaria",area:null,wide:true},
 {id:"wellness",title:"Wellness del día",area:"internal"},
 {id:"pending",title:"RPE pendientes",area:"internal"},
 {id:"gps",title:"Carga externa · 7 días",area:"gps"},
 {id:"internal",title:"Carga interna · 7 días",area:"internal"},
 {id:"trend",title:"Distribución diaria de carga GPS",area:"gps",wide:true},
 {id:"minutes",title:"Minutos competitivos · 7 días",area:"minutes"},
 {id:"exposure",title:"Velocidad máxima observada",area:"gps"},
 {id:"nutrition",title:"Nutrición · último control y cambio",area:"nutrition",wide:true},
 {id:"strength",title:"Evaluaciones · resultados comparables",area:"strength",wide:true},
 {id:"cross",title:"Minutos y carga externa",area:"gps",wide:true},
 {id:"medical",title:"Seguimiento médico y retorno",area:"medical"},
 {id:"coverage",title:"Cobertura y vigencia",area:null},
 {id:"player",title:"Ficha integrada del jugador",area:null,wide:true}
];
const METRICS=[["total_distance","Distancia total","m"],["player_load","Player Load","UA"],["distance_25","D >25","m"],["sprints","Sprints","acciones"],["acc_3","ACC >3","acciones"],["dec_3","DEC <−3","acciones"]];

function Empty({text="Sin registros para los filtros elegidos."}){return <p className="py-8 text-center text-sm text-zinc-500">{text}</p>;}

const PHOTO_SM="w-6 h-6 rounded-full object-cover border border-zinc-600 shrink-0";
const PHOTO_SM_FB="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center shrink-0";
const PHOTO_SM_TX="text-[10px] font-bold text-zinc-400";

function PlayerCell({player,onClick}){
 return <div className="flex items-center gap-2"><PlayerPhoto player={player} className={PHOTO_SM} fallbackClassName={PHOTO_SM_FB} textClassName={PHOTO_SM_TX}/><button className="text-sky-400 text-left underline hover:text-sky-300" onClick={onClick}>{name(player)}</button></div>;
}
function PlayerName({player}){
 return <div className="flex items-center gap-2"><PlayerPhoto player={player} className={PHOTO_SM} fallbackClassName={PHOTO_SM_FB} textClassName={PHOTO_SM_TX}/><span className="text-zinc-200">{name(player)}</span></div>;
}

function Bars({data,color="#34d399",unit=""}){
 const valid=data.filter(d=>n(d.value)!=null).slice(0,8);
 if(!valid.length)return <Empty/>;
 const photoMap=new Map(valid.map(d=>[d.name,d.photo]));
 const PhotoTick=({x,y,payload})=>{
  const photo=photoMap.get(payload.value);
  return <foreignObject x={x-148} y={y-11} width={148} height={22}><div className="flex items-center gap-1.5"><PlayerPhoto src={photo} player={{full_name:payload.value}} className="w-5 h-5 rounded-full object-cover border border-zinc-600 shrink-0" fallbackClassName="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center shrink-0" textClassName="text-[8px] font-bold text-zinc-400"/><span className="text-zinc-300 text-[10px] truncate">{payload.value}</span></div></foreignObject>;
 };
 return <ResponsiveContainer width="100%" height={Math.max(180,valid.length*34)}><BarChart data={valid} layout="vertical" margin={{left:8,right:20}}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:"#a1a1aa",fontSize:10}}/><YAxis type="category" dataKey="name" width={152} tick={<PhotoTick/>}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #52525b",color:"#f4f4f5",borderRadius:"8px"}} formatter={v=>[fmt(v)+" "+unit,"Valor"]}/><Bar dataKey="value" fill={color} radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>;
}
function SmallTable({headers,rows}){
 if(!rows.length)return <Empty/>;
 return <div className="overflow-auto max-h-80"><table className="w-full text-xs"><thead><tr>{headers.map(h=><th className="p-2 text-left text-zinc-400" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/30">{row.map((v,j)=><td className="p-2 text-zinc-300" key={j}>{v??"Sin registro"}</td>)}</tr>)}</tbody></table></div>;
}
export default function PerformanceWidgetBoard({state,rows,squadName,squadId,seasonId,date,onDateChange,onRefresh,canSee}){
 const [position,setPosition]=useState("");
 const [playerId,setPlayerId]=useState("");
 const [metricKey,setMetricKey]=useState("total_distance");
 const [layout,setLayout]=useState(CATALOG.map(w=>({id:w.id,wide:!!w.wide,visible:true})));
 const [storageKey,setStorageKey]=useState("");
 const [saveError,setSaveError]=useState("");
 const [nutritionDays,setNutritionDays]=useState(30);
 const [strengthDays,setStrengthDays]=useState(14);
 useEffect(()=>{
  let cancelled=false;
  base44.auth.me().then(user=>{
   if(cancelled)return;
   const key="performance-widgets-v1:"+user.id+":"+squadId+":"+seasonId;
   try{
    const config=JSON.parse(localStorage.getItem(key)||"null");
    if(config?.layout){const known=new Set(CATALOG.map(w=>w.id));const clean=config.layout.filter((w,i,a)=>known.has(w.id)&&a.findIndex(x=>x.id===w.id)===i);setLayout([...clean,...CATALOG.filter(w=>!clean.some(x=>x.id===w.id)).map(w=>({id:w.id,wide:!!w.wide,visible:true}))]);}
    if(Number(config?.nutritionDays)>0)setNutritionDays(Number(config.nutritionDays));
    if(Number(config?.strengthDays)>0)setStrengthDays(Number(config.strengthDays));
   }catch{setSaveError("No se pudo recuperar la vista guardada.");}
   setStorageKey(key);
  }).catch(()=>{if(!cancelled)setSaveError("La vista funcionará sin guardar preferencias de usuario.");});
  return()=>{cancelled=true;};
 },[squadId,seasonId]);
 useEffect(()=>{if(storageKey)try{localStorage.setItem(storageKey,JSON.stringify({layout,nutritionDays,strengthDays}));}catch{setSaveError("No se pudo guardar la vista en este navegador.");}},[storageKey,layout,nutritionDays,strengthDays]);
 const selected=rows.filter(r=>(!position||r.player.position===position)&&(!playerId||r.player.id===playerId));
 const ids=new Set(selected.map(r=>r.player.id));
 const from=moment(date).subtract(6,"days").format("YYYY-MM-DD");
 const scoped=(items,key="date")=>(items||[]).filter(r=>ids.has(r.player_id)&&r[key]>=from&&r[key]<=date);
 const gps=scoped(state.data.gps);
 const internal=scoped(state.data.internal?.sessionPlayers);
 const gpsMetric=METRICS.find(m=>m[0]===metricKey)||METRICS[0];
 const attention=selected.filter(r=>r.reasons.length>0);
 const pending=internal.filter(r=>["presente","diferenciado","kinesiologia"].includes(r.attendance)&&n(r.rpe)==null);
 const freshness=(value,days)=>!value?"Sin registro":moment(date).diff(moment(value),"days")>days?"Revisar vigencia":"Dentro de ventana";
 function move(id,delta){setLayout(current=>{const next=[...current],i=next.findIndex(w=>w.id===id),j=i+delta;if(j<0||j>=next.length)return next;[next[i],next[j]]=[next[j],next[i]];return next;});}
 function patch(id,values){setLayout(current=>current.map(w=>w.id===id?{...w,...values}:w));}
 const personLink=r=><PlayerCell player={r.player} onClick={()=>setPlayerId(r.player.id)} />;
 const nutritionRows=selected.map(r=>{
  const last=r.nutrition;
  const previous=last?(state.data.nutrition||[]).filter(x=>x.player_id===r.player.id&&x.fecha<last.fecha&&x.tipo_medicion===last.tipo_medicion).sort((a,b)=>b.fecha.localeCompare(a.fecha))[0]:null;
  return [personLink(r),last?.fecha||"Sin control",fmt(last?.peso),fmt(last?.sumatoria_6p),n(last?.peso)!=null&&n(previous?.peso)!=null?fmt(last.peso-previous.peso)+" kg · vs "+previous.fecha:"Sin comparación",freshness(last?.fecha,nutritionDays)];
 });
 const eventCount=new Set(gps.map(r=>r.session_id)).size;
 const series=Array.from({length:7},(_,i)=>{
  const day=moment(from).add(i,"days").format("YYYY-MM-DD");
  const rs=gps.filter(r=>r.date===day);
  const byPlayer=selected.map(p=>sum(rs.filter(r=>r.player_id===p.player.id),metricKey)).filter(v=>v!=null);
  return {name:moment(day).format("DD/MM"),value:byPlayer.length?byPlayer.reduce((a,b)=>a+b,0)/byPlayer.length:null};
 });
 function content(id){
  if(id==="attention")return <><p className="text-xs text-zinc-400 mb-3">Señales reportadas en las áreas de origen. No se calcula un puntaje único ni riesgo de lesión por cocientes GPS.</p>{attention.length?<SmallTable headers={["Jugador","Motivos para revisar","Médico","RPE reciente"]} rows={attention.map(r=>[personLink(r),r.reasons.join(" · "),r.medical?.current_status||"Sin registro",r.internal.latestRpe!=null?fmt(r.internal.latestRpe)+" · "+r.internal.latestDate:"Sin registro"])}/>:<Empty text="Sin avisos reportados en los datos disponibles. Revisá también la cobertura."/>}</>;
  if(id==="wellness")return <><div className="flex gap-8 mb-3"><div><p className="text-3xl font-bold text-sky-400">{selected.filter(r=>r.wellness).length}/{selected.length}</p><p className="text-xs text-zinc-400">Respuestas · {date}</p></div><div><p className="text-3xl font-bold text-amber-400">{selected.filter(r=>r.wellness?.has_pain).length}</p><p className="text-xs text-zinc-400">Con dolor reportado</p></div></div><SmallTable headers={["Jugador","Wellness","Escala","Dolor"]} rows={selected.map(r=>[personLink(r),fmt(r.wellness?.wellness_score),r.wellness?r.wellness.wellness_scale_version==="negative_1_10_v2"?"1–10 · mayor peor":"Legado · mayor mejor":"Sin respuesta",r.wellness?r.wellness.has_pain?fmt(r.wellness.pain_intensity)+"/10":"No reportado":"Sin dato"])}/></>;
  if(id==="pending")return <><p className="text-xs text-zinc-400 mb-3">{pending.length} registros de asistencia sin RPE en los siete días. Solo presentes, diferenciados y kinesiología; no se cuentan ausencias.</p><SmallTable headers={["Jugador","Sesión","Fecha"]} rows={pending.map(r=>[<PlayerName player={selected.find(p=>p.player.id===r.player_id)?.player||{}}/>,state.data.training?.find(s=>s.id===r.session_id)?.title||"Sesión",r.date])}/></>;
  if(id==="gps")return <><p className="text-xs text-zinc-400">{gpsMetric[1]} · {gpsMetric[2]} · acumulados observados</p><Bars data={selected.map(r=>({name:name(r.player),value:r.gps.metrics.find(m=>m.key===metricKey)?.value,photo:r.player.photo_url})).sort((a,b)=>(b.value??-1)-(a.value??-1))} unit={gpsMetric[2]}/><p className="text-xs text-zinc-400">{eventCount} eventos GPS · entrenamiento y partido, incluyendo diferenciados.</p></>;
  if(id==="internal")return <><p className="text-xs text-zinc-400">Suma de RPE × minutos realizados, por sesión. No se usa duración planificada.</p><Bars data={selected.map(r=>({name:name(r.player),value:r.internal.hasData?r.internal.value:null,photo:r.player.photo_url})).sort((a,b)=>(b.value??-1)-(a.value??-1))} unit="UA" color="#c4b5fd"/></>;
  if(id==="trend")return <><p className="text-xs text-zinc-400 mb-3">Promedio de acumulados individuales por día entre jugadores con registro · {gpsMetric[1]} ({gpsMetric[2]}). La cantidad de jugadores puede variar entre días.</p><Bars data={series} unit={gpsMetric[2]} color="#38bdf8"/></>;
  if(id==="minutes")return <><Bars data={selected.map(r=>({name:name(r.player),value:r.minutes,photo:r.player.photo_url})).sort((a,b)=>(b.value??-1)-(a.value??-1))} unit="min" color="#fbbf24"/><p className="text-xs text-zinc-400">Se conserva 0 minutos cuando fue registrado. La ausencia de registro no equivale a 0.</p></>;
  if(id==="exposure")return <SmallTable headers={["Jugador","Máxima 7d","Fecha","Fuente"]} rows={selected.map(r=>{const max=gps.filter(g=>g.player_id===r.player.id&&n(g.smax)!=null).sort((a,b)=>b.smax-a.smax)[0];return [personLink(r),max?fmt(max.smax)+" km/h":"Sin registro",max?.date||"—",max?.source_type==="match"?"Partido":max?"Entrenamiento":"—"];})}/>;
  if(id==="nutrition")return <><p className="text-xs text-zinc-400 mb-3">Peso y sumatoria de seis pliegues. Cambios frente al control previo del mismo tipo; subir o bajar no se interpreta automáticamente como mejora.</p><SmallTable headers={["Jugador","Fecha","Peso kg","6P mm","Cambio de peso","Vigencia"]} rows={nutritionRows}/></>;
  if(id==="strength")return <StrengthWidget squadId={squadId} seasonId={seasonId} date={date} overview={state.data.strength} players={selected.map(r=>r.player)}/>;
  if(id==="cross"){
   if(!canSee(PATH.minutes)||state.errors.minutes)return <Empty text="El cruce requiere acceso y datos de minutos competitivos."/>;
   const points=selected.map(r=>({name:name(r.player),minutes:r.minutes,load:r.gps.metrics.find(m=>m.key===metricKey)?.value})).filter(r=>n(r.minutes)!=null&&n(r.load)!=null);
   return <><p className="text-xs text-zinc-400 mb-3">Minutos jugados frente a {gpsMetric[1].toLowerCase()} de siete días. Seleccioná un punto para filtrar al jugador. Relación descriptiva; no permite inferir fatiga o causalidad.</p>{points.length?<ResponsiveContainer width="100%" height={280}><ScatterChart margin={{left:15,right:20,bottom:15}}><CartesianGrid stroke="#27272a"/><XAxis type="number" dataKey="minutes" name="Minutos" unit=" min" tick={{fill:"#a1a1aa",fontSize:10}}/><YAxis type="number" dataKey="load" name={gpsMetric[1]} unit={" "+gpsMetric[2]} tick={{fill:"#a1a1aa",fontSize:10}}/><ZAxis range={[70,70]}/><Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload})=>active&&payload?.length?<div className="bg-zinc-950 border border-zinc-600 p-3 text-sm text-white rounded-lg"><p>{payload[0].payload.name}</p><p>{fmt(payload[0].payload.minutes)} min · {fmt(payload[0].payload.load)} {gpsMetric[2]}</p></div>:null}/><Scatter data={points} fill="#38bdf8" onClick={point=>{const r=selected.find(r=>name(r.player)===point.name);if(r)setPlayerId(r.player.id);}}/></ScatterChart></ResponsiveContainer>:<Empty text="Sin pares de GPS y minutos registrados en el período."/>}</>;
  }
  if(id==="medical")return <SmallTable headers={["Jugador","Estado actual","Actualizado"]} rows={selected.filter(r=>r.medical&& !["disponible","alta"].includes(r.medical.current_status)).map(r=>[personLink(r),r.medical.current_status,r.medical.updated_at?.slice(0,10)||"Sin fecha"])}/>;
  if(id==="coverage")return <><SmallTable headers={["Área","Con registro / selección","Criterio"]} rows={[
   ["Wellness",selected.filter(r=>r.wellness).length+"/"+selected.length,"Día seleccionado"],
   ["GPS",selected.filter(r=>r.gps.hasData).length+"/"+selected.length,"Últimos 7 días"],
   ["Carga interna",selected.filter(r=>r.internal.hasData).length+"/"+selected.length,"RPE + duración"],
   ["Nutrición",selected.filter(r=>r.nutrition).length+"/"+selected.length,"Último control hasta fecha"],
   ["Fuerza",selected.filter(r=>r.strength&&r.strength.lastDate<=date).length+"/"+selected.length,"Última fecha del índice"]
  ]}/><p className="text-xs text-zinc-400 mt-3">Vigencia operativa configurable: nutrición {nutritionDays} días; fuerza {strengthDays} días. No son límites clínicos.</p><p className="text-xs text-amber-300 mt-2">Fuerza a revisar por antigüedad: {selected.filter(r=>r.strength&&r.strength.lastDate<=date&&freshness(r.strength.lastDate,strengthDays)==="Revisar vigencia").length}.</p></>;
  if(id==="player"){
   const r=selected.find(r=>r.player.id===playerId)||selected[0];if(!r)return <Empty/>;
   return <><div className="flex items-center gap-3 mb-4"><PlayerPhoto player={r.player} className="w-12 h-12 rounded-full object-cover border border-zinc-600" fallbackClassName="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center" textClassName="text-base font-bold text-zinc-400"/><div><p className="text-lg font-bold text-white">{name(r.player)}</p><p className="text-xs text-zinc-400">{r.player.position||"Sin posición"} · {squadName}</p></div></div><SmallTable headers={["Área","Dato","Fecha / período"]} rows={[
    ["GPS",fmt(r.gps.metrics.find(m=>m.key===metricKey)?.value)+" "+gpsMetric[2],from+" a "+date],
    ["Carga interna",fmt(r.internal.hasData?r.internal.value:null)+" UA",from+" a "+date],
    ["Minutos",fmt(r.minutes),from+" a "+date],
    ["Nutrición",r.nutrition?"Peso "+fmt(r.nutrition.peso)+" kg · 6P "+fmt(r.nutrition.sumatoria_6p)+" mm":"Sin registro",r.nutrition?.fecha],
    ["Fuerza",r.strength&&r.strength.lastDate<=date?"Con evaluación":"Sin registro hasta fecha",r.strength?.lastDate<=date?r.strength.lastDate:null]
   ]}/><p className="text-xs text-zinc-400 mt-3">{r.reasons.join(" · ")||"Sin avisos reportados."}</p></>;
  }
  return null;
 }
 const KPIS=[
  {label:"Jugadores en vista",value:selected.length,color:"text-sky-400"},
  {label:"Con avisos reportados",value:attention.length,color:"text-amber-400"},
  {label:"GPS registrado",value:selected.filter(r=>r.gps.hasData).length,color:"text-emerald-400"},
  {label:"RPE pendientes",value:pending.length,color:"text-rose-400"}
 ];
 return <div className="space-y-5 text-zinc-200">
  <header className="rounded-3xl border border-blue-900/40 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/40 p-6">
   <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-sky-400">Rendimiento · {squadName}</p><h1 className="text-3xl font-black mt-2 text-white">Tablero del equipo de rendimiento</h1><p className="text-sm text-zinc-400 mt-2">Carga, respuesta y seguimiento individual en una misma vista.</p></div><button className={input+" flex gap-2 items-center hover:bg-zinc-800"} onClick={onRefresh}><RefreshCw size={16}/>Actualizar</button></div>
   <div className="flex flex-wrap gap-3 mt-5"><input aria-label="Fecha de análisis" type="date" className={input} value={date} max={moment().format("YYYY-MM-DD")} onChange={e=>{if(e.target.value)onDateChange(e.target.value);}}/><select aria-label="Posición" className={input} value={position} onChange={e=>{setPosition(e.target.value);setPlayerId("");}}><option value="">Todas las posiciones</option>{[...new Set(rows.map(r=>r.player.position).filter(Boolean))].map(p=><option key={p}>{p}</option>)}</select><select aria-label="Jugador" className={input} value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Todo el plantel</option>{rows.filter(r=>!position||r.player.position===position).map(r=><option key={r.player.id} value={r.player.id}>{name(r.player)}</option>)}</select><select aria-label="Métrica GPS compartida" className={input} value={metricKey} onChange={e=>setMetricKey(e.target.value)}>{METRICS.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div>
   <p className="text-xs text-zinc-500 mt-3">GPS, carga interna y minutos: {from} a {date}. Nutrición y fuerza: mediciones fechadas. Estado médico: registro actual, no reconstrucción histórica.</p>
  </header>
  <details className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><summary className="cursor-pointer flex gap-2 items-center font-semibold text-zinc-200"><Settings2 size={16}/>Personalizar widgets y vigencia</summary><div className="flex flex-wrap gap-3 mt-4">{CATALOG.filter(w=>!w.area||canSee(PATH[w.area])).map(w=><label className="text-xs text-zinc-300" key={w.id}><input type="checkbox" checked={layout.find(x=>x.id===w.id)?.visible!==false} onChange={e=>patch(w.id,{visible:e.target.checked})}/> {w.title}</label>)}</div><div className="flex gap-4 mt-4"><label className="text-xs text-zinc-300">Revisar nutrición después de <input aria-label="Vigencia nutrición" className={input+" w-20"} type="number" min="1" value={nutritionDays} onChange={e=>setNutritionDays(Math.max(1,Number(e.target.value)||1))}/> días</label><label className="text-xs text-zinc-300">Revisar fuerza después de <input aria-label="Vigencia fuerza" className={input+" w-20"} type="number" min="1" value={strengthDays} onChange={e=>setStrengthDays(Math.max(1,Number(e.target.value)||1))}/> días</label></div><p className="text-xs text-zinc-500 mt-3">Orden, tamaño y visibilidad se guardan en este navegador por usuario, plantel y temporada.</p></details>
  {saveError&&<p role="alert" className="text-sm text-amber-300">{saveError}</p>}
  {state.loading?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({length:6},(_,i)=><div key={i} className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl animate-pulse"/>)}</div>:state.rosterError?<p role="alert" className="text-amber-300">{state.rosterError}</p>:<>
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{KPIS.map(k=><div key={k.label} className="border border-zinc-800 rounded-xl bg-zinc-900/60 p-4"><p className="text-xs text-zinc-400">{k.label}</p><p className={"text-3xl font-bold mt-2 "+k.color}>{k.value}</p></div>)}</div>
   {Object.entries(state.errors).map(([area,error])=><p key={area} role="alert" className="text-sm text-amber-300 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3">{area}: {error}</p>)}
   <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">{layout.filter(w=>w.visible!==false).map(w=>{
    const def=CATALOG.find(d=>d.id===w.id);if(!def||def.area&&!canSee(PATH[def.area]))return null;
    return <article key={w.id} className={"min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden "+(w.wide?"xl:col-span-2":"")}><div className="p-4 border-b border-zinc-800 flex justify-between gap-3"><div><h2 className="font-bold text-white">{def.title}</h2>{def.area&&<Link className="text-xs text-sky-400 underline" to={PATH[def.area]}>Abrir área</Link>}</div><div className="flex gap-1 shrink-0">{[[ArrowUp,"Mover arriba",()=>move(w.id,-1)],[ArrowDown,"Mover abajo",()=>move(w.id,1)],[Maximize2,"Cambiar tamaño",()=>patch(w.id,{wide:!w.wide})],[X,"Ocultar widget",()=>patch(w.id,{visible:false})]].map(([Icon,label,action])=><button key={label} aria-label={label+" · "+def.title} title={label} onClick={action} className="p-1 text-zinc-500 hover:text-sky-400"><Icon size={14}/></button>)}</div></div><div className="p-4">{def.area&&state.errors[def.area]?<Empty text={state.errors[def.area]}/>:content(w.id)}</div></article>;
   })}</div>
  </>}
 </div>;
}

function StrengthWidget({squadId,seasonId,date,overview,players}){
 const sessions=(overview?.sessions||[]).filter(s=>s.assessment_date<=date&&(!seasonId||!s.season_id||s.season_id===seasonId)).sort((a,b)=>b.assessment_date.localeCompare(a.assessment_date));
 const [sessionId,setSessionId]=useState("");
 const chosen=sessions.find(s=>(s.session_id||s.id)===sessionId)||sessions[0];
 const [data,setData]=useState({loading:false,results:[],definitions:[],error:""});
 const [test,setTest]=useState("");
 const [metric,setMetric]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setData({loading:!!chosen,results:[],definitions:[],error:""});
  if(!chosen)return;
  Promise.all([evaluationsGateway("sessions",{squad_id:squadId,session_id:chosen.session_id||chosen.id}),evaluationsGateway("config",{squad_id:squadId})]).then(([result,config])=>{
   if(!cancelled)setData({loading:false,results:result.results||[],definitions:config.metric_definitions||[],error:""});
  }).catch(e=>{if(!cancelled)setData({loading:false,results:[],definitions:[],error:e.message});});
  return()=>{cancelled=true;};
 },[squadId,chosen?.session_id,chosen?.id,retry]);
 const ids=new Set(players.map(p=>p.id));
 const results=data.results.filter(r=>ids.has(r.player_id)&&r.is_primary!==false&&r.quality_status!=="error"&&r.assessment_date<=date);
 const groups=[...new Set(results.map(r=>[r.source_key,r.test_key,r.test_side||"Bilateral"].join(" · ")))];
 const selectedTest=groups.includes(test)?test:groups[0];
 const scoped=results.filter(r=>[r.source_key,r.test_key,r.test_side||"Bilateral"].join(" · ")===selectedTest);
 const source=scoped[0]?.source_key;
 const keys=[...new Set(scoped.flatMap(r=>Object.keys(r.metrics||{})))].filter(k=>scoped.some(r=>n(r.metrics[k])!=null));
 const key=keys.includes(metric)?metric:keys[0];
 const definition=data.definitions.find(d=>d.metric_key===key&&d.source_key===source);
 if(!chosen)return <Empty text="Sin sesiones de evaluación disponibles hasta la fecha elegida."/>;
 return <div className="space-y-3"><div className="flex flex-wrap gap-2"><select aria-label="Sesión de evaluación" className={input+" max-w-full"} value={chosen.session_id||chosen.id} onChange={e=>{setSessionId(e.target.value);setTest("");setMetric("");}}>{sessions.map(s=><option key={s.session_id||s.id} value={s.session_id||s.id}>{s.assessment_date} · {s.name||"Evaluación"}</option>)}</select><select aria-label="Prueba y lado" className={input+" max-w-full"} value={selectedTest||""} onChange={e=>{setTest(e.target.value);setMetric("");}}>{groups.map(t=><option key={t}>{t}</option>)}</select><select aria-label="Métrica de fuerza" className={input+" max-w-full"} value={key||""} onChange={e=>setMetric(e.target.value)}>{keys.map(k=><option key={k} value={k}>{data.definitions.find(d=>d.metric_key===k&&d.source_key===source)?.metric_label||k}</option>)}</select></div>
 {data.loading?<Empty text="Consultando resultados…"/>:data.error?<p role="alert" className="text-amber-300">{data.error} <button onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>:<>
 <p className="text-xs text-zinc-400">{definition?.metric_label||key} · {definition?.unit||"Unidad no informada"} · {chosen.assessment_date}. Misma fuente, prueba, lado y métrica; intentos principales, excluyendo errores de calidad.</p>
 <Bars color="#a5b4fc" unit={definition?.unit||""} data={scoped.map(r=>{const p=players.find(p=>p.id===r.player_id)||{};return {name:name(p),value:n(r.metrics?.[key]),photo:p.photo_url}}).sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity))}/>
 <SmallTable headers={["Jugador","Valor","Señales del registro"]} rows={scoped.map(r=>[<PlayerName player={players.find(p=>p.id===r.player_id)||{}}/>,fmt(r.metrics?.[key]),[...(r.flags||[]),r.quality_status==="warning"?"Revisar calidad":""].filter(Boolean).join(" · ")||"Sin señales registradas"])}/>
 </>}
 </div>;
}