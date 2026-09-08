import React, { useEffect, useMemo, useState } from "react";
import ReportSurface from "./ReportSurface";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Brain, Check, Download, Eye, FileClock, FileText, Loader2, Save, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { downloadBlob } from "@/lib/exports/fileExport";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { hydrateReportAssets } from "@/reports/core/reportAssets";
import {
  finalizeReportArtifact,
  getReportRun,
  listSessionReports,
  prepareSessionReport,
  saveReportAiSummary,
} from "@/reports/core/reportClient";
import { defaultSessionReportSections, SESSION_REPORT_SECTIONS } from "@/reports/core/reportRegistry";
import { sessionReportFilename } from "@/reports/core/reportFileNames";
import SessionReportDocument from "@/reports/session/SessionReportDocument";

const ORIENTATIONS = [
  { id: "auto", label: "Automática", detail: "Vertical para lectura y horizontal para tablas anchas." },
  { id: "portrait", label: "A4 vertical", detail: "Fuerza todo el documento a orientación vertical." },
  { id: "landscape", label: "A4 horizontal", detail: "Fuerza todo el documento a orientación horizontal." },
];

const CHARTS = [
  { id: "total_distance", label: "Distancia total" },
  { id: "m_min", label: "m/min" },
  { id: "distance_25", label: "D>25" },
  { id: "player_load", label: "Player Load" },
  { id: "smax", label: "Smax" },
];

function compactAiPayload(snapshot) {
  return {
    session: snapshot.session,
    summary: snapshot.summary,
    exercises: (snapshot.exercises || []).map((row) => ({ name: row.name, format: row.format_label, blocks: row.blocks, duration_min: row.duration_min, eii: row.eii, objective: row.objective })),
    gps: (snapshot.gps || []).map((row) => ({ player: row.player_name, group: row.gps_group, total_distance: row.total_distance, m_min: row.m_min, distance_19_8: row.distance_19_8, distance_25: row.distance_25, sprints: row.sprints, acc_3: row.acc_3, dec_3: row.dec_3, player_load: row.player_load, smax: row.smax })),
  };
}

function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
}

