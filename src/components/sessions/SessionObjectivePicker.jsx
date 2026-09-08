import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Plus, Trash2 } from "lucide-react";

const DEFAULT_COLOR = "#3b82f6";

function textForColor(hex) {
  const clean = String(hex || "#ffffff").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
}

export default function SessionObjectivePicker({ value, onChange }) {
  const [objectives, setObjectives] = useState([]);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  async function load() {
    try {
      const rows = await base44.entities.PhysicalObjective.list("order", 100);
      setObjectives(rows.filter((o) => o.active !== false && o.hidden !== true));
    } catch (e) {
      console.error("objectives load", e);
    }
  }

  useEffect(() => { load(); }, []);

  async function addNew() {
    const name = newName.trim();
    if (!name) return;
    const maxOrder = Math.max(0, ...objectives.map((o) => Number(o.order || 0)));
    try {
      await base44.entities.PhysicalObjective.create({
        name,
        color: newColor,
        border_color: newColor,
        text_color: textForColor(newColor),
        order: maxOrder + 1,
        hidden: false,
        active: true,
      });
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      await load();
      onChange(name);
    } catch (e) {
      console.error("create objective", e);
    }
  }

  async function updateName(item, name) {
    await base44.entities.PhysicalObjective.update(item.id, { name });
    await load();
    if (value === item.name) onChange(name);
  }

  async function updateColor(item, color) {
    await base44.entities.PhysicalObjective.update(item.id, {
      color,
      border_color: color,
      text_color: textForColor(color),
    });
    await load();
  }

  async function remove(item) {
    await base44.entities.PhysicalObjective.delete(item.id);
    await load();
    if (value === item.name) onChange("");
  }

  const selected = objectives.find((o) => o.name === value);

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 appearance-none"
          >
            {value && !selected && <option value={value}>{value}</option>}
            <option value="">— Sin objetivo —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
          {selected && (
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-white/20 pointer-events-none"
              style={{ backgroundColor: selected.color }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`px-3 rounded-lg border text-sm flex items-center gap-1.5 transition-colors shrink-0 ${
            editing
              ? "bg-zinc-700 border-zinc-600 text-white"
              : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          <Pencil size={13} /> {editing ? "Cerrar" : "Editar"}
        </button>
      </div>

      {editing && (
        <div className="mt-2 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-2">
          {objectives.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <input
                type="color"
                value={o.color || DEFAULT_COLOR}
                onChange={(e) => updateColor(o, e.target.value)}
                className="h-8 w-9 rounded border border-zinc-600 bg-zinc-900 p-0.5 shrink-0"
              />
              <input
                value={o.name || ""}
                onChange={(e) =>
                  setObjectives((prev) =>
                    prev.map((x) => (x.id === o.id ? { ...x, name: e.target.value } : x))
                  )
                }
                onBlur={(e) => updateName(o, e.target.value)}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={() => remove(o)}
                className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-300 hover:border-red-500/40 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 w-9 rounded border border-zinc-600 bg-zinc-900 p-0.5 shrink-0"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nuevo objetivo..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNew();
                }
              }}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={addNew}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 flex items-center gap-1 shrink-0"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}