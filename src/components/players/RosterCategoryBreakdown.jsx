import React from "react";

export default function RosterCategoryBreakdown({ rows, selected, onSelect }) {
  const categories = Array.from(rows.reduce((map, row) => map.set(row.categoryId, { id: row.categoryId, name: row.categoryName, count: (map.get(row.categoryId)?.count || 0) + 1 }), new Map()).values()).sort((a, b) => b.count - a.count);
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Jugadores por categoría</p><button type="button" onClick={() => onSelect("all")} className={`text-xs ${selected === "all" ? "text-cyan-400" : "text-zinc-500 hover:text-white"}`}>Todas las categorías</button></div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{categories.map((category) => <button type="button" key={category.id} onClick={() => onSelect(category.id)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${selected === category.id ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"}`}><span className="truncate text-xs font-medium text-zinc-300">{category.name}</span><span className="ml-2 text-sm font-bold text-white">{category.count}</span></button>)}</div>
  </div>;
}