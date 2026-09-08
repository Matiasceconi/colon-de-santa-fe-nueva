import React from "react";
import { roleGroup } from "@/components/staff/staffDirectoryUtils";

export default function StaffDirectoryStats({ entries }) {
  const counts = entries.reduce((acc, entry) => {
    const role = entry.member?.role || entry.access.role || "";
    acc[roleGroup(role)] += 1;
    return acc;
  }, { technical: 0, performance: 0, health: 0, other: 0 });
  const cards = [
    ["Total con acceso", entries.length],
    ["Cuerpo técnico", counts.technical],
    ["Rendimiento", counts.performance],
    ["Salud", counts.health],
  ];
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div>)}</div>;
}