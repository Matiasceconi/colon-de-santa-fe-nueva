import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Activity, BellRing, Check, CircleAlert, ClipboardCheck, Dumbbell, Gauge, GripVertical,
  HeartPulse, Maximize2, Minimize2, Plus, RotateCcw, ShieldCheck, SlidersHorizontal,
  Sparkles, Target, Trash2, TrendingUp, UsersRound, X, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";

const CATALOG = [
  { id:"overview", title:"Resumen del área", description:"Indicadores principales de rendimiento", icon:Activity, size:"wide" },
  { id:"alerts", title:"Alertas de jugadores", description:"Situaciones que necesitan revisión", icon:BellRing, size:"normal" },
  { id:"external", title:"Carga externa", description:"Volumen, intensidad y velocidad", icon:Gauge, size:"wide" },
  { id:"internal", title:"Carga interna", description:"RPE, carga y respuesta individual", icon:HeartPulse, size:"normal" },
  { id:"readiness", title:"Disponibilidad y wellness", description:"Estado diario del plantel", icon:ShieldCheck, size:"normal" },
  { id:"evaluations", title:"Evaluaciones", description:"CMJ, fuerza y asimetrías", icon:Dumbbell, size:"wide" },
  { id:"exposure", title:"Exposición a velocidad", description:"Smax y dosis semanal", icon:Zap, size:"normal" },
  { id:"players", title:"Jugadores a seguir", description:"Prioridades individuales", icon:UsersRound, size:"wide" },
  { id:"quality", title:"Calidad del dato", description:"Estado de integraciones y registros", icon:ClipboardCheck, size:"normal" },
];

const DEFAULT_WIDGETS = [
  {id:"overview",size:"wide"},{id:"alerts",size:"normal"},{id:"external",size:"wide"},
  {id:"readiness",size:"normal"},{id:"internal",size:"normal"},{id:"evaluations",size:"wide"},
  {id:"exposure",size:"normal"},{id:"players",size:"wide"},{id:"quality",size:"normal"},
];

const LOAD = [
  {day:"Lun",distance:5.8,mmin:93,rpe:310},{day:"Mar",distance:8.4,mmin:107,rpe:506},
  {day:"Mié",distance:7.0,mmin:113,rpe:464},{day:"Jue",distance:5.7,mmin:117,rpe:355},
  {day:"Vie",distance:3.9,mmin:88,rpe:214},{day:"Sáb",distance:10.2,mmin:108,rpe:612},
];
const EVALS = [
  {name:"Ríos",cmj:38.2,asymmetry:4.1},{name:"Vidal",cmj:35.7,asymmetry:8.4},
  {name:"Benítez",cmj:41.3,asymmetry:3.2},{name:"Ferrer",cmj:39.1,asymmetry:5.8},
  {name:"Acosta",cmj:42.0,asymmetry:2.9},
];
const ALERTS = [
  {name:"Mateo Ríos",text:"Alta velocidad: 126% del objetivo semanal",area:"Carga externa",priority:"alta",tone:"amber"},
  {name:"Tomás Vidal",text:"Wellness muscular bajo + CMJ -8%",area:"Integrada",priority:"alta",tone:"rose"},
  {name:"Santiago Leiva",text:"Carga interna 24% sobre su media",area:"Carga interna",priority:"media",tone:"blue"},
  {name:"Julián Acosta",text:"Exposición a Smax insuficiente en 14 días",area:"Velocidad",priority:"media",tone:"amber"},
];
const FOLLOW = [
  {name:"Tomás Vidal",reason:"Respuesta neuromuscular",status:"Revisar hoy",tone:"rose"},
  {name:"Mateo Ríos",reason:"Exposición acumulada",status:"Monitorear",tone:"amber"},
  {name:"Julián Acosta",reason:"Dosis de velocidad",status:"Planificar",tone:"blue"},
];

