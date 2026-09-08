import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, UsersRound } from "lucide-react";

/**
 * Multi-select de planteles para vincular a una competencia.
 * value: string[] (ids de planteles seleccionados)
 */
export default function SquadMultiSelect({ squads = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = Array.isArray(value) ? value : [];
  const selectedNames = squads.filter((s) => selected.includes(s.id)).map((s) => s.name);

  function toggle(id) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  const label = selected.length === 0
    ? "Todos los planteles"
    : selected.length === 1
      ? selectedNames[0]
      : `${selected.length} planteles seleccionados`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white flex items-center justify-between gap-2 focus:outline-none focus:border-yellow-500/60 transition-colors"
      >
        <span className={`flex items-center gap-2 min-w-0 ${selected.length === 0 ? "text-zinc-500" : "text-white"}`}>
          <UsersRound size={14} className="shrink-0 text-zinc-500" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-64 overflow-y-auto p-1">
          {squads.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">No hay planteles cargados</div>
          )}
          {squads.map((squad) => {
            const checked = selected.includes(squad.id);
            return (
              <button
                key={squad.id}
                type="button"
                onClick={() => toggle(squad.id)}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-left hover:bg-zinc-800 transition-colors"
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "bg-yellow-500 border-yellow-500" : "border-zinc-600 bg-zinc-800"}`}>
                  {checked && <Check size={12} className="text-zinc-950" />}
                </span>
                <span className={`truncate ${checked ? "text-white" : "text-zinc-300"}`}>{squad.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-md bg-yellow-500/15 border border-yellow-500/25 px-2 py-0.5 text-[11px] font-medium text-yellow-200">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}