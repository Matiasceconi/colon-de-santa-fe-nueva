import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import React, { useMemo, useRef, useState } from "react";
import { BarChart, Bar, Line, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, LabelList } from "recharts";
import { BarChart3, FileDown, Gauge, LayoutDashboard, Plus, Settings2, Timer, Users, X } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { MATCH_METRICS, PERIODS, fmt, periodRow, metricValue, metricUnit, pairedRows, mean, radarRows } from "./matchGpsAnalysis";
import { exportMatchGpsPDF } from "./matchGpsPDF";
import MatchGpsPlayerTable from "./MatchGpsPlayerTable";

const COLORS=["#38bdf8","#34d399","#fbbf24","#c4b5fd"];
const panel="rounded-2xl border border-zinc-700 bg-zinc-900 p-4";
const input="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const tooltip={background:"#18181b",border:"1px solid #71717a",borderRadius:10,color:"#fff"};
const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());
function playerAxisRows(selectedRows,metric,mode){
  return selectedRows.map((r,i)=>({
    axisKey:`${r.player_id}-${i}`,
    player_name:r.player_name,
    photo_url:r.photo_url,
    position:r.position,
    value:metricValue(r,metric.key,metric.peak?"absolute":mode),
  })).filter(r=>r.value!=null);
}
function PlayerAxisTick({x,y,payload,rows}){
  const row=rows.find(r=>r.axisKey===payload.value);
  if(!row) return null;
  const label=row.player_name.length>10?row.player_name.slice(0,9)+"…":row.player_name;
  return <g transform={`translate(${x},${y})`}>
    {row.photo_url?<image href={row.photo_url} x={-12} y={7} width={24} height={24} preserveAspectRatio="xMidYMid slice"/>:<circle cx={0} cy={19} r={12} fill="#3f3f46"/>}
    <text x={0} y={39} textAnchor="middle" fill="#e4e4e7" fontSize={9} fontWeight={600}>{label}</text>
  </g>;
}
function readConfig(key){try{return JSON.parse(localStorage.getItem(key)||"null")||{};}catch{return {};}}
function initials(name){return String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function PlayerAvatar({row,size="h-12 w-12"}){
  const [failed,setFailed]=useState(false);
  if(!row?.photo_url||failed)return <div className={size+" flex shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 font-black text-zinc-300"}>{initials(row?.player_name)}</div>;
  return <img src={row.photo_url} alt={row.player_name} className={size+" shrink-0 rounded-xl border border-zinc-700 object-cover"} onError={()=>setFailed(true)}/>;
}
function participation(row){
  const ps=row.periods||[],a=ps.some(p=>p.period==="first_half"),b=ps.some(p=>p.period==="second_half");
  return a&&b?"1T + 2T":a?"Solo 1T":b?"Solo 2T":row.total_source==="csv_total"?"Total CSV":"Sin detalle";
}
function dataLabel({x,y,width,height,value}){return value==null?null:<text x={x+width+7} y={y+height/2+4} fill="#f4f4f5" fontSize="11">{fmt(value)}</text>;}
function Kpi({icon:Icon,title,value,detail}){
  return <div className={panel}><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-zinc-400">{title}</p><p className="mt-3 text-2xl font-black text-white">{value}</p></div><span className="h-fit rounded-xl bg-sky-400/10 p-2 text-sky-300"><Icon size={18}/></span></div><p className="mt-2 text-xs text-zinc-500">{detail}</p></div>;
}
function Ranking({rows,metric,mode,labels=true}){
  const values=rows.map(r=>({...r,value:metricValue(r,metric.key,mode)})).filter(r=>r.value!=null).sort((a,b)=>b.value-a.value);
  if(!values.length)return <p className="py-14 text-center text-zinc-400">Sin datos para esta selección.</p>;
  return <ResponsiveContainer width="100%" height={Math.max(300,values.length*42)}><BarChart layout="vertical" data={values} margin={{right:labels?76:24,left:8}}><CartesianGrid stroke="#3f3f46" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:"#d4d4d8",fontSize:11}}/><YAxis type="category" dataKey="player_name" width={150} tick={{fill:"#f4f4f5",fontSize:11}}/><Tooltip contentStyle={tooltip} formatter={v=>fmt(v)+" "+metricUnit(metric,mode)}/><Bar dataKey="value" fill={COLORS[0]} radius={[0,5,5,0]} isAnimationActive={false}>{labels&&<LabelList dataKey="value" content={dataLabel}/>}</Bar></BarChart></ResponsiveContainer>;
}
function Halves({rows,metric,mode,minimum,labels=true}){
  const values=pairedRows(rows,metric.key,mode,minimum).filter(r=>r.eligible);
  if(!values.length)return <p className="py-14 text-center text-zinc-400">No hay jugadores con ambos tiempos y el mínimo indicado.</p>;
  return <ResponsiveContainer width="100%" height={Math.max(320,values.length*54)}><BarChart layout="vertical" data={values} margin={{right:labels?76:24,left:8}}><CartesianGrid stroke="#3f3f46" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:"#d4d4d8",fontSize:11}}/><YAxis type="category" dataKey="player_name" width={150} tick={{fill:"#f4f4f5",fontSize:11}}/><Tooltip contentStyle={tooltip} formatter={v=>fmt(v)+" "+metricUnit(metric,mode)}/><Legend/><Bar dataKey="first" name="Primer tiempo" fill={COLORS[0]} isAnimationActive={false}>{labels&&<LabelList dataKey="first" content={dataLabel}/>}</Bar><Bar dataKey="second" name="Segundo tiempo" fill={COLORS[1]} isAnimationActive={false}>{labels&&<LabelList dataKey="second" content={dataLabel}/>}</Bar></BarChart></ResponsiveContainer>;
}
function Leader({title,row,metric,mode}){
  return <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3"><PlayerAvatar row={row}/><div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-zinc-500">{title}</p><p className="truncate font-semibold text-white">{row?.player_name||"Sin dato"}</p><p className="text-sm font-bold text-sky-300">{row?fmt(metricValue(row,metric.key,mode))+" "+metricUnit(metric,mode):"—"}</p></div></div>;
}

