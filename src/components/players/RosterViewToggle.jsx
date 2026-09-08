import React from "react";
import { LayoutGrid, List } from "lucide-react";

export default function RosterViewToggle({ value, onChange }) {
  return <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
    <button type="button" onClick={() => onChange("table")} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${value === "table" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}><List size={14} /> Vista tabla</button>
    <button type="button" onClick={() => onChange("cards")} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${value === "cards" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}><LayoutGrid size={14} /> Vista jugadores</button>
  </div>;
}