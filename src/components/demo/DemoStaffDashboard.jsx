import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Activity, BellRing, CalendarDays, Check, ChevronRight, ClipboardList, Clock3, Gauge, GripVertical, HeartPulse, Maximize2,
  MessageSquareText, Minimize2, Plus, RotateCcw, Settings2, ShieldCheck,
  SlidersHorizontal, Target, Trash2, Trophy, UsersRound, X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";

const CATALOG = [
  { id: "today", title: "Agenda de hoy", description: "Actividades del plantel", icon: CalendarDays, size: "wide" },
  { id: "availability", title: "Disponibilidad", description: "Estado actual del plantel", icon: ShieldCheck, size: "normal" },
  { id: "next_match", title: "Próximo partido", description: "Contexto competitivo", icon: Trophy, size: "normal" },
  { id: "session", title: "Próxima sesión", description: "Objetivo y contenidos", icon: ClipboardList, size: "wide" },
  { id: "gps", title: "Carga y GPS", description: "Última lectura física", icon: Gauge, size: "normal" },
  { id: "alerts", title: "Alertas del staff", description: "Situaciones prioritarias", icon: BellRing, size: "wide" },
  { id: "tasks", title: "Pendientes personales", description: "Tareas propias del usuario", icon: Target, size: "normal" },
  { id: "notes", title: "Notas rápidas", description: "Notas privadas del usuario", icon: MessageSquareText, size: "normal" },
];

const DEFAULT_WIDGETS = [
  { id: "today", size: "wide" },
  { id: "availability", size: "normal" },
  { id: "next_match", size: "normal" },
  { id: "session", size: "wide" },
  { id: "gps", size: "normal" },
  { id: "alerts", size: "wide" },
  { id: "tasks", size: "normal" },
  { id: "notes", size: "normal" },
];

const DEFAULT_FILTERS = { period: "hoy", area: "todas", priority: "todas" };
const EVENTS = [
  { time: "08:45", title: "Desayuno y control de hidratación", place: "Comedor", area: "Nutrición" },
  { time: "10:00", title: "Sesión MD-3 · Alta intensidad", place: "Campo 2", area: "Cuerpo Técnico" },
  { time: "12:00", title: "Recuperación individual", place: "Gimnasio", area: "Rendimiento" },
  { time: "16:30", title: "Video prepartido", place: "Sala táctica", area: "Cuerpo Técnico" },
];
const ALERTS = [
  { id: 1, player: "Mateo Ríos", text: "Carga aguda por encima del objetivo", area: "Rendimiento", priority: "alta", tone: "amber" },
  { id: 2, player: "Tomás Vidal", text: "Molestia posterior informada en wellness", area: "Médica", priority: "alta", tone: "rose" },
  { id: 3, player: "Bruno Ferrer", text: "Control antropométrico pendiente", area: "Nutrición", priority: "media", tone: "blue" },
];

function readSaved(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed?.widgets?.length ? parsed : null;
  } catch {
    return null;
  }
}

function Card({ children, ...props }) {
  return <section {...props} className="h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/85 shadow-xl shadow-black/10">{children}</section>;
}

function Header({ icon: Icon, title, subtitle }) {
  return <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"><Icon size={17}/></span><div><h2 className="text-sm font-bold text-white">{title}</h2><p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p></div></div>;
}

