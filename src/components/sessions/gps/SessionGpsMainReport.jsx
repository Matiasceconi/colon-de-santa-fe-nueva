import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, ChevronDown, ChevronUp, FileSpreadsheet, Gauge, ShieldCheck, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { REPORT_METRICS, fmtMetricVal, withPlayerDisplayNames, buildExerciseLoads } from "@/components/sessions/gpsReport/sessionGpsReportData";
import { normalizeGpsReferenceConfig, referenceTypeLabel, resolveGpsMetricReference } from "./gpsReferenceEngine";
import SessionGpsPlayerRankingTable from "./SessionGpsPlayerRankingTable";
import SessionGpsExerciseLoadTable from "./SessionGpsExerciseLoadTable";
import SessionGpsPinnedCharts from "./SessionGpsPinnedCharts";
import { layoutMatchesSeason, normalizeGpsReportLayout } from "./gpsReportLayoutConfig";

const PRIMARY_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load"];

function average(rows, key) {
  const values = rows.map(row => row[key]).filter(value => value != null && value !== "").map(Number).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function metricUnit(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  if (formatted === "—" || !metric.unit) return formatted;
  return `${formatted} ${metric.unit}`;
}

export default function SessionGpsMainReport({ session, rows = [], rawRows = [], exercises = [], exerciseRows = [], duplicateGroups = [], exerciseDuplicateGroups = [], exerciseSourceFiles = [], excludedCount = 0, sourceFile = "", referenceContext = {}, isAdmin = false }) {
  const { toast } = useToast();
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [layoutRecord, setLayoutRecord] = useState(null);
  const [layout, setLayout] = useState(() => normalizeGpsReportLayout());
  const [savingLayout, setSavingLayout] = useState(false);
  const displayRows = useMemo(() => withPlayerDisplayNames(rows), [rows]);
  const referenceConfig = useMemo(() => normalizeGpsReferenceConfig(referenceContext.config, { squad_id: session.squad_id, squad_name: session.squad_name, season_id: session.season_id }), [referenceContext.config, session.squad_id, session.squad_name, session.season_id]);
  const referenceByPlayer = useMemo(() => {
    const result = {};
    displayRows.forEach((row) => {
      result[row.player_id] = {};
      [...PRIMARY_METRICS, "smax"].forEach((metricKey) => {
        result[row.player_id][metricKey] = resolveGpsMetricReference({
          metricKey,
          row,
          session,
          config: referenceConfig,
          objectiveRules: referenceContext.objectiveRules || [],
          players: referenceContext.players || [],
          playerCompetitionProfiles: referenceContext.playerCompetitionProfiles || [],
          playerMicrocycleProfiles: referenceContext.playerMicrocycleProfiles || [],
          legacyMicrocycleProfiles: referenceContext.legacyMicrocycleProfiles || [],
          playerGpsProfiles: referenceContext.playerGpsProfiles || [],
          teamMicrocycleProfiles: referenceContext.teamMicrocycleProfiles || [],
          teamProfiles: referenceContext.teamProfiles || [],
        });
      });
    });
    return result;
  }, [displayRows, session, referenceConfig, referenceContext]);
  const referenceSummary = useMemo(() => Object.fromEntries([...PRIMARY_METRICS, "smax"].map((metricKey) => {
    const refs = displayRows.map((row) => referenceByPlayer[row.player_id]?.[metricKey]).filter(Boolean);
    const sufficient = refs.filter((ref) => ref.sufficient && Number.isFinite(Number(ref.pct)));
    const objectiveRefs = sufficient.filter((ref) => ref.status === "in_range" || ref.status === "below" || ref.status === "above");
    const types = [...new Set(sufficient.map((ref) => ref.referenceType).filter(Boolean))];
    return [metricKey, {
      averagePct: sufficient.length ? sufficient.reduce((sum, ref) => sum + Number(ref.pct), 0) / sufficient.length : null,
      sufficientCount: sufficient.length,
      totalCount: refs.length,
      objectiveCount: objectiveRefs.length,
      inRangeCount: objectiveRefs.filter((ref) => ref.status === "in_range").length,
      types,
    }];
  })), [displayRows, referenceByPlayer]);
  const metrics = showAllMetrics ? REPORT_METRICS : REPORT_METRICS.filter(metric => PRIMARY_METRICS.includes(metric.key));
  const averages = useMemo(() => Object.fromEntries(REPORT_METRICS.map(metric => [metric.key, average(displayRows, metric.key)])), [displayRows]);
  const smaxSummary = useMemo(() => {
    const valid = displayRows.map(row => ({ row, value: Number(row.smax) })).filter(item => Number.isFinite(item.value));
    if (!valid.length) return { average: null, peak: null, peakRow: null };
    const averageValue = valid.reduce((sum, item) => sum + item.value, 0) / valid.length;
    const peakItem = [...valid].sort((a, b) => b.value - a.value)[0];
    return { average: averageValue, peak: peakItem.value, peakRow: peakItem.row };
  }, [displayRows]);
  const missingCore = useMemo(() => displayRows.filter(row => row.total_distance == null || row.m_min == null || row.player_load == null), [displayRows]);
  const qualityIssues = duplicateGroups.length + exerciseDuplicateGroups.length + missingCore.length;
  const exerciseLoads = useMemo(() => {
    const exerciseIdsWithCurrentData = new Set(exerciseRows.map(row => row.exercise_id).filter(Boolean));
    return buildExerciseLoads(exercises.filter(exercise => exerciseIdsWithCurrentData.has(exercise.id)), exerciseRows);
  }, [exercises, exerciseRows]);
  useEffect(() => {
    const squadId = session.squad_id || "";
    const seasonId = session.season_id || "";
    if (!squadId) return;
    let cancelled = false;
    base44.entities.GPSReportLayoutConfiguration.filter({ squad_id: squadId }, "-updated_at", 50)
      .then((records) => {
        if (cancelled) return;
        const record = records.find((item) => item.active !== false && layoutMatchesSeason(item, seasonId)) || null;
        setLayoutRecord(record);
        setLayout(normalizeGpsReportLayout(record));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session.squad_id, session.season_id]);

  async function saveLayout() {
    if (!isAdmin || !session.squad_id) return;
    setSavingLayout(true);
    try {
      const payload = {
        squad_id: session.squad_id,
        squad_name: session.squad_name || "",
        season_id: session.season_id || "",
        table_config: layout.table_config,
        charts: layout.charts,
        active: true,
        updated_at: new Date().toISOString(),
      };
      if (layoutRecord?.id) {
        await base44.entities.GPSReportLayoutConfiguration.update(layoutRecord.id, payload);
        setLayoutRecord({ ...layoutRecord, ...payload });
      } else {
        const created = await base44.entities.GPSReportLayoutConfiguration.create(payload);
        setLayoutRecord(created);
      }
      toast({ title: "Vista GPS guardada", description: "La tabla y los gráficos fijados se repetirán en las próximas sesiones de este plantel." });
    } catch (error) {
      toast({ title: "No se pudo guardar la vista GPS", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSavingLayout(false);
    }
  }

  return (
    <section data-tour="session-gps-reference" className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-xl">
      <div className="border-b border-zinc-800 bg-gradient-to-r from-emerald-500/[0.10] via-zinc-950 to-zinc-950 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">GPS · Carga externa</p>
            <h2 className="mt-1 text-2xl font-black text-white">Informe principal de la sesión</h2>
            <p className="mt-2 text-sm text-zinc-400">{session.title || "Sesión"} · {session.match_day_code || "Sin MD"} · {session.session_objective || "Sin objetivo"}{session.duration_minutes ? ` · ${session.duration_minutes} min planificados` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-300"><Users size={11} className="mr-1 inline" />{displayRows.length} válidos</span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-400">{exerciseLoads.length} ejercicios</span>
            {excludedCount > 0 && <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-amber-300">{excludedCount} fuera del promedio</span>}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { key: "total_distance", label: "Volumen", Icon: Activity, detail: "Distancia total promedio por jugador", value: averages.total_distance },
            { key: "m_min", label: "Intensidad locomotora · m/min", Icon: Gauge, detail: "Metros recorridos por minuto", value: averages.m_min },
            { key: "distance_25", label: "Sprint · >25 km/h", Icon: BarChart3, detail: "Distancia promedio por encima de 25 km/h", value: averages.distance_25 },
            { key: "player_load", label: "Carga mecánica · Player Load", Icon: Activity, detail: "Player Load promedio del grupo", value: averages.player_load },
            { key: "smax", label: "Velocidad máxima promedio · Smax", Icon: ShieldCheck, detail: "Promedio de la velocidad máxima individual alcanzada", value: smaxSummary.average },
          ].map(({ key, label, Icon, detail, value }) => {
            const metric = REPORT_METRICS.find(item => item.key === key);
            const refSummary = referenceSummary[key];
            return <div key={key} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</p><Icon size={14} className="shrink-0 text-emerald-300" /></div><p className="mt-2 text-2xl font-black text-white">{metricUnit(metric, value)}</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{detail}</p>{key === "smax" && smaxSummary.peak != null && <p className="mt-2 text-[9px] font-semibold text-zinc-500">Pico: {metricUnit(metric, smaxSummary.peak)} · {smaxSummary.peakRow?.display_name || smaxSummary.peakRow?.player_name || "Jugador"}</p>}{refSummary?.sufficientCount > 0 && <p className="mt-2 text-[10px] font-bold text-cyan-300">Prom. {Math.round(refSummary.averagePct)}% de referencia · {refSummary.sufficientCount} jugadores</p>}</div>;
          })}
        </div>
      </div>

      {qualityIssues > 0 && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-200">Control de calidad: {qualityIssues} incidencia{qualityIssues === 1 ? "" : "s"}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Los registros duplicados quedan fuera de los promedios y del análisis principal hasta ser revisados. No se modifica ni elimina ningún dato automáticamente.</p>
              {(duplicateGroups.length > 0 || exerciseDuplicateGroups.length > 0) && <div className="mt-2 flex flex-wrap gap-2">{duplicateGroups.map(group => <span key={group.playerId} className="rounded-md border border-amber-500/20 bg-black/20 px-2 py-1 text-[10px] text-amber-200">Sesión · {group.playerName}: {group.rows.length} registros</span>)}{exerciseDuplicateGroups.slice(0, 8).map(group => <span key={group.key} className="rounded-md border border-amber-500/20 bg-black/20 px-2 py-1 text-[10px] text-amber-200">Tarea · {group.playerName} · bloque {group.blockNumber}: {group.rows.length}</span>)}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-sm font-black text-white">Carga del grupo principal</h3><p className="mt-1 text-[11px] text-zinc-500">Lectura simple de la sesión. Las referencias por MD, objetivo e histórico se incorporarán sobre esta misma estructura.</p></div>
            <button onClick={() => setShowAllMetrics(value => !value)} className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white">{showAllMetrics ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{showAllMetrics ? "Ver métricas principales" : "Ver todas las métricas"}</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {metrics.map(metric => <div key={metric.key} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"><p className="text-[9px] uppercase tracking-wider text-zinc-400">{metric.label}</p><p className="mt-1 text-lg font-black" style={{ color: metric.color }}>{metricUnit(metric, averages[metric.key])}</p></div>)}
          </div>
        </div>

        <div data-tour="gps-main-reference-summary" className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400">Metodología activa</p><h3 className="mt-1 text-sm font-black text-white">Referencias configuradas por el club</h3><p className="mt-1 text-[11px] leading-5 text-zinc-500">Cada porcentaje se calcula contra la fuente elegida para esa métrica. Si falta muestra individual, se aplica el fallback y se informa la fuente utilizada.</p></div>
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold text-cyan-300">{referenceConfig.model === "hybrid" ? "Perfil híbrido" : referenceConfig.model === "competition" ? "Demanda de partido" : referenceConfig.model === "microcycle" ? "Histórico por MD" : "Personalizado"}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {[...PRIMARY_METRICS, "smax"].map((key) => {
              const metric = REPORT_METRICS.find((item) => item.key === key);
              const summary = referenceSummary[key];
              const configuredType = referenceConfig.metric_rules?.[key]?.reference_type || "none";
              return <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{metric?.label || key}</p><p className="mt-1 text-[10px] font-bold text-zinc-300">{referenceTypeLabel(configuredType)}</p>{summary?.sufficientCount ? <><p className="mt-2 text-lg font-black text-cyan-300">{Math.round(summary.averagePct)}%</p><p className="text-[9px] text-zinc-400">{summary.sufficientCount}/{displayRows.length} con referencia suficiente{summary.objectiveCount ? ` · ${summary.inRangeCount}/${summary.objectiveCount} en objetivo` : ""}</p></> : <p className="mt-2 text-[10px] font-semibold text-zinc-500">Referencia en construcción</p>}</div>;
            })}
          </div>
        </div>

        <SessionGpsPlayerRankingTable
          rows={displayRows}
          players={referenceContext.players || []}
          referenceByPlayer={referenceByPlayer}
          config={layout.table_config}
          onConfigChange={(tableConfig) => setLayout(current => ({ ...current, table_config: tableConfig }))}
          session={session}
        />

        <SessionGpsPinnedCharts
          rows={displayRows}
          exerciseLoads={exerciseLoads}
          referenceByPlayer={referenceByPlayer}
          charts={layout.charts}
          onChartsChange={(charts) => setLayout(current => ({ ...current, charts }))}
          onSave={saveLayout}
          saving={savingLayout}
          canSave={isAdmin}
        />

        {exerciseLoads.length > 0 && (
          <SessionGpsExerciseLoadTable exerciseLoads={exerciseLoads} />
        )}

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Fuente</p><p className="mt-2 flex items-center gap-2 text-xs font-bold text-white"><FileSpreadsheet size={14} className="text-emerald-300" />{sourceFile || "Datos GPS cargados"}</p><p className="mt-1 text-[10px] text-zinc-400">{rawRows.length} registros globales{exerciseSourceFiles.length ? ` · tareas: ${exerciseSourceFiles.join(", ")}` : ""}</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Calidad del dato</p><p className={`mt-2 text-xs font-bold ${qualityIssues ? "text-amber-300" : "text-emerald-300"}`}>{qualityIssues ? `${qualityIssues} incidencias para revisar` : "Sin incidencias estructurales"}</p><p className="mt-1 text-[10px] text-zinc-400">Duplicados y métricas principales faltantes</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Siguiente nivel</p><p className="mt-2 text-xs font-bold text-white">Tareas y análisis avanzado</p><p className="mt-1 text-[10px] text-zinc-400">Ejercicios, bloques y comparaciones conservan el mismo lenguaje visual: barras o línea.</p></div>
        </div>
      </div>
    </section>
  );
}