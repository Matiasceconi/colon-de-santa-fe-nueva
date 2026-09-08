import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bot, CheckCircle2, Clock3, DatabaseZap, ExternalLink,
  Loader2, PlayCircle, RefreshCw, ShieldCheck, Sparkles, UsersRound, XCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { toast } from "@/components/ui/use-toast";

const CATEGORY_ORDER = ["4ta", "5ta", "6ta", "7ma", "8va", "9na"];

function unwrap(response) {
  return response?.data || response;
}

function statusStyle(status) {
  if (status === "applied") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "ready") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (status === "needs_review") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (status === "error" || status === "rejected") return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function statusLabel(status) {
  return {
    checking: "Revisando",
    ready: "Listo para aplicar",
    needs_review: "Requiere revisión",
    applied: "Aplicado",
    rejected: "Descartado",
    error: "Error",
  }[status] || "Sin revisiones";
}

function dateTime(value) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function ControlledYouthImporter() {
  const { clubBrand } = useWorkspace();
  const [detection, setDetection] = useState(null);
  const [config, setConfig] = useState(null);
  const [batch, setBatch] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const invoke = useCallback(async (action, payload = {}) => {
    try {
      const response = await base44.functions.invoke("controlledYouthImporter", { action, ...payload });
      return unwrap(response);
    } catch (requestError) {
      const message = requestError?.response?.data?.error || requestError?.message || "No se pudo completar la operación.";
      throw new Error(message);
    }
  }, []);

  const refresh = useCallback(async () => {
    const [detected, status] = await Promise.all([invoke("detect"), invoke("status")]);
    setDetection(detected.detection);
    setConfig(status.config || detected.config);
    setBatch(status.batch || null);
    setCandidates(status.candidates || []);
    return { detected, status };
  }, [invoke]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const initial = await refresh();
        if (!mounted) return;
        const currentConfig = initial.status.config || initial.detected.config;
        const lastCheck = currentConfig?.last_check_at ? new Date(currentConfig.last_check_at).getTime() : 0;
        const interval = Math.max(1, Number(currentConfig?.check_interval_hours || 24)) * 60 * 60 * 1000;
        const due = currentConfig?.auto_check !== false && (!lastCheck || Date.now() - lastCheck >= interval || currentConfig?.last_club_key !== initial.detected.detection?.club_key);
        if (due) {
          setBusy("auto");
          await invoke("autoCheck");
          if (mounted) await refresh();
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) {
          setLoading(false);
          setBusy("");
        }
      }
    })();
    return () => { mounted = false; };
  }, [invoke, refresh]);

  const run = async (action, payload = {}, successMessage = "") => {
    setBusy(action);
    setError("");
    try {
      const result = await invoke(action, payload);
      await refresh();
      if (successMessage) toast({ description: successMessage });
      return result;
    } catch (runError) {
      setError(runError.message);
      toast({ description: runError.message, variant: "destructive" });
      return null;
    } finally {
      setBusy("");
    }
  };

  const missing = useMemo(
    () => (detection?.categories || []).filter((category) => !category.squad_id),
    [detection]
  );
  const issues = batch?.issues || [];
  const criticalIssues = issues.filter((issue) => issue.severity === "critical");
  const reviewCandidates = candidates.filter((candidate) => candidate.validation_status === "review" && !candidate.applied);
  const safePending = candidates.filter((candidate) => candidate.validation_status === "safe" && !candidate.applied);
  const summary = batch?.summary || {};

  const toggleAutomation = async () => {
    const next = !config?.auto_check;
    await run("updateConfiguration", {
      active: true,
      auto_check: next,
      auto_apply_safe: config?.auto_apply_safe !== false,
      check_interval_hours: config?.check_interval_hours || 24,
    }, next ? "Control automático activado." : "Control automático pausado.");
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-400" size={28} />
          <p className="mt-3 text-sm font-semibold text-white">Preparando el importador controlado</p>
          <p className="mt-1 text-xs text-zinc-500">Detectando club, categorías y última revisión…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-white">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 bg-gradient-to-r from-blue-500/10 via-zinc-950 to-zinc-950 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
                {(detection?.shield_url || clubBrand?.logoUrl)
                  ? <img src={detection?.shield_url || clubBrand.logoUrl} alt="" className="h-10 w-10 object-contain" />
                  : <Bot size={24} className="text-blue-400" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black">Importador juvenil controlado</h2>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">Agente reutilizable</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Club detectado: <span className="font-bold text-white">{detection?.club_name}</span> · Temporada {detection?.season}
                </p>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
                  Lee la fuente oficial, compara contra la base y aplica automáticamente solo cambios seguros. Las anomalías quedan detenidas para revisión.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleAutomation}
                disabled={!!busy}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${config?.auto_check ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-400"}`}
              >
                <Clock3 size={14} /> {config?.auto_check ? "Control al abrir · cada 24 h" : "Control automático pausado"}
              </button>
              <button
                onClick={() => run("preview", { auto_apply: true }, "Revisión oficial completada.")}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {busy === "preview" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Revisar ahora
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fuente</p>
            <p className="mt-2 text-sm font-bold">Liga Profesional de Fútbol</p>
            <a href="https://www.ligaprofesional.ar/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              Sitio oficial <ExternalLink size={11} />
            </a>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Último control</p>
            <p className="mt-2 text-sm font-bold">{dateTime(config?.last_check_at)}</p>
            <p className="mt-2 text-xs text-zinc-500">Sincronización segura: {dateTime(config?.last_success_at)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Último lote</p>
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(batch?.status)}`}>
              {statusLabel(batch?.status)}
            </span>
            <p className="mt-2 text-xs text-zinc-500">{batch ? dateTime(batch.completed_at || batch.created_date) : "Todavía no hay controles"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Protecciones</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-emerald-300"><ShieldCheck size={16} /> Sin duplicar ni borrar</div>
            <p className="mt-2 text-xs text-zinc-500">Respeta correcciones manuales y resultados cerrados.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div><p className="font-bold">No se pudo completar el control</p><p className="mt-1 text-xs text-red-300/80">{error}</p></div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 font-bold"><UsersRound size={17} className="text-violet-400" /> Categorías administradas</h3>
            <p className="mt-1 text-xs text-zinc-500">Se detectan por nombre y categoría; no dependen de IDs de una copia anterior.</p>
          </div>
          {missing.length > 0 && (
            <button
              onClick={() => run("prepareSquads", {}, `Se crearon ${missing.length} planteles juveniles.`)}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
            >
              {busy === "prepareSquads" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Crear {missing.length} categorías faltantes
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {CATEGORY_ORDER.map((key) => {
            const category = detection?.categories?.find((item) => item.key === key);
            const ok = !!category?.squad_id;
            const catSummary = summary?.category_summary?.[key];
            return (
              <div key={key} className={`rounded-xl border p-3 ${ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">{category?.label || key}</span>
                  {ok ? <CheckCircle2 size={15} className="text-emerald-400" /> : <AlertTriangle size={15} className="text-amber-400" />}
                </div>
                <p className="mt-1 truncate text-[10px] text-zinc-500">{ok ? category.squad_name : "Plantel pendiente"}</p>
                {catSummary && <p className="mt-2 text-[10px] text-zinc-400">{catSummary.fixtures} partidos · {catSummary.standings} posiciones</p>}
              </div>
            );
          })}
        </div>
      </div>

      {batch && (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h3 className="flex items-center gap-2 font-bold"><DatabaseZap size={17} className="text-blue-400" /> Resultado del control</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Nuevos", summary.create || 0, "text-emerald-300"],
                ["Actualizados", summary.update || 0, "text-blue-300"],
                ["Sin cambios", summary.unchanged || 0, "text-zinc-300"],
                ["A revisar", summary.conflict || summary.review || 0, "text-amber-300"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {safePending.length > 0 && criticalIssues.length === 0 && (
                <button
                  onClick={() => run("apply", { batch_id: batch.id }, "Cambios seguros aplicados.")}
                  disabled={!!busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busy === "apply" ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                  Aplicar {safePending.length} cambios seguros
                </button>
              )}
              {batch.status !== "rejected" && batch.status !== "applied" && (
                <button
                  onClick={() => run("reject", { batch_id: batch.id }, "Lote descartado sin modificar datos.")}
                  disabled={!!busy}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Descartar lote
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h3 className="flex items-center gap-2 font-bold"><AlertTriangle size={17} className="text-amber-400" /> Control de incidencias</h3>
            {issues.length === 0 && reviewCandidates.length === 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 size={16} /> No se detectaron anomalías</p>
                <p className="mt-1 text-xs text-zinc-500">Los cambios seguros pueden aplicarse sin intervención.</p>
              </div>
            ) : (
              <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
                {issues.map((issue, index) => (
                  <div key={`${issue.code}-${issue.category}-${index}`} className={`rounded-lg border p-3 ${issue.severity === "critical" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                    <p className="text-xs font-bold">{issue.category?.toUpperCase()} · {issue.severity === "critical" ? "Bloqueante" : "Aviso"}</p>
                    <p className="mt-1 text-xs text-zinc-400">{issue.message}</p>
                  </div>
                ))}
                {reviewCandidates.slice(0, 12).map((candidate) => (
                  <div key={candidate.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-bold">{candidate.category.toUpperCase()} · {candidate.record_type === "fixture" ? "Partido" : "Posición"}</p>
                    <p className="mt-1 text-xs text-zinc-400">{candidate.issue || "Cambio detenido para revisión."}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-blue-200"><Bot size={16} /> Cómo reutilizarlo en otra copia</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Configurá el nombre y escudo del nuevo club. El agente volverá a detectar la identidad, invalidará el club anterior y buscará al nuevo equipo en las seis categorías. No hace falta cambiar código, IDs ni enlaces.
        </p>
      </div>
    </div>
  );
}