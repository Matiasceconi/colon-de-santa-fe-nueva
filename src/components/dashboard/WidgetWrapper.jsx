import React from "react";
import { GripVertical, Trash2, Maximize2 } from "lucide-react";
import { WIDGET_MAP, SIZE_LABELS, SIZE_ORDER } from "@/lib/dashboardWidgets";

export default function WidgetWrapper({
  widget,
  isEditing,
  dragHandleProps,
  onRemove,
  onResize,
  children,
}) {
  const def = WIDGET_MAP[widget.type];

  const cycleSize = () => {
    const currentIdx = SIZE_ORDER.indexOf(widget.size);
    const nextIdx = (currentIdx + 1) % SIZE_ORDER.length;
    onResize(SIZE_ORDER[nextIdx]);
  };

  if (!isEditing) return children;

  return (
    <div className="relative h-full">
      {/* Drag handle bar */}
      <div
        {...dragHandleProps}
        className="absolute -top-3 left-3 z-30 flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-lg cursor-grab active:cursor-grabbing hover:bg-blue-500 transition-colors"
      >
        <GripVertical size={11} />
        {def?.name || widget.type}
      </div>

      {/* Action buttons */}
      <div className="absolute -top-3 right-3 z-30 flex items-center gap-1">
        <button
          onClick={cycleSize}
          title={`Tamaño: ${SIZE_LABELS[widget.size]}`}
          className="bg-zinc-800 text-zinc-300 p-1.5 rounded-md hover:bg-zinc-700 transition-colors shadow-lg"
        >
          <Maximize2 size={12} />
        </button>
        <button
          onClick={onRemove}
          title="Quitar widget"
          className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-500 transition-colors shadow-lg"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="ring-2 ring-blue-500/40 ring-offset-2 ring-offset-zinc-950 rounded-2xl h-full">
        {children}
      </div>
    </div>
  );
}