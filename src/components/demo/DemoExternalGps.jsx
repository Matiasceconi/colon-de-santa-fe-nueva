import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Check, ChevronRight, CircleAlert, Plus, RotateCcw, Save, Search,
  SlidersHorizontal, Sparkles, TableProperties, Target, Trash2, TrendingUp, UsersRound, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";

const METRICS = [
  { id: "distance", label: "Distancia total", unit: "m", color: "#3b82f6" },
  { id: "mmin", label: "m/min", unit: "m/min", color: "#2dd4bf" },
  { id: "highSpeed", label: "D >19.8", unit: "m", color: "#f59e0b" },
  { id: "sprintDistance", label: "D >25", unit: "m", color: "#f97316" },
  { id: "sprints", label: "Sprints", unit: "", color: "#fb7185" },
  { id: "acc", label: "ACC +3", unit: "", color: "#8b5cf6" },
  { id: "dec", label: "DEC -3", unit: "", color: "#ec4899" },
  { id: "playerLoad", label: "Player Load", unit: "UA", color: "#22c55e" },
  { id: "smax", label: "Smax", unit: "km/h", color: "#06b6d4" },
];

const PLAYERS = [
  { id: "p1", name: "Mateo Ríos", position: "Extremo", initials: "MR", photo: "https://i.pravatar.cc/160?img=12", factor: 1.08 },
  { id: "p2", name: "Tomás Vidal", position: "Central", initials: "TV", photo: "https://i.pravatar.cc/160?img=13", factor: .94 },
  { id: "p3", name: "Lautaro Benítez", position: "Lateral", initials: "LB", photo: "https://i.pravatar.cc/160?img=15", factor: 1.03 },
  { id: "p4", name: "Bruno Ferrer", position: "Volante", initials: "BF", photo: "https://i.pravatar.cc/160?img=11", factor: .99 },
  { id: "p5", name: "Julián Acosta", position: "Delantero", initials: "JA", photo: "https://i.pravatar.cc/160?img=14", factor: 1.12 },
  { id: "p6", name: "Santiago Leiva", position: "Volante", initials: "SL", photo: "https://i.pravatar.cc/160?img=16", factor: .91 },
  { id: "p7", name: "Nicolás Pereyra", position: "Lateral", initials: "NP", photo: "https://i.pravatar.cc/160?img=17", factor: 1.01 },
  { id: "p8", name: "Franco Molina", position: "Central", initials: "FM", photo: "https://i.pravatar.cc/160?img=18", factor: .97 },
];

const SESSIONS = [
  { id: "s1", date: "26/08/2026", iso: "2026-08-26", title: "MD-3 · Alta intensidad", md: "MD-3", objective: "Intensidad", type: "Entrenamiento", duration: 86, players: 26, quality: 98, base: { distance: 6980, mmin: 113, highSpeed: 792, sprintDistance: 188, sprints: 10, acc: 27, dec: 31, playerLoad: 648, smax: 32.1 } },
  { id: "s2", date: "25/08/2026", iso: "2026-08-25", title: "MD-4 · Volumen", md: "MD-4", objective: "Volumen", type: "Entrenamiento", duration: 94, players: 27, quality: 96, base: { distance: 8420, mmin: 106, highSpeed: 655, sprintDistance: 122, sprints: 7, acc: 23, dec: 25, playerLoad: 731, smax: 31.4 } },
  { id: "s3", date: "23/08/2026", iso: "2026-08-23", title: "Partido vs Atlético Central", md: "MD", objective: "Competencia", type: "Partido", duration: 96, players: 16, quality: 100, base: { distance: 10180, mmin: 108, highSpeed: 931, sprintDistance: 274, sprints: 13, acc: 31, dec: 35, playerLoad: 889, smax: 33.2 } },
  { id: "s4", date: "21/08/2026", iso: "2026-08-21", title: "MD-2 · Velocidad", md: "MD-2", objective: "Velocidad", type: "Entrenamiento", duration: 74, players: 25, quality: 94, base: { distance: 5740, mmin: 117, highSpeed: 844, sprintDistance: 231, sprints: 12, acc: 25, dec: 28, playerLoad: 572, smax: 32.8 } },
  { id: "s5", date: "20/08/2026", iso: "2026-08-20", title: "MD-3 · Específico", md: "MD-3", objective: "Intensidad", type: "Entrenamiento", duration: 82, players: 26, quality: 97, base: { distance: 6520, mmin: 111, highSpeed: 718, sprintDistance: 169, sprints: 9, acc: 29, dec: 33, playerLoad: 624, smax: 31.9 } },
  { id: "s6", date: "18/08/2026", iso: "2026-08-18", title: "MD-5 · Regenerativo", md: "MD-5", objective: "Recuperación", type: "Entrenamiento", duration: 52, players: 24, quality: 92, base: { distance: 3720, mmin: 82, highSpeed: 164, sprintDistance: 21, sprints: 2, acc: 14, dec: 16, playerLoad: 318, smax: 28.6 } },
];

