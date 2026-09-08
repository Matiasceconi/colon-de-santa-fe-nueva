import ExerciseComparisonExplorer from "./ExerciseComparisonExplorer";
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, BarChart3, GitCompareArrows, LineChart as LineIcon, Plus, Settings2, Trash2, Trophy, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateSessionGps } from "@/components/sessions/gps/gpsTaskImportUtils";
import { REPORT_METRICS, fmtMetricVal } from "@/components/sessions/gpsReport/sessionGpsReportData";
import { loadSessionGpsStudioConfig, saveSessionGpsStudioConfig } from "./sessionGpsStudioConfig";
import { validExerciseGpsRows, validSessionGpsRows } from "./sessionGpsQuality";

function average(rows, key) {
  const values = rows
    .map(row => row[key])
    .filter(value => value != null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function metricValue(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  return formatted === "—" || !metric.unit ? formatted : `${formatted} ${metric.unit}`;
}

function shortName(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : value;
}

function StudioChart({ chart, data, metric, brandColor, compare = false }) {
  const chartColor = metric?.color || brandColor;
  const values = data
    .map(item => item.value)
    .filter(value => value != null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
      <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 58 : 34} />
      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={48} />
      <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, fontSize: 11 }} formatter={(value, name) => [metricValue(metric, value), name === "comparison" ? "Sesión comparada" : metric.label]} />
      {compare && <Legend wrapperStyle={{ fontSize: 10 }} />}
      {chart.showAverage !== false && mean != null && <ReferenceLine y={mean} stroke={brandColor} strokeDasharray="4 4" label={{ value: "Prom.", fill: brandColor, fontSize: 9 }} />}
    </>
  );

  if (chart.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 4, right: 20, top: 18, bottom: 4 }}>
          {common}
          <Line type="monotone" dataKey="value" name={metric.label} stroke={chartColor} strokeWidth={3} dot={{ r: 4, fill: chartColor }} />
          {compare && <Line type="monotone" dataKey="comparison" name="Sesión comparada" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 20, top: 18, bottom: 4 }}>
        {common}
        <Bar dataKey="value" name={metric.label} radius={[6, 6, 0, 0]}>
          <LabelList dataKey="value" position="top" fill="#d4d4d8" fontSize={9} formatter={value => fmtMetricVal(metric.key, value)} />
          {data.map((_, index) => <Cell key={index} fill={chartColor} fillOpacity={0.88} />)}
        </Bar>
        {compare && <Bar dataKey="comparison" name="Sesión comparada" fill="#f59e0b" fillOpacity={0.8} radius={[6, 6, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SessionGpsAnalysisStudio({ session, gpsRows, allowedPlayerIds }) {
  
  const brandColor = "#34d399";
  const [activeView, setActiveView] = useState("exercise");
  const [exercises, setExercises] = useState([]);
  const [exerciseRows, setExerciseRows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [comparisonRows, setComparisonRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(() => loadSessionGpsStudioConfig(session.id));
  const [draftChart, setDraftChart] = useState({ metric: "total_distance", dimension: "exercise", type: "bar", showAverage: true });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [sessionExercises, taskRows, allSessions] = await Promise.all([
        base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 500),
        base44.entities.ExerciseGPSData.filter({ session_id: session.id }, "player_name", 5000),
        base44.entities.TrainingSession.list("-date", 500),
      ]);
      if (cancelled) return;
      const cleanTaskRows = validExerciseGpsRows(taskRows);
      const exerciseIdsWithCurrentData = new Set(cleanTaskRows.map(row => row.exercise_id).filter(Boolean));
      setExercises(sessionExercises.filter(exercise => exerciseIdsWithCurrentData.has(exercise.id)));
      setExerciseRows(cleanTaskRows);
      setSessions(allSessions.filter(item => item.id !== session.id && item.squad_id === session.squad_id));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [session.id, session.squad_id]);

  useEffect(() => {
    saveSessionGpsStudioConfig(session.id, config);
  }, [config, session.id]);

  useEffect(() => {
    let cancelled = false;
    if (!config.comparisonSessionId) {
      setComparisonRows([]);
      return undefined;
    }
    base44.entities.SessionGPSData.filter({ session_id: config.comparisonSessionId }, "player_name", 500)
      .then(rows => { if (!cancelled) setComparisonRows(validSessionGpsRows(rows)); })
      .catch(() => { if (!cancelled) setComparisonRows([]); });
    return () => { cancelled = true; };
  }, [config.comparisonSessionId]);

  const fieldRows = useMemo(() => gpsRows.filter(row => row.include_in_session_average !== false), [gpsRows]);
  const teamAverages = useMemo(() => Object.fromEntries(REPORT_METRICS.map(metric => [metric.key, average(fieldRows, metric.key)])), [fieldRows]);

  const exerciseLoads = useMemo(() => exercises.map(exercise => {
    const detail = exerciseRows.filter(row => row.exercise_id === exercise.id && row.include_in_session_average !== false && (!allowedPlayerIds?.length || allowedPlayerIds.includes(row.player_id)));
    const playerTotals = detail.length ? aggregateSessionGps(detail) : [];
    const summary = exercise.external_load_summary || {};
    const metrics = {};
    REPORT_METRICS.forEach(metric => {
      metrics[metric.key] = playerTotals.length ? average(playerTotals, metric.key) : (allowedPlayerIds?.length ? null : (summary[metric.key] ?? null));
    });
    return {
      id: exercise.id,
      name: exercise.name,
      blocks: Number(exercise.blocks) || Math.max(1, ...detail.map(row => Number(row.block_number) || 1)),
      players: playerTotals.length || summary.players_count || exercise.players_count || 0,
      ...metrics,
    };
  }).filter(row => REPORT_METRICS.some(metric => row[metric.key] != null)), [exercises, exerciseRows, allowedPlayerIds]);

  const selectedPlayerIds = config.selectedPlayerIds.length
    ? config.selectedPlayerIds
    : fieldRows.slice(0, 2).map(row => row.player_id);
  const selectedPlayers = fieldRows.filter(row => selectedPlayerIds.includes(row.player_id));

  function updateConfig(patch) {
    setConfig(current => ({ ...current, ...patch }));
  }

  function togglePlayer(playerId) {
    const current = selectedPlayerIds;
    const next = current.includes(playerId)
      ? current.filter(id => id !== playerId)
      : [...current, playerId].slice(-4);
    updateConfig({ selectedPlayerIds: next });
  }

  function chartData(chart) {
    if (chart.dimension === "exercise") {
      return exerciseLoads.map(row => ({ name: row.name, value: row[chart.metric] }));
    }
    return fieldRows.map(row => ({ name: shortName(row.player_name), value: row[chart.metric] }));
  }

  function addChart() {
    const metric = REPORT_METRICS.find(item => item.key === draftChart.metric);
    const dimensionLabel = draftChart.dimension === "exercise" ? "por ejercicio" : "por jugador";
    updateConfig({
      charts: [...config.charts, {
        ...draftChart,
        id: `${Date.now()}-${draftChart.metric}`,
        title: `${metric.label} ${dimensionLabel}`,
      }],
    });
  }

  function patchChart(id, patch) {
    updateConfig({ charts: config.charts.map(chart => chart.id === id ? { ...chart, ...patch } : chart) });
  }

  function removeChart(id) {
    updateConfig({ charts: config.charts.filter(chart => chart.id !== id) });
  }

  const topExerciseByMetric = metric => [...exerciseLoads].filter(row => row[metric] != null).sort((a, b) => (b[metric] || 0) - (a[metric] || 0))[0];
  const comparedSession = sessions.find(item => item.id === config.comparisonSessionId);
  const comparisonAverages = Object.fromEntries(REPORT_METRICS.map(metric => [metric.key, average(comparisonRows.filter(row => row.include_in_session_average !== false), metric.key)]));
  const comparisonIndexData = REPORT_METRICS.map(metric => {
    const current = teamAverages[metric.key];
    const reference = comparisonAverages[metric.key];
    if (current == null || reference == null || reference <= 0) return null;
    return {
      name: metric.label,
      current: (current / reference) * 100,
      reference: 100,
    };
  }).filter(Boolean);

  if (loading) {
    return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-10 text-center text-sm text-zinc-500">Preparando análisis de la sesión…</div>;
  }

  const views = [
    { id: "exercise", label: "Ejercicios", icon: Activity },
    { id: "exercise-compare", label: "Comparar ejercicios", icon: GitCompareArrows },
    { id: "players", label: "Comparar jugadores", icon: Users },
    { id: "sessions", label: "Comparar sesión", icon: GitCompareArrows },
    { id: "charts", label: "Gráficos e informe", icon: BarChart3 },
  ];

  return (
    <section className="text-zinc-100 rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5 border-b border-zinc-800" style={{ boxShadow: `inset 4px 0 0 ${brandColor}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: brandColor }}>Centro de análisis GPS</p>
            <h3 className="text-lg font-bold text-white mt-1">Lectura profesional de la sesión</h3>
            <p className="text-xs text-zinc-500 mt-1">Carga por ejercicio y bloque, comparación individual e histórica.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">{fieldRows.length} jugadores</span>
            <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">{exerciseLoads.length} ejercicios</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
          {views.map(view => {
            const Icon = view.icon;
            return <button key={view.id} onClick={() => setActiveView(view.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${activeView === view.id ? "text-white border-transparent" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"}`} style={activeView === view.id ? { backgroundColor: brandColor } : {}}><Icon size={13} />{view.label}</button>;
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {activeView === "exercise" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {["total_distance", "player_load", "m_min", "smax"].map(key => {
                const metric = REPORT_METRICS.find(item => item.key === key);
                const top = topExerciseByMetric(key);
                return <div key={key} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><p className="text-[9px] text-zinc-500 uppercase tracking-wider">{metric.label}</p><p className="text-lg font-bold mt-1" style={{ color: metric.color }}>{top ? metricValue(metric, top[key]) : "—"}</p><p className="text-[10px] text-zinc-400 truncate">{top?.name || "Sin carga por ejercicio"}</p></div>;
              })}
            </div>
            {exerciseLoads.length ? (
              <>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <p className="text-xs font-bold text-white mb-1">Perfil de carga por ejercicio</p>
                  <p className="text-[10px] text-zinc-500 mb-3">Promedio por jugador. Seleccioná una métrica para identificar rápidamente la tarea más exigente.</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {REPORT_METRICS.map(metric => <button key={metric.key} onClick={() => setDraftChart(current => ({ ...current, metric: metric.key, dimension: "exercise" }))} className={`px-2.5 py-1 rounded-full border text-[10px] ${draftChart.metric === metric.key ? "text-zinc-950 border-transparent" : "border-zinc-700 text-zinc-400"}`} style={draftChart.metric === metric.key ? { backgroundColor: metric.color } : {}}>{metric.label}</button>)}
                  </div>
                  <StudioChart chart={{ type: "bar", showAverage: true }} data={chartData({ dimension: "exercise", metric: draftChart.metric })} metric={REPORT_METRICS.find(metric => metric.key === draftChart.metric)} brandColor={brandColor} />
                </div>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-[11px]">
                    <thead className="bg-zinc-900"><tr><th className="text-left px-3 py-2 text-zinc-400">Ejercicio</th><th className="text-center px-2 py-2 text-zinc-500">Bloques</th>{REPORT_METRICS.map(metric => <th key={metric.key} className="text-right px-2 py-2 whitespace-nowrap" style={{ color: metric.color }}>{metric.label}</th>)}</tr></thead>
                    <tbody>{exerciseLoads.map(row => <tr key={row.id} className="border-t border-zinc-800/70"><td className="px-3 py-2.5 text-white font-semibold whitespace-nowrap">{row.name}<span className="block text-[9px] text-zinc-600">{row.players} jugadores</span></td><td className="text-center text-zinc-400">{row.blocks}</td>{REPORT_METRICS.map(metric => <td key={metric.key} className="text-right px-2 py-2 font-semibold whitespace-nowrap">{metricValue(metric, row[metric.key])}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </>
            ) : <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">La sesión tiene carga global, pero todavía no hay carga GPS asociada a ejercicios.</div>}
          </>
        )}

        {activeView === "exercise-compare" && <ExerciseComparisonExplorer session={session} sessions={sessions} exercises={exercises} exerciseRows={exerciseRows} config={config} onChange={setConfig} allowedPlayerIds={allowedPlayerIds} />}
        {activeView === "players" && (
          <>
            <div>
              <p className="text-xs font-bold text-white">Elegí hasta 4 jugadores</p>
              <p className="text-[10px] text-zinc-500 mt-1">La selección queda guardada y también puede incorporarse al informe.</p>
              <div className="flex flex-wrap gap-2 mt-3">{fieldRows.map(row => <button key={row.player_id} onClick={() => togglePlayer(row.player_id)} className={`px-3 py-1.5 rounded-full border text-[11px] transition-colors ${selectedPlayerIds.includes(row.player_id) ? "text-white border-transparent" : "border-zinc-700 text-zinc-400 hover:text-white"}`} style={selectedPlayerIds.includes(row.player_id) ? { backgroundColor: brandColor } : {}}>{row.player_name}</button>)}</div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              {REPORT_METRICS.map(metric => {
                const data = selectedPlayers.map(row => ({ name: shortName(row.player_name), value: row[metric.key] }));
                const best = [...selectedPlayers].filter(row => row[metric.key] != null).sort((a, b) => (b[metric.key] || 0) - (a[metric.key] || 0))[0];
                return <div key={metric.key} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold" style={{ color: metric.color }}>{metric.label}</p><p className="text-[10px] text-zinc-500">Comparación directa</p></div>{best && <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Trophy size={10} style={{ color: brandColor }} />{shortName(best.player_name)}</span>}</div><StudioChart chart={{ type: "bar", showAverage: false }} data={data} metric={metric} brandColor={brandColor} /></div>;
              })}
            </div>
          </>
        )}

        {activeView === "sessions" && (
          <>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">Sesión de referencia</label>
              <select value={config.comparisonSessionId} onChange={event => updateConfig({ comparisonSessionId: event.target.value })} className="w-full sm:max-w-md bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">Seleccionar otra sesión…</option>
                {sessions.map(item => <option key={item.id} value={item.id}>{item.date} · {item.title || item.session_type || "Sesión"}</option>)}
              </select>
            </div>
            {comparedSession ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{REPORT_METRICS.map(metric => {
                  const current = teamAverages[metric.key];
                  const previous = comparisonAverages[metric.key];
                  const difference = current != null && previous ? ((current - previous) / previous) * 100 : null;
                  return <div key={metric.key} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><p className="text-[9px] text-zinc-500">{metric.label}</p><div className="flex items-end justify-between gap-2 mt-1"><p className="text-base font-bold" style={{ color: metric.color }}>{metricValue(metric, current)}</p><span className={`text-[10px] font-bold ${difference == null ? "text-zinc-500" : difference >= 0 ? "text-emerald-400" : "text-red-400"}`}>{difference == null ? "—" : `${difference >= 0 ? "+" : ""}${Math.round(difference)}%`}</span></div><p className="text-[9px] text-zinc-600">vs {metricValue(metric, previous)}</p></div>;
                })}</div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <p className="text-xs font-bold text-white">Índice relativo por parámetro</p>
                  <p className="text-[10px] text-zinc-500 mt-1 mb-3">Cada métrica conserva su unidad en las tarjetas. En este gráfico, la sesión comparada equivale a 100 para evitar mezclar metros, km/h y conteos.</p>
                  {comparisonIndexData.length ? <ResponsiveContainer width="100%" height={320}><BarChart data={comparisonIndexData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 9 }} interval={0} angle={-22} textAnchor="end" height={65} /><YAxis tick={{ fill: "#71717a", fontSize: 9 }} unit="%" domain={[0, "auto"]} /><Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} formatter={value => [`${Math.round(Number(value))}%`, "Índice"]} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="current" name={session.title || "Sesión actual"} fill={brandColor} radius={[5, 5, 0, 0]} /><Bar dataKey="reference" name={comparedSession.title || "Referencia (100)"} fill="#f59e0b" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="py-10 text-center text-xs text-zinc-500">No hay métricas equivalentes suficientes para construir el índice.</div>}
                </div>
              </>
            ) : <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">Seleccioná una sesión para ver qué parámetros estuvieron más altos o más bajos.</div>}
          </>
        )}

        {activeView === "charts" && (
          <>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center gap-2"><Settings2 size={14} style={{ color: brandColor }} /><div><p className="text-xs font-bold text-white">Constructor de gráficos</p><p className="text-[10px] text-zinc-500">Los gráficos agregados también aparecerán en el informe exportable.</p></div></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <select value={draftChart.metric} onChange={event => setDraftChart(current => ({ ...current, metric: event.target.value }))} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white">{REPORT_METRICS.map(metric => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select>
                <select value={draftChart.dimension} onChange={event => setDraftChart(current => ({ ...current, dimension: event.target.value }))} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white"><option value="exercise">Por ejercicio</option><option value="player">Por jugador</option></select>
                <select value={draftChart.type} onChange={event => setDraftChart(current => ({ ...current, type: event.target.value }))} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white"><option value="bar">Barras</option><option value="line">Línea</option></select>
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-300"><input type="checkbox" checked={draftChart.showAverage} onChange={event => setDraftChart(current => ({ ...current, showAverage: event.target.checked }))} />Mostrar promedio</label>
                <button onClick={addChart} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: brandColor }}><Plus size={13} />Agregar gráfico</button>
              </div>
            </div>
            <div className="grid xl:grid-cols-2 gap-4">{config.charts.map(chart => {
              const metric = REPORT_METRICS.find(item => item.key === chart.metric) || REPORT_METRICS[0];
              return <div key={chart.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4"><div className="flex items-start justify-between gap-3 mb-2"><input value={chart.title} onChange={event => patchChart(chart.id, { title: event.target.value })} className="flex-1 bg-transparent text-xs font-bold text-white border-b border-transparent focus:border-zinc-700 outline-none" /><button onClick={() => removeChart(chart.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button></div><div className="flex gap-2 mb-2"><select value={chart.metric} onChange={event => patchChart(chart.id, { metric: event.target.value })} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300">{REPORT_METRICS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select><button onClick={() => patchChart(chart.id, { type: chart.type === "bar" ? "line" : "bar" })} className="flex items-center gap-1 px-2 py-1 border border-zinc-800 rounded text-[10px] text-zinc-400">{chart.type === "bar" ? <BarChart3 size={10} /> : <LineIcon size={10} />}{chart.type === "bar" ? "Barras" : "Línea"}</button></div><label className="flex gap-2 text-xs text-zinc-400 mb-3"><input type="checkbox" checked={chart.includeInReport !== false} onChange={event => patchChart(chart.id, { includeInReport: event.target.checked })} />Incluir en informe</label><StudioChart chart={chart} data={chartData(chart)} metric={metric} brandColor={brandColor} /></div>;
            })}</div>
          </>
        )}
      </div>
    </section>
  );
}