function WidgetShell({ widget, index, editing, provided, onRemove, onResize, children }) {
  const width = widget.size === "full" ? "md:col-span-12" : widget.size === "wide" ? "md:col-span-12 xl:col-span-8" : "md:col-span-6 xl:col-span-4";
  return <div ref={provided.innerRef} {...provided.draggableProps} className={width}>
    {editing && <div className="mb-2 flex items-center justify-between rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2"><span {...provided.dragHandleProps} className="flex cursor-grab items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-200"><GripVertical size={14}/> Widget {index + 1}</span><div className="flex gap-1"><button onClick={onResize} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white">{widget.size === "normal" ? <Maximize2 size={13}/> : <Minimize2 size={13}/>}</button><button onClick={onRemove} className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 size={13}/></button></div></div>}
    {children}
  </div>;
}

function Library({ widgets, onChange, onClose, onReset }) {
  const active = new Map(widgets.map((w) => [w.id, w]));
  const toggle = (item) => onChange(active.has(item.id) ? widgets.filter((w) => w.id !== item.id) : [...widgets, { id: item.id, size: item.size }]);
  return <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}><div onClick={(e)=>e.stopPropagation()} className="ml-auto h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Biblioteca personal</p><h2 className="mt-1 text-xl font-black text-white">Widgets del Cuerpo Técnico</h2><p className="mt-1 text-xs text-zinc-500">Cada usuario arma su propia vista del plantel.</p></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"><X size={18}/></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{CATALOG.map((item)=>{const Icon=item.icon;const selected=active.has(item.id);return <button key={item.id} onClick={()=>toggle(item)} className={`rounded-2xl border p-4 text-left transition ${selected?"border-blue-500/40 bg-blue-500/10":"border-white/10 bg-white/[0.025] hover:border-white/20"}`}><div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-blue-300"><Icon size={17}/></span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected?"border-blue-400 bg-blue-500 text-white":"border-zinc-700"}`}>{selected&&<Check size={12}/>}</span></div><p className="mt-3 text-sm font-bold text-white">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.description}</p></button>})}</div><div className="mt-6 flex gap-2 border-t border-white/10 pt-4"><button onClick={onReset} className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/5">Restaurar recomendado</button><button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500">Listo</button></div></div></div>;
}

export default function DemoStaffDashboard() {
  const { user } = useAuth();
  const { activeSquad, activeSquadId, activeAreaName } = useWorkspace();
  const memberKey = String(user?.email || user?.id || "demo").toLowerCase();
  const squadKey = activeSquadId || activeSquad?.id || "reserva";
  const roleKey = String(activeAreaName || user?.role || "staff").toLowerCase().replace(/\s+/g, "-");
  const storageKey = `pp_demo_staff_dashboard_v1:${memberKey}:${squadKey}:${roleKey}`;
  const initial = useMemo(() => readSaved(storageKey), [storageKey]);
  const [widgets, setWidgets] = useState(initial?.widgets || DEFAULT_WIDGETS);
  const [filters, setFilters] = useState(initial?.filters || DEFAULT_FILTERS);
  const [notes, setNotes] = useState(initial?.notes || ["Revisar video del rival", "Confirmar pelota parada"]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    const saved = readSaved(storageKey);
    setWidgets(saved?.widgets || DEFAULT_WIDGETS);
    setFilters(saved?.filters || DEFAULT_FILTERS);
    setNotes(saved?.notes || ["Revisar video del rival", "Confirmar pelota parada"]);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ widgets, filters, notes }));
  }, [storageKey, widgets, filters, notes]);

  const visibleAlerts = ALERTS.filter((a) => (filters.area === "todas" || a.area === filters.area) && (filters.priority === "todas" || a.priority === filters.priority));
  const activeFilters = Object.entries(filters).filter(([k,v]) => v !== DEFAULT_FILTERS[k]).length;
  const reset = () => { setWidgets(DEFAULT_WIDGETS); setFilters(DEFAULT_FILTERS); };
  const resize = (id) => setWidgets((current)=>current.map((w)=>w.id===id?{...w,size:w.size==="normal"?"wide":w.size==="wide"?"full":"normal"}:w));
  const onDragEnd = ({source,destination}) => { if(!destination)return; setWidgets((current)=>{const next=[...current];const [moved]=next.splice(source.index,1);next.splice(destination.index,0,moved);return next;}); };

  const renderWidget = (widget) => {
    if (widget.id === "today") return <Card data-tour="staff-agenda"><Header icon={CalendarDays} title="Agenda de hoy" subtitle="Reserva · Miércoles 26 de agosto"/><div className="space-y-2 p-4">{EVENTS.filter((e)=>filters.area==="todas"||e.area===filters.area).map((e)=><div key={e.title} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3"><span className="w-12 text-xs font-black text-white">{e.time}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{e.title}</p><p className="mt-0.5 text-[10px] text-zinc-500">{e.place} · {e.area}</p></div><ChevronRight size={14} className="text-zinc-700"/></div>)}</div></Card>;
    if (widget.id === "availability") return <Card data-tour="staff-availability"><Header icon={UsersRound} title="Disponibilidad" subtitle="Plantel Reserva"/><div className="grid grid-cols-2 gap-3 p-4">{[["Disponibles",24,"text-emerald-400"],["Diferenciados",2,"text-amber-400"],["Lesionados",1,"text-rose-400"],["Convocados",23,"text-blue-400"]].map(([l,v,c])=><div key={l} className="rounded-xl bg-black/20 p-3"><p className={`text-2xl font-black ${c}`}>{v}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{l}</p></div>)}</div></Card>;
    if (widget.id === "next_match") return <Card><Header icon={Trophy} title="Próximo partido" subtitle="Torneo de Reserva · Fecha 17"/><div className="p-5"><p className="text-xl font-black text-white">Performance FC <span className="text-zinc-600">vs</span> Deportivo Norte</p><p className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><Clock3 size={13}/> Domingo 30 · 16:00</p><p className="mt-2 text-xs text-zinc-500">Estadio Performance · Local</p></div></Card>;
    if (widget.id === "session") return <Card><Header icon={ClipboardList} title="Próxima sesión" subtitle="MD-3 · Alta intensidad"/><div className="grid gap-3 p-4 sm:grid-cols-3">{[["Duración","85 min"],["Objetivo","Alta intensidad"],["Jugadores","24 + 2 diferenciados"]].map(([l,v])=><div key={l} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{l}</p><p className="mt-2 text-sm font-black text-white">{v}</p></div>)}</div></Card>;
    if (widget.id === "gps") return <Card data-tour="staff-gps"><Header icon={Activity} title="Carga y GPS" subtitle="Último entrenamiento procesado"/><div className="grid grid-cols-2 gap-3 p-4">{[["m/min","112"],["D >19.8","725 m"],["Sprints","9"],["Player Load","642"]].map(([l,v])=><div key={l} className="rounded-xl bg-black/20 p-3"><p className="text-lg font-black text-white">{v}</p><p className="text-[9px] uppercase tracking-wider text-zinc-600">{l}</p></div>)}</div></Card>;
    if (widget.id === "alerts") return <Card data-tour="staff-alerts"><Header icon={HeartPulse} title="Alertas del staff" subtitle="Información compartida según permisos"/><div>{visibleAlerts.map((a)=><div key={a.id} className="flex gap-3 border-b border-white/[0.06] p-4 last:border-0"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${a.tone==="rose"?"bg-rose-400":a.tone==="amber"?"bg-amber-400":"bg-blue-400"}`}/><div><p className="text-xs font-bold text-white">{a.player}</p><p className="mt-1 text-xs text-zinc-400">{a.text}</p><p className="mt-1 text-[10px] text-zinc-600">{a.area} · Prioridad {a.priority}</p></div></div>)}</div></Card>;
    if (widget.id === "tasks") return <Card><Header icon={Target} title="Pendientes personales" subtitle="Solo visibles para este usuario"/><div className="space-y-2 p-4">{["Confirmar convocatoria","Preparar pelota parada","Revisar informe rival"].map((task,i)=><label key={task} className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-3 text-xs text-zinc-300"><input type="checkbox" defaultChecked={i===2} className="accent-blue-500"/>{task}</label>)}</div></Card>;
    if (widget.id === "notes") return <Card data-tour="staff-notes"><Header icon={MessageSquareText} title="Notas rápidas" subtitle="Guardadas para este usuario, plantel y función"/><div className="p-4"><div className="flex gap-2"><input value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&draft.trim()){setNotes((n)=>[draft.trim(),...n]);setDraft("");}}} placeholder="Escribir nota..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"/><button onClick={()=>{if(draft.trim()){setNotes((n)=>[draft.trim(),...n]);setDraft("");}}} className="rounded-xl bg-blue-600 px-3 text-white"><Plus size={15}/></button></div><div className="mt-3 space-y-2">{notes.map((note,i)=><div key={`${note}-${i}`} className="group flex items-center gap-2 rounded-xl bg-white/[0.035] p-3"><p className="flex-1 text-xs text-zinc-300">{note}</p><button onClick={()=>setNotes((n)=>n.filter((_,idx)=>idx!==i))} className="text-zinc-700 opacity-0 group-hover:opacity-100"><X size={13}/></button></div>)}</div></div></Card>;
    return null;
  };

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-24">
    <section data-tour="staff-personal" className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/85 via-zinc-900 to-zinc-950 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Tablero personal del Cuerpo Técnico</p><h1 className="mt-2 text-3xl font-black text-white">{activeSquad?.name || "Reserva"}</h1><p className="mt-2 text-sm text-zinc-400">{user?.full_name || user?.email || "Miembro del staff"} · {activeAreaName || "Cuerpo Técnico"}</p><p className="mt-1 text-xs text-zinc-600">Esta vista es independiente para cada usuario, plantel y función.</p></div><div className="flex flex-wrap gap-2"><select data-tour="staff-filters" value={filters.area} onChange={(e)=>setFilters((f)=>({...f,area:e.target.value}))} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-bold text-white"><option value="todas">Todas las áreas</option><option>Cuerpo Técnico</option><option>Rendimiento</option><option>Médica</option><option>Nutrición</option></select><select value={filters.priority} onChange={(e)=>setFilters((f)=>({...f,priority:e.target.value}))} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-bold text-white"><option value="todas">Toda prioridad</option><option value="alta">Alta</option><option value="media">Media</option></select><button data-tour="staff-widgets" onClick={()=>setEditing((v)=>!v)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${editing?"border-emerald-500/30 bg-emerald-500/15 text-emerald-200":"border-blue-500/25 bg-blue-500/10 text-blue-200"}`}>{editing?<Check size={15}/>:<SlidersHorizontal size={15}/>} {editing?"Finalizar edición":"Editar tablero"}</button>{editing&&<button onClick={()=>setLibraryOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"><Plus size={15}/> Agregar widgets</button>}</div></div>{activeFilters>0&&<p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-blue-300">{activeFilters} filtros activos</p>}</section>
    {editing&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/[0.08] px-4 py-3"><p className="flex items-center gap-2 text-xs text-blue-100"><GripVertical size={15}/><strong>Arrastrá, cambiá tamaños u ocultá widgets.</strong></p><button onClick={reset} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><RotateCcw size={13}/> Restaurar recomendado</button></div>}
    <DragDropContext onDragEnd={onDragEnd}><Droppable droppableId="staff-dashboard">{(drop)=><div ref={drop.innerRef} {...drop.droppableProps} className="grid grid-cols-1 gap-5 md:grid-cols-12">{widgets.map((widget,index)=><Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!editing}>{(drag)=><WidgetShell widget={widget} index={index} editing={editing} provided={drag} onResize={()=>resize(widget.id)} onRemove={()=>setWidgets((w)=>w.filter((item)=>item.id!==widget.id))}>{renderWidget(widget)}</WidgetShell>}</Draggable>)}{drop.placeholder}</div>}</Droppable></DragDropContext>
    {!widgets.length&&<div className="rounded-2xl border border-white/10 bg-zinc-900 p-12 text-center"><Settings2 size={28} className="mx-auto text-zinc-700"/><h3 className="mt-4 font-bold text-white">Tu tablero está vacío</h3><button onClick={()=>setLibraryOpen(true)} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">Agregar widgets</button></div>}
    <p className="text-center text-[10px] text-zinc-700">Vista personal · {memberKey} · {activeSquad?.name || "Reserva"} · {activeAreaName || "Cuerpo Técnico"}</p>
    {libraryOpen&&<Library widgets={widgets} onChange={setWidgets} onClose={()=>setLibraryOpen(false)} onReset={reset}/>}
  </div>;
}