const DEFAULT_METRICS = ["distance", "mmin", "highSpeed", "sprints", "acc", "dec"];
const DEFAULT_RULES = [
  { id: "r1", metric: "mmin", op: ">", value: 115, color: "#f59e0b" },
  { id: "r2", metric: "playerLoad", op: ">", value: 760, color: "#ef4444" },
];
const DEFAULT_CHARTS = [
  { id: "c1", metric: "distance", style: "bar" },
  { id: "c2", metric: "mmin", style: "line" },
];

function metric(id) { return METRICS.find((item) => item.id === id) || METRICS[0]; }
function fmt(value, id) {
  if (id === "distance" || id === "highSpeed" || id === "sprintDistance" || id === "playerLoad") return Math.round(value).toLocaleString("es-AR");
  if (id === "mmin" || id === "smax") return Number(value).toFixed(1);
  return Math.round(value);
}
function playerValue(session, player, id, index) {
  const variation = 1 + (((index * 7 + player.id.charCodeAt(1)) % 9) - 4) / 100;
  return session.base[id] * player.factor * variation;
}
function readSaved(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function Card({ children, className = "", ...props }) {
  return <section {...props} className={"overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/85 shadow-xl shadow-black/10 " + className}>{children}</section>;
}
function Tone({ value }) {
  const cls = value >= 97 ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" : value >= 94 ? "bg-amber-500/10 text-amber-300 ring-amber-500/20" : "bg-rose-500/10 text-rose-300 ring-rose-500/20";
  return <span className={"rounded-full px-2 py-1 text-[10px] font-bold ring-1 " + cls}>{value}% calidad</span>;
}

function SettingsPanel({ open, onClose, selectedMetrics, setSelectedMetrics, rules, setRules, charts, setCharts }) {
  const [tab, setTab] = useState("metrics");
  if (!open) return null;
  const addRule = () => setRules((current) => current.concat({ id: "r" + Date.now(), metric: "mmin", op: ">", value: 110, color: "#f59e0b" }));
  const addChart = () => setCharts((current) => current.concat({ id: "c" + Date.now(), metric: "playerLoad", style: "area" }));
  const patchRule = (id, patch) => setRules((current) => current.map((r) => r.id === id ? { ...r, ...patch } : r));
  const patchChart = (id, patch) => setCharts((current) => current.map((c) => c.id === id ? { ...c, ...patch } : c));
  return <div className="fixed inset-0 z-[80] bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
    <aside onClick={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Configuración personal</p><h2 className="mt-1 text-2xl font-black text-white">Diseñá tu análisis GPS</h2><p className="mt-1 text-xs text-zinc-500">Métricas, reglas y gráficos quedan guardados para esta cuenta.</p></div><button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-white"><X size={18}/></button></div>
      <div className="mt-5 flex gap-2 rounded-xl bg-white/[.04] p-1">{[["metrics","Métricas"],["rules","Reglas de color"],["charts","Gráficos"]].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={"flex-1 rounded-lg px-3 py-2 text-xs font-bold " + (tab === id ? "bg-cyan-500 text-zinc-950" : "text-zinc-500")}>{label}</button>)}</div>
      {tab === "metrics" && <div className="mt-5 grid gap-3 sm:grid-cols-2">{METRICS.map((m) => {
        const active = selectedMetrics.includes(m.id);
        return <button key={m.id} onClick={() => setSelectedMetrics((current) => active ? current.filter((id) => id !== m.id) : current.concat(m.id))} className={"flex items-center gap-3 rounded-xl border p-3 text-left " + (active ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-white/[.025]")}><span className={"flex h-5 w-5 items-center justify-center rounded-full border " + (active ? "border-cyan-400 bg-cyan-500 text-zinc-950" : "border-zinc-700")}>{active && <Check size={12}/>}</span><div><p className="text-xs font-bold text-white">{m.label}</p><p className="text-[10px] text-zinc-600">{m.unit || "repeticiones"}</p></div></button>;
      })}</div>}
      {tab === "rules" && <div className="mt-5 space-y-3">{rules.map((r) => <div key={r.id} className="grid gap-2 rounded-xl border border-white/10 bg-white/[.025] p-3 sm:grid-cols-[1fr_80px_90px_48px_36px]">
        <select value={r.metric} onChange={(e) => patchRule(r.id,{metric:e.target.value})} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white">{METRICS.map((m)=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
        <select value={r.op} onChange={(e) => patchRule(r.id,{op:e.target.value})} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white"><option value=">">Mayor</option><option value="<">Menor</option></select>
        <input type="number" value={r.value} onChange={(e) => patchRule(r.id,{value:Number(e.target.value)})} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white"/>
        <input type="color" value={r.color} onChange={(e) => patchRule(r.id,{color:e.target.value})} className="h-9 w-full rounded-lg bg-transparent"/>
        <button onClick={() => setRules((current)=>current.filter((item)=>item.id!==r.id))} className="text-zinc-600 hover:text-rose-400"><Trash2 size={15}/></button>
      </div>)}<button onClick={addRule} className="flex items-center gap-2 rounded-xl border border-dashed border-cyan-500/30 px-4 py-3 text-xs font-bold text-cyan-300"><Plus size={14}/> Crear regla</button><p className="text-xs text-zinc-600">Ejemplo: si m/min es mayor a 115, pintar la celda de amarillo.</p></div>}
      {tab === "charts" && <div className="mt-5 space-y-3">{charts.map((c,index) => <div key={c.id} className="grid gap-2 rounded-xl border border-white/10 bg-white/[.025] p-3 sm:grid-cols-[30px_1fr_130px_36px]"><span className="pt-2 text-xs font-black text-zinc-600">{index+1}</span><select value={c.metric} onChange={(e)=>patchChart(c.id,{metric:e.target.value})} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white">{METRICS.map((m)=><option key={m.id} value={m.id}>{m.label}</option>)}</select><select value={c.style} onChange={(e)=>patchChart(c.id,{style:e.target.value})} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white"><option value="bar">Barras</option><option value="line">Línea</option><option value="area">Área</option></select><button onClick={()=>setCharts((current)=>current.filter((item)=>item.id!==c.id))} className="text-zinc-600 hover:text-rose-400"><Trash2 size={15}/></button></div>)}<button onClick={addChart} disabled={charts.length >= 6} className="flex items-center gap-2 rounded-xl border border-dashed border-cyan-500/30 px-4 py-3 text-xs font-bold text-cyan-300 disabled:opacity-40"><Plus size={14}/> Agregar gráfico</button></div>}
      <div className="mt-6 flex gap-2 border-t border-white/10 pt-4"><button onClick={() => { setSelectedMetrics(DEFAULT_METRICS); setRules(DEFAULT_RULES); setCharts(DEFAULT_CHARTS); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-xs font-bold text-zinc-400"><RotateCcw size={14}/> Restaurar</button><button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-xs font-black text-zinc-950"><Save size={14}/> Guardar vista</button></div>
    </aside>
  </div>;
}

function PlayerDrawer({ player, sessions, onClose }) {
  if (!player) return null;
  const data = sessions.map((session,index) => ({ name: session.date.slice(0,5), distance: Math.round(playerValue(session,player,"distance",index)), mmin: Number(playerValue(session,player,"mmin",index).toFixed(1)), playerLoad: Math.round(playerValue(session,player,"playerLoad",index)) })).reverse();
  const totals = METRICS.map((m) => ({ ...m, value: sessions.reduce((sum,s,index)=>sum+playerValue(s,player,m.id,index),0) / (["mmin","smax"].includes(m.id) ? Math.max(1,sessions.length) : 1) }));
  return <div className="fixed inset-0 z-[85] bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}><aside onClick={(e)=>e.stopPropagation()} className="ml-auto h-full w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
    <div className="flex items-center gap-4 border-b border-white/10 pb-5"><img src={player.photo} alt={player.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-cyan-500/30" onError={(e)=>{e.currentTarget.style.display="none";}}/><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Carga individual · {sessions.length} sesión(es)</p><h2 className="mt-1 text-2xl font-black text-white">{player.name}</h2><p className="text-xs text-zinc-500">{player.position} · Reserva</p></div><button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-white/5"><X size={18}/></button></div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{totals.slice(0,8).map((m)=><div key={m.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-white">{fmt(m.value,m.id)}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{m.label} {m.unit && "· " + m.unit}</p></div>)}</div>
    <Card className="mt-5 p-4"><h3 className="text-sm font-bold text-white">Evolución individual</h3><p className="mt-1 text-xs text-zinc-500">Distancia y m/min por sesión seleccionada</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:25,right:20,left:0,bottom:0}}><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fill:"#71717a",fontSize:10}}/><YAxis yAxisId="left" tick={{fill:"#71717a",fontSize:10}}/><YAxis yAxisId="right" orientation="right" domain={["dataMin - 5","dataMax + 5"]} tick={{fill:"#71717a",fontSize:10}}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12}}/><Line yAxisId="left" type="monotone" dataKey="distance" stroke="#3b82f6" strokeWidth={3} name="Distancia"><LabelList dataKey="distance" position="top" fill="#d4d4d8" fontSize={10}/></Line><Line yAxisId="right" type="monotone" dataKey="mmin" stroke="#2dd4bf" strokeWidth={3} name="m/min"><LabelList dataKey="mmin" position="bottom" fill="#5eead4" fontSize={10}/></Line></LineChart></ResponsiveContainer></div></Card>
    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/[.07] p-4"><p className="flex items-center gap-2 text-xs font-bold text-amber-200"><Sparkles size={14}/> Lectura automática</p><p className="mt-2 text-xs leading-relaxed text-zinc-400">El jugador acumuló una exposición alta a velocidad y mantiene la intensidad dentro de su rango competitivo. Revisar recuperación si participa en la próxima sesión.</p></div>
  </aside></div>;
}

function DynamicChart({ config, sessions }) {
  const m = metric(config.metric);
  const data = sessions.map((s,index) => ({ name: s.date.slice(0,5), value: Number((PLAYERS.reduce((sum,p)=>sum+playerValue(s,p,m.id,index),0)/PLAYERS.length).toFixed(m.id==="mmin"||m.id==="smax"?1:0)) })).reverse();
  const common = <><CartesianGrid stroke="#27272a" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fill:"#71717a",fontSize:10}}/><YAxis tick={{fill:"#71717a",fontSize:10}}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12}} formatter={(v)=>[v+" "+m.unit,m.label]}/></>;
  return <Card data-tour="gps-charts" className="p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-bold text-white">{m.label}</h3><p className="mt-1 text-xs text-zinc-500">{sessions.length > 1 ? "Evolución de sesiones seleccionadas" : "Distribución de la sesión"} · {config.style}</p></div><span className="rounded-lg bg-white/5 px-2 py-1 text-[9px] font-bold uppercase text-zinc-600">Etiquetas activas</span></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%">
    {config.style === "bar" ? <BarChart data={data} margin={{top:25,right:10,left:0,bottom:0}}>{common}<Bar dataKey="value" fill={m.color} radius={[6,6,0,0]} name={m.label}><LabelList dataKey="value" position="top" fill="#e4e4e7" fontSize={11} fontWeight={700}/></Bar></BarChart> :
    config.style === "area" ? <AreaChart data={data} margin={{top:25,right:10,left:0,bottom:0}}>{common}<Area type="monotone" dataKey="value" stroke={m.color} fill={m.color} fillOpacity={.18} strokeWidth={3} name={m.label}><LabelList dataKey="value" position="top" fill="#e4e4e7" fontSize={11} fontWeight={700}/></Area></AreaChart> :
    <LineChart data={data} margin={{top:25,right:10,left:0,bottom:0}}>{common}<Line type="monotone" dataKey="value" stroke={m.color} strokeWidth={3} name={m.label} dot={{r:5,fill:"#09090b",strokeWidth:3}}><LabelList dataKey="value" position="top" fill="#e4e4e7" fontSize={11} fontWeight={700}/></Line></LineChart>}
  </ResponsiveContainer></div></Card>;
}

