import React, { useMemo } from "react";
import { Eye, Medal, SlidersHorizontal, Target } from "lucide-react";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { REPORT_METRICS, fmtMetricVal } from "@/components/sessions/gpsReport/sessionGpsReportData";
import { shortReferenceLabel, shortStatusLabel, statusTone } from "./gpsReferenceEngine";

const TABLE_METRICS = ["total_distance", "m_min", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load", "smax"];

function metricLabel(metric, value) {
  const formatted = fmtMetricVal(metric.key, value);
  if (formatted === "—" || !metric.unit) return formatted;
  return `${formatted} ${metric.unit}`;
}

function rankTone(rank) {
  if (rank === 1) return "border-yellow-400/40 bg-yellow-400/10 text-yellow-300";
  if (rank === 2) return "border-zinc-400/40 bg-zinc-400/10 text-zinc-300";
  if (rank === 3) return "border-amber-600/40 bg-amber-600/10 text-amber-300";
  return "border-zinc-800 bg-zinc-900 text-zinc-500";
}

export default function SessionGpsPlayerRankingTable({
  rows = [],
  players = [],
  referenceByPlayer = {},
  config,
  onConfigChange,
  session,
}) {
  const rankingMetric = config?.ranking_metric || "total_distance";
  const limit = config?.limit || "all";
  const showReferences = config?.show_references !== false;
  const detailMode = config?.detail_mode === "detailed" ? "detailed" : "simple";
  const playerMap = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const rankingMeta = REPORT_METRICS.find((metric) => metric.key === rankingMetric) || REPORT_METRICS[0];
  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => Number(b[rankingMetric] || 0) - Number(a[rankingMetric] || 0));
    if (limit === "all") return sorted;
    return sorted.slice(0, Math.max(1, Number(limit) || 5));
  }, [rows, rankingMetric, limit]);

  return (
    <section data-tour="gps-player-ranking" className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Jugadores</p>
          <h3 className="mt-1 text-base font-black text-white">Ranking y tabla dinámica</h3>
          <p className="mt-1 text-[11px] leading-5 text-zinc-400">Ordená por variable y mostrá u ocultá referencias. Modo simple por defecto para lectura rápida del cuerpo técnico.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-400">
            <SlidersHorizontal size={13} />
            Ver
            <select value={limit} onChange={(event) => onConfigChange?.({ ...config, limit: event.target.value })} className="bg-transparent text-white outline-none">
              <option className="bg-zinc-950" value="5">Top 5</option>
              <option className="bg-zinc-950" value="10">Top 10</option>
              <option className="bg-zinc-950" value="all">Todos</option>
            </select>
          </label>
          <button type="button" onClick={() => onConfigChange?.({ ...config, detail_mode: detailMode === "simple" ? "detailed" : "simple" })} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold transition ${detailMode === "detailed" ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}>
            <Eye size={13} />{detailMode === "detailed" ? "Detallado" : "Simple"}
          </button>
          <button type="button" onClick={() => onConfigChange?.({ ...config, show_references: !showReferences })} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold transition ${showReferences ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>
            <Target size={13} />{showReferences ? "Referencias" : "Sin ref."}
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABLE_METRICS.map((key) => {
          const metric = REPORT_METRICS.find((item) => item.key === key);
          const active = rankingMetric === key;
          return (
            <button key={key} type="button" onClick={() => onConfigChange?.({ ...config, ranking_metric: key })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black transition ${active ? "border-transparent text-zinc-950" : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white"}`} style={active ? { backgroundColor: metric?.color || "#60a5fa" } : {}}>
              {metric?.label || key}
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-[1180px] w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="w-12 px-3 py-3 text-center font-black text-zinc-500">#</th>
              <th className="min-w-56 px-3 py-3 text-left font-black text-zinc-300">Jugador</th>
              {TABLE_METRICS.map((key) => {
                const metric = REPORT_METRICS.find((item) => item.key === key);
                return (
                  <th key={key} className={`px-3 py-3 text-right font-black whitespace-nowrap ${rankingMetric === key ? "text-white" : "text-zinc-500"}`}>
                    {metric?.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const rank = index + 1;
              const player = playerMap[row.player_id] || { id: row.player_id, full_name: row.player_name, photo_url: row.photo_url };
              return (
                <tr key={row.id || row.player_id} className="border-b border-zinc-800/70 bg-zinc-950/35 hover:bg-white/[0.03]">
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-[10px] font-black ${rankTone(rank)}`}>
                      {rank <= 3 ? <><Medal size={11} className="mr-0.5" />{rank}</> : rank}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PlayerAvatar player={player} size="md" showName />
                    <p className="ml-12 -mt-0.5 text-[10px] text-zinc-400">{player.position || row.position || ""}</p>
                  </td>
                  {TABLE_METRICS.map((key) => {
                    const metric = REPORT_METRICS.find((item) => item.key === key);
                    const ref = referenceByPlayer[row.player_id]?.[key];
                    const active = rankingMetric === key;
                    const hasRef = showReferences && ref?.sufficient && Number.isFinite(Number(ref.pct));
                    const fullLabel = `${ref?.referenceLabel || "Referencia"}${ref?.usedFallback ? " · fallback" : ""}`;
                    return (
                      <td key={key} className={`px-3 py-3 text-right align-top ${active ? "bg-white/[0.03]" : ""}`}>
                        {/* Línea 1: valor principal dominante */}
                        <p className={`text-sm font-black leading-tight ${active ? "text-white" : "text-zinc-200"}`}>
                          {metricLabel(metric, row[key])}
                        </p>
                        {/* Línea 2: % de referencia claro y legible */}
                        {hasRef && (
                          <p className={`mt-1 text-[11px] font-bold leading-tight ${statusTone(ref.status)}`}>
                            {Math.round(ref.pct)}%{ref.status !== "reference_only" ? ` · ${shortStatusLabel(ref.status)}` : ""}
                          </p>
                        )}
                        {/* Línea 3: referencia resumida legible */}
                        {hasRef && (
                          <p className="mt-0.5 text-[10px] text-zinc-400 leading-tight truncate max-w-36" title={detailMode === "detailed" ? `${fullLabel}${ref.sampleCount ? ` · ${ref.sampleCount} ${ref.sampleUnit}` : ""}` : fullLabel}>
                            {detailMode === "detailed"
                              ? `${ref.referenceLabel || "Referencia"}${ref.usedFallback ? " · fallback" : ""}`
                              : shortReferenceLabel(ref, session)}
                          </p>
                        )}
                        {showReferences && !hasRef && (
                          <p className="mt-1 text-[10px] text-zinc-500">{ref?.status === "no_reference" ? "Sin referencia" : "Ref. en construcción"}</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-zinc-500">Orden: mayor a menor en {rankingMeta.label}. El ranking no modifica los datos ni el promedio.</p>
    </section>
  );
}