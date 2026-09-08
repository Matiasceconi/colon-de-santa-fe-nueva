import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import React, { useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { MATCH_METRICS, PERIODS, fmt, periodRow, metricValue, metricUnit, pairedRows, mean, radarRows } from "./matchGpsAnalysis";
import { exportMatchGpsPDF } from "./matchGpsPDF";

const COLORS=["#38bdf8","#34d399","#fbbf24","#c4b5fd"];
const input="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-white";
const panel="rounded-xl border border-zinc-700 bg-zinc-900 p-4";
const tooltip={background:"#18181b",border:"1px solid #71717a",color:"#fff"};
function readConfig(key){try{return JSON.parse(localStorage.getItem(key)||"null")||{};}catch{return {};}}
export default function MatchGpsAnalysisStudio({ match, data }) {
  const {clubBrand,user,can}=useWorkspace();
  const {toast}=useToast();
  const key="match-gps-studio-v2:"+match.id+":"+(user?.id||"local");
  const [saved]=useState(()=>readConfig(key));
  const [period,setPeriod]=useState("total");
  const [mode,setMode]=useState("absolute");
  const [position,setPosition]=useState("all");
  const [cohort,setCohort]=useState("field");
  const [selected,setSelected]=useState([]);
  const [minimum,setMinimum]=useState(30);
  const [active,setActive]=useState("total_distance");
  const [notes,setNotes]=useState(saved.notes||"");
  const [charts,setCharts]=useState(Array.isArray(saved.charts)?saved.charts:[{id:"initial",type:"ranking",metric:"total_distance",include:true}]);
  const [exporting,setExporting]=useState(false);
  const refs=useRef({});
  const rows=data.rows.filter(r=>!r.unresolved);
  const positions=[...new Set(rows.map(r=>r.position||"Sin posición"))].sort();
  const scope=rows.filter(r=>(cohort!=="field"||!isGoalkeeper(r))&&(position==="all"||(r.position||"Sin posición")===position)&&(!selected.length||selected.includes(r.player_id)));
  const visible=scope.map(r=>{const p=periodRow(r,period);return p?{...r,...p,player_name:r.player_name,player_id:r.player_id,position:r.position}:null;}).filter(Boolean);
  const metric=MATCH_METRICS.find(m=>m.key===active);
  const pairs=pairedRows(scope,active,mode,minimum);
  const eligible=pairs.filter(r=>r.eligible);
  const a=mean(eligible.map(r=>r.first)),b=mean(eligible.map(r=>r.second));
  const valid=visible.map(r=>metricValue(r,active,mode)).filter(v=>v!==null);
  const highest=[...visible].filter(r=>metricValue(r,active,mode)!==null).sort((a,b)=>metricValue(b,active,mode)-metricValue(a,active,mode))[0];
  const context=PERIODS[period]+" · "+(mode==="relative"?"Por minuto GPS":"Valores absolutos")+" · "+(cohort==="field"?"Jugadores de campo":"Todos, incluidos arqueros")+" · "+(position==="all"?"Todas las posiciones":position);
  function updateChart(id,patch){setCharts(prev=>prev.map(c=>c.id===id?{...c,...patch}:c));}
  function save(){
    try{localStorage.setItem(key,JSON.stringify({charts,notes}));toast({title:"Diseño y observaciones guardados en este navegador"});}
    catch{toast({title:"No se pudo guardar el diseño",variant:"destructive"});}
  }
  async function exportPDF(){
    setExporting(true);
    try {
      assertExportAllowed(can,"/matches");
      await exportMatchGpsPDF({match,brand:clubBrand,rows:visible,sourceRows:scope,pairs,metric,mode,context,minimum,notes,warnings:data.warnings||[],
        charts:charts.filter(c=>c.include)});
    }catch(e){toast({title:"No se pudo exportar el informe",description:e.message,variant:"destructive"});}
    finally{setExporting(false);}
  }
  function renderChart(chart){
    const m=MATCH_METRICS.find(x=>x.key===chart.metric)||MATCH_METRICS[0];
    const chartPairs=pairedRows(scope,m.key,mode,minimum).filter(r=>r.eligible);
    const ranking=visible.map(r=>({...r,value:metricValue(r,m.key,mode)})).filter(r=>r.value!==null).sort((a,b)=>b.value-a.value);
    const radarPlayers=visible.slice(0,4);
    const radarData=radarRows(radarPlayers,mode);
    const empty=chart.type==="halves"?!chartPairs.length:!ranking.length;
    return <div ref={el=>{refs.current[chart.id]=el;}} className="rounded-xl bg-zinc-950 p-4 text-white">
      <h4 className="font-semibold text-white">{chart.type==="radar"?"Perfil relativo de jugadores":m.label+" · "+metricUnit(m,mode)}</h4>
      <p className="mb-4 text-xs text-zinc-300">{chart.type==="halves"?"Mismos jugadores en ambos tiempos · mínimo "+minimum+" min GPS por tiempo · n="+chartPairs.length:context}</p>
      {chart.type==="radar" ? <>
        <p className="text-xs text-zinc-300 mb-3">Hasta 4 jugadores según la selección. Cada eje: máximo del grupo mostrado = 100. No representa objetivo ni riesgo. Los valores faltantes no se completan.</p>
        <ResponsiveContainer width="100%" height={350}><RadarChart data={radarData}>
          <PolarGrid stroke="#52525b"/><PolarAngleAxis dataKey="metric" tick={{fill:"#e4e4e7",fontSize:11}}/><PolarRadiusAxis domain={[0,100]} tick={{fill:"#d4d4d8"}}/>
          {radarPlayers.map((r,i)=><Radar key={r.player_id} name={r.player_name} dataKey={"p"+i} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.12} connectNulls={false} isAnimationActive={false}/>)}
          <Legend/><Tooltip contentStyle={tooltip} formatter={v=>fmt(v)+" %"}/>
        </RadarChart></ResponsiveContainer>
        <p className="text-xs text-zinc-300">{radarData.map(r=>r.metric+": 100 = "+fmt(r.reference)+" "+r.unit).join(" · ")}</p>
      </> : empty ? <p className="py-10 text-center text-zinc-300">Sin datos comparables con estos filtros.</p> :
      <ResponsiveContainer width="100%" height={Math.max(280,(chart.type==="halves"?chartPairs.length:ranking.length)*40)}>
        <BarChart layout="vertical" data={chart.type==="halves"?chartPairs:ranking} margin={{left:0,right:20}}>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3"/><XAxis type="number" tick={{fill:"#d4d4d8",fontSize:11}}/><YAxis type="category" dataKey="player_name" width={155} tick={{fill:"#f4f4f5",fontSize:11}}/>
          <Tooltip contentStyle={tooltip} labelStyle={{color:"#fff"}} formatter={v=>fmt(v)+" "+metricUnit(m,mode)}/>
          {chart.type==="halves"?<><Bar dataKey="first" name="Primer tiempo" fill={COLORS[0]} isAnimationActive={false}/><Bar dataKey="second" name="Segundo tiempo" fill={COLORS[1]} isAnimationActive={false}/><Legend/></>:<Bar dataKey="value" name={m.label} fill={COLORS[0]} radius={[0,4,4,0]} isAnimationActive={false}/>}
        </BarChart>
      </ResponsiveContainer>}
    </div>;
  }
  return <div className="space-y-4 text-zinc-100">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-white">Centro de análisis GPS del partido</h2><p className="text-sm text-zinc-300">{data.total} jugadores · {data.raw_count||data.total} registros GPS · {data.resolved} identificados</p></div>
      <div className="flex gap-2"><button className={input} onClick={save}>Guardar diseño</button><button className={input+" border-emerald-500 text-emerald-200"} disabled={exporting||!visible.length} onClick={exportPDF}>{exporting?"Preparando PDF…":"Exportar informe PDF"}</button></div>
    </div>
    {!!data.warnings?.length&&<details className="rounded-xl border border-amber-600/50 bg-amber-950/20 p-3 text-amber-200"><summary>Revisión del CSV ({data.warnings.length})</summary><ul className="mt-2 list-disc pl-5 text-xs">{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    <div className={panel+" flex flex-wrap gap-3"}>
      <label className="text-xs text-zinc-300">Período<br/><select className={input} value={period} onChange={e=>setPeriod(e.target.value)}>{Object.entries(PERIODS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-xs text-zinc-300">Lectura<br/><select className={input} value={mode} onChange={e=>setMode(e.target.value)}><option value="absolute">Volumen absoluto</option><option value="relative">Intensidad por minuto GPS</option></select></label>
      <label className="text-xs text-zinc-300">Grupo<br/><select className={input} value={cohort} onChange={e=>setCohort(e.target.value)}><option value="field">Jugadores de campo</option><option value="all">Todos, incluidos arqueros</option></select></label>
      <label className="text-xs text-zinc-300">Posición<br/><select className={input} value={position} onChange={e=>setPosition(e.target.value)}><option value="all">Todas</option>{positions.map(p=><option key={p}>{p}</option>)}</select></label>
      <label className="text-xs text-zinc-300">Métrica de análisis<br/><select className={input} value={active} onChange={e=>setActive(e.target.value)}>{MATCH_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
    </div>
    <details className={panel}><summary className="cursor-pointer">Jugadores a visualizar ({selected.length?selected.length+" seleccionados":"todos"})</summary>
      <button onClick={()=>setSelected([])} className="my-3 text-sm text-sky-300">Mostrar todos</button><div className="flex flex-wrap gap-2">{rows.map(r=><label key={r.player_id} className="rounded-lg border border-zinc-600 px-3 py-2 text-sm"><input type="checkbox" className="mr-2" checked={selected.includes(r.player_id)} onChange={e=>setSelected(s=>e.target.checked?[...s,r.player_id]:s.filter(id=>id!==r.player_id))}/>{r.player_name}</label>)}</div>
    </details>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Cobertura del período",visible.length+" de "+scope.length+" jugadores"],
      ["Promedio observado · n="+valid.length,fmt(mean(valid))+" "+metricUnit(metric,mode)],
      ["Mayor valor observado",highest?highest.player_name+" · "+fmt(metricValue(highest,active,mode))+" "+metricUnit(metric,mode):"Sin dato"],
      ["Cambio 2T vs 1T · mismos jugadores",a>0?fmt((b-a)/a*100)+" % · n="+eligible.length:"Sin referencia comparable"],
    ].map(([title,value])=><div key={title} className={panel}><p className="text-xs text-zinc-300">{title}</p><p className="mt-2 text-lg font-semibold text-sky-200">{value}</p></div>)}</div>
    <p className="text-xs text-zinc-300">Duración = exposición GPS exportada, no minutos oficiales ni tiempo efectivo de juego. No se extrapola a 90 minutos. Velocidad máxima siempre en km/h. El total suma los períodos disponibles o conserva el Total del CSV, si existe.</p>
    <div className={panel}>
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">Comparación individual entre tiempos</h3><label className="text-xs text-zinc-300">Mínimo GPS en cada tiempo <input type="number" min="0" max="60" className={input+" w-20"} value={minimum} onChange={e=>setMinimum(Math.max(0,Math.min(60,Number(e.target.value)||0)))}/> min</label></div>
      <p className="my-2 text-xs text-zinc-300">Filtro operativo editable (30 min iniciales), no umbral de fatiga. Cambios absolutos y porcentuales calculados con los mismos jugadores. Un primer tiempo ausente no equivale a cero.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-zinc-300"><tr>{["Jugador","1T min","2T min","1T "+metricUnit(metric,mode),"2T "+metricUnit(metric,mode),"Diferencia","Cambio %"].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
        <tbody>{pairs.map(r=><tr key={r.player_id} className="border-t border-zinc-700"><td className="p-2">{r.player_name}</td>{[r.firstMinutes,r.secondMinutes,r.first,r.second,r.delta].map((v,i)=><td key={i} className="p-2">{fmt(v)}</td>)}<td className="p-2 text-sky-200">{!r.eligible?"No comparable":r.percent===null?"Base cero":fmt(r.percent)+" %"}</td></tr>)}</tbody></table></div>
    </div>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Constructor de gráficos</h3><button className={input} onClick={()=>setCharts(s=>[...s,{id:crypto.randomUUID(),type:"ranking",metric:active,include:true}])}>+ Agregar gráfico</button></div>
    {charts.map(c=><div key={c.id} className={panel}><div className="mb-3 flex flex-wrap items-center gap-3">
      <select aria-label="Tipo de gráfico" className={input} value={c.type} onChange={e=>updateChart(c.id,{type:e.target.value})}><option value="ranking">Comparar jugadores</option><option value="halves">Primer vs segundo tiempo</option><option value="radar">Radar de jugadores</option></select>
      {c.type!=="radar"&&<select aria-label="Métrica del gráfico" className={input} value={c.metric} onChange={e=>updateChart(c.id,{metric:e.target.value})}>{MATCH_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select>}
      <label className="text-sm"><input type="checkbox" className="mr-2" checked={c.include} onChange={e=>updateChart(c.id,{include:e.target.checked})}/>Incluir en informe</label>
      <button className="ml-auto text-sm text-rose-300" onClick={()=>setCharts(s=>s.filter(x=>x.id!==c.id))}>Quitar gráfico</button>
    </div>{renderChart(c)}</div>)}
    <div className={panel}><h3 className="mb-3 font-semibold">Carga por jugador · {PERIODS[period]}</h3>
      {!visible.length&&<p className="text-zinc-300">Sin registros para este período y selección.</p>}
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-xs"><thead className="text-zinc-300"><tr><th className="p-2 text-left">Jugador</th><th className="p-2">Min GPS</th>{MATCH_METRICS.map(m=><th key={m.key} className="p-2">{m.label}<br/>{metricUnit(m,mode)}</th>)}<th className="p-2">Origen del total</th></tr></thead>
      <tbody>{visible.map(r=><tr key={r.player_id} className="border-t border-zinc-700"><td className="p-2">{r.player_name}</td><td className="p-2">{fmt(r.total_duration)}</td>{MATCH_METRICS.map(m=><td key={m.key} className="p-2 text-center">{fmt(metricValue(r,m.key,mode))}</td>)}<td className="p-2">{r.total_source==="csv_total"?"CSV":r.total_source==="sum_halves"?"1T + 2T":r.total_source==="observed_half"?"Un tiempo registrado":"Sin detalle"}</td></tr>)}</tbody></table></div>
    </div>
    <div className={panel}><label className="font-semibold" htmlFor="match-gps-notes">Observaciones del profesional</label><textarea id="match-gps-notes" className={input+" mt-3 w-full"} rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexto del marcador, rol, sustituciones, incidencias y lectura del cuerpo técnico…"/><p className="text-xs text-zinc-400">Se incluyen en el PDF. Guardar diseño conserva gráficos y observaciones en este navegador.</p></div>
    <details className={panel}><summary className="cursor-pointer font-semibold">Cómo interpretar este análisis · fundamentos</summary><div className="mt-3 space-y-2 text-sm text-zinc-300">
      <p>Compará volumen e intensidad por separado, con duración, posición y contexto del marcador. Una caída no demuestra fatiga y un valor alto no equivale a lesión ni a mejor rendimiento.</p>
      <p>Los promedios incluyen únicamente valores informados (n visible); no convierten faltantes en cero. El radar normaliza cada eje y muestra su referencia; no mezcla unidades en una escala absoluta.</p>
      <p>Este CSV resume tiempos completos: no permite reconstruir picos móviles de 1, 3 o 5 minutos, tiempo efectivo de juego ni episodios de máxima exigencia.</p>
      <a className="block text-sky-300 underline" target="_blank" rel="noreferrer" href="https://doi.org/10.5114/biolsport.2025.144296">Morgans et al. (2025): tiempos, marcador e intensidad relativa</a>
      <a className="block text-sky-300 underline" target="_blank" rel="noreferrer" href="https://doi.org/10.5114/biolsport.2020.97067">Oliva-Lozano et al. (2020): períodos de máxima exigencia y contexto</a>
    </div></details>
  </div>;
}
