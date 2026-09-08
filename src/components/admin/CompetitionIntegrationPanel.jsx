import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Save, Trophy, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";

const INPUT = "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50";

function formatDateTime(value) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function CompetitionIntegrationPanel({ settings = null, onReload, isAdmin = false }) {
  const { toast } = useToast();
  const { institutionProfile, squads = [] } = useWorkspace();
  const [form, setForm] = useState(() => ({
    provider: settings?.provider || "promiedos",
    enabled: settings?.enabled !== false,
    provider_time_adjustment_minutes: settings?.provider_time_adjustment_minutes ?? 0,
    calendar_lookahead_days: settings?.calendar_lookahead_days ?? 90,
    calendar_auto_create_match_reports: settings?.calendar_auto_create_match_reports === true,
  }));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setForm({
      provider: settings?.provider || "promiedos",
      enabled: settings?.enabled !== false,
      provider_time_adjustment_minutes: settings?.provider_time_adjustment_minutes ?? 0,
      calendar_lookahead_days: settings?.calendar_lookahead_days ?? 90,
      calendar_auto_create_match_reports: settings?.calendar_auto_create_match_reports === true,
    });
  }, [settings?.id, settings?.updated_at]);

  const linkedSquads = useMemo(() => {
    const ids = new Set(settings?.calendar_sync_squad_ids || []);
    return squads.filter((squad) => ids.has(squad.id));
  }, [settings?.calendar_sync_squad_ids, squads]);

  async function save() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        provider: form.provider || "promiedos",
        enabled: form.enabled !== false,
        provider_time_adjustment_minutes: Number(form.provider_time_adjustment_minutes || 0),
        calendar_lookahead_days: Math.max(1, Number(form.calendar_lookahead_days || 90)),
        calendar_auto_create_match_reports: form.calendar_auto_create_match_reports === true,
        updated_at: new Date().toISOString(),
      };
      if (settings?.id) await base44.entities.CompetitionIntegrationSettings.update(settings.id, payload);
      else await base44.entities.CompetitionIntegrationSettings.create({ ...payload, calendar_sync_enabled: false, calendar_sync_squad_ids: [] });
      toast({ title: "Integración de competencias guardada", description: "La configuración se aplica al proveedor actual de esta instancia." });
      await onReload?.();
    } catch (error) {
      toast({ title: "No se pudo guardar la integración", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    if (!isAdmin || form.enabled === false) return;
    setSyncing(true);
    try {
      const season = institutionProfile?.default_season || String(new Date().getFullYear());
      await base44.functions.invoke("syncAFAData", { season, force: true });
      toast({ title: "Competencias actualizadas", description: `Se solicitó una sincronización forzada para ${season}.` });
      await onReload?.();
    } catch (error) {
      toast({ title: "No se pudo actualizar competencias", description: error?.response?.data?.error || error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300"><Trophy size={18}/></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-white">Competencias y fixture</h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black ${form.enabled !== false ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}>
                {form.enabled !== false ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>} {form.enabled !== false ? "ACTIVA" : "PAUSADA"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Proveedor actual: <strong className="text-zinc-300">Promiedos · Argentina</strong>. La lógica interna queda separada del proveedor para poder sumar otros adapters sin cambiar el calendario.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && <button onClick={syncNow} disabled={syncing || form.enabled === false} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-40"><RefreshCw size={13} className={syncing ? "animate-spin" : ""}/>{syncing ? "Actualizando…" : "Actualizar ahora"}</button>}
          {isAdmin && <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400 disabled:opacity-40"><Save size={13}/>{saving ? "Guardando…" : "Guardar"}</button>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Estado del proveedor</span>
          <button type="button" disabled={!isAdmin} onClick={() => setForm((current) => ({ ...current, enabled: !current.enabled }))} className={`mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold ${form.enabled !== false ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-zinc-700 bg-zinc-950 text-zinc-500"} disabled:cursor-default`}><span>{form.enabled !== false ? "Habilitado" : "Pausado"}</span><span className={`relative h-5 w-9 rounded-full ${form.enabled !== false ? "bg-emerald-500" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.enabled !== false ? "translate-x-[18px]" : "translate-x-0.5"}`}/></span></button>
        </label>
        <label className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"><span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Ajuste horario proveedor</span><div className="mt-2 flex items-center gap-2"><input disabled={!isAdmin} type="number" step="15" value={form.provider_time_adjustment_minutes} onChange={(event) => setForm((current) => ({ ...current, provider_time_adjustment_minutes: event.target.value }))} className={INPUT}/><span className="text-xs text-zinc-600">min</span></div></label>
        <label className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"><span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Horizonte de calendario</span><div className="mt-2 flex items-center gap-2"><input disabled={!isAdmin} type="number" min="1" max="365" value={form.calendar_lookahead_days} onChange={(event) => setForm((current) => ({ ...current, calendar_lookahead_days: event.target.value }))} className={INPUT}/><span className="text-xs text-zinc-600">días</span></div></label>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"><span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Planteles vinculados</span><p className="mt-2 text-xl font-black text-white">{linkedSquads.length}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{linkedSquads.length ? linkedSquads.map((squad) => squad.name).join(" · ") : "Ninguno"}</p></div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
        <div className="text-xs text-zinc-500"><p>Última sincronización hacia calendario: <strong className="text-zinc-300">{formatDateTime(settings?.last_calendar_sync_at)}</strong></p><p className="mt-1 text-[10px] text-zinc-600">Los planteles se vinculan individualmente desde Calendario. Desvincular no elimina eventos ya creados.</p></div>
        <Link to="/schedule" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200">Gestionar planteles vinculados <ExternalLink size={12}/></Link>
      </div>

      {isAdmin && <label className="mt-3 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-xs text-zinc-400"><input type="checkbox" checked={form.calendar_auto_create_match_reports} onChange={(event) => setForm((current) => ({ ...current, calendar_auto_create_match_reports: event.target.checked }))} className="mt-0.5"/><span><strong className="text-zinc-300">Crear MatchReport automáticamente</strong><span className="mt-0.5 block text-[10px] leading-4 text-zinc-600">Dejalo apagado si querés que la integración solo alimente calendario/fixture y que los partidos operativos se creen manualmente.</span></span></label>}
    </section>
  );
}
