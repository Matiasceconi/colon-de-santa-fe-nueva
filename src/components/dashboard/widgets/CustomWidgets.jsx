import React, { useState, useEffect } from "react";
import { StickyNote, Hash, Plus, Minus } from "lucide-react";

const COLOR_MAP = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  red: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
};

export function NoteWidget({ widget, onConfigChange }) {
  const [text, setText] = useState(widget.config?.text || "");
  const [title, setTitle] = useState(widget.config?.title || "Nota");

  useEffect(() => {
    setText(widget.config?.text || "");
    setTitle(widget.config?.title || "Nota");
  }, [widget.id, widget.config?.text, widget.config?.title]);

  const saveTimeout = React.useRef(null);
  const handleChange = (field, value) => {
    if (field === "text") setText(value);
    if (field === "title") setTitle(value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onConfigChange?.({ ...widget.config, [field]: value });
    }, 600);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote size={16} className="text-yellow-400" />
        <input
          value={title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Título"
          className="flex-1 bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-zinc-700 transition-colors"
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange("text", e.target.value)}
        placeholder="Escribí tu nota aquí..."
        className="flex-1 min-h-[80px] w-full bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-700 resize-none"
      />
    </div>
  );
}

export function CounterWidget({ widget, onConfigChange }) {
  const config = widget.config || {};
  const label = config.label || "Contador";
  const value = Number(config.value || 0);
  const colorKey = config.color || "blue";
  const c = COLOR_MAP[colorKey] || COLOR_MAP.blue;

  const update = (newVal) => {
    onConfigChange?.({ ...config, value: newVal });
  };

  return (
    <div className={`bg-zinc-900 border ${c.border} rounded-2xl p-5 h-full flex flex-col items-center justify-center gap-3`}>
      <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center`}>
        <Hash size={22} />
      </div>
      <p className="text-3xl font-black text-white tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide text-center">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => update(value - 1)}
          className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => update(value + 1)}
          className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}