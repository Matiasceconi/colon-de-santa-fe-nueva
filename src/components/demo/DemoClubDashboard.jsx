import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  Activity, ArrowRight, BellRing, Cake, CalendarDays, Check, ChevronRight,
  CircleAlert, ClipboardList, Clock3, Filter, GripVertical, HeartPulse,
  LayoutDashboard, MapPin, Maximize2, MessageSquareText, Minimize2, Plus,
  RotateCcw, Settings2, SlidersHorizontal, Target, Trash2, Trophy,
  UsersRound, X,
} from 'lucide-react';
import { DEMO_CLUB, DEMO_COMPETITIONS, DEMO_STATS, DEMO_STANDINGS, DEMO_UPCOMING } from '@/lib/demoFootballData';
import { PFCShield } from '@/components/demo/DemoClubIdentity';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'pp_demo_dashboard_staff_demo_v2';

const ALERTS = [
  { id: 1, level: 'critical', area: 'Médica', squad: 'Primera', player: 'Tomás Vidal', text: 'Dolor muscular reportado en wellness', time: '08:12', icon: HeartPulse },
  { id: 2, level: 'warning', area: 'Rendimiento', squad: 'Primera', player: 'Mateo Ríos', text: 'Carga aguda por encima del rango objetivo', time: '09:05', icon: Activity },
  { id: 3, level: 'warning', area: 'Nutrición', squad: 'Reserva', player: 'Bruno Ferrer', text: 'Control antropométrico pendiente', time: 'Ayer', icon: Target },
  { id: 4, level: 'info', area: 'Cuerpo técnico', squad: 'Juveniles', player: 'Julián Acosta', text: 'Plan individual actualizado', time: 'Ayer', icon: ClipboardList },
];

const BIRTHDAYS = [
  { name: 'Lautaro Benítez', squad: 'Reserva', day: 'Hoy', initials: 'LB' },
  { name: 'Santiago Leiva', squad: 'Primera', day: '29 ago', initials: 'SL' },
];

const SQUAD_STATUS = [
  { id: 'primera', name: 'Primera', available: 24, total: 27, load: 82, next: 'vs Atlético Central', bar: 'bg-blue-500' },
  { id: 'reserva', name: 'Reserva', available: 26, total: 29, load: 76, next: 'vs Deportivo Norte', bar: 'bg-emerald-500' },
  { id: 'juveniles', name: 'Juveniles', available: 89, total: 96, load: 71, next: 'Jornada vs Unión Metro.', bar: 'bg-violet-500' },
];

const DAYS = [
  { day: 'Mié', date: '26', active: true, events: 3 },
  { day: 'Jue', date: '27', events: 2 },
  { day: 'Vie', date: '28', events: 4 },
  { day: 'Sáb', date: '29', events: 1 },
  { day: 'Dom', date: '30', events: 1 },
  { day: 'Lun', date: '31', events: 3 },
];

const WIDGET_CATALOG = [
  { id: 'agenda', title: 'Agenda del club', description: 'Actividades y controles de la semana', icon: CalendarDays, defaultSize: 'wide' },
  { id: 'alerts', title: 'Alertas prioritarias', description: 'Alertas de todas las áreas', icon: BellRing, defaultSize: 'normal' },
  { id: 'squads', title: 'Estado de los planteles', description: 'Disponibilidad y carga', icon: UsersRound, defaultSize: 'wide' },
  { id: 'notes', title: 'Notas rápidas', description: 'Pendientes personales del staff', icon: MessageSquareText, defaultSize: 'normal' },
  { id: 'birthdays', title: 'Cumpleaños', description: 'Próximos cumpleaños', icon: Cake, defaultSize: 'normal' },
  { id: 'competition', title: 'Contexto competitivo', description: 'Tabla, puntos y próximo partido', icon: Trophy, defaultSize: 'full' },
  { id: 'summary', title: 'Resumen del club', description: 'Indicadores ejecutivos rápidos', icon: LayoutDashboard, defaultSize: 'wide' },
  { id: 'next_match', title: 'Próximo partido', description: 'Información del siguiente compromiso', icon: Clock3, defaultSize: 'normal' },
];

