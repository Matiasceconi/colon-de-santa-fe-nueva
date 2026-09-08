import React, { useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { REPORT_METRICS, fmtMetricVal } from "@/components/sessions/gpsReport/sessionGpsReportData";

const EXERCISE_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "player_load", "smax"];

function metricLabel(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  if (formatted === "—" || !metric.unit) return formatted;
  return `${formatted} ${metric.unit}`;
}

export default function SessionGpsExerciseLoadTable({ exerciseLoads = [] }) {
  const maxima = useMemo(() => {
    const result = {};
    EXERCISE_METRICS.forEach((key) => {
      const values = exerciseLoads.map((row) => Number(row[key])).filter((v) => Number.isFinite(v) && v > 0);
      result[key] = values.length ? Math.max(...values) : null;
    });
    return result;
  }, [exerciseLoads]);

  if (exerciseLoads.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Dumbbell size={15} className="text-emerald-300" />
        <h3 className="text-sm font-black text-white">Carga por ejercicio</h3>
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">Promedio por jugador consolidando los bloques de cada tarea. El valor máximo de cada columna se resalta automáticamente.</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left font-black text-zinc-300">Ejercicio</th>
              <th className="px-3 py-3 text-center font-bold text-zinc-400">Bloques</th>
              <th className="px-3 py-3 text-center font-bold text-zinc-400">Jugadores</th>
              {EXERCISE_METRICS.map((key) => {
                const metric = REPORT_METRICS.find((item) => item.key === key);
                return (
                  <th key={key} className="px-3 py-3 text-right font-black whitespace-nowrap" style={{ color: metric?.color || "#a1a1aa" }}>
                    {metric?.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {exerciseLoads.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/60 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-white leading-tight">{row.name}</p>
                </td>
                <td className="px-3 py-3 text-center text-sm font-semibold text-zinc-300">{row.blocks || "—"}</td>
                <td className="px-3 py-3 text-center text-sm font-semibold text-zinc-300">{row.players || "—"}</td>
                {EXERCISE_METRICS.map((key) => {
                  const metric = REPORT_METRICS.find((item) => item.key === key);
                  const value = Number(row[key]);
                  const isMax = maxima[key] != null && value === maxima[key];
                  return (
                    <td key={key} className="px-3 py-3 text-right">
                      <p className={`text-sm font-black leading-tight ${isMax ? "text-white" : "text-zinc-200"}`}>
                        {metricLabel(metric, row[key])}
                      </p>
                      {isMax && <p className="text-[9px] font-bold text-emerald-400">Pico</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}