export default function DemoExternalGps() {
  const { user } = useAuth();
  const { activeSquad, activeSquadId } = useWorkspace();
  const key = "pp_demo_gps_view_v1:" + String(user?.email || user?.id || "demo").toLowerCase() + ":" + (activeSquadId || "reserva");
  const saved = useMemo(() => readSaved(key), [key]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(["s1"]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [objective, setObjective] = useState("Todos");
  const [selectedMetrics, setSelectedMetrics] = useState(saved?.metrics || DEFAULT_METRICS);
  const [rules, setRules] = useState(saved?.rules || DEFAULT_RULES);
  const [charts, setCharts] = useState(saved?.charts || DEFAULT_CHARTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [player, setPlayer] = useState(null);

  useEffect(() => { localStorage.setItem(key, JSON.stringify({metrics:selectedMetrics,rules,charts})); }, [key,selectedMetrics,rules,charts]);
  useEffect(() => {
    const handler = (event) => {
      if (event.detail === "gps-list") setView("list");
      if (event.detail === "gps-analysis") { setSelected(["s1","s2","s3"]); setView("analysis"); }
    };
    window.addEventListener("pp-demo-tour-view",handler);
    return () => window.removeEventListener("pp-demo-tour-view",handler);
  }, []);

  const filtered = SESSIONS.filter((s) => (type==="Todos"||s.type===type) && (objective==="Todos"||s.objective===objective) && (s.title.toLowerCase().includes(search.toLowerCase())||s.date.includes(search)));
  const selectedSessions = SESSIONS.filter((s)=>selected.includes(s.id));
  const toggle = (id) => setSelected((current)=>current.includes(id)?current.filter((item)=>item!==id):current.concat(id));
  const rows = PLAYERS.map((p,pIndex) => {
    const values = {};
    METRICS.forEach((m) => { values[m.id] = selectedSessions.reduce((sum,s,sIndex)=>sum+playerValue(s,p,m.id,pIndex+sIndex),0) / (["mmin","smax"].includes(m.id) ? Math.max(1,selectedSessions.length) : 1); });
    return { player:p,values };
  });
  const cellStyle = (id,value) => {
    const match = rules.find((r)=>r.metric===id && (r.op===">"?value>r.value:value<r.value));
    return match ? { backgroundColor: match.color+"28", color: match.color } : {};
  };

  if (view === "list") return <div className="mx-auto max-w-[1500px] space-y-5 pb-24">
    <section data-tour="gps-list-header" className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/70 via-zinc-900 to-zinc-950 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">Carga externa · GPS</p><h1 className="mt-2 text-3xl font-black text-white">Sesiones con datos procesados</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">Elegí una sesión para analizarla o combiná varias para consultar el acumulado del plantel y de cada jugador.</p><p className="mt-2 text-xs text-zinc-600">{activeSquad?.name || "Reserva"} · Temporada 2026 · Datos ficticios</p></div><div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-right"><p className="text-3xl font-black text-white">{SESSIONS.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">sesiones con GPS</p></div></div></section>
    <Card data-tour="gps-list-filters" className="p-4"><div className="flex flex-wrap gap-3"><label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-3 text-zinc-600"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar fecha, MD u objetivo..." className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-500"/></label><select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs font-bold text-white"><option>Todos</option><option>Entrenamiento</option><option>Partido</option></select><select value={objective} onChange={(e)=>setObjective(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs font-bold text-white"><option>Todos</option><option>Volumen</option><option>Intensidad</option><option>Velocidad</option><option>Recuperación</option><option>Competencia</option></select><button onClick={()=>{setSearch("");setType("Todos");setObjective("Todos");}} className="rounded-xl border border-white/10 px-3 text-xs font-bold text-zinc-500"><RotateCcw size={14}/></button></div></Card>
    <div data-tour="gps-session-list" className="space-y-3">{filtered.map((s,index)=>{const active=selected.includes(s.id);return <button key={s.id} onClick={()=>toggle(s.id)} className={"grid w-full items-center gap-4 rounded-2xl border p-4 text-left transition sm:grid-cols-[34px_120px_1fr_120px_100px_90px_28px] " + (active?"border-cyan-500/45 bg-cyan-500/[.09]":"border-white/10 bg-zinc-900/80 hover:border-white/20")} data-tour={index===0?"gps-session-item":undefined}><span className={"flex h-6 w-6 items-center justify-center rounded-md border " + (active?"border-cyan-400 bg-cyan-500 text-zinc-950":"border-zinc-700")}>{active&&<Check size={14}/>}</span><div><p className="text-xs font-black text-white">{s.date}</p><p className="text-[10px] text-zinc-600">{s.md}</p></div><div><p className="text-sm font-bold text-white">{s.title}</p><div className="mt-1 flex gap-2"><span className="text-[10px] text-zinc-500">{s.type}</span><span className="text-[10px] text-cyan-400">{s.objective}</span></div></div><div><p className="text-lg font-black text-white">{s.duration} min</p><p className="text-[9px] uppercase text-zinc-600">duración</p></div><div><p className="text-lg font-black text-white">{s.players}</p><p className="text-[9px] uppercase text-zinc-600">jugadores</p></div><Tone value={s.quality}/><ChevronRight size={16} className="text-zinc-700"/></button>})}</div>
    <div data-tour="gps-selection" className="sticky bottom-5 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl"><div><p className="text-sm font-black text-white">{selected.length} sesión(es) seleccionada(s)</p><p className="text-xs text-zinc-500">{selected.length>1?"Se calculará el acumulado y los promedios de intensidad.":"Se abrirá el análisis completo de la sesión."}</p></div><div className="flex gap-2"><button onClick={()=>setSelected([])} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-500">Limpiar</button><button disabled={!selected.length} onClick={()=>setView("analysis")} className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-zinc-950 disabled:opacity-40"><BarChart3 size={15}/> Analizar selección</button></div></div>
  </div>;

  return <div className="mx-auto max-w-[1600px] space-y-5 pb-24">
    <section data-tour="gps-analysis-header" className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/70 via-zinc-900 to-zinc-950 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex gap-3"><button onClick={()=>setView("list")} className="mt-1 rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">{selectedSessions.length>1?"Análisis acumulado":"Análisis de sesión"}</p><h1 className="mt-1 text-3xl font-black text-white">{selectedSessions.length>1?selectedSessions.length+" sesiones seleccionadas":selectedSessions[0]?.title}</h1><p className="mt-2 text-sm text-zinc-400">{selectedSessions.map((s)=>s.date+" · "+s.md).join("  |  ")}</p></div></div><div className="flex gap-2"><button data-tour="gps-config" onClick={()=>setSettingsOpen(true)} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200"><SlidersHorizontal size={15}/> Configurar análisis</button><button className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-zinc-950"><Save size={15}/> Guardar vista</button></div></div></section>
    <div data-tour="gps-kpis" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{selectedMetrics.slice(0,6).map((id)=>{const m=metric(id);const value=selectedSessions.reduce((sum,s)=>sum+s.base[id],0)/(["mmin","smax"].includes(id)?Math.max(1,selectedSessions.length):1);return <Card key={id} className="p-4"><p className="text-2xl font-black text-white">{fmt(value,id)} <span className="text-xs text-zinc-600">{m.unit}</span></p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{m.label}</p><p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400"><TrendingUp size={11}/> dentro del objetivo</p></Card>})}</div>
    <Card data-tour="gps-player-table"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="text-sm font-bold text-white">Carga por jugador</h2><p className="mt-1 text-xs text-zinc-500">Tocá la foto para abrir el detalle individual. Las reglas colorean automáticamente las celdas.</p></div><div className="flex gap-2"><span className="rounded-lg bg-white/5 px-3 py-2 text-[10px] font-bold text-zinc-500">{rules.length} reglas activas</span><button onClick={()=>setSettingsOpen(true)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400"><TableProperties size={14}/></button></div></div><div className="overflow-x-auto"><table className="min-w-full text-left"><thead><tr className="border-b border-white/10">{["Jugador"].concat(selectedMetrics).map((id)=><th key={id} className="whitespace-nowrap px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600">{id==="Jugador"?id:metric(id).label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.player.id} className="border-b border-white/[.06] last:border-0 hover:bg-white/[.025]"><td className="px-4 py-3"><button onClick={()=>setPlayer(row.player)} className="flex items-center gap-3 text-left"><img src={row.player.photo} alt={row.player.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"/><div><p className="whitespace-nowrap text-xs font-bold text-white">{row.player.name}</p><p className="text-[10px] text-zinc-600">{row.player.position}</p></div></button></td>{selectedMetrics.map((id)=><td key={id} className="px-4 py-3 text-sm font-black text-zinc-200" style={cellStyle(id,row.values[id])}>{fmt(row.values[id],id)} <span className="text-[9px] font-medium text-zinc-600">{metric(id).unit}</span></td>)}</tr>)}</tbody></table></div></Card>
    <div className="grid gap-5 xl:grid-cols-2">{charts.map((chart)=><DynamicChart key={chart.id} config={chart} sessions={selectedSessions}/>)}</div>
    <div data-tour="gps-alerts" className="grid gap-4 md:grid-cols-3"><Card className="border-amber-500/20 p-4"><p className="flex items-center gap-2 text-xs font-bold text-amber-300"><CircleAlert size={15}/> 3 exposiciones altas</p><p className="mt-2 text-xs text-zinc-500">Jugadores por encima del 115% de su perfil en alta velocidad.</p></Card><Card className="border-emerald-500/20 p-4"><p className="flex items-center gap-2 text-xs font-bold text-emerald-300"><Target size={15}/> Objetivo cumplido</p><p className="mt-2 text-xs text-zinc-500">La intensidad media quedó dentro del rango previsto.</p></Card><Card className="border-blue-500/20 p-4"><p className="flex items-center gap-2 text-xs font-bold text-blue-300"><UsersRound size={15}/> 2 cargas modificadas</p><p className="mt-2 text-xs text-zinc-500">Revisar jugadores con minutos competitivos acumulados.</p></Card></div>
    <SettingsPanel open={settingsOpen} onClose={()=>setSettingsOpen(false)} selectedMetrics={selectedMetrics} setSelectedMetrics={setSelectedMetrics} rules={rules} setRules={setRules} charts={charts} setCharts={setCharts}/>
    <PlayerDrawer player={player} sessions={selectedSessions} onClose={()=>setPlayer(null)}/>
  </div>;
}
