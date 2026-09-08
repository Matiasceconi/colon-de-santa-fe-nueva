import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Check, Settings2, Trophy, FileSpreadsheet, ShieldCheck } from "lucide-react";
import moment from "moment";
import { REPORT_METRICS, fmtMetricVal } from "./sessionGpsReportData";
import { shortReferenceLabel, shortStatusLabel } from "../gps/gpsReferenceEngine";

const TABLE_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load", "smax"];
const SUMMARY_METRICS = ["total_distance", "m_min", "distance_25", "player_load", "smax"];
const HIGHLIGHT_METRICS = ["total_distance", "m_min", "distance_25", "player_load", "smax"];

function unitValue(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  return formatted === "—" || !metric.unit ? formatted : `${formatted} ${metric.unit}`;
}

function surname(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : value;
}

function toneColor(status) {
  if (status === "in_range") return "#059669";
  if (status === "below") return "#2563eb";
  if (status === "above") return "#d97706";
  return "#64748b";
}

function ReportHeader({ session, clubBrand, page, reportData }) {
  const primary = clubBrand?.colors?.primary || "#1e293b";
  const accent = clubBrand?.colors?.accent || "#0ea5e9";
  return (
    <header className="flex items-start justify-between gap-5 pb-4 border-b-2" style={{ borderColor: accent }}>
      <div className="flex items-center gap-3 min-w-0">
        {clubBrand?.logoUrl
          ? <img src={clubBrand.logoUrl} crossOrigin="anonymous" alt="" className="w-14 h-14 object-contain shrink-0" />
          : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: primary }}>{clubBrand?.shortName || "CLUB"}</div>}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: accent }}>{clubBrand?.name || "Club"}</p>
          <h2 className="text-xl font-black text-slate-900 truncate">Informe de sesión GPS</h2>
          <p className="text-[11px] text-slate-600">{session.title || "Sesión"} · {session.squad_name || clubBrand?.squadName || "Plantel"}</p>
        </div>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-bold text-slate-900">{moment(session.date).format("DD/MM/YYYY")}</p>
        {clubBrand?.season && <p className="text-[10px] text-slate-600">Temporada {clubBrand.season}</p>}
        <p className="text-[10px] font-semibold" style={{ color: primary }}>Página {page}</p>
      </div>
    </header>
  );
}

function ReportFooter({ institutionProfile, clubBrand }) {
  return (
    <footer className="absolute left-8 right-8 bottom-6 flex items-center justify-between border-t border-slate-300 pt-2 text-[9px] text-slate-600">
      <span>{institutionProfile?.export_footer_text || "Informe interno del cuerpo técnico"}</span>
      <span>{institutionProfile?.show_performancepitch_brand === false ? clubBrand?.shortName : "PerformancePitch"}</span>
    </footer>
  );
}

