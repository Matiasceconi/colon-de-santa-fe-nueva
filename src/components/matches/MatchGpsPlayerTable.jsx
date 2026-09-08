import React, { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { MATCH_METRICS, fmt, metricValue, number } from "./matchGpsAnalysis";

const EXTRA_COLUMNS = [
  { key: "official_minutes", label: "Min. oficial", unit: "min" },
  { key: "total_duration", label: "Duración GPS", unit: "min" },
  { key: "meters_per_minute", label: "m/min", unit: "m/min" },
];

const ALL_COLUMNS = [...EXTRA_COLUMNS, ...MATCH_METRICS.map(m => ({ key: m.key, label: m.label, unit: m.unit }))];
const DEFAULT_COLUMNS = ["official_minutes", "total_duration", "total_distance", "meters_per_minute", "distance_hsr", "sprint_distance", "sprint_efforts", "accelerations", "decelerations", "player_load", "max_velocity"];

function initials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
}

function Avatar({ row, size = "h-9 w-9" }) {
  const [failed, setFailed] = useState(false);
  if (!row?.photo_url || failed)
    return <div className={size + " flex shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-[10px] font-black text-zinc-300"}>{initials(row?.player_name)}</div>;
  return <img src={row.photo_url} alt={row.player_name} className={size + " shrink-0 rounded-lg border border-zinc-700 object-cover"} onError={() => setFailed(true)} />;
}

export default function MatchGpsPlayerTable({ rows, mode = "absolute" }) {
  const [sortKey, setSortKey] = useState("total_distance");
  const [sortDir, setSortDir] = useState("desc");
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const sorted = useMemo(() => {
    const withValues = rows.map(r => ({
      ...r,
      _sort: sortKey === "official_minutes" ? number(r.official_minutes) : sortKey === "meters_per_minute" ? number(r.meters_per_minute) : sortKey === "total_duration" ? number(r.total_duration) : metricValue(r, sortKey, sortKey === "max_velocity" ? "absolute" : mode),
    }));
    return withValues.sort((a, b) => {
      const av = a._sort, bv = b._sort;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [rows, sortKey, sortDir, mode]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleColumn = (key) => {
    setColumns(cols => cols.includes(key) ? cols.filter(c => c !== key) : [...cols, key]);
  };

  const colDef = (key) => ALL_COLUMNS.find(c => c.key === key) || { key, label: key, unit: "" };
  const cellVal = (r, key) => {
    if (key === "official_minutes") return number(r.official_minutes);
    if (key === "meters_per_minute") return number(r.meters_per_minute);
    if (key === "total_duration") return number(r.total_duration);
    return metricValue(r, key, key === "max_velocity" ? "absolute" : mode);
  };

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Planilla GPS del partido</h3>
          <p className="text-xs text-zinc-400">Valores absolutos y minutos oficiales cuando están confirmados. Sin semáforo ni clasificación de riesgo.</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowColumnPicker(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-sky-400">
            Columnas <ChevronDown size={14} />
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-600 bg-zinc-950 p-2 shadow-2xl">
              {ALL_COLUMNS.map(col => (
                <button key={col.key} type="button" onClick={() => toggleColumn(col.key)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition ${columns.includes(col.key) ? "bg-sky-500/15 text-sky-300" : "text-zinc-400 hover:bg-zinc-800"}`}>
                  <span className={`h-3.5 w-3.5 rounded border ${columns.includes(col.key) ? "border-sky-500 bg-sky-500" : "border-zinc-600"}`} />
                  {col.label} ({col.unit})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400">
              <th className="p-2 text-left sticky left-0 bg-zinc-900 z-10">Jugador</th>
              {columns.map(key => {
                const col = colDef(key);
                const sorting = sortKey === key;
                return (
                  <th key={key} className="p-2 text-right cursor-pointer select-none hover:text-white whitespace-nowrap" onClick={() => toggleSort(key)}>
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sorting && (sortDir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              return (
                <tr key={r.player_id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                  <td className="p-2 sticky left-0 bg-zinc-900 z-10">
                    <div className="flex items-center gap-2">
                      <Avatar row={r} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white text-xs">{r.player_name}</p>
                        <p className="text-[10px] text-zinc-500">{r.position || "Sin posición"}</p>
                      </div>
                    </div>
                  </td>
                  {columns.map(key => {
                    const col = colDef(key);
                    const val = cellVal(r, key);
                    return (
                      <td key={key} className="p-2 text-right tabular-nums whitespace-nowrap">
                        <span className="font-bold text-white">{fmt(val)}</span>
                        <span className="ml-1 text-[10px] text-zinc-500">{col.unit}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!sorted.length && <p className="py-8 text-center text-zinc-400">Sin jugadores para esta selección.</p>}
    </div>
  );
}