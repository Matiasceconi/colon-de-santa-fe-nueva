import React, { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, LineChart as LineChartIcon, Plus, Save, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { REPORT_METRICS, fmtMetricVal } from "@/components/sessions/gpsReport/sessionGpsReportData";

const CHART_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load", "smax"];

function metricUnit(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  if (formatted === "—" || !metric.unit) return formatted;
  return `${formatted} ${metric.unit}`;
}

function defaultTitle(metricKey, dimension) {
  const metric = REPORT_METRICS.find(item => item.key === metricKey);
  return `${metric?.label || metricKey} por ${dimension === "exercise" ? "ejercicio" : "jugador"}`;
}

export default function SessionGpsPinnedCharts({
  rows = [],
  exerciseLoads = [],
  referenceByPlayer = {},
  charts = [],
  onChartsChange,
  onSave,
  saving = false,
  canSave = false,
}) {
  const [editingId, setEditingId] = useState("");

  function patch(id, next) {
    onChartsChange?.(charts.map(chart => chart.id === id ? { ...chart, ...next } : chart));
  }

  function addChart() {
    const id = `chart-${Date.now()}`;
    const chart = { id, title: "Distancia total por jugador", metric: "total_distance", dimension: "player", type: "bar", showReference: true };
    onChartsChange?.([...charts, chart]);
    setEditingId(id);
  }

  function move(id, direction) {
    const index = charts.findIndex(chart => chart.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= charts.length) return;
    const next = [...charts];
    [next[index], next[target]] = [next[target], next[index]];
    onChartsChange?.(next);
  }

  function remove(id) {
    onChartsChange?.(charts.filter(chart => chart.id !== id));
    if (editingId === id) setEditingId("");
  }

  return (
    <section data-tour="gps-pinned-charts" className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Visualización principal</p>
          <h3 className="mt-1 text-base font-black text-white">Gráficos fijados del informe</h3>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">Agregá las métricas que el cuerpo técnico quiere ver siempre. La configuración queda fijada para el plantel y se repite automáticamente en las próximas sesiones.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addChart} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-black text-zinc-300 hover:text-white"><Plus size={13} />Agregar gráfico</button>
          {canSave && <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-500 disabled:opacity-50"><Save size={13} />{saving ? "Guardando…" : "Guardar vista del plantel"}</button>}
        </div>
      </div>

      {!charts.length ? <div className="mt-4 rounded-xl border border-dashed border-zinc-800 py-10 text-center text-xs text-zinc-600">No hay gráficos fijados. Agregá el primero para construir la vista estándar de las sesiones.</div> : <div className="mt-4 space-y-4">
        {charts.map((chart, index) => {
          const metric = REPORT_METRICS.find(item => item.key === chart.metric) || REPORT_METRICS[0];
          const data = chart.dimension === "exercise"
            ? exerciseLoads.map(row => ({ name: row.name, value: row[chart.metric], reference: null }))
            : rows.map(row => ({
                name: row.display_name || row.player_name,
                value: row[chart.metric],
                reference: chart.showReference !== false && referenceByPlayer[row.player_id]?.[chart.metric]?.sufficient ? referenceByPlayer[row.player_id][chart.metric].referenceValue : null,
              }));
          const hasReference = chart.dimension === "player" && chart.showReference !== false && data.some(item => item.reference != null);
          const editorOpen = editingId === chart.id;
          return (
            <article key={chart.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/75">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-black text-white">{chart.title || defaultTitle(chart.metric, chart.dimension)}</p><p className="mt-0.5 text-[9px] text-zinc-600">{metric.label} · {chart.dimension === "exercise" ? "Por ejercicio" : "Por jugador"} · {chart.type === "line" ? "Línea" : "Barras"}{hasReference ? " · con referencia" : ""}</p></div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(chart.id, -1)} disabled={index === 0} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-900 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => move(chart.id, 1)} disabled={index === charts.length - 1} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-900 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                  <button type="button" onClick={() => setEditingId(editorOpen ? "" : chart.id)} className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[9px] font-bold text-zinc-400 hover:text-white">Configurar</button>
                  <button type="button" onClick={() => remove(chart.id)} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>

              {editorOpen && <div className="grid gap-3 border-b border-zinc-800 bg-zinc-900/55 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                <input value={chart.title || ""} onChange={(event) => patch(chart.id, { title: event.target.value })} placeholder="Título" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none" />
                <select value={chart.metric} onChange={(event) => { const metricKey = event.target.value; patch(chart.id, { metric: metricKey, title: defaultTitle(metricKey, chart.dimension) }); }} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none">
                  {CHART_METRICS.map(key => <option key={key} value={key}>{REPORT_METRICS.find(metricItem => metricItem.key === key)?.label}</option>)}
                </select>
                <select value={chart.dimension || "player"} onChange={(event) => { const dimension = event.target.value; patch(chart.id, { dimension, title: defaultTitle(chart.metric, dimension) }); }} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none">
                  <option value="player">Por jugador</option>
                  <option value="exercise" disabled={!exerciseLoads.length}>Por ejercicio</option>
                </select>
                <div className="flex rounded-xl border border-zinc-700 bg-zinc-950 p-1">{[{ id: "bar", label: "Barras", Icon: BarChart3 }, { id: "line", label: "Línea", Icon: LineChartIcon }].map(option => <button key={option.id} type="button" onClick={() => patch(chart.id, { type: option.id })} className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-black ${chart.type === option.id ? "bg-emerald-600 text-white" : "text-zinc-500"}`}><option.Icon size={11} />{option.label}</button>)}</div>
                <label className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-[9px] font-bold text-zinc-400"><input type="checkbox" checked={chart.showReference !== false} disabled={chart.dimension === "exercise"} onChange={(event) => patch(chart.id, { showReference: event.target.checked })} />Referencia</label>
              </div>}

              <div className="p-3 sm:p-4">
                {data.length ? <ResponsiveContainer width="100%" height={330}>{chart.type === "line" ? <LineChart data={data} margin={{ left: 0, right: 20, top: 28, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={0} angle={data.length > 8 ? -24 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 62 : 36} /><YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={50} /><Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, fontSize: 11 }} formatter={(value, name) => [metricUnit(metric, value), name]} /><Line type="monotone" dataKey="value" name="Sesión" stroke={metric.color} strokeWidth={3} dot={{ r: 4, fill: metric.color }}><LabelList dataKey="value" position="top" fill="#f4f4f5" fontSize={9} formatter={value => fmtMetricVal(metric.key, value)} /></Line>{hasReference && <Line type="monotone" dataKey="reference" name="Referencia" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#a1a1aa" }}><LabelList dataKey="reference" position="bottom" fill="#a1a1aa" fontSize={8} formatter={value => fmtMetricVal(metric.key, value)} /></Line>}</LineChart> : <BarChart data={data} margin={{ left: 0, right: 20, top: 28, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={0} angle={data.length > 8 ? -24 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 62 : 36} /><YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={50} /><Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, fontSize: 11 }} formatter={(value, name) => [metricUnit(metric, value), name]} /><Bar dataKey="value" name="Sesión" fill={metric.color} radius={[6, 6, 0, 0]}><LabelList dataKey="value" position="top" fill="#f4f4f5" fontSize={9} formatter={value => fmtMetricVal(metric.key, value)} /></Bar>{hasReference && <Bar dataKey="reference" name="Referencia" fill="#52525b" radius={[6, 6, 0, 0]}><LabelList dataKey="reference" position="top" fill="#a1a1aa" fontSize={8} formatter={value => fmtMetricVal(metric.key, value)} /></Bar>}</BarChart>}</ResponsiveContainer> : <div className="py-14 text-center text-xs text-zinc-600">No hay datos suficientes para este gráfico.</div>}
              </div>
            </article>
          );
        })}
      </div>}
    </section>
  );
}