function readSaved(key) { try { const value=JSON.parse(localStorage.getItem(key)||"null"); return value?.widgets?.length?value:null; } catch { return null; } }
function Card({children,className="",...props}) { return <section {...props} className={"h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/85 shadow-xl shadow-black/10 "+className}>{children}</section>; }
function Header({icon:Icon,title,subtitle,action}) { return <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20"><Icon size={17}/></span><div><h2 className="text-sm font-bold text-white">{title}</h2><p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p></div></div>{action}</div>; }

function Library({widgets,onChange,onClose,onReset}) {
  const active=new Map(widgets.map((w)=>[w.id,w]));
  return <div className="fixed inset-0 z-[80] bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}><aside onClick={(e)=>e.stopPropagation()} className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Biblioteca personal</p><h2 className="mt-1 text-2xl font-black text-white">Widgets de Rendimiento</h2><p className="mt-1 text-xs text-zinc-500">Cada integrante guarda su propia combinación.</p></div><button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5"><X size={18}/></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{CATALOG.map((item)=>{const Icon=item.icon;const selected=active.has(item.id);return <button key={item.id} onClick={()=>onChange(selected?widgets.filter((w)=>w.id!==item.id):widgets.concat({id:item.id,size:item.size}))} className={"rounded-2xl border p-4 text-left "+(selected?"border-violet-500/40 bg-violet-500/10":"border-white/10 bg-white/[.025]")}><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-violet-300"><Icon size={17}/></span><span className={"flex h-5 w-5 items-center justify-center rounded-full border "+(selected?"border-violet-400 bg-violet-500 text-white":"border-zinc-700")}>{selected&&<Check size={12}/>}</span></div><p className="mt-3 text-sm font-bold text-white">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.description}</p></button>})}</div><div className="mt-6 flex gap-2 border-t border-white/10 pt-4"><button onClick={onReset} className="flex-1 rounded-xl border border-white/10 py-3 text-xs font-bold text-zinc-400">Restaurar recomendado</button><button onClick={onClose} className="flex-1 rounded-xl bg-violet-500 py-3 text-xs font-black text-white">Listo</button></div></aside></div>;
}

function WidgetShell({widget,index,editing,provided,onRemove,onResize,children}) {
  const span=widget.size==="full"?"md:col-span-12":widget.size==="wide"?"md:col-span-12 xl:col-span-8":"md:col-span-6 xl:col-span-4";
  return <div ref={provided.innerRef} {...provided.draggableProps} className={span}>{editing&&<div className="mb-2 flex items-center justify-between rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2"><span {...provided.dragHandleProps} className="flex cursor-grab items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-200"><GripVertical size={14}/> Widget {index+1}</span><div className="flex gap-1"><button onClick={onResize} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10">{widget.size==="normal"?<Maximize2 size={13}/>:<Minimize2 size={13}/>}</button><button onClick={onRemove} className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 size={13}/></button></div></div>}{children}</div>;
}

export default function DemoPerformanceDashboard() {
  const {user}=useAuth();
  const {activeSquad,activeSquadId,activeAreaName}=useWorkspace();
  const member=String(user?.email||user?.id||"demo").toLowerCase();
  const key="pp_demo_performance_dashboard_v1:"+member+":"+(activeSquadId||"reserva")+":"+String(activeAreaName||"rendimiento").toLowerCase().replace(/\s+/g,"-");
  const saved=useMemo(()=>readSaved(key),[key]);
  const [widgets,setWidgets]=useState(saved?.widgets||DEFAULT_WIDGETS);
  const [filters,setFilters]=useState(saved?.filters||{period:"7d",status:"todos",squad:"Reserva"});
  const [editing,setEditing]=useState(false);
  const [library,setLibrary]=useState(false);

  useEffect(()=>{const next=readSaved(key);setWidgets(next?.widgets||DEFAULT_WIDGETS);setFilters(next?.filters||{period:"7d",status:"todos",squad:"Reserva"});},[key]);
  useEffect(()=>{localStorage.setItem(key,JSON.stringify({widgets,filters}));},[key,widgets,filters]);
  const resize=(id)=>setWidgets((current)=>current.map((w)=>w.id===id?{...w,size:w.size==="normal"?"wide":w.size==="wide"?"full":"normal"}:w));
  const drag=({source,destination})=>{if(!destination)return;setWidgets((current)=>{const next=[...current];const [item]=next.splice(source.index,1);next.splice(destination.index,0,item);return next;});};
  const visibleAlerts=ALERTS.filter((a)=>filters.status==="todos"||a.priority===filters.status);

  const render=(widget)=>{
    if(widget.id==="overview") return <Card data-tour="performance-overview"><Header icon={Activity} title="Estado general del rendimiento" subtitle="Reserva · Últimos 7 días"/><div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">{[["Disponibles","24/27","text-emerald-400"],["Carga semanal","31,6 km","text-blue-400"],["Alertas activas","4","text-amber-400"],["Datos completos","96%","text-violet-400"]].map(([label,value,color])=><div key={label} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><p className={"text-2xl font-black "+color}>{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</p></div>)}</div></Card>;
    if(widget.id==="alerts") return <Card data-tour="performance-alerts"><Header icon={BellRing} title="Alertas integradas" subtitle="Cruce automático de diferentes fuentes"/><div>{visibleAlerts.map((a)=><div key={a.name+a.text} className="flex gap-3 border-b border-white/[.06] p-4 last:border-0"><span className={"mt-1 h-2.5 w-2.5 rounded-full "+(a.tone==="rose"?"bg-rose-400":a.tone==="amber"?"bg-amber-400":"bg-blue-400")}/><div><p className="text-xs font-bold text-white">{a.name}</p><p className="mt-1 text-xs leading-relaxed text-zinc-400">{a.text}</p><p className="mt-1 text-[10px] text-zinc-600">{a.area} · {a.priority}</p></div></div>)}</div></Card>;
    if(widget.id==="external") return <Card data-tour="performance-external"><Header icon={Gauge} title="Carga externa semanal" subtitle="Distancia e intensidad por día"/><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={LOAD} margin={{top:22,right:10,left:0,bottom:0}}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="day" tick={{fill:"#71717a",fontSize:10}}/><YAxis tick={{fill:"#71717a",fontSize:10}}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12}}/><Bar dataKey="distance" name="Distancia km" fill="#3b82f6" radius={[6,6,0,0]}><LabelList dataKey="distance" position="top" fill="#d4d4d8" fontSize={10}/></Bar></BarChart></ResponsiveContainer></div></Card>;
    if(widget.id==="internal") return <Card data-tour="performance-internal"><Header icon={HeartPulse} title="Carga interna" subtitle="RPE × duración"/><div className="p-4"><div className="flex items-end justify-between"><div><p className="text-3xl font-black text-white">2.461 <span className="text-xs text-zinc-600">UA</span></p><p className="mt-1 text-xs text-emerald-400">+4% vs semana previa</p></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Rango esperado</span></div><div className="mt-5 h-32"><ResponsiveContainer width="100%" height="100%"><AreaChart data={LOAD}><Area type="monotone" dataKey="rpe" stroke="#ec4899" fill="#ec4899" fillOpacity={.16} strokeWidth={3}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46"}}/><XAxis dataKey="day" hide/><YAxis hide/></AreaChart></ResponsiveContainer></div></div></Card>;
    if(widget.id==="readiness") return <Card data-tour="performance-readiness"><Header icon={ShieldCheck} title="Disponibilidad y wellness" subtitle="Lectura de esta mañana"/><div className="grid grid-cols-2 gap-3 p-4">{[["Disponibles",24,"text-emerald-400"],["Diferenciados",2,"text-amber-400"],["Molestias",3,"text-rose-400"],["Wellness bajo",2,"text-blue-400"]].map(([l,v,c])=><div key={l} className="rounded-xl bg-black/20 p-3"><p className={"text-2xl font-black "+c}>{v}</p><p className="mt-1 text-[9px] font-bold uppercase text-zinc-600">{l}</p></div>)}</div></Card>;
    if(widget.id==="evaluations") return <Card data-tour="performance-evaluations"><Header icon={Dumbbell} title="Evaluaciones neuromusculares" subtitle="CMJ y asimetría · Último control"/><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={EVALS} margin={{top:22,right:10,left:0,bottom:0}}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fill:"#71717a",fontSize:10}}/><YAxis domain={[30,45]} tick={{fill:"#71717a",fontSize:10}}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12}}/><Bar dataKey="cmj" name="CMJ cm" fill="#8b5cf6" radius={[6,6,0,0]}><LabelList dataKey="cmj" position="top" fill="#ddd6fe" fontSize={10}/></Bar></BarChart></ResponsiveContainer></div></Card>;
    if(widget.id==="exposure") return <Card data-tour="performance-exposure"><Header icon={Zap} title="Exposición a velocidad" subtitle="Dosis semanal por encima del 90% Smax"/><div className="p-5"><p className="text-4xl font-black text-white">72%</p><p className="mt-1 text-xs text-zinc-500">18 de 25 jugadores expuestos</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"/></div><p className="mt-4 flex items-center gap-2 text-xs text-amber-300"><CircleAlert size={14}/> 7 jugadores necesitan dosis</p></div></Card>;
    if(widget.id==="players") return <Card data-tour="performance-follow"><Header icon={UsersRound} title="Jugadores a seguir" subtitle="Priorización diaria del área"/><div>{FOLLOW.map((p)=><div key={p.name} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-white/[.06] px-4 py-3 last:border-0"><div><p className="text-xs font-bold text-white">{p.name}</p><p className="text-[10px] text-zinc-600">{p.reason}</p></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={"h-full rounded-full "+(p.tone==="rose"?"w-[86%] bg-rose-500":p.tone==="amber"?"w-[68%] bg-amber-500":"w-[52%] bg-blue-500")}/></div><span className="rounded-lg bg-white/5 px-2 py-1 text-[9px] font-bold text-zinc-400">{p.status}</span></div>)}</div></Card>;
    if(widget.id==="quality") return <Card data-tour="performance-quality"><Header icon={ClipboardCheck} title="Calidad del dato" subtitle="Fuentes actualizadas"/><div className="space-y-3 p-4">{[["GPS / Tracking",98],["Wellness",92],["RPE",89],["Evaluaciones",100]].map(([l,v])=><div key={l}><div className="mb-1 flex justify-between text-xs"><span className="text-zinc-400">{l}</span><strong className={v>=95?"text-emerald-400":"text-amber-400"}>{v}%</strong></div><div className="h-1.5 rounded-full bg-zinc-800"><div style={{width:v+"%"}} className="h-full rounded-full bg-violet-500"/></div></div>)}</div></Card>;
    return null;
  };

  return <div className="mx-auto max-w-[1550px] space-y-5 pb-24">
    <section data-tour="performance-personal" className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/70 via-zinc-900 to-zinc-950 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">Centro de Rendimiento</p><h1 className="mt-2 text-3xl font-black text-white">Tablero de Rendimiento</h1><p className="mt-2 text-sm text-zinc-400">{user?.full_name||user?.email||"Profesional de rendimiento"} · {activeSquad?.name||"Reserva"} · {activeAreaName||"Rendimiento"}</p><p className="mt-1 text-xs text-zinc-600">Vista personal guardada por cuenta, plantel y función.</p></div><div className="flex flex-wrap gap-2"><select data-tour="performance-filters" value={filters.period} onChange={(e)=>setFilters((f)=>({...f,period:e.target.value}))} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white"><option value="hoy">Hoy</option><option value="7d">7 días</option><option value="28d">28 días</option></select><select value={filters.status} onChange={(e)=>setFilters((f)=>({...f,status:e.target.value}))} className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white"><option value="todos">Todas las alertas</option><option value="alta">Prioridad alta</option><option value="media">Prioridad media</option></select><button data-tour="performance-widgets" onClick={()=>setEditing((v)=>!v)} className={"flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold "+(editing?"border-emerald-500/30 bg-emerald-500/15 text-emerald-200":"border-violet-500/30 bg-violet-500/10 text-violet-200")}>{editing?<Check size={15}/>:<SlidersHorizontal size={15}/>} {editing?"Finalizar edición":"Editar tablero"}</button>{editing&&<button onClick={()=>setLibrary(true)} className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-black text-white"><Plus size={15}/> Agregar widgets</button>}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-3"><p className="flex items-center gap-2 text-xs font-bold text-emerald-300"><TrendingUp size={14}/> Carga controlada</p><p className="mt-1 text-[10px] text-zinc-500">Plantel dentro del rango semanal</p></div><div className="rounded-xl border border-amber-500/20 bg-amber-500/[.07] p-3"><p className="flex items-center gap-2 text-xs font-bold text-amber-300"><BellRing size={14}/> 4 alertas abiertas</p><p className="mt-1 text-[10px] text-zinc-500">2 requieren revisión hoy</p></div><div className="rounded-xl border border-violet-500/20 bg-violet-500/[.07] p-3"><p className="flex items-center gap-2 text-xs font-bold text-violet-300"><Sparkles size={14}/> Información integrada</p><p className="mt-1 text-[10px] text-zinc-500">GPS + RPE + wellness + evaluaciones</p></div></div></section>
    {editing&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[.08] px-4 py-3"><p className="flex items-center gap-2 text-xs text-violet-100"><GripVertical size={15}/><strong>Arrastrá, redimensioná u ocultá widgets.</strong></p><button onClick={()=>{setWidgets(DEFAULT_WIDGETS);setFilters({period:"7d",status:"todos",squad:"Reserva"});}} className="flex items-center gap-2 text-xs font-bold text-zinc-400"><RotateCcw size={13}/> Restaurar recomendado</button></div>}
    <DragDropContext onDragEnd={drag}><Droppable droppableId="performance-dashboard">{(drop)=><div ref={drop.innerRef} {...drop.droppableProps} className="grid grid-cols-1 gap-5 md:grid-cols-12">{widgets.map((widget,index)=><Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!editing}>{(provided)=><WidgetShell widget={widget} index={index} editing={editing} provided={provided} onResize={()=>resize(widget.id)} onRemove={()=>setWidgets((current)=>current.filter((w)=>w.id!==widget.id))}>{render(widget)}</WidgetShell>}</Draggable>)}{drop.placeholder}</div>}</Droppable></DragDropContext>
    {!widgets.length&&<div className="rounded-2xl border border-white/10 bg-zinc-900 p-12 text-center"><Target size={28} className="mx-auto text-zinc-700"/><h3 className="mt-3 font-bold text-white">Tu tablero está vacío</h3><button onClick={()=>setLibrary(true)} className="mt-4 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white">Agregar widgets</button></div>}
    <p className="text-center text-[10px] text-zinc-700">Vista personal · {member} · {activeSquad?.name||"Reserva"} · {activeAreaName||"Rendimiento"}</p>
    {library&&<Library widgets={widgets} onChange={setWidgets} onClose={()=>setLibrary(false)} onReset={()=>setWidgets(DEFAULT_WIDGETS)}/>}
  </div>;
}
