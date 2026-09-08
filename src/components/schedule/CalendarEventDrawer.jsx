import React from "react";
import { X, CalendarDays, Clock3, MapPin, ExternalLink, Pencil, Copy, Trash2, Trophy, Dumbbell, Link2, Info } from "lucide-react";
import moment from "moment";
import { effectiveEventType, eventStartTime } from "./calendarAudit";
import { eventSourceLabel } from "./calendarSourceAdapter";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"><Icon size={14} className="mt-0.5 shrink-0 text-zinc-500"/><div><p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-0.5 text-xs font-semibold text-zinc-200">{value}</p></div></div>;
}

export default function CalendarEventDrawer({ event, onClose, onOpenSource, onEdit, onCopy, onDelete }) {
  if (!event) return null;
  const type = effectiveEventType(event);
  const source = eventSourceLabel(event);
  const isSession = event.source_kind === "training_session";
  const isMatch = event.source_kind === "match_report" || type === "Partido";
  const linked = isSession || event.source_kind === "match_report";
  const integrated = event.source_kind === "competition_integration";
  const dateLabel = event.date ? moment(event.date).format("dddd D [de] MMMM") : "";
  const time = eventStartTime(event);
  const round = event.competition_round || event.phase_label || (event.matchday_number ? `Fecha ${event.matchday_number}` : "");

  return <div className="fixed inset-0 z-[80] bg-black/50" onClick={onClose}>
    <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-zinc-950/95 px-5 py-4 backdrop-blur">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Detalle de calendario</p><p className="mt-1 text-sm font-black text-white">{source}</p></div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-zinc-500 hover:text-white"><X size={16}/></button>
      </div>

      <div className="space-y-5 p-5">
        {isMatch ? <section className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.08] to-zinc-950 p-5">
          <div className="flex items-center gap-4">
            {event.rival_logo_url ? <img src={event.rival_logo_url} alt="" className="h-14 w-14 object-contain"/> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10"><Trophy size={24} className="text-red-300"/></div>}
            <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wider text-red-300">{event.competition || "Partido"}</p><h2 className="mt-1 text-xl font-black text-white">{event.rival ? `vs ${event.rival}` : event.title}</h2><p className="mt-1 text-xs text-zinc-500">{[event.home_away, round].filter(Boolean).join(" · ")}</p></div>
          </div>
        </section> : isSession ? <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-zinc-950 p-5">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10"><Dumbbell size={22} className="text-emerald-300"/></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Sesión vinculada</p><h2 className="mt-1 text-xl font-black text-white">{event.title || "Entrenamiento"}</h2><p className="mt-1 text-xs text-zinc-500">{[event.match_day_code, event.physical_objective].filter(Boolean).join(" · ") || "Entrenamiento del plantel"}</p></div></div>
        </section> : <section className="rounded-2xl border border-white/[0.07] bg-zinc-900 p-5"><p className="text-[9px] font-black uppercase tracking-wider text-blue-300">{type}</p><h2 className="mt-1 text-xl font-black text-white">{event.title}</h2><p className="mt-1 text-xs text-zinc-500">Evento operativo del calendario</p></section>}

        <div className="grid gap-2 sm:grid-cols-2">
          <InfoRow icon={CalendarDays} label="Fecha" value={dateLabel}/>
          <InfoRow icon={Clock3} label="Horario" value={[time, event.end_time ? `a ${event.end_time}` : "", event.duration_minutes ? `${event.duration_minutes} min` : ""].filter(Boolean).join(" · ")}/>
          <InfoRow icon={MapPin} label="Lugar" value={event.location}/>
          <InfoRow icon={Link2} label="Origen" value={integrated ? "Integración competitiva" : source}/>
        </div>

        {(event.notes || event.physical_objective) && <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/70 p-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500"><Info size={13}/>Información</p><p className="mt-2 text-xs leading-relaxed text-zinc-300">{event.physical_objective || event.notes}</p></div>}

        {integrated && <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4 text-xs leading-relaxed text-blue-100">Este evento proviene de la integración competitiva. Mientras conserve ese origen, los cambios de programación pueden actualizarse automáticamente.</div>}

        <div className="space-y-2 border-t border-white/[0.07] pt-5">
          {linked && <button onClick={()=>onOpenSource?.(event)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-zinc-950 hover:bg-zinc-200"><ExternalLink size={14}/>Abrir {isSession ? "sesión" : "partido"}</button>}
          {!linked && !event.is_virtual && <div className="grid grid-cols-2 gap-2"><button onClick={()=>onEdit?.(event)} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-zinc-800"><Pencil size={13}/>Editar</button><button onClick={()=>onCopy?.(event)} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800"><Copy size={13}/>Copiar</button></div>}
          {!linked && !event.is_virtual && <button onClick={()=>onDelete?.(event.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/10"><Trash2 size={13}/>Eliminar evento</button>}
        </div>
      </div>
    </aside>
  </div>;
}
