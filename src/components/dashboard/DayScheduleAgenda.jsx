import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bus, Coffee, DoorOpen, Dumbbell, ClipboardList, Trophy, HeartPulse, Users, ChevronRight, Plus, Pencil, Plane, Shirt, Utensils, Video, CalendarPlus } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import QuickEventModal from "@/components/dashboard/QuickEventModal";

function SoccerPitchIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M3 9h3v6H3" />
      <path d="M21 9h-3v6h3" />
    </svg>
  );
}

const SCHEDULE_COLOR_MAP = {
  green: "#10b981", verde: "#10b981", emerald: "#10b981",
  blue: "#3b82f6", azul: "#3b82f6", sky: "#38bdf8", celeste: "#38bdf8",
  red: "#ef4444", rojo: "#ef4444", orange: "#f97316", naranja: "#f97316",
  yellow: "#facc15", amarillo: "#facc15", purple: "#a855f7", violeta: "#8b5cf6", violet: "#8b5cf6",
  gray: "#71717a", grey: "#71717a", gris: "#71717a", zinc: "#71717a",
};

function normalizeScheduleColor(color) {
  const value = String(color || "").trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("#")) return value;
  return SCHEDULE_COLOR_MAP[value] || null;
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(ch => ch + ch).join("") : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(113,113,122,${alpha})`;
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

function buildStyle(ev, base) {
  const accent = normalizeScheduleColor(ev.color) || base.accent;
  return { ...base, accent, bgColor: hexToRgba(accent, 0.16), borderColor: hexToRgba(accent, 0.45) };
}

function getEventStyle(ev = {}) {
  const t = `${ev.title || ""} ${ev.type || ""} ${ev.event_type || ""} ${ev.location || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("desayuno") || t.includes("merienda")) return buildStyle(ev, { icon: Coffee, color: "text-amber-300", accent: "#f59e0b" });
  if (t.includes("almuerzo") || t.includes("cena") || t.includes("comida")) return buildStyle(ev, { icon: Utensils, color: "text-orange-300", accent: "#f97316" });
  if (t.includes("llegada") || t.includes("vestuario") || t.includes("citacion") || t.includes("citación")) return buildStyle(ev, { icon: Shirt, color: "text-sky-300", accent: "#38bdf8" });
  if (t.includes("salida") || t.includes("traslado") || t.includes("micro") || t.includes("bus")) return buildStyle(ev, { icon: Bus, color: "text-cyan-300", accent: "#06b6d4" });
  if (t.includes("viaje") || t.includes("vuelo")) return buildStyle(ev, { icon: Plane, color: "text-indigo-300", accent: "#6366f1" });
  if (t.includes("partido")) return buildStyle(ev, { icon: Trophy, color: "text-red-300", accent: "#ef4444" });
  if (t.includes("gimnasio") || t.includes("fuerza") || t.includes("gym")) return buildStyle(ev, { icon: Dumbbell, color: "text-blue-300", accent: "#3b82f6" });
  if (t.includes("cancha") || t.includes("campo") || t.includes("entrenamiento")) return buildStyle(ev, { icon: SoccerPitchIcon, color: "text-emerald-300", accent: "#10b981" });
  if (t.includes("auditorio") || t.includes("video") || t.includes("charla")) return buildStyle(ev, { icon: Video, color: "text-violet-300", accent: "#8b5cf6" });
  if (t.includes("evalua")) return buildStyle(ev, { icon: ClipboardList, color: "text-yellow-300", accent: "#eab308" });
  if (t.includes("medic") || t.includes("kinesio")) return buildStyle(ev, { icon: HeartPulse, color: "text-purple-300", accent: "#a855f7" });
  if (t.includes("reunion") || t.includes("reunión")) return buildStyle(ev, { icon: Users, color: "text-zinc-200", accent: "#a1a1aa" });
  return buildStyle(ev, { icon: DoorOpen, color: "text-zinc-300", accent: "#71717a" });
}

function eventTime(ev = {}) {
  return String(ev.start_time || ev.time || ev.display_time || "").slice(0, 5);
}