function SessionInfoBar({ session, reportData, clubBrand }) {
  const primary = clubBrand?.colors?.primary || "#1e293b";
  const items = [
    { label: "Objetivo", value: session.session_objective || "—" },
    { label: "MD", value: session.match_day_code || "—" },
    { label: "Duración", value: session.duration_minutes ? `${session.duration_minutes}'` : "—" },
    { label: "Jugadores válidos", value: reportData.summary.conGps },
    { label: "Fuente GPS", value: session.csv_label || session.csv_url || "Datos cargados" },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex-1 min-w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">{item.label}</p>
          <p className="text-[11px] font-bold text-slate-900 truncate">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ reportData, clubBrand }) {
  const primary = clubBrand?.colors?.primary || "#1e293b";
  const peaks = useMemo(() => {
    const result = {};
    SUMMARY_METRICS.forEach((key) => {
      const sorted = [...reportData.principal].filter((r) => r[key] != null && Number(r[key]) > 0).sort((a, b) => Number(b[key]) - Number(a[key]));
      const top = sorted[0];
      result[key] = top ? { value: top[key], name: top.display_name || top.player_name } : null;
    });
    return result;
  }, [reportData.principal]);

  return (
    <div className="mt-5 grid grid-cols-5 gap-3">
      {SUMMARY_METRICS.map((key) => {
        const metric = REPORT_METRICS.find((m) => m.key === key);
        const avg = reportData.teamAverages[key];
        const peak = peaks[key];
        return (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: metric.color }}>{unitValue(metric, avg)}</p>
            <p className="text-[9px] text-slate-500">Promedio del grupo</p>
            {peak && (
              <div className="mt-2 border-t border-slate-100 pt-1.5">
                <p className="text-[9px] font-bold text-slate-700">Pico: {unitValue(metric, peak.value)}</p>
                <p className="text-[9px] text-slate-600 truncate">{peak.name}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopHighlights({ reportData }) {
  const top3 = useMemo(() => {
    const result = {};
    HIGHLIGHT_METRICS.forEach((key) => {
      result[key] = [...reportData.principal]
        .filter((r) => r[key] != null && Number(r[key]) > 0)
        .sort((a, b) => Number(b[key]) - Number(a[key]))
        .slice(0, 3);
    });
    return result;
  }, [reportData.principal]);

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <Trophy size={15} className="text-amber-500" />
        <h3 className="text-sm font-black text-slate-900">Destacados de la sesión</h3>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-3">
        {HIGHLIGHT_METRICS.map((key) => {
          const metric = REPORT_METRICS.find((m) => m.key === key);
          const players = top3[key] || [];
          if (!players.length) return <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-700">{metric.label}</p><p className="text-[9px] text-slate-400 mt-2">Sin datos</p></div>;
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold text-slate-700">{metric.label}</p>
              <div className="mt-2 space-y-2">
                {players.map((p, i) => (
                  <div key={p.player_id} className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-amber-700 text-white"}`}>{i + 1}</span>
                    {p._player?.photo_url
                      ? <img src={p._player.photo_url} crossOrigin="anonymous" alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">{(p.display_name || p.player_name).charAt(0)}</div>}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-900 truncate">{p.display_name || p.player_name}</p>
                      <p className="text-[9px] font-semibold" style={{ color: metric.color }}>{unitValue(metric, p[key])}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerTable({ reportData, session, showReferences }) {
  const rows = reportData.principal;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-[10px]">
        <thead style={{ backgroundColor: "#1e293b", color: "#fff" }}>
          <tr>
            <th className="text-left px-2 py-2.5 font-bold">Jugador</th>
            {TABLE_METRICS.map((key) => {
              const metric = REPORT_METRICS.find((m) => m.key === key);
              return <th key={key} className="text-right px-1.5 py-2.5 font-bold whitespace-nowrap">{metric.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.player_id} className="border-t border-slate-200">
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  {row._player?.photo_url
                    ? <img src={row._player.photo_url} crossOrigin="anonymous" alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    : <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 shrink-0">{(row.display_name || row.player_name).charAt(0)}</div>}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{row.display_name || row.player_name}</p>
                    <p className="text-[8px] text-slate-500">{row._player?.position || row.position || ""}</p>
                  </div>
                </div>
              </td>
              {TABLE_METRICS.map((key) => {
                const metric = REPORT_METRICS.find((m) => m.key === key);
                const ref = reportData.referenceByPlayer?.[row.player_id]?.[key];
                const hasRef = showReferences && ref?.sufficient && Number.isFinite(Number(ref.pct));
                return (
                  <td key={key} className="px-1.5 py-2 text-right align-top">
                    <p className="font-black text-slate-900">{unitValue(metric, row[key])}</p>
                    {hasRef && (
                      <>
                        <p className="text-[9px] font-bold" style={{ color: toneColor(ref.status) }}>{Math.round(ref.pct)}%{ref.status !== "reference_only" ? ` · ${shortStatusLabel(ref.status)}` : ""}</p>
                        <p className="text-[8px] text-slate-500">{shortReferenceLabel(ref, session)}</p>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportChart({ chart, data, metric, brandColor }) {
  const values = data.filter((item) => item.value != null && item.value !== "").map((item) => Number(item.value)).filter(Number.isFinite);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const hasReferences = data.some((item) => item.reference != null);
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 9 }} interval={0} angle={data.length > 6 ? -22 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 50 : 28} />
      <YAxis tick={{ fill: "#64748b", fontSize: 9 }} width={38} />
      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 10 }} formatter={(value) => unitValue(metric, value)} />
      {chart.showAverage !== false && !hasReferences && mean != null && <ReferenceLine y={mean} stroke={brandColor} strokeDasharray="4 4" label={{ value: "Prom.", fill: brandColor, fontSize: 9 }} />}
    </>
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2"><p className="text-[11px] font-bold text-slate-900">{chart.title}</p><p className="text-[9px] text-slate-500">{chart.dimension === "exercise" ? "Promedio por jugador en cada ejercicio" : "Valores individuales de la sesión"}</p></div>
      <ResponsiveContainer width="100%" height={225}>
        {chart.type === "line" ? (
          <LineChart data={data} margin={{ left: 0, right: 16, top: 15, bottom: 0 }}>
            {common}
            <Line type="monotone" dataKey="value" name="Sesión" stroke={metric.color} strokeWidth={2.5} dot={{ r: 3, fill: metric.color }} />
            {hasReferences && <Line type="monotone" dataKey="reference" name="Referencia" stroke="#64748b" strokeWidth={1.8} strokeDasharray="5 4" dot={{ r: 2.5, fill: "#64748b" }}><LabelList dataKey="reference" position="bottom" fill="#475569" fontSize={8} formatter={(value) => fmtMetricVal(metric.key, value)} /></Line>}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ left: 0, right: 12, top: 15, bottom: 0 }}>
            {common}
            <Bar dataKey="value" name="Sesión" radius={[5, 5, 0, 0]}>
              <LabelList dataKey="value" position="top" fill="#334155" fontSize={8} formatter={(value) => fmtMetricVal(metric.key, value)} />
              {data.map((_, index) => <Cell key={index} fill={metric.color} />)}
            </Bar>
            {hasReferences && <Bar dataKey="reference" name="Referencia" fill="#94a3b8" radius={[5, 5, 0, 0]}><LabelList dataKey="reference" position="top" fill="#475569" fontSize={8} formatter={(value) => fmtMetricVal(metric.key, value)} /></Bar>}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function ExerciseTable({ reportData, clubBrand }) {
  const primary = clubBrand?.colors?.primary || "#1e293b";
  const EXERCISE_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "player_load", "smax"];
  const maxima = useMemo(() => {
    const result = {};
    EXERCISE_METRICS.forEach((key) => {
      const values = reportData.exerciseLoads.map((r) => Number(r[key])).filter((v) => Number.isFinite(v) && v > 0);
      result[key] = values.length ? Math.max(...values) : null;
    });
    return result;
  }, [reportData.exerciseLoads]);

  if (!reportData.exerciseLoads.length) return <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 mt-3 text-[10px] text-slate-600">Sin carga GPS asociada a ejercicios.</div>;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-[10px]">
        <thead style={{ backgroundColor: primary, color: "#fff" }}>
          <tr>
            <th className="text-left px-2 py-2.5 font-bold">Ejercicio</th>
            <th className="text-center px-1.5 py-2.5 font-bold">Bloques</th>
            <th className="text-center px-1.5 py-2.5 font-bold">Jug.</th>
            {EXERCISE_METRICS.map((key) => {
              const metric = REPORT_METRICS.find((m) => m.key === key);
              return <th key={key} className="text-right px-1.5 py-2.5 font-bold">{metric.label}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {reportData.exerciseLoads.map((row) => (
            <tr key={row.id} className="border-t border-slate-200">
              <td className="px-2 py-2 font-bold text-slate-900">{row.name}</td>
              <td className="text-center text-slate-700">{row.blocks || "—"}</td>
              <td className="text-center text-slate-700">{row.players || "—"}</td>
              {EXERCISE_METRICS.map((key) => {
                const metric = REPORT_METRICS.find((m) => m.key === key);
                const isMax = maxima[key] != null && Number(row[key]) === maxima[key];
                return (
                  <td key={key} className="px-1.5 py-2 text-right">
                    <p className={`font-black ${isMax ? "text-slate-900" : "text-slate-700"}`}>{unitValue(metric, row[key])}</p>
                    {isMax && <p className="text-[8px] font-bold text-emerald-600">Pico</p>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataQualityBox({ reportData }) {
  const { summary, alerts } = reportData;
  const issues = alerts.length;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-slate-700" />
        <p className="text-[11px] font-black text-slate-900">Control de calidad del dato</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div><p className="text-lg font-black text-slate-900">{summary.excluidos}</p><p className="text-[9px] text-slate-600">Excluidos del promedio</p></div>
        <div><p className="text-lg font-black text-slate-900">{summary.diferenciados}</p><p className="text-[9px] text-slate-600">Diferenciados</p></div>
        <div><p className="text-lg font-black text-slate-900">{issues}</p><p className="text-[9px] text-slate-600">Incidencias detectadas</p></div>
      </div>
      {issues > 0 && (
        <div className="mt-2 space-y-1">
          {alerts.slice(0, 8).map((alert, i) => <p key={i} className="text-[9px] text-slate-700">• {alert.text}</p>)}
        </div>
      )}
      <p className="mt-2 text-[9px] text-slate-500">No se modifica ni elimina ningún dato automáticamente. Los duplicados quedan fuera del promedio hasta ser revisados.</p>
    </div>
  );
}

export default function SessionGpsReportContent({ session, reportData, clubBrand, institutionProfile, studioConfig, setStudioConfig, observations, setObservations, saving, onSaveObservations }) {
  const primary = clubBrand?.colors?.primary || "#1e293b";
  const accent = clubBrand?.colors?.accent || "#0ea5e9";
  const showReferences = studioConfig.showReferences !== false;

  const chartData = (chart) => {
    if (chart.dimension === "exercise") {
      return reportData.exerciseLoads.map((row) => ({ name: row.name, value: row[chart.metric] }));
    }
    return reportData.principal.map((row) => ({
      name: surname(row.player_name),
      value: row[chart.metric],
      reference: chart.showReference !== false && reportData.referenceByPlayer?.[row.player_id]?.[chart.metric]?.sufficient ? reportData.referenceByPlayer[row.player_id][chart.metric].referenceValue : null,
    }));
  };

  function patchChart(id, patch) {
    setStudioConfig((current) => ({ ...current, charts: current.charts.map((chart) => (chart.id === id ? { ...chart, ...patch } : chart)) }));
  }

  const chartPages = useMemo(() => {
    const chunks = [];
    const included = studioConfig.charts.filter((chart) => chart.includeInReport !== false);
    for (let index = 0; index < included.length; index += 2) chunks.push(included.slice(index, index + 2));
    return chunks;
  }, [studioConfig.charts]);

  const pageStyle = { width: 794, minHeight: 1123, background: "#ffffff" };
  let pageNumber = 1;

  return (
    <div className="space-y-5">
      {/* Controles */}
      <section className="gps-report-controls rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 size={14} style={{ color: accent }} />
          <div>
            <p className="text-xs font-bold text-white">Configuración del informe</p>
            <p className="text-[10px] text-zinc-400">Gráficos, referencias y observaciones. El PDF respetá esta configuración.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={showReferences} onChange={(e) => setStudioConfig((c) => ({ ...c, showReferences: e.target.checked }))} className="accent-cyan-500" />
            Mostrar referencias en tabla
          </label>
        </div>
        <div className="grid lg:grid-cols-2 gap-2">
          {studioConfig.charts.map((chart) => (
            <div key={chart.id} className="space-y-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <input value={chart.title} onChange={(e) => patchChart(chart.id, { title: e.target.value })} className="w-full bg-transparent text-xs font-bold text-white outline-none border-b border-zinc-800 pb-2" />
              <div className="grid grid-cols-2 gap-2">
                <select value={chart.metric} onChange={(e) => patchChart(chart.id, { metric: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[10px] text-zinc-300">
                  {REPORT_METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
                </select>
                <select value={chart.dimension || "player"} onChange={(e) => patchChart(chart.id, { dimension: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[10px] text-zinc-300">
                  <option value="player">Por jugador</option>
                  <option value="exercise">Por ejercicio</option>
                </select>
              </div>
              <div className="flex w-fit rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                <button onClick={() => patchChart(chart.id, { type: "bar" })} className={`rounded-md px-3 py-1 text-[10px] font-bold ${chart.type !== "line" ? "bg-emerald-600 text-white" : "text-zinc-400"}`}>Barras</button>
                <button onClick={() => patchChart(chart.id, { type: "line" })} className={`rounded-md px-3 py-1 text-[10px] font-bold ${chart.type === "line" ? "bg-emerald-600 text-white" : "text-zinc-400"}`}>Línea</button>
              </div>
              <label className="flex items-center gap-2 text-[9px] text-zinc-400">
                <input type="checkbox" checked={chart.showReference !== false} disabled={chart.dimension === "exercise"} onChange={(e) => patchChart(chart.id, { showReference: e.target.checked })} />
                Mostrar referencia
              </label>
              <label className="flex items-center gap-2 text-[10px] text-zinc-300">
                <input type="checkbox" checked={chart.includeInReport !== false} onChange={(e) => patchChart(chart.id, { includeInReport: e.target.checked })} />
                Incluir gráfico en PDF
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Página 1: Encabezado + Info + Resumen + Destacados */}
      <div className="gps-report-page relative mx-auto p-8 text-slate-900 shadow-2xl overflow-hidden" style={pageStyle}>
        <ReportHeader session={session} clubBrand={clubBrand} page={pageNumber++} reportData={reportData} />
        <SessionInfoBar session={session} reportData={reportData} clubBrand={clubBrand} />
        <SummaryCards reportData={reportData} clubBrand={clubBrand} />
        <TopHighlights reportData={reportData} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-black text-slate-900">Lectura automática</p>
            <div className="mt-1.5 space-y-1">
              {reportData.insights.slice(0, 5).map((line, i) => <p key={i} className="text-[9px] leading-relaxed text-slate-700 flex gap-1.5"><Check size={9} className="mt-0.5 shrink-0" style={{ color: accent }} />{line}</p>)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-black text-slate-900">Objetivos y alertas</p>
            <div className="mt-1.5 space-y-1">
              {reportData.alerts.length ? reportData.alerts.slice(0, 6).map((alert, i) => <p key={i} className="text-[9px] text-slate-700">• {alert.text}</p>) : <p className="text-[9px] text-emerald-700">Sin desvíos ni incidencias.</p>}
            </div>
          </div>
        </div>
        <ReportFooter institutionProfile={institutionProfile} clubBrand={clubBrand} />
      </div>

      {/* Página 2: Tabla por jugador */}
      <div className="gps-report-page relative mx-auto p-8 text-slate-900 shadow-2xl overflow-hidden" style={pageStyle}>
        <ReportHeader session={session} clubBrand={clubBrand} page={pageNumber++} reportData={reportData} />
        <div className="mt-5">
          <h3 className="text-sm font-black text-slate-900">Tabla principal por jugador</h3>
          <p className="text-[9px] text-slate-600 mt-0.5">{showReferences ? "Valor · % de referencia · fuente de referencia" : "Valores individuales de la sesión"}</p>
          <PlayerTable reportData={reportData} session={session} showReferences={showReferences} />
        </div>
        <ReportFooter institutionProfile={institutionProfile} clubBrand={clubBrand} />
      </div>

      {/* Páginas de gráficos */}
      {chartPages.map((charts, chunkIndex) => (
        <div key={chunkIndex} className="gps-report-page relative mx-auto p-8 text-slate-900 shadow-2xl overflow-hidden" style={pageStyle}>
          <ReportHeader session={session} clubBrand={clubBrand} page={pageNumber++} reportData={reportData} />
          <div className="mt-5 flex items-center gap-2">
            <BarChart3 size={15} style={{ color: accent }} />
            <div>
              <h3 className="text-sm font-black text-slate-900">Gráficos de la sesión</h3>
              <p className="text-[9px] text-slate-600">Configuración personalizada del club</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-4">
            {charts.map((chart) => {
              const metric = REPORT_METRICS.find((item) => item.key === chart.metric) || REPORT_METRICS[0];
              return <ReportChart key={chart.id} chart={chart} data={chartData(chart)} metric={metric} brandColor={accent} />;
            })}
          </div>
          <ReportFooter institutionProfile={institutionProfile} clubBrand={clubBrand} />
        </div>
      ))}

      {/* Página final: Ejercicios + Observaciones + Calidad */}
      <div className="gps-report-page relative mx-auto p-8 text-slate-900 shadow-2xl overflow-hidden" style={pageStyle}>
        <ReportHeader session={session} clubBrand={clubBrand} page={pageNumber++} reportData={reportData} />
        <div className="mt-5">
          <h3 className="text-sm font-black text-slate-900">Carga por ejercicio</h3>
          <p className="text-[9px] text-slate-600 mt-0.5">Promedio por jugador. El pico de cada columna se resalta automáticamente.</p>
          <ExerciseTable reportData={reportData} clubBrand={clubBrand} />
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-black text-slate-900">Observaciones del cuerpo técnico</h3>
          <textarea rows={4} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Análisis de la sesión, decisiones para el próximo día, jugadores fuera de referencia…" className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] text-slate-800 resize-none outline-none" />
          <button onClick={onSaveObservations} disabled={saving} className="gps-report-controls mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: primary }}>{saving ? "Guardando…" : "Guardar observaciones"}</button>
        </div>

        <div className="mt-5">
          <DataQualityBox reportData={reportData} />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <FileSpreadsheet size={14} className="text-slate-700" />
          <div>
            <p className="text-[10px] font-bold text-slate-900">Fuente del archivo GPS</p>
            <p className="text-[9px] text-slate-600">{session.csv_label || session.csv_url || "Datos cargados manualmente"}</p>
          </div>
        </div>
        <ReportFooter institutionProfile={institutionProfile} clubBrand={clubBrand} />
      </div>
    </div>
  );
}