const DEFAULT_WIDGETS = [
  { id: 'summary', size: 'wide' },
  { id: 'next_match', size: 'normal' },
  { id: 'agenda', size: 'wide' },
  { id: 'birthdays', size: 'normal' },
  { id: 'alerts', size: 'normal' },
  { id: 'squads', size: 'wide' },
  { id: 'notes', size: 'normal' },
  { id: 'competition', size: 'full' },
];

const DEFAULT_FILTERS = { squad: 'todos', area: 'todas', priority: 'todas', competition: 'liga', period: 'semana' };

function loadSaved(storageKey) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey));
    return value?.widgets?.length ? value : { widgets: DEFAULT_WIDGETS, filters: DEFAULT_FILTERS };
  } catch {
    return { widgets: DEFAULT_WIDGETS, filters: DEFAULT_FILTERS };
  }
}

function Card({ children, className = '', ...props }) {
  return <section {...props} className={`rounded-2xl border border-white/10 bg-zinc-900/82 shadow-xl shadow-black/10 backdrop-blur-sm ${className}`}>{children}</section>;
}

function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"><Icon size={17} /></span>
        <div className="min-w-0"><h2 className="text-sm font-bold text-white">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}

function AlertRow({ item }) {
  const tone = item.level === 'critical' ? 'bg-rose-500/10 text-rose-300 ring-rose-500/20' : item.level === 'warning' ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20' : 'bg-blue-500/10 text-blue-300 ring-blue-500/20';
  const Icon = item.icon;
  return (
    <div className="flex gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0 sm:px-5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-white">{item.player}</p><span className="shrink-0 text-[10px] text-zinc-600">{item.time}</span></div>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{item.text}</p>
        <div className="mt-1.5 flex gap-1.5"><span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{item.area}</span><span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[9px] text-zinc-600">{item.squad}</span></div>
      </div>
    </div>
  );
}

