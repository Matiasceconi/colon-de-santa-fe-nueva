import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Link2, RefreshCw, ShieldCheck } from "lucide-react";

function Metric({ label, value, tone = "neutral" }) {
  const tones = {
    ok: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
    warn: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300",
    critical: "border-red-500/20 bg-red-500/[0.07] text-red-300",
    neutral: "border-white/[0.07] bg-black/20 text-zinc-300",
  };
  return <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}><p className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

export default function CalendarQualityPanel({ audit, hiddenDuplicateCount = 0, normalizing = false, onNormalize, isAdmin = false }) {
  const [open, setOpen] = useState(false);
  const critical = audit?.criticalCount || 0;
  const warning = audit?.warningCount || 0;
  const clean = critical === 0 && warning === 0;

  return (
    <section data-tour="calendar-quality" className={`rounded-2xl border ${clean ? "border-emerald-500/20 bg-emerald-500/[0.04]" : critical ? "border-red-500/20 bg-red-500/[0.04]" : "border-amber-500/20 bg-amber-500/[0.04]"}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${clean ? "bg-emerald-500/10 text-emerald-300" : critical ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>
          {clean ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Calidad del calendario</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{clean ? "Sin conflictos estructurales detectados." : `${critical} conflicto${critical === 1 ? "" : "s"} crítico${critical === 1 ? "" : "s"} · ${warning} advertencia${warning === 1 ? "" : "s"}`}{hiddenDuplicateCount ? ` · ${hiddenDuplicateCount} duplicado${hiddenDuplicateCount === 1 ? "" : "s"} oculto${hiddenDuplicateCount === 1 ? "" : "s"} en la vista` : ""}</p>
        </div>
        {isAdmin && <button onClick={onNormalize} disabled={normalizing} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-50"><RefreshCw size={13} className={normalizing ? "animate-spin" : ""} />Revisar integridad</button>}
        <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{open ? "Ocultar" : "Ver detalle"}</button>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Partidos duplicados" value={audit?.duplicateMatchGroups?.length || 0} tone={audit?.duplicateMatchGroups?.length ? "critical" : "ok"} />
            <Metric label="Vínculos de partido rotos" value={(audit?.brokenEventMatchLinks?.length || 0) + (audit?.brokenMatchEventLinks?.length || 0) + (audit?.mismatchedLinks?.length || 0)} tone={(audit?.brokenEventMatchLinks?.length || audit?.brokenMatchEventLinks?.length || audit?.mismatchedLinks?.length) ? "critical" : "ok"} />
            <Metric label="Vínculos de sesión rotos" value={audit?.brokenEventSessionLinks?.length || 0} tone={audit?.brokenEventSessionLinks?.length ? "critical" : "ok"} />
            <Metric label="Pares de entrenamiento" value={audit?.suspiciousTrainingPairs?.length || 0} tone={audit?.suspiciousTrainingPairs?.length ? "warn" : "ok"} />
            <Metric label="Origen legado" value={audit?.legacySourceEvents?.length || 0} tone={audit?.legacySourceEvents?.length ? "warn" : "neutral"} />
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {(audit?.duplicateMatchGroups || []).slice(0, 4).map((group, index) => <div key={`dup-${index}`} className="rounded-xl border border-red-500/15 bg-red-500/[0.04] p-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-300"><AlertTriangle size={11} />Posible partido duplicado</p><p className="mt-1 text-xs font-semibold text-white">{group[0]?.date} · {group[0]?.rival || group[0]?.title}</p><p className="mt-1 text-[10px] text-zinc-500">{group.length} registros conservados. La vista muestra sólo el vínculo más confiable.</p></div>)}
            {(audit?.brokenEventMatchLinks || []).slice(0, 4).map((event) => <div key={event.id} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300"><Link2 size={11} />Vínculo roto</p><p className="mt-1 text-xs font-semibold text-white">{event.date} · {event.title}</p><p className="mt-1 text-[10px] text-zinc-500">El evento apunta a un MatchReport que ya no existe. No se elimina automáticamente.</p></div>)}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-zinc-600"><CheckCircle2 size={12} className="mt-0.5 shrink-0" />El auditor nunca borra datos históricos. Normaliza campos seguros, repara vínculos recíprocos cuando son inequívocos y deja los conflictos como “requiere revisión”.</p>
        </div>
      )}
    </section>
  );
}
