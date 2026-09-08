import React from "react";
import { X, Link2, RefreshCw, CheckCircle2, CircleOff, Clock3, Database } from "lucide-react";
import moment from "moment";

export default function CalendarSourcesPanel({ open, onClose, integrationSettings, activeCalendarLinked, integrationBusy, onToggle, onSync, activeSquad, isAdmin }) {
  if (!open) return null;
  const provider = integrationSettings?.provider || "Sin proveedor";
  const lastSync = integrationSettings?.last_calendar_sync_at ? moment(integrationSettings.last_calendar_sync_at).fromNow() : "Sin sincronización registrada";
  return <div className="fixed inset-0 z-[80] bg-black/50" onClick={onClose}>
    <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-zinc-950/95 px-5 py-4 backdrop-blur">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Fuentes del calendario</p><h2 className="mt-1 text-lg font-black text-white">Integraciones y sincronización</h2></div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-zinc-500 hover:text-white"><X size={16}/></button>
      </div>
      <div className="space-y-4 p-5">
        <section className="rounded-2xl border border-white/[0.07] bg-zinc-900 p-4">
          <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Database size={18} className="text-blue-300"/></div><div><p className="text-xs font-black text-white">Competencias</p><p className="mt-1 text-[11px] text-zinc-500">Proveedor: {provider}</p></div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${integrationSettings?.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>{integrationSettings?.enabled ? "CONECTADO" : "INACTIVO"}</span></div>
        </section>

        <section className={`rounded-2xl border p-4 ${activeCalendarLinked ? "border-blue-500/20 bg-blue-500/[0.05]" : "border-white/[0.07] bg-zinc-900"}`}>
          <div className="flex items-start gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeCalendarLinked ? "bg-blue-500/10 text-blue-300" : "bg-zinc-800 text-zinc-500"}`}>{activeCalendarLinked ? <CheckCircle2 size={18}/> : <CircleOff size={18}/>}</div><div className="min-w-0 flex-1"><p className="text-xs font-black text-white">Próximos partidos · {activeSquad?.name || "plantel"}</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{activeCalendarLinked ? "Los próximos partidos del plantel se agregan y actualizan en el calendario automáticamente." : "La integración existe, pero este plantel no está publicando sus próximos partidos en el calendario."}</p></div></div>
          <div className="mt-4 flex gap-2">
            {isAdmin && integrationSettings?.id && <button onClick={onToggle} disabled={integrationBusy} className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition disabled:opacity-50 ${activeCalendarLinked ? "border border-red-500/20 bg-red-500/[0.06] text-red-300 hover:bg-red-500/10" : "bg-blue-600 text-white hover:bg-blue-500"}`}>{activeCalendarLinked ? "Desvincular plantel" : "Vincular partidos"}</button>}
            {activeCalendarLinked && <button onClick={onSync} disabled={integrationBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-50"><RefreshCw size={13} className={integrationBusy ? "animate-spin" : ""}/>Actualizar ahora</button>}
          </div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 p-3"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-600"><Clock3 size={11}/>Última actualización</p><p className="mt-2 text-xs font-bold text-zinc-200">{lastSync}</p></div><div className="rounded-xl border border-white/[0.07] bg-zinc-900/70 p-3"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-600"><Link2 size={11}/>Modo</p><p className="mt-2 text-xs font-bold text-zinc-200">{activeCalendarLinked ? "Automático" : "Manual"}</p></div></div>

        <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-[11px] leading-relaxed text-zinc-500">La integración sólo agrega programación competitiva. Sesiones y partidos operativos siguen gobernados por sus módulos correspondientes. Si un evento integrado se corrige manualmente, deja de ser sobrescrito automáticamente.</div>
      </div>
    </aside>
  </div>;
}
