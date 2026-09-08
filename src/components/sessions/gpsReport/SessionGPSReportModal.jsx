import ReportSurface from "@/reports/builder/ReportSurface";
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, FileDown, Loader } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { createSessionGpsPdf } from "@/lib/reports/sessionGpsPdf";
import { downloadBlob } from "@/lib/exports/fileExport";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { buildReportData } from "./sessionGpsReportData";
import SessionGpsReportContent from "./SessionGpsReportContent";
import { loadSessionGpsStudioConfig, saveSessionGpsStudioConfig } from "@/components/sessions/gps/sessionGpsStudioConfig";
import { layoutMatchesSeason, normalizeGpsReportLayout } from "@/components/sessions/gps/gpsReportLayoutConfig";
import { validSessionGpsRows, validExerciseGpsRows } from "@/components/sessions/gps/sessionGpsQuality";
moment.locale("es");

export default function SessionGPSReportModal({ session, sessionPlayers, onClose, visiblePlayerIds = [] }) {
  const { toast } = useToast();
  const { clubBrand, institutionProfile, can } = useWorkspace();
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [generated, setGenerated] = useState(null);
  const [orientation, setOrientation] = useState("portrait");
  const [reportData, setReportData] = useState(null);
  const [observations, setObservations] = useState(session.gps_report_observations || "");
  const [studioConfig, setStudioConfig] = useState(() => loadSessionGpsStudioConfig(session.id));

  const signature = JSON.stringify({session,reportData,studioConfig,observations,orientation,clubBrand,institutionProfile});
  const fresh = generated?.signature === signature && !loading && !loadError;
  useEffect(() => () => { if (generated?.url) URL.revokeObjectURL(generated.url); }, [generated]);
  useEffect(() => {
    saveSessionGpsStudioConfig(session.id, studioConfig);
  }, [session.id, studioConfig]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      setReportData(null);
      const weekStart = moment(session.date).startOf("isoWeek").format("YYYY-MM-DD");
      const weekEnd = moment(session.date).endOf("isoWeek").format("YYYY-MM-DD");
      const squadId = session.squad_id || "";
      const [gpsRows, players, allSessions, competitionProfiles, exercises, exerciseRows, referenceConfigs, objectiveRules, playerMicrocycleProfiles, legacyMicrocycleProfiles, playerGpsProfiles, teamMicrocycleProfiles, teamProfiles, reportLayouts] = await Promise.all([
        base44.entities.SessionGPSData.filter({ session_id: session.id }, "-created_date", 500),
        base44.entities.Player.list("-created_date", 1000),
        base44.entities.TrainingSession.list("-date", 500),
        squadId ? base44.entities.PlayerCompetitionProfile.filter({ squad_id: squadId }, "-updated_at", 1000).catch(() => []) : [],
        base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 500),
        base44.entities.ExerciseGPSData.filter({ session_id: session.id }, "player_name", 5000),
        squadId ? base44.entities.GPSReferenceConfiguration.filter({ squad_id: squadId }, "-updated_at", 50).catch(() => []) : [],
        squadId ? base44.entities.GPSObjectiveRule.filter({ squad_id: squadId }, "-updated_at", 500).catch(() => []) : [],
        squadId ? base44.entities.PlayerMicrocycleGPSProfile.filter({ squad_id: squadId }, "-updated_at", 2000).catch(() => []) : [],
        squadId ? base44.entities.PlayerGPSMicrocycleProfile.filter({ squad_id: squadId }, "-updated_at", 2000).catch(() => []) : [],
        squadId ? base44.entities.PlayerGPSProfile.filter({ squad_id: squadId }, "-updated_at", 1000).catch(() => []) : [],
        squadId ? base44.entities.TeamGPSMicrocycleProfile.filter({ squad_id: squadId }, "-updated_at", 500).catch(() => []) : [],
        squadId ? base44.entities.TeamGPSProfile.filter({ squad_id: squadId }, "-updated_at", 100).catch(() => []) : [],
        squadId ? base44.entities.GPSReportLayoutConfiguration.filter({ squad_id: squadId }, "-updated_at", 50).catch(() => []) : [],
      ]);
      const weekSessions = allSessions.filter(item => item.id !== session.id && item.squad_id === session.squad_id && item.date >= weekStart && item.date <= weekEnd);
      const weekGpsRows = weekSessions.length
        ? (await Promise.all(weekSessions.map(item => base44.entities.SessionGPSData.filter({ session_id: item.id }, "-created_date", 300)))).flat()
        : [];
      const comparisonSession = allSessions.find(item => item.id === studioConfig.comparisonSessionId && item.squad_id === session.squad_id && (!session.season_id || item.season_id === session.season_id)) || null;
      const comparisonGpsRows = comparisonSession
        ? await base44.entities.SessionGPSData.filter({ session_id: comparisonSession.id }, "-created_date", 500)
        : [];
      if (cancelled) return;
      const scopeRows = rows => rows.filter(row => !visiblePlayerIds.length || visiblePlayerIds.includes(row.player_id));
      const cleanSessionBuckets = rows => {
        const buckets = new Map();
        scopeRows(rows).forEach(row => {
          const key = row.session_id || "session";
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(row);
        });
        return [...buckets.values()].flatMap(bucket => validSessionGpsRows(bucket));
      };
      const cleanExerciseRows = validExerciseGpsRows(scopeRows(exerciseRows));
      const exerciseIdsWithCurrentData = new Set(cleanExerciseRows.map(row => row.exercise_id).filter(Boolean));
      const currentExercises = exercises
        .filter(exercise => exerciseIdsWithCurrentData.has(exercise.id))
        .map(exercise => visiblePlayerIds.length ? { ...exercise, external_load_summary: {} } : exercise);
      const seasonId = session.season_id || "";
      const seasonMatch = (row) => !seasonId || !row?.season_id || String(row.season_id) === String(seasonId);
      const sharedLayoutRecord = reportLayouts.find((row) => row.active !== false && layoutMatchesSeason(row, seasonId)) || null;
      if (sharedLayoutRecord) {
        const sharedLayout = normalizeGpsReportLayout(sharedLayoutRecord);
        setStudioConfig((current) => ({
          ...current,
          charts: sharedLayout.charts.map((chart) => ({ ...chart, includeInReport: true })),
        }));
      }
      const referenceContext = {
        config: referenceConfigs.find(seasonMatch) || null,
        objectiveRules: objectiveRules.filter(seasonMatch),
        playerCompetitionProfiles: competitionProfiles.filter(seasonMatch),
        playerMicrocycleProfiles: playerMicrocycleProfiles.filter(seasonMatch),
        legacyMicrocycleProfiles: legacyMicrocycleProfiles.filter(seasonMatch),
        playerGpsProfiles: playerGpsProfiles.filter(seasonMatch),
        teamMicrocycleProfiles: teamMicrocycleProfiles.filter(seasonMatch),
        teamProfiles: teamProfiles.filter(seasonMatch),
      };
      setReportData(buildReportData({
        session,
        sessionPlayers: scopeRows(sessionPlayers),
        gpsRows: validSessionGpsRows(scopeRows(gpsRows)),
        players,
        weekGpsRows: cleanSessionBuckets(weekGpsRows),
        competitionProfiles: competitionProfiles.filter(seasonMatch),
        exercises: currentExercises,
        exerciseRows: cleanExerciseRows,
        comparisonSession,
        comparisonGpsRows: validSessionGpsRows(scopeRows(comparisonGpsRows)),
        referenceContext,
      }));
      setLoading(false);
    }
    load().catch(error => {
      if (!cancelled) {
        setLoading(false);
        setLoadError(error?.message || "No se pudo cargar el informe.");
        toast({ title: "No se pudo preparar el informe", description: error?.message, variant: "destructive" });
      }
    });
    return () => { cancelled = true; };
  }, [session.id, session.date, session.squad_id, session.season_id, studioConfig.comparisonSessionId, JSON.stringify(visiblePlayerIds), JSON.stringify(sessionPlayers)]);

  async function saveObservations() {
    setSaving(true);
    try {
      if (!can("edit", "/sessions")) throw new Error("No tenés permiso para editar observaciones.");
      await base44.entities.TrainingSession.update(session.id, { gps_report_observations: observations });
      toast({ title: "Observaciones guardadas" });
    } catch (error) {
      toast({ title: "No se pudieron guardar las observaciones", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      assertExportAllowed(can, "/sessions");
      if (loading || loadError || !reportData) throw new Error("Esperá a que los datos estén listos.");
      const result = await createSessionGpsPdf({ session, reportData, clubBrand, institutionProfile, studioConfig, observations, orientation });
      const blob = result.doc.output("blob");
      setGenerated({blob, url:URL.createObjectURL(blob), filename:result.filename, signature});
    } catch (error) {
      toast({ title: "Error al generar el PDF", description: error.message, variant: "destructive" });
    } finally { setExporting(false); }
  }
  function download() {
    try {
      assertExportAllowed(can, "/sessions");
      if (!fresh) throw new Error("Regenerá la vista previa para incluir los cambios.");
      downloadBlob(generated.blob, generated.filename);
    } catch (error) { toast({title:"No se pudo descargar",description:error.message,variant:"destructive"}); }
  }

  return (
    <ReportSurface onClose={onClose} className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-3 sm:p-5">
      <div className="bg-zinc-950 border border-zinc-700 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">Informe profesional de sesión</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">PDF estructurado · identidad y gráficos configurables</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Orientación del PDF" value={orientation} onChange={e=>setOrientation(e.target.value)} className="bg-zinc-800 text-white text-xs rounded p-2"><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select>
            <button onClick={download} disabled={!fresh || exporting} className="bg-white text-zinc-950 rounded px-3 py-2 text-xs disabled:opacity-40">Descargar PDF</button>
            <button onClick={handleExport} disabled={exporting || loading || !!loadError || !reportData || !can("export", "/sessions")} className="flex items-center gap-1.5 px-3 py-2 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50" style={{ backgroundColor: clubBrand?.colors?.accent || "#facc15", color: clubBrand?.colors?.onAccent || "#111827" }}>
              {exporting ? <Loader size={12} className="animate-spin" /> : <FileDown size={12} />} Generar vista previa
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 bg-zinc-900/40">
          {generated && <section className="mb-5"><p className="text-xs text-zinc-300 mb-2">{fresh ? "Este es el archivo que se descargará." : "La configuración cambió. Generá una nueva vista previa para descargar."}</p><iframe title="Vista previa del PDF GPS" src={generated.url} className="w-full h-[70vh] rounded bg-white" /></section>}
          {loadError ? <p role="alert" className="text-red-300 p-5">{loadError}</p> : loading || !reportData
            ? <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
            : <div ref={reportRef}><SessionGpsReportContent session={session} reportData={reportData} clubBrand={clubBrand} institutionProfile={institutionProfile} studioConfig={studioConfig} setStudioConfig={setStudioConfig} observations={observations} setObservations={setObservations} saving={saving} onSaveObservations={saveObservations} /></div>}
        </div>
      </div>
    </ReportSurface>
  );
}