export default function SessionReportBuilderModal({ session, sessionPlayers = [], onClose }) {
  const { can } = useWorkspace();
  const { toast } = useToast();
  const [showOptions, setShowOptions] = useState(() => window.innerWidth >= 1024);
  const [preparedConfig, setPreparedConfig] = useState("");
  const [sections, setSections] = useState(defaultSessionReportSections());
  const [orientation, setOrientation] = useState("auto");
  const [playerIds, setPlayerIds] = useState(() => sessionPlayers.map((row) => row.player_id).filter(Boolean));
  const [chartMetrics, setChartMetrics] = useState(["total_distance", "m_min", "distance_25", "player_load"]);
  const [snapshot, setSnapshot] = useState(null);
  const [run, setRun] = useState(null);
  const [assets, setAssets] = useState({});
  const [preparing, setPreparing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const canExport = can("export", "/sessions");
  const configKey = JSON.stringify({ sections: [...sections].sort(), orientation, playerIds: [...playerIds].sort(), chartMetrics: [...chartMetrics].sort() });
  const previewStale = Boolean(snapshot && configKey !== preparedConfig);

  useEffect(() => {
    setPlayerIds(sessionPlayers.map((row) => row.player_id).filter(Boolean));
  }, [session.id, sessionPlayers]);

  useEffect(() => { loadHistory(); }, [session.id]);

  async function loadHistory() {
    if (!canExport) return;
    setHistoryLoading(true);
    try { setHistory(await listSessionReports(session.id)); }
    catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }

  function toggleSection(id) {
    setSections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleChart(id) {
    setChartMetrics((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function togglePlayer(id) {
    setPlayerIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function preparePreview() {
    if (!canExport) {
      toast({ title: "No tenés permiso para exportar Sesiones", variant: "destructive" });
      return;
    }
    if (!sections.length) {
      toast({ title: "Seleccioná al menos una sección", variant: "destructive" });
      return;
    }
    if (sections.includes("charts") && !chartMetrics.length) {
      toast({ title: "Seleccioná al menos una métrica o quitá la sección Gráficos", variant: "destructive" });
      return;
    }
    const playerDependent = sections.some((id) => ["players", "gps", "charts"].includes(id));
    if (playerDependent && sessionPlayers.length && !playerIds.length) {
      toast({ title: "Seleccioná al menos un jugador para las secciones individuales", variant: "destructive" });
      return;
    }
    setPreparing(true);
    try {
      const result = await prepareSessionReport({ sessionId: session.id, sections, orientation, playerIds, chartMetrics });
      const hydratedAssets = await hydrateReportAssets(result.snapshot);
      setPreparedConfig(configKey);
      setShowHistory(false);
      if (window.innerWidth < 1024) setShowOptions(false);
      setRun(result.run);
      setSnapshot(result.snapshot);
      setAssets(hydratedAssets);
      setAiDraft(result.snapshot.ai_summary || "");
      toast({ title: "Vista previa preparada", description: `Snapshot ${String(result.snapshot.snapshot_hash || "").slice(0, 10)}… · v${result.snapshot.template_version}` });
      await loadHistory();
    } catch (error) {
      toast({ title: "No se pudo preparar el informe", description: error.message, variant: "destructive" });
    } finally {
      setPreparing(false);
    }
  }

  async function renderPdfBlob() {
    if (!snapshot) throw new Error("Primero generá la vista previa.");
    if (previewStale) throw new Error("Actualizá la vista previa para aplicar las opciones seleccionadas.");
    const document = <SessionReportDocument snapshot={{ ...snapshot, ai_summary: aiDraft }} assets={assets} />;
    return pdf(document).toBlob();
  }

  async function persistArtifact(blob, filename) {
    const file = new File([blob], filename, { type: "application/pdf" });
    const upload = await base44.integrations.Core.UploadFile({ file });
    const fileUrl = upload?.file_url;
    if (!fileUrl) throw new Error("El PDF se generó, pero no pudo guardarse en PerformancePitch.");
    const finalized = await finalizeReportArtifact(run?.id || snapshot?.report_run_id, {
      file_url: fileUrl,
      filename,
      mime_type: "application/pdf",
      size_bytes: blob.size,
    });
    setRun(finalized.run);
    await loadHistory();
    return fileUrl;
  }

  async function handleSave({ download = false } = {}) {
    if (!canExport || preparing || rendering || previewStale) return;
    setRendering(true);
    try {
      if (aiDraft !== (snapshot?.ai_summary || "")) {
        await saveReportAiSummary(run?.id || snapshot.report_run_id, aiDraft, "edited");
        setSnapshot((current) => ({ ...current, ai_summary: aiDraft }));
      }
      const blob = await renderPdfBlob();
      const filename = sessionReportFilename(snapshot);
      let stored = false;
      try {
        await persistArtifact(blob, filename);
        stored = true;
      } catch (error) {
        toast({ title: "PDF generado, historial pendiente", description: error.message, variant: "destructive" });
      }
      if (download) downloadBlob(blob, filename);
      if (stored || download) toast({ title: download ? "PDF descargado" : "Informe guardado", description: stored ? `${filename} · guardado en el historial` : `${filename} · descargado sin guardar en el historial` });
    } catch (error) {
      toast({ title: "No se pudo renderizar el PDF", description: error.message, variant: "destructive" });
    } finally {
      setRendering(false);
    }
  }

  async function generateAiSummary() {
    if (!snapshot) return;
    setAiLoading(true);
    try {
      const payload = compactAiPayload(snapshot);
      const prompt = `Actuá como asistente de rendimiento de un club de fútbol. Redactá una síntesis profesional y prudente de esta sesión usando EXCLUSIVAMENTE los datos JSON provistos. No inventes datos, no diagnostiques lesiones y no atribuyas causalidad. Escribí un párrafo breve de contexto y luego 3 a 5 observaciones concretas. Si faltan datos relevantes, indicarlo. Datos: ${JSON.stringify(payload)}`;
      const answer = await base44.integrations.Core.InvokeLLM({ prompt });
      const text = typeof answer === "string" ? answer : String(answer?.text || answer?.answer || answer || "");
      setAiDraft(text);
      setSnapshot((current) => ({ ...current, ai_summary: text }));
      await saveReportAiSummary(run?.id || snapshot.report_run_id, text, "generated");
      toast({ title: "Resumen IA generado", description: "Revisalo antes de guardar el informe." });
    } catch (error) {
      toast({ title: "No se pudo generar el resumen IA", description: error.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function saveAiDraft() {
    if (!snapshot) return;
    try {
      await saveReportAiSummary(run?.id || snapshot.report_run_id, aiDraft, "edited");
      setSnapshot((current) => ({ ...current, ai_summary: aiDraft }));
      toast({ title: "Resumen guardado" });
    } catch (error) {
      toast({ title: "No se pudo guardar el resumen", description: error.message, variant: "destructive" });
    }
  }

  async function openHistorical(reportId) {
    setPreparing(true);
    try {
      const result = await getReportRun(reportId);
      const hydratedAssets = await hydrateReportAssets(result.snapshot);
      setPreparedConfig(configKey);
      setShowHistory(false);
      if (window.innerWidth < 1024) setShowOptions(false);
      setRun(result.run);
      setSnapshot(result.snapshot);
      setAssets(hydratedAssets);
      setAiDraft(result.snapshot.ai_summary || "");
      const restored = {
        sections: result.snapshot.sections || [],
        orientation: result.snapshot.orientation || "auto",
        playerIds: result.run?.filters_snapshot?.player_ids || (result.snapshot.players || []).map((row) => row.player_id).filter(Boolean),
        chartMetrics: result.run?.options?.chart_metrics || [],
      };
      setSections(restored.sections);
      setOrientation(restored.orientation);
      setPlayerIds(restored.playerIds);
      setChartMetrics(restored.chartMetrics);
      setPreparedConfig(JSON.stringify({ ...restored, sections: [...restored.sections].sort(), playerIds: [...restored.playerIds].sort(), chartMetrics: [...restored.chartMetrics].sort() }));
      setShowHistory(false);
    } catch (error) {
      toast({ title: "No se pudo abrir el informe histórico", description: error.message, variant: "destructive" });
    } finally {
      setPreparing(false);
    }
  }

  const selectedCount = playerIds.length;
  const allPlayersSelected = sessionPlayers.length > 0 && selectedCount === sessionPlayers.filter((row) => row.player_id).length;
  const pdfSnapshot = useMemo(() => snapshot ? { ...snapshot, ai_summary: aiDraft } : null, [snapshot, aiDraft]);

  if (!canExport) {
    return <ReportSurface onClose={onClose} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex items-center justify-between"><h2 className="font-bold text-white">PerformancePitch Reports</h2><button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button></div><p className="mt-4 text-sm text-zinc-400">Tu rol permite ver Sesiones, pero no exportarlas. Un administrador puede habilitar la acción <strong className="text-zinc-200">Exportar</strong> para este módulo.</p></div></ReportSurface>;
  }

  return (
    <ReportSurface onClose={onClose} className="fixed inset-0 bg-zinc-950 p-0 sm:p-2">
      <div className="mx-auto flex h-full max-w-none flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3 md:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-400">PerformancePitch Reports</p>
            <h2 className="mt-1 text-lg font-black text-white">Informe profesional de sesión</h2>
            <p className="text-xs text-zinc-500">{session.squad_name || "Plantel"} · {session.date || "Sin fecha"} · Informe de sesión</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowOptions((value) => !value)} aria-expanded={showOptions} aria-controls="report-options" className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200">{showOptions ? "Ocultar opciones" : "Configurar informe"}</button>
            <button onClick={preparePreview} disabled={preparing || rendering} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-50">{preparing ? "Preparando..." : snapshot ? "Actualizar vista previa" : "Generar vista previa"}</button>
            <button onClick={() => { setShowHistory((value) => !value); if (window.innerWidth < 1024) setShowOptions(false); }} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"><FileClock size={14} /> Historial</button>
            <button onClick={onClose} aria-label="Cerrar informe" className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={18} /></button>
          </div>
        </header>

        <div className={`grid min-h-0 flex-1 overflow-hidden ${showOptions ? "grid-rows-[minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[300px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"}`}>
          <aside id="report-options" className={`${showOptions ? "" : "hidden"} min-h-0 overflow-y-auto overscroll-contain border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r`}>
            <div className="space-y-5">
              <section>
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">1. Secciones</h3><span className="text-xs text-zinc-500">{sections.length}/{SESSION_REPORT_SECTIONS.length}</span></div>
                <div className="mt-3 space-y-2">
                  {SESSION_REPORT_SECTIONS.map((section) => {
                    const active = sections.includes(section.id);
                    return <button key={section.id} onClick={() => toggleSection(section.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"}`}><div className="flex items-start gap-2"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600"}`}>{active ? <Check size={11} /> : null}</span><div><p className={`text-xs font-bold ${active ? "text-emerald-200" : "text-zinc-300"}`}>{section.label}</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{section.description}</p></div></div></button>;
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-white">2. Orientación</h3>
                <div className="mt-3 grid gap-2">
                  {ORIENTATIONS.map((item) => <button key={item.id} onClick={() => setOrientation(item.id)} className={`rounded-xl border p-3 text-left ${orientation === item.id ? "border-sky-500/40 bg-sky-500/10" : "border-zinc-800 bg-zinc-900/70"}`}><p className={`text-xs font-bold ${orientation === item.id ? "text-sky-200" : "text-zinc-300"}`}>{item.label}</p><p className="mt-1 text-[10px] text-zinc-600">{item.detail}</p></button>)}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">3. Jugadores</h3><button onClick={() => setPlayerIds(allPlayersSelected ? [] : sessionPlayers.map((row) => row.player_id).filter(Boolean))} className="text-[10px] font-bold text-sky-300 hover:text-sky-200">{allPlayersSelected ? "Quitar todos" : "Seleccionar todos"}</button></div>
                <p className="mt-1 text-[10px] text-zinc-600">{selectedCount} jugadores seleccionados para el informe.</p>
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {sessionPlayers.map((row) => <label key={row.player_id || row.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-xs text-zinc-300 hover:border-zinc-700"><input type="checkbox" checked={playerIds.includes(row.player_id)} onChange={() => togglePlayer(row.player_id)} className="accent-emerald-500" /><span className="min-w-0 flex-1 truncate">{row.player_name}</span><span className="text-[10px] text-zinc-600">{row.attendance || ""}</span></label>)}
                  {!sessionPlayers.length && <p className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-600">La sesión todavía no tiene jugadores vinculados.</p>}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-white">4. Gráficos vectoriales</h3>
                <div className="mt-3 flex flex-wrap gap-2">{CHARTS.map((chart) => <button key={chart.id} onClick={() => toggleChart(chart.id)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${chartMetrics.includes(chart.id) ? "border-violet-500/40 bg-violet-500/10 text-violet-200" : "border-zinc-800 text-zinc-500"}`}>{chart.label}</button>)}</div>
              </section>

              <button onClick={preparePreview} disabled={preparing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50">{preparing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} {preparing ? "Preparando informe..." : snapshot ? "Regenerar vista previa" : "Generar vista previa"}</button>
            </div>
          </aside>

          <main className={`${showOptions ? "hidden lg:block" : ""} min-h-0 min-w-0 overflow-y-auto bg-zinc-900/50 p-3 md:p-4`}>
            {previewStale && <p role="status" className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">Cambiaste las opciones. Actualizá la vista previa antes de guardar o descargar.</p>}
            {showHistory ? (
              <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
                <div className="flex items-center justify-between"><div><h3 className="font-bold text-white">Historial de esta sesión</h3><p className="mt-1 text-xs text-zinc-500">Snapshots versionados y artefactos guardados.</p></div><button onClick={loadHistory} className="text-xs text-sky-300">Actualizar</button></div>
                {historyLoading ? <div className="py-16 text-center text-zinc-500"><Loader2 size={20} className="mx-auto animate-spin" /></div> : <div className="mt-4 space-y-2">{history.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-zinc-200">{item.title}</p><p className="mt-1 text-[10px] text-zinc-500">{formatDate(item.generated_at)} · {item.generated_by_name || item.generated_by_email || "Usuario"} · v{item.template_version} · {item.status}</p><p className="mt-1 font-mono text-[9px] text-zinc-700">{String(item.snapshot_hash || "").slice(0, 18)}…</p></div><div className="flex gap-2"><button onClick={() => openHistorical(item.id)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Vista previa</button>{item.artifact_url ? <a href={item.artifact_url} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">Abrir PDF</a> : <span className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-600">Sin artefacto</span>}</div></article>)}{!history.length && <p className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-600">Todavía no hay informes generados para esta sesión.</p>}</div>}
              </section>
            ) : snapshot && pdfSnapshot ? (
              <div className="flex h-full min-h-0 flex-col gap-3">
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 xl:flex-row xl:items-center xl:justify-between">
                  <div><p className="text-xs font-bold text-white">Snapshot preparado · v{snapshot.template_version}</p><p className="mt-1 font-mono text-[9px] text-zinc-600">SHA-256 {String(snapshot.snapshot_hash || "").slice(0, 24)}…</p></div>
                  <div className="flex flex-wrap gap-2">
                    {sections.includes("ai") && <button onClick={generateAiSummary} disabled={aiLoading} className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 disabled:opacity-50">{aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />} {aiDraft ? "Regenerar IA" : "Generar resumen IA"}</button>}
                    <button onClick={() => handleSave({ download: false })} disabled={rendering || preparing || previewStale} className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 disabled:opacity-50"><Save size={13} /> Guardar informe</button>
                    <button onClick={() => handleSave({ download: true })} disabled={rendering || preparing || previewStale} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-50">{rendering ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Descargar PDF</button>
                  </div>
                </div>
                {sections.includes("ai") && <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold text-violet-200">Resumen IA editable</p>{aiDraft && <button onClick={saveAiDraft} className="text-[10px] font-bold text-violet-300">Guardar texto</button>}</div><textarea value={aiDraft} onChange={(event) => setAiDraft(event.target.value)} rows={4} placeholder="Generá el resumen o escribí una síntesis manual..." className="mt-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs leading-relaxed text-zinc-200 outline-none focus:border-violet-500" /></div>}
                <div className="min-h-[400px] flex-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                  <PDFViewer title="Vista previa del informe de sesión" width="100%" height="100%" showToolbar className="min-h-[400px]"><SessionReportDocument snapshot={pdfSnapshot} assets={assets} /></PDFViewer>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] h-full items-center justify-center"><div className="max-w-md text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"><FileText size={25} /></div><h3 className="mt-4 text-lg font-black text-white">Prepará el primer PerformancePitch Report</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">Elegí secciones, jugadores, orientación y gráficos. Generá la vista previa para revisar el documento antes de descargarlo.</p><p className="mt-3 text-xs text-zinc-600">No se captura la pantalla. Tablas, texto y gráficos se renderizan como contenido estructurado del PDF.</p></div></div>
            )}
          </main>
        </div>
      </div>
    </ReportSurface>
  );
}