function WidgetShell({ widget, index, editing, onRemove, onSize, children, provided }) {
  const meta = WIDGET_CATALOG.find((item) => item.id === widget.id);
  const span = widget.size === 'full' ? 'md:col-span-12' : widget.size === 'wide' ? 'md:col-span-12 xl:col-span-8' : 'md:col-span-6 xl:col-span-4';
  return (
    <div ref={provided?.innerRef} {...provided?.draggableProps} className={`${span} min-w-0 ${editing ? 'rounded-2xl ring-1 ring-blue-500/35' : ''}`}>
      {editing && (
        <div className="mb-1.5 flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-200" {...provided?.dragHandleProps}><GripVertical size={14} /> Arrastrar widget {index + 1}</div>
          <div className="flex items-center gap-1">
            <button onClick={onSize} className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-zinc-300 hover:bg-white/10" title="Cambiar tamaño">{widget.size === 'normal' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}{widget.size === 'normal' ? 'Ampliar' : 'Reducir'}</button>
            <button onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300" title={`Ocultar ${meta?.title}`}><Trash2 size={13} /></button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function WidgetLibrary({ widgets, onChange, onClose, onReset }) {
  const selected = new Map(widgets.map((item) => [item.id, item]));
  const toggle = (meta) => {
    if (selected.has(meta.id)) onChange(widgets.filter((item) => item.id !== meta.id));
    else onChange([...widgets, { id: meta.id, size: meta.defaultSize }]);
  };
  const setSize = (id, size) => onChange(widgets.map((item) => item.id === id ? { ...item, size } : item));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Configuración del tablero</p><h2 className="mt-1 text-xl font-black text-white">Elegí y configurá tus widgets</h2><p className="mt-1 text-xs text-zinc-500">Tu selección y orden quedan guardados para tu usuario.</p></div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={17} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><span className="text-xs font-bold text-zinc-400">{widgets.length} widgets visibles</span><button onClick={onReset} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white"><RotateCcw size={14} /> Restaurar predeterminado</button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIDGET_CATALOG.map((meta) => {
              const active = selected.get(meta.id);
              const Icon = meta.icon;
              return (
                <div key={meta.id} className={`rounded-2xl border p-4 transition ${active ? 'border-blue-500/45 bg-blue-500/[0.08]' : 'border-white/10 bg-white/[0.025]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500'}`}><Icon size={18} /></span>
                    <button onClick={() => toggle(meta)} className={`flex h-7 w-7 items-center justify-center rounded-full border ${active ? 'border-blue-400 bg-blue-500 text-white' : 'border-zinc-700 text-transparent hover:border-blue-500'}`}><Check size={14} /></button>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-white">{meta.title}</h3><p className="mt-1 min-h-8 text-xs leading-relaxed text-zinc-500">{meta.description}</p>
                  {active && <div className="mt-3 flex rounded-lg bg-black/25 p-1">{['normal','wide','full'].map((size) => <button key={size} onClick={() => setSize(meta.id, size)} className={`flex-1 rounded-md px-1 py-1.5 text-[9px] font-bold uppercase ${active.size === size ? 'bg-white/10 text-white' : 'text-zinc-600'}`}>{size === 'normal' ? 'Normal' : size === 'wide' ? 'Ancho' : 'Completo'}</button>)}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-5 py-4"><p className="hidden text-xs text-zinc-600 sm:block">Después podés arrastrarlos directamente en el tablero.</p><button onClick={onClose} className="ml-auto rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500">Guardar tablero</button></footer>
      </div>
    </div>
  );
}

function FilterDrawer({ value, onChange, onClose, onReset }) {
  const Select = ({ label, field, options }) => (
    <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span><select value={value[field]} onChange={(event) => onChange({ ...value, [field]: event.target.value })} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-white outline-none focus:border-blue-500/50">{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
  );
  return (
    <div className="fixed inset-0 z-[85] bg-black/55 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-5"><div><p className="text-[10px] font-black uppercase tracking-wider text-blue-300">Vista personalizada</p><h2 className="mt-1 text-lg font-black text-white">Filtros del tablero</h2></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/10"><X size={17} /></button></header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Select label="Plantel" field="squad" options={[[ 'todos','Todos los planteles'],['primera','Primera'],['reserva','Reserva'],['juveniles','Juveniles']]} />
          <Select label="Área" field="area" options={[[ 'todas','Todas las áreas'],['Médica','Médica'],['Rendimiento','Rendimiento'],['Nutrición','Nutrición'],['Cuerpo técnico','Cuerpo técnico']]} />
          <Select label="Prioridad de alertas" field="priority" options={[[ 'todas','Todas las prioridades'],['critical','Críticas'],['warning','Seguimiento'],['info','Informativas']]} />
          <Select label="Competencia" field="competition" options={DEMO_COMPETITIONS.map((item) => [item.id, item.name])} />
          <Select label="Período" field="period" options={[[ 'hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['temporada','Temporada']]} />
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-4"><p className="text-xs font-bold text-blue-200">Filtros compartidos por widgets</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">Cada widget utiliza solamente los filtros que corresponden a sus datos.</p></div>
        </div>
        <footer className="flex gap-2 border-t border-white/10 p-4"><button onClick={onReset} className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:bg-white/5">Limpiar</button><button onClick={onClose} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500">Aplicar filtros</button></footer>
      </aside>
    </div>
  );
}

export default function DemoClubDashboard() {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}:${user?.email || user?.id || 'demo'}`;
  const saved = useMemo(() => loadSaved(storageKey), [storageKey]);
  const [tab, setTab] = useState('inicio');
  const [widgets, setWidgets] = useState(saved.widgets);
  const [filters, setFilters] = useState(saved.filters);
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notes, setNotes] = useState(saved.notes || [{ id: 1, text: 'Confirmar horarios de la semana competitiva', done: false }, { id: 2, text: 'Revisar informe GPS del último partido', done: true }]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ widgets, filters, notes }));
  }, [widgets, filters, notes, storageKey]);

  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_FILTERS[key]).length;
  const filteredAlerts = ALERTS.filter((item) => (filters.squad === 'todos' || item.squad.toLowerCase() === filters.squad) && (filters.area === 'todas' || item.area === filters.area) && (filters.priority === 'todas' || item.level === filters.priority));
  const visibleSquads = SQUAD_STATUS.filter((item) => filters.squad === 'todos' || item.id === filters.squad);
  const activeComp = filters.competition;
  const stats = DEMO_STATS[activeComp];
  const standings = DEMO_STANDINGS[activeComp];
  const nextMatch = DEMO_UPCOMING.find((item) => item.compId === activeComp) || DEMO_UPCOMING[0];

  const addNote = () => {
    if (!draft.trim()) return;
    setNotes((current) => [{ id: Date.now(), text: draft.trim(), done: false }, ...current]);
    setDraft('');
  };

  const removeWidget = (id) => setWidgets((current) => current.filter((item) => item.id !== id));
  const cycleSize = (id) => setWidgets((current) => current.map((item) => item.id === id ? { ...item, size: item.size === 'normal' ? 'wide' : item.size === 'wide' ? 'full' : 'normal' } : item));
  const resetDashboard = () => { setWidgets(DEFAULT_WIDGETS); setFilters(DEFAULT_FILTERS); };

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    setWidgets((current) => {
      const next = [...current];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    });
  };

  const renderWidget = (widget) => {
    if (widget.id === 'summary') return <Card><SectionTitle icon={LayoutDashboard} title="Resumen del club" subtitle="Indicadores actualizados según tus filtros" /><div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">{[['Planteles', visibleSquads.length || 0],['Disponibles', visibleSquads.reduce((sum,item)=>sum+item.available,0)],['Alertas', filteredAlerts.length],['Competencias', DEMO_COMPETITIONS.length]].map(([label,value])=><div key={label} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</p></div>)}</div></Card>;
    if (widget.id === 'next_match') return <Card><SectionTitle icon={Clock3} title="Próximo partido" subtitle={DEMO_COMPETITIONS.find((item)=>item.id===activeComp)?.name} /><div className="p-5"><p className="text-lg font-black text-white">{nextMatch.home} <span className="text-zinc-600">vs</span> {nextMatch.away}</p><p className="mt-3 flex items-center gap-2 text-xs text-zinc-400"><Clock3 size={13}/> 26 ago · 21:00</p><p className="mt-2 flex items-center gap-2 text-xs text-zinc-500"><MapPin size={13}/>{nextMatch.venue}</p><button className="mt-5 flex items-center gap-1 text-xs font-bold text-blue-300">Ver partido <ArrowRight size={13}/></button></div></Card>;
    if (widget.id === 'agenda') return <Card data-tour="club-agenda"><SectionTitle icon={CalendarDays} title="Agenda del club" subtitle={filters.period === 'hoy' ? 'Actividades de hoy' : 'Actividades y controles de la semana'} /><div className="p-4 sm:p-5"><div className="grid grid-cols-6 gap-2">{DAYS.map((item)=><button key={item.date} className={`rounded-xl border p-2 text-center ${item.active ? 'border-blue-400 bg-blue-600 text-white' : 'border-white/10 bg-white/[0.025] text-zinc-400'}`}><span className="block text-[9px] font-bold uppercase">{item.day}</span><span className="mt-1 block text-lg font-black">{item.date}</span></button>)}</div><div className="mt-4 space-y-2">{[['09:30','Entrenamiento Primera','Campo 1'],['11:45','Control antropométrico Reserva','Nutrición'],['16:00','Videoanálisis prepartido','Sala táctica']].map(([time,title,place])=><div key={title} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3"><span className="w-12 text-xs font-black text-white">{time}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{title}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500"><MapPin size={10}/>{place}</p></div><ChevronRight size={15} className="text-zinc-700"/></div>)}</div></div></Card>;
    if (widget.id === 'birthdays') return <Card><SectionTitle icon={Cake} title="Cumpleaños" subtitle="Próximos 7 días" /><div className="space-y-3 p-4">{BIRTHDAYS.filter((person)=>filters.squad==='todos'||person.squad.toLowerCase()===filters.squad).map((person)=><div key={person.name} className="flex items-center gap-3 rounded-xl bg-white/[0.035] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-black text-white">{person.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{person.name}</p><p className="text-[10px] text-zinc-500">{person.squad}</p></div><span className="text-[10px] font-bold text-blue-300">{person.day}</span></div>)}</div></Card>;
    if (widget.id === 'alerts') return <Card data-tour="club-alerts"><SectionTitle icon={BellRing} title="Alertas prioritarias" subtitle="Lectura transversal de las áreas" action={<button onClick={()=>setTab('alertas')} className="text-xs font-bold text-blue-300">Ver todas</button>} />{filteredAlerts.length ? filteredAlerts.slice(0,3).map((item)=><AlertRow key={item.id} item={item}/>) : <p className="p-8 text-center text-xs text-zinc-600">No hay alertas con estos filtros.</p>}</Card>;
    if (widget.id === 'squads') return <Card data-tour="club-squads"><SectionTitle icon={UsersRound} title="Estado de los planteles" subtitle="Disponibilidad y carga consolidada" /><div className="grid gap-3 p-4 md:grid-cols-3">{visibleSquads.map((squad)=><div key={squad.id} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><div className="flex justify-between"><p className="text-sm font-black text-white">{squad.name}</p><span className="text-xs font-black text-emerald-400">{squad.available}/{squad.total}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${squad.bar}`} style={{width:`${squad.load}%`}}/></div><div className="mt-2 flex justify-between text-[9px] text-zinc-600"><span>CARGA</span><span>{squad.load}%</span></div><p className="mt-4 border-t border-white/[0.07] pt-3 text-xs font-semibold text-zinc-300">{squad.next}</p></div>)}</div></Card>;
    if (widget.id === 'notes') return <Card data-tour="club-notes"><SectionTitle icon={MessageSquareText} title="Notas rápidas" subtitle="Personales para este usuario" /><div className="p-4"><div className="flex gap-2"><input value={draft} onChange={(event)=>setDraft(event.target.value)} onKeyDown={(event)=>event.key==='Enter'&&addNote()} placeholder="Escribir una nota..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50"/><button onClick={addNote} className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Plus size={16}/></button></div><div className="mt-3 space-y-2">{notes.map((note)=><div key={note.id} className="group flex gap-2 rounded-xl border border-white/[0.07] p-3"><button onClick={()=>setNotes((current)=>current.map((item)=>item.id===note.id?{...item,done:!item.done}:item))} className={`mt-0.5 h-4 w-4 rounded-full border ${note.done?'border-emerald-400 bg-emerald-400':'border-zinc-600'}`}/><p className={`flex-1 text-xs ${note.done?'text-zinc-600 line-through':'text-zinc-300'}`}>{note.text}</p><button onClick={()=>setNotes((current)=>current.filter((item)=>item.id!==note.id))} className="opacity-0 text-zinc-600 group-hover:opacity-100"><X size={13}/></button></div>)}</div></div></Card>;
    if (widget.id === 'competition') return <Card data-tour="club-competition"><SectionTitle icon={Trophy} title="Contexto competitivo" subtitle={DEMO_COMPETITIONS.find((item)=>item.id===activeComp)?.name}/><div className="p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-4">{[['Posición',`${stats.position}°`],['Puntos',stats.points],['Partidos',stats.played],['Diferencia',`+${stats.gd}`]].map(([label,value])=><div key={label} className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><p className="text-2xl font-black text-white">{value}</p><p className="text-[9px] font-bold uppercase text-zinc-600">{label}</p></div>)}</div><div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">{standings.slice(0,5).map((row)=><div key={row.team} className={`grid grid-cols-[32px_1fr_50px] border-b border-white/[0.06] px-3 py-2.5 text-xs last:border-0 ${row.team===DEMO_CLUB.name?'bg-blue-500/10 text-blue-200':'text-zinc-400'}`}><span>{row.position}</span><span className="font-semibold">{row.team}</span><span className="text-right font-black text-white">{row.points}</span></div>)}</div></div></Card>;
    return null;
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-24">
      <section data-tour="club-identity" className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/90 via-zinc-900/90 to-zinc-950 p-5 shadow-2xl shadow-blue-950/20 sm:p-7">
        <PFCShield muted className="pointer-events-none absolute -right-10 -top-20 h-80 w-72 text-white opacity-[0.055]"/>
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4"><PFCShield className="h-20 w-16 shrink-0 drop-shadow-2xl sm:h-24 sm:w-20"/><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Centro operativo del club</p><h1 className="mt-1 text-2xl font-black text-white sm:text-4xl">{DEMO_CLUB.name}</h1><p className="mt-1 text-sm text-zinc-400">Miércoles 26 de agosto · Temporada 2026</p></div></div>
          <div className="flex flex-wrap gap-2">
            <button data-tour="club-filters" onClick={()=>setFiltersOpen(true)} className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10"><Filter size={15}/> Filtros{activeFilters>0&&<span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px]">{activeFilters}</span>}</button>
            <button data-tour="club-widgets" onClick={()=>setEditing((value)=>!value)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${editing?'border-emerald-500/30 bg-emerald-500/15 text-emerald-200':'border-blue-500/25 bg-blue-500/10 text-blue-200'}`}>{editing?<Check size={15}/>:<SlidersHorizontal size={15}/>} {editing?'Finalizar edición':'Editar tablero'}</button>
            {editing&&<button onClick={()=>setLibraryOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500"><Plus size={15}/> Agregar widgets</button>}
          </div>
        </div>
        <div className="relative mt-6 flex gap-1 border-b border-white/10">{[['inicio','Inicio'],['alertas','Alertas']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`relative px-4 py-3 text-xs font-bold ${tab===id?'text-white':'text-zinc-500'}`}>{label}{id==='alertas'&&<span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{filteredAlerts.length}</span>}{tab===id&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-blue-400"/>}</button>)}</div>
      </section>

      {tab === 'alertas' ? <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Card><SectionTitle icon={BellRing} title="Centro de alertas" subtitle="Resultados según tus filtros"/>{filteredAlerts.length?filteredAlerts.map((item)=><AlertRow key={item.id} item={item}/>):<p className="p-12 text-center text-sm text-zinc-600">No hay alertas con estos filtros.</p>}</Card><Card className="p-5"><CircleAlert className="text-blue-300"/><p className="mt-5 text-4xl font-black text-white">{filteredAlerts.length}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Alertas visibles</p><button onClick={()=>setFiltersOpen(true)} className="mt-5 flex items-center gap-2 text-xs font-bold text-blue-300"><Filter size={14}/> Ajustar filtros</button></Card></div> : (
        <>
          {editing&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/[0.08] px-4 py-3"><div className="flex items-center gap-2 text-xs text-blue-100"><GripVertical size={15}/><span><strong>Modo edición activo.</strong> Arrastrá, redimensioná u ocultá los widgets.</span></div><button onClick={resetDashboard} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><RotateCcw size={13}/> Restaurar tablero</button></div>}
          <DragDropContext onDragEnd={onDragEnd}><Droppable droppableId="dashboard-grid" direction="vertical">{(dropProvided)=><div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="grid grid-cols-1 gap-5 md:grid-cols-12">{widgets.map((widget,index)=><Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!editing}>{(dragProvided)=><WidgetShell widget={widget} index={index} editing={editing} provided={dragProvided} onRemove={()=>removeWidget(widget.id)} onSize={()=>cycleSize(widget.id)}>{renderWidget(widget)}</WidgetShell>}</Draggable>)}{dropProvided.placeholder}</div>}</Droppable></DragDropContext>
          {!widgets.length&&<Card className="p-12 text-center"><Settings2 size={28} className="mx-auto text-zinc-700"/><h3 className="mt-4 font-bold text-white">Tu tablero está vacío</h3><p className="mt-1 text-sm text-zinc-500">Agregá los widgets que necesitás para tu trabajo.</p><button onClick={()=>setLibraryOpen(true)} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">Agregar widgets</button></Card>}
          <p className="text-center text-[10px] text-zinc-700">Configuración personal del usuario · Performance FC y sus datos son ficticios</p>
        </>
      )}

      {libraryOpen&&<WidgetLibrary widgets={widgets} onChange={setWidgets} onClose={()=>setLibraryOpen(false)} onReset={resetDashboard}/>}
      {filtersOpen&&<FilterDrawer value={filters} onChange={setFilters} onClose={()=>setFiltersOpen(false)} onReset={()=>setFilters(DEFAULT_FILTERS)}/>}
    </div>
  );
}
