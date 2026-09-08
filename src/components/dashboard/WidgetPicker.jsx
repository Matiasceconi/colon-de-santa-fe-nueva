import React, { useState } from "react";
import { X } from "lucide-react";
import { WIDGET_CATALOG, CATEGORY_LABELS, buildDefaultWidget } from "@/lib/dashboardWidgets";

const CATEGORY_ORDER = ["competition", "staff", "custom"];

export default function WidgetPicker({ onClose, onAdd, categories = CATEGORY_ORDER }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const filtered = WIDGET_CATALOG.filter((w) => w.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Agregar Widget</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-3 border-b border-zinc-800">
          {categories.map((key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === key
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          {filtered.map((w) => (
            <button
              key={w.type}
              onClick={() => onAdd(buildDefaultWidget(w.type))}
              className="flex items-center gap-3 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <w.icon size={18} className="text-zinc-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{w.name}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">{w.description || CATEGORY_LABELS[w.category]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}