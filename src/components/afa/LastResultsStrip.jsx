import React from "react";

const MAP = {
  W: { bg: "bg-emerald-500", text: "G" },
  D: { bg: "bg-zinc-500", text: "E" },
  L: { bg: "bg-red-500", text: "P" },
};

export default function LastResultsStrip({ results }) {
  const arr = (results || []).filter((r) => r === "W" || r === "D" || r === "L");
  if (!arr.length) return <span className="text-xs text-zinc-600">Sin resultados</span>;
  return (
    <div className="flex items-center gap-1.5">
      {arr.map((r, i) => {
        const c = MAP[r];
        return (
          <span
            key={i}
            className={`w-6 h-6 rounded-md ${c.bg} text-white text-xs font-bold flex items-center justify-center`}
          >
            {c.text}
          </span>
        );
      })}
    </div>
  );
}