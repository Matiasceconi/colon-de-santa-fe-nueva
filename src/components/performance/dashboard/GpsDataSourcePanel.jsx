import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Headphones, LockKeyhole, Radio, RefreshCw } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";

const PROVIDERS = ["Catapult", "STATSports", "Otros GPS"];

export default function GpsDataSourcePanel() {
  const { brand } = usePublicClubBrand();
  const [open, setOpen] = useState(true);
  const clubName = brand?.club_name || "el club";
  const supportMessage = encodeURIComponent(`Hola, queremos evaluar una integración automática de GPS para ${clubName}. Proveedor: [Catapult / STATSports / Otro].`);
  const supportHref = `https://wa.me/5491122679347?text=${supportMessage}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/20">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Radio size={19} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-white">Origen de los datos GPS</h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">CSV activo</span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">API opcional</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Carga manual disponible e integración automática opcional.</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="shrink-0 text-zinc-500" /> : <ChevronDown size={18} className="shrink-0 text-zinc-500" />}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-zinc-800 p-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><FileSpreadsheet size={18} /></span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300"><CheckCircle2 size={13} /> Disponible</span>
            </div>
            <h3 className="mt-3 font-bold text-white">Importación por CSV</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-400">Cargá el archivo exportado por el GPS dentro de una sesión o de un partido. Los datos quedan vinculados a esa fecha y plantel.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-300">
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1">Sesiones</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1">Partidos</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><RefreshCw size={18} /></span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-300"><Headphones size={13} /> Configuración asistida</span>
            </div>
            <h3 className="mt-3 font-bold text-white">Integración automática por API</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-400">Sincronización directa con el proveedor del club. Soporte valida la API, el formato y la correspondencia de jugadores antes de activarla.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => <span key={provider} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200">{provider}</span>)}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><LockKeyhole size={12} /> Las credenciales se configuran de forma privada.</p>
              <a href={supportHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500">
                <Headphones size={14} /> Solicitar integración
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