export default function MatchGpsAnalysisStudioV3({match,data}){
  const {clubBrand,user,can}=useWorkspace(); const {toast}=useToast();
  const storageKey="match-gps-studio-v3:"+match.id+":"+(user?.id||"local");
  const [saved]=useState(()=>readConfig(storageKey));
  const [view,setView]=useState("summary"),[period,setPeriod]=useState("total"),[mode,setMode]=useState("absolute");
  const [cohort,setCohort]=useState("field"),[position,setPosition]=useState("all"),[selected,setSelected]=useState([]);
  const [active,setActive]=useState("total_distance"),[minimum,setMinimum]=useState(15),[notes,setNotes]=useState(saved.notes||"");
  const [charts,setCharts]=useState(Array.isArray(saved.charts)&&saved.charts.length?saved.charts:[
    {id:"distance",type:"ranking",metric:"total_distance",period:"total",labels:true,include:true,color:"#38bdf8"},
    {id:"halves",type:"halves",metric:"total_distance",period:"total",labels:true,include:true,color:"#38bdf8"},
  ]);
  const [exporting,setExporting]=useState(false); const refs=useRef({});
  const rows=useMemo(()=>(data.rows||[]).filter(r=>!r.unresolved),[data.rows]);
  const positions=useMemo(()=>[...new Set(rows.map(r=>r.position||"Sin posición"))].sort(),[rows]);
  const scope=useMemo(()=>rows.filter(r=>(cohort!=="field"||!isGoalkeeper(r))&&(position==="all"||(r.position||"Sin posición")===position)&&(!selected.length||selected.includes(r.player_id))),[rows,cohort,position,selected]);
  const rowsAt=p=>scope.map(r=>{const pr=periodRow(r,p);return pr?{...r,...pr,player_name:r.player_name,player_id:r.player_id,photo_url:r.photo_url,position:r.position,periods:r.periods,total_source:r.total_source}:null;}).filter(Boolean);
  const visible=useMemo(()=>rowsAt(period),[scope,period]);
  const metric=MATCH_METRICS.find(m=>m.key===active)||MATCH_METRICS[0];
  const pairs=pairedRows(scope,active,mode,minimum),eligible=pairs.filter(r=>r.eligible);
  const firstMean=mean(eligible.map(r=>r.first)),secondMean=mean(eligible.map(r=>r.second));
  const context=PERIODS[period]+" · "+(mode==="relative"?"por minuto GPS":"valores absolutos")+" · "+(cohort==="field"?"jugadores de campo":"todos");
  const average=key=>mean(visible.map(r=>metricValue(r,key,key==="max_velocity"?"absolute":mode)));
  const leader=key=>[...visible].filter(r=>metricValue(r,key,mode)!=null).sort((a,b)=>metricValue(b,key,mode)-metricValue(a,key,mode))[0];
  const updateChart=(id,patch)=>setCharts(s=>s.map(c=>c.id===id?{...c,...patch}:c));
  function save(){try{localStorage.setItem(storageKey,JSON.stringify({charts,notes}));toast({title:"Diseño del informe guardado"});}catch{toast({title:"No se pudo guardar el diseño",variant:"destructive"});}}
  async function exportPDF(){setExporting(true);try{assertExportAllowed(can,"/matches");await exportMatchGpsPDF({match,brand:clubBrand,rows:visible,sourceRows:scope,pairs,metric,mode,context,minimum,notes,warnings:data.warnings||[],charts:charts.filter(c=>c.include)});}catch(e){toast({title:"No se pudo exportar",description:e.message,variant:"destructive"});}finally{setExporting(false);}}
  function renderChart(c){
    const m=MATCH_METRICS.find(x=>x.key===c.metric)||MATCH_METRICS[0],selectedRows=rowsAt(c.period||"total");
    const color=c.color||COLORS[0];
    if(c.type==="halves")return <Halves rows={scope} metric={m} mode={mode} minimum={minimum} labels={c.labels!==false}/>;
    if(c.type==="radar"){const ps=selectedRows.slice(0,4),rd=radarRows(ps,mode);return <><ResponsiveContainer width="100%" height={360}><RadarChart data={rd}><PolarGrid stroke="#52525b"/><PolarAngleAxis dataKey="metric" tick={{fill:"#e4e4e7",fontSize:11}}/><PolarRadiusAxis domain={[0,100]} tick={{fill:"#d4d4d8"}}/>{ps.map((r,i)=><Radar key={r.player_id} name={r.player_name} dataKey={"p"+i} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} isAnimationActive={false}/>)}<Legend/><Tooltip contentStyle={tooltip} formatter={v=>fmt(v)+" %"}/></RadarChart></ResponsiveContainer><p className="text-xs text-zinc-400">{rd.map(r=>r.metric+": 100 = "+fmt(r.reference)+" "+r.unit).join(" · ")}</p></>;}
    if(["bar","line","area"].includes(c.type)){
      const data=playerAxisRows(selectedRows,m,mode);
      if(!data.length)return <p className="py-14 text-center text-zinc-400">Sin datos para esta selección.</p>;
      const height=Math.max(300,data.length*38+60);
      const unit=metricUnit(m,mode);
      const gid=`grad-${c.id}`;
      return <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{left:0,right:18,top:34,bottom:10}}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.45}/><stop offset="95%" stopColor={color} stopOpacity={0.03}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false}/>
          <XAxis dataKey="axisKey" height={48} interval={0} tick={<PlayerAxisTick rows={data}/>} tickLine={false} axisLine={{stroke:"#52525b"}}/>
          <YAxis domain={[0,(mx)=>Math.max(1,Math.ceil(Number(mx||0)*1.16))]} tick={{fill:"#a1a1aa",fontSize:10}} width={52}/>
          <Tooltip contentStyle={tooltip} formatter={v=>fmt(v)+" "+unit} labelFormatter={(_,p)=>p?.[0]?.payload?.player_name||""}/>
          {c.type==="bar"&&<Bar dataKey="value" name={m.label} fill={color} radius={[5,5,0,0]} fillOpacity={0.82} isAnimationActive={false}>{c.labels!==false&&<LabelList dataKey="value" position="top" offset={8} formatter={v=>fmt(v)} fill="#f4f4f5" fontSize={11} fontWeight={800}/>}</Bar>}
          {c.type==="line"&&<Line dataKey="value" name={m.label} stroke={color} strokeWidth={3} type="monotone" dot={{r:4,fill:color}} activeDot={{r:6}} isAnimationActive={false}>{c.labels!==false&&<LabelList dataKey="value" position="top" offset={9} formatter={v=>fmt(v)} fill="#f4f4f5" fontSize={11} fontWeight={800}/>}</Line>}
          {c.type==="area"&&<Area dataKey="value" name={m.label} stroke={color} strokeWidth={3} type="monotone" fill={`url(#${gid})`} isAnimationActive={false}>{c.labels!==false&&<LabelList dataKey="value" position="top" offset={9} formatter={v=>fmt(v)} fill="#f4f4f5" fontSize={11} fontWeight={800}/>}</Area>}
        </ComposedChart>
      </ResponsiveContainer>;
    }
    return <Ranking rows={selectedRows} metric={m} mode={mode} labels={c.labels!==false}/>;
  }
  return <div className="space-y-5 text-zinc-100">
    <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950">
      <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-300">GPS de partido</p><h2 className="mt-1 text-2xl font-black text-white">Informe principal del partido</h2><p className="mt-1 text-sm text-zinc-400">{data.total} jugadores consolidados · {data.raw_count||data.total} períodos · un total por jugador</p></div><div className="flex flex-wrap gap-2"><button className={input} onClick={save}><Settings2 size={15} className="mr-2 inline"/>Guardar diseño</button><button className={input+" border-emerald-500 text-emerald-200"} disabled={exporting||!visible.length} onClick={exportPDF}><FileDown size={15} className="mr-2 inline"/>{exporting?"Preparando PDF…":"Exportar informe"}</button></div></div>
      <div className="grid grid-cols-3 gap-2 p-3">{[["summary",LayoutDashboard,"Resumen"],["halves",Timer,"Por tiempos"],["charts",BarChart3,"Gráficos"]].map(([id,Icon,label])=><button key={id} onClick={()=>setView(id)} className={"flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold "+(view===id?"bg-sky-400 text-zinc-950":"bg-zinc-900 text-zinc-300 hover:bg-zinc-800")}><Icon size={16}/>{label}</button>)}</div>
    </section>
    {!!data.warnings?.length&&<details className="rounded-xl border border-amber-600/50 bg-amber-950/20 p-3 text-amber-200"><summary>Revisión del CSV ({data.warnings.length})</summary><ul className="mt-2 list-disc pl-5 text-xs">{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    <section className={panel+" flex flex-wrap gap-3"}>
      <label className="text-xs text-zinc-400">Período<br/><select className={input} value={period} onChange={e=>setPeriod(e.target.value)}>{Object.entries(PERIODS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-xs text-zinc-400">Lectura<br/><select className={input} value={mode} onChange={e=>setMode(e.target.value)}><option value="absolute">Volumen absoluto</option><option value="relative">Intensidad por minuto GPS</option></select></label>
      <label className="text-xs text-zinc-400">Grupo<br/><select className={input} value={cohort} onChange={e=>setCohort(e.target.value)}><option value="field">Jugadores de campo</option><option value="all">Todos</option></select></label>
      <label className="text-xs text-zinc-400">Posición<br/><select className={input} value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Todas</option>{positions.map(p=><option key={p}>{p}</option>)}</select></label>
    </section>
    <details className={panel}><summary className="cursor-pointer font-semibold">Filtrar jugadores ({selected.length?selected.length+" seleccionados":"todos"})</summary><button onClick={()=>setSelected([])} className="my-3 text-sm text-sky-300">Mostrar todos</button><div className="flex flex-wrap gap-2">{rows.map(r=><label key={r.player_id} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(r.player_id)} onChange={e=>setSelected(s=>e.target.checked?[...s,r.player_id]:s.filter(id=>id!==r.player_id))}/><PlayerAvatar row={r} size="h-7 w-7"/>{r.player_name}</label>)}</div></details>

    {view==="summary"&&<>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={Users} title="Jugadores observados" value={visible.length+" / "+scope.length} detail={PERIODS[period]}/><Kpi icon={Gauge} title="Distancia promedio" value={fmt(average("total_distance"))+" "+metricUnit(MATCH_METRICS[0],mode)} detail="Solo valores informados"/><Kpi icon={Timer} title="m/min promedio" value={fmt(mean(visible.map(r=>r.meters_per_minute)))+" m/min"} detail="Duración GPS"/><Kpi icon={Gauge} title="Mayor velocidad" value={fmt(Math.max(...visible.map(r=>Number(r.max_velocity)).filter(Number.isFinite),0))+" km/h"} detail="Máximo observado"/></div>
      <section className={panel}><h3 className="text-lg font-bold text-white">Destacados del partido</h3><p className="mb-4 text-xs text-zinc-400">Máximos descriptivos observados; no equivalen a rendimiento global, riesgo ni diagnóstico.</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{["total_distance","distance_hsr","sprint_distance","max_velocity"].map(k=>{const m=MATCH_METRICS.find(x=>x.key===k);return <Leader key={k} title={m.label} row={leader(k)} metric={m} mode={mode}/>;})}</div></section>
      <MatchGpsPlayerTable rows={visible} mode={mode}/>
      <section className={panel}><h3 className="text-lg font-bold text-white">Jugadores del partido</h3><p className="mb-4 text-xs text-zinc-400">Cada jugador aparece una vez; los tiempos quedan dentro de su ficha.</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(r=><article key={r.player_id} className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4"><div className="flex items-center gap-3"><PlayerAvatar row={r} size="h-16 w-16"/><div className="min-w-0"><p className="truncate font-bold text-white">{r.player_name}</p><p className="text-xs text-zinc-400">{r.position||"Sin posición"}</p><span className="mt-2 inline-flex rounded-full bg-sky-400/10 px-2 py-1 text-[11px] font-semibold text-sky-300">{participation(r)}</span></div></div><div className="mt-4 grid grid-cols-2 gap-2">{[["Distancia",fmt(r.total_distance)+" m"],["m/min",fmt(r.meters_per_minute)],["D >25",fmt(r.sprint_distance)+" m"],["Smax",fmt(r.max_velocity)+" km/h"]].map(([l,v])=><div key={l} className="rounded-lg bg-zinc-900 p-2"><p className="text-[10px] uppercase text-zinc-500">{l}</p><p className="font-bold text-white">{v}</p></div>)}</div></article>)}</div></section>
      <section className={panel}><h3 className="mb-3 text-lg font-bold text-white">Ranking principal · distancia total</h3><Ranking rows={visible} metric={MATCH_METRICS[0]} mode={mode} labels/></section>
    </>}
    {view==="halves"&&<>
      <section className={panel+" flex flex-wrap items-end gap-3"}><label className="text-xs text-zinc-400">Métrica<br/><select className={input} value={active} onChange={e=>setActive(e.target.value)}>{MATCH_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></label><label className="text-xs text-zinc-400">Mínimo por tiempo<br/><input type="number" min="0" max="60" className={input+" w-24"} value={minimum} onChange={e=>setMinimum(Math.max(0,Math.min(60,Number(e.target.value)||0)))}/></label><div className="ml-auto rounded-xl bg-zinc-950 px-4 py-2 text-sm">Cambio grupal: <strong>{firstMean>0?fmt((secondMean-firstMean)/firstMean*100)+" %":"Sin referencia"}</strong> · n={eligible.length}</div></section>
      <section className={panel}><h3 className="text-lg font-bold">Primer tiempo vs segundo tiempo</h3><p className="mb-4 text-xs text-zinc-400">Compara al mismo jugador; un tiempo ausente nunca se reemplaza por cero.</p><Halves rows={scope} metric={metric} mode={mode} minimum={minimum} labels/></section>
      <section className={panel}><h3 className="mb-3 text-lg font-bold">Detalle individual</h3><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="text-zinc-400"><tr>{["Jugador","Participación","Min 1T","Min 2T","Valor 1T","Valor 2T","Diferencia","Cambio"].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{pairs.map(r=><tr key={r.player_id} className="border-t border-zinc-800"><td className="p-2"><span className="flex items-center gap-2"><PlayerAvatar row={r} size="h-8 w-8"/>{r.player_name}</span></td><td className="p-2">{participation(r)}</td><td className="p-2">{fmt(r.firstMinutes)}</td><td className="p-2">{fmt(r.secondMinutes)}</td><td className="p-2">{fmt(r.first)}</td><td className="p-2">{fmt(r.second)}</td><td className="p-2">{fmt(r.delta)}</td><td className="p-2 font-semibold text-sky-300">{!r.eligible?"No comparable":r.percent==null?"Base cero":fmt(r.percent)+" %"}</td></tr>)}</tbody></table></div></section>
    </>}
    {view==="charts"&&<>
      <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Constructor de gráficos</h3><p className="text-xs text-zinc-400">Elegí estilo, período, métrica, color y etiquetas. Todo entra al PDF.</p></div><button className={input} onClick={()=>setCharts(s=>[...s,{id:uid(),type:"bar",metric:active,period,labels:true,include:true,color:COLORS[s.length%COLORS.length]}])}><Plus size={15} className="mr-2 inline"/>Agregar gráfico</button></div></section>
      {charts.map(c=><section key={c.id} className={panel}><div className="mb-4 flex flex-wrap items-center gap-3"><select className={input} value={c.type} onChange={e=>updateChart(c.id,{type:e.target.value})}><option value="bar">Barras verticales</option><option value="line">Línea</option><option value="area">Área</option><option value="ranking">Ranking horizontal</option><option value="halves">Primer vs segundo tiempo</option><option value="radar">Radar</option></select><select className={input} value={c.metric} onChange={e=>updateChart(c.id,{metric:e.target.value})}>{MATCH_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select>{c.type!=="halves"&&<select className={input} value={c.period||"total"} onChange={e=>updateChart(c.id,{period:e.target.value})}>{Object.entries(PERIODS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>}<label className="flex items-center gap-1.5 text-sm text-zinc-300"><span className="text-xs text-zinc-500">Color</span><input type="color" value={c.color||COLORS[0]} onChange={e=>updateChart(c.id,{color:e.target.value})} className="h-8 w-10 cursor-pointer rounded border border-zinc-600 bg-zinc-950"/></label><label className="text-sm"><input type="checkbox" className="mr-2" checked={c.labels!==false} onChange={e=>updateChart(c.id,{labels:e.target.checked})}/>Etiquetas</label><label className="text-sm"><input type="checkbox" className="mr-2" checked={c.include!==false} onChange={e=>updateChart(c.id,{include:e.target.checked})}/>Incluir en informe</label><button className="ml-auto inline-flex items-center gap-1 text-sm text-rose-300" onClick={()=>setCharts(s=>s.filter(x=>x.id!==c.id))}><X size={14}/>Quitar</button></div><div ref={el=>{refs.current[c.id]=el;}} className="rounded-xl bg-zinc-950 p-4"><h4 className="font-semibold">{c.type==="radar"?"Perfil relativo":MATCH_METRICS.find(m=>m.key===c.metric)?.label}</h4><p className="mb-3 text-xs text-zinc-400">{c.type==="halves"?"Comparación del mismo jugador":PERIODS[c.period||"total"]}</p>{renderChart(c)}</div></section>)}
    </>}
    <section className={panel}><label className="font-semibold" htmlFor="match-gps-notes">Observaciones del profesional</label><textarea id="match-gps-notes" className={input+" mt-3 w-full"} rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Marcador, rol, sustituciones, incidencias y lectura del cuerpo técnico…"/><p className="mt-2 text-xs text-zinc-500">Se incluyen en el informe exportable.</p></section>
    <p className="text-xs leading-relaxed text-zinc-400">El total suma los tiempos disponibles o conserva el total explícito del CSV; nunca suma Total + tiempos. La duración es exposición GPS y no se extrapola a 90 minutos. Una diferencia entre tiempos no demuestra por sí sola fatiga.</p>
  </div>;
}