import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, FileSpreadsheet, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MatchGpsReport from "@/components/matches/MatchGpsReport";
import { parseCatapultCSV } from "@/components/matches/matchGpsCsvParser";

function MatchCsvPanel({ match, onMatchUpdated }) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [includeMinutes, setIncludeMinutes] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function importFile(file, csvText, id) {
    setBusy(true); setError(""); setStage("Subiendo el CSV…");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("El servidor no devolvió el archivo cargado.");
      if (id !== request.current) return;
      setStage("Consolidando jugadores y tiempos…");
      const processed = await base44.functions.invoke("resolveMatchGpsCSV", {
        csv_text: csvText,
        csv_url: file_url,
        match_id: match.id,
        match_date: match.date,
        csv_label: file.name,
        import_minutes: includeMinutes,
      });
      const result = processed.data || processed;
      if (result?.error) throw new Error(result.error);
      if (id !== request.current) return;
      setStage("Guardando el archivo en el partido…");
      await base44.entities.MatchReport.update(match.id, { csv_url: file_url, csv_label: file.name });
      if (id !== request.current) return;
      const suggestionPatch = result.match_duration_minutes ? { gps_duration_suggestion: result.match_duration_minutes, gps_duration_suggested_at: new Date().toISOString() } : {};
      onMatchUpdated({ csv_url: file_url, csv_label: file.name, gps_import_version: 4, ...suggestionPatch });
      setPendingFile(null);
      setStage(result.minutes_imported ? `Carga completa: ${result.minutes_imported} sugerencias de minutos GPS. Deben confirmarse en Minutos jugados.` : "Carga completa. El informe físico ya está disponible debajo.");
    } catch (e) {
      if (id === request.current) {
        setStage("");
        setError(e?.response?.data?.error || e.message || "No se pudo guardar el CSV. Podés reintentar sin seleccionarlo nuevamente.");
      }
    } finally { if (id === request.current) setBusy(false); }
  }
  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const id = ++request.current;
    setBusy(true); setPreview(null); setError(""); setPendingFile(null); setStage("Leyendo el archivo…");
    try {
      const csvText = await file.text();
      const parsed = parseCatapultCSV(csvText);
      if (id !== request.current) return;
      if (parsed.error) throw new Error(parsed.error);
      if (!Array.isArray(parsed.rows) || !parsed.rows.length) throw new Error("No se encontraron jugadores en el archivo.");
      setPreview({ ...parsed, filename: file.name }); setPendingFile({ file, csvText });
      await importFile(file, csvText, id);
    } catch (e) {
      if (id === request.current) { setError(e.message || "No se pudo leer el archivo."); setStage(""); setBusy(false); }
    }
  }
  async function removeCsv() {
    setBusy(true); setError(""); setStage("Quitando la importación GPS del partido…");
    try {
      await base44.functions.invoke("resolveMatchGpsCSV", { mode: "clear_import", match_id: match.id });
      await base44.entities.MatchReport.update(match.id, { csv_url: null, csv_label: null, gps_duration_suggestion: null, gps_duration_suggested_at: null });
      onMatchUpdated({ csv_url: null, csv_label: null, gps_duration_suggestion: null, gps_duration_suggested_at: null });
      setPreview(null); setPendingFile(null); setStage("");
    } catch (e) { setError(e?.response?.data?.error || e.message || "No se pudo quitar la importación GPS."); setStage(""); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold text-white"><FileSpreadsheet size={16} className="text-emerald-300"/>Archivo GPS del partido</h2>
        <p className="mt-1 text-xs text-zinc-300">Cargá el CSV del proveedor GPS. El informe físico se guarda automáticamente; los minutos GPS son sólo una sugerencia hasta que el staff los confirme.</p></div>
      {match.csv_url && <div className="flex items-center gap-2"><a href={match.csv_url} target="_blank" rel="noreferrer" aria-label="Abrir CSV guardado" className="rounded-lg border border-zinc-600 p-2 text-zinc-200"><ExternalLink size={14}/></a><button aria-label="Quitar CSV del partido" onClick={removeCsv} disabled={busy} className="rounded-lg border border-zinc-600 p-2 text-zinc-200 disabled:opacity-40"><X size={14}/></button></div>}
    </div>
    <label className="mt-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100"><input type="checkbox" checked={includeMinutes} disabled={busy} onChange={(event) => setIncludeMinutes(event.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-400" /><span><strong>Generar sugerencias de minutos desde GPS</strong><span className="mt-0.5 block text-xs text-sky-200/70">No modifica los minutos oficiales. Después se revisan y confirman en la pestaña Minutos jugados.</span></span></label>
    <label className={"mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4 "+(busy?"pointer-events-none opacity-60":"hover:border-emerald-400")}>
      <span className="min-w-0"><span className="block truncate text-sm text-white">{match.csv_label || "Seleccionar CSV del partido"}</span><span className="text-xs text-zinc-300">Se conservan 1T/2T y el total físico por jugador, sin convertirlo automáticamente en minutos oficiales.</span></span>
      <span className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-sm font-medium text-zinc-950"><Upload size={15}/>{busy?"Procesando…":match.csv_url?"Reemplazar":"Cargar CSV"}</span>
      <input aria-label="Seleccionar archivo CSV de Catapult" type="file" accept=".csv,.txt,text/csv" className="hidden" disabled={busy} onChange={handleUpload}/>
    </label>
    {stage && <p role="status" aria-live="polite" className="mt-3 text-sm text-sky-200">{stage}</p>}
    {error && <div role="alert" className="mt-3 rounded-lg border border-rose-500 bg-rose-950/30 p-3 text-sm text-rose-200"><p>{error}</p>{pendingFile && <button disabled={busy} onClick={()=>importFile(pendingFile.file,pendingFile.csvText,++request.current)} className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-white disabled:opacity-40">Reintentar carga</button>}</div>}
    {preview && <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-950/30 p-4">
      <h3 className="font-semibold text-emerald-200">Archivo leído · {preview.filename}</h3>
      <p className="mt-2 text-sm">{preview.raw_count} registros → {preview.rows.length} jugadores · Primer tiempo: {preview.rows.filter(r=>r.periods.some(p=>p.period==="first_half")).length} · Segundo tiempo: {preview.rows.filter(r=>r.periods.some(p=>p.period==="second_half")).length}</p>
      <details className="mt-3"><summary className="cursor-pointer text-sm text-zinc-200">Ver jugadores y períodos detectados</summary><div className="mt-2 max-h-60 overflow-auto text-xs">{preview.rows.map(r=><p className="border-t border-zinc-700 py-2" key={r.player_name}>{r.player_name} · {r.periods.length===2?"1T + 2T":r.periods[0]?.period==="first_half"?"Solo 1T":r.periods[0]?.period==="second_half"?"Solo 2T":"Total CSV"}</p>)}</div></details>
      {!!preview.warnings.length && <details className="mt-3 text-sm text-amber-200"><summary>Observaciones ({preview.warnings.length})</summary>{preview.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    </div>}
  </section>;
}
export default function GpsTab({match,onMatchUpdated,onRegisterSave}){
  const [localUpload,setLocalUpload]=useState(null);
  const current=localUpload?.id===match.id?{...match,...localUpload.patch}:match;
  useEffect(()=>{setLocalUpload(null);},[match.id,match.csv_url,match.csv_label]);
  useEffect(()=>{onRegisterSave?.({action:null,disabled:true,pending:false,label:"gps"});},[onRegisterSave]);
  function handleUpdated(patch){setLocalUpload({id:match.id,patch});onMatchUpdated?.(patch);}
  return <div className="space-y-4"><MatchCsvPanel key={match.id} match={current} onMatchUpdated={handleUpdated}/><MatchGpsReport key={match.id} match={current}/></div>;
}