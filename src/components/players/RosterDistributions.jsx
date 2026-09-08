import React from "react";

function Distribution({ title, values, active, onSelect }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
    <div className="flex flex-wrap gap-2">{values.map(([label, count]) => <button type="button" key={label} onClick={() => onSelect(active === label ? "all" : label)} className={`rounded-lg border px-2.5 py-1.5 text-xs ${active === label ? "border-cyan-400 bg-cyan-500/10 text-cyan-300" : "border-zinc-700 bg-zinc-950/50 text-zinc-300 hover:border-zinc-600"}`}><span className="font-semibold">{label}</span><span className="ml-2 text-zinc-500">{count}</span></button>)}</div>
  </div>;
}

export default function RosterDistributions({ rows, positionFilter, birthYearFilter, onPosition, onBirthYear }) {
  const count = (getter) => Object.entries(rows.reduce((acc, row) => { const key = getter(row); if (key) acc[key] = (acc[key] || 0) + 1; return acc; }, {}));
  const positions = count((row) => row.player.position).sort((a, b) => b[1] - a[1]);
  const years = count((row) => row.birthYear).sort((a, b) => Number(b[0]) - Number(a[0]));
  return <div className="grid gap-3 lg:grid-cols-2"><Distribution title="Distribución por posición" values={positions} active={positionFilter} onSelect={onPosition} /><Distribution title="Año de nacimiento" values={years} active={birthYearFilter} onSelect={onBirthYear} /></div>;
}