function zonedNow(timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "America/Argentina/Buenos_Aires",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  } catch {
    const now = new Date();
    return { date: now.toISOString().slice(0, 10), minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

// Estado del evento según la hora local del club: pendiente | en_curso | finalizado
function getEventStatus(ev, dateStr, timezone) {
  const now = zonedNow(timezone);
  if (dateStr < now.date) return "finalizado";
  if (dateStr > now.date) return "pendiente";
  const clock = eventTime(ev);
  if (!/^\d{2}:\d{2}$/.test(clock)) return "pendiente";
  const [hour, minute] = clock.split(":").map(Number);
  const startMinutes = hour * 60 + minute;
  const duration = Math.max(1, Number(ev.duration_minutes || 60));
  const endMinutes = startMinutes + duration;
  if (now.minutes < startMinutes) return "pendiente";
  if (now.minutes >= endMinutes) return "finalizado";
  return "en_curso";
}

const STATUS_LABELS = { pendiente: "Pendiente", en_curso: "En curso", finalizado: "Finalizado" };

export default function DayScheduleAgenda({ todayEvents = [], tomorrowEvents = [], todayDate, tomorrowDate, timezone = "America/Argentina/Buenos_Aires", onRefresh }) {
  const { activeSquadId, activeSquad } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const sortedToday = useMemo(
    () => [...todayEvents].sort((a, b) => eventTime(a).localeCompare(eventTime(b))),
    [todayEvents]
  );
  const sortedTomorrow = useMemo(
    () => [...tomorrowEvents].sort((a, b) => eventTime(a).localeCompare(eventTime(b))),
    [tomorrowEvents]
  );

  // Si no hay eventos hoy, o todos ya finalizaron → mostrar el cronograma de mañana
  const showTomorrow = useMemo(() => {
    if (sortedToday.length === 0) return true;
    return sortedToday.every(ev => getEventStatus(ev, todayDate, timezone) === "finalizado");
  }, [sortedToday, todayDate, timezone]);

  const displayDate = showTomorrow ? tomorrowDate : todayDate;
  const displayEvents = showTomorrow ? sortedTomorrow : sortedToday;
  const title = showTomorrow ? "Cronograma de Mañana" : "Cronograma del Día";
  const emptyText = showTomorrow ? "Sin eventos cargados para mañana" : "Sin eventos cargados para hoy";

  function openNew() { setEditingEvent(null); setModalOpen(true); }
  function openEdit(ev) { setEditingEvent(ev); setModalOpen(true); }
  function handleSaved() { if (onRefresh) onRefresh(); }

  return (
    <div data-tour="staff-day-schedule" className="h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">Agenda operativa · {activeSquad?.name || "Plantel activo"}</p>
          <h2 className="mt-1 text-base font-black text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white">
            <Plus size={13} /> Actividad rápida
          </button>
          <Link to={`/schedule?date=${displayDate}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950 transition hover:bg-zinc-200">
            <CalendarPlus size={13} /> {displayEvents.length ? "Editar cronograma" : "Armar cronograma"}
          </Link>
        </div>
      </div>
      <div className="p-4">
        {displayEvents.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {displayEvents.map(ev => {
              const style = getEventStyle(ev);
              const Icon = style.icon;
              const status = getEventStatus(ev, displayDate, timezone);
              const isFinished = status === "finalizado";
              const isOngoing = status === "en_curso";
              return (
                <div key={ev.id}
                  className={`group relative overflow-hidden flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    isFinished
                      ? "bg-zinc-800/30 border-zinc-800 opacity-60"
                      : isOngoing
                      ? "ring-2 ring-white/20"
                      : ""
                  }`}
                  style={isFinished ? undefined : { backgroundColor: style.bgColor, borderColor: style.borderColor }}
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${isFinished ? "bg-zinc-700" : ""}`} style={isFinished ? undefined : { backgroundColor: style.accent }} />
                  <span className={`text-xs font-semibold w-12 shrink-0 pl-1 ${isFinished ? "text-zinc-600" : "text-zinc-200"}`}>
                    {eventTime(ev) || "--:--"}
                  </span>
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isFinished ? "bg-zinc-800 text-zinc-600" : "bg-black/20 " + style.color}`} style={isFinished ? undefined : { color: style.accent }}>
                    <Icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isFinished ? "text-zinc-500 line-through" : "text-white"}`}>
                      {ev.title}
                    </p>
                    {ev.location && <p className="text-[10px] text-zinc-500 truncate">{ev.location}</p>}
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                    isFinished
                      ? "bg-zinc-700/30 text-zinc-500 border-zinc-700"
                      : isOngoing
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-zinc-700/30 text-zinc-400 border-zinc-700"
                  }`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <button onClick={() => openEdit(ev)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0" title="Editar">
                    <Pencil size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <Link to={`/schedule?date=${displayDate}`}
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors">
          Abrir Calendario Completo <ChevronRight size={13} />
        </Link>
      </div>

      <QuickEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        event={editingEvent}
        date={displayDate}
        squadId={activeSquadId}
        squadName={activeSquad?.name || ""}
        seasonId={activeSquad?.season || ""}
      />
    </div>
  );
}