import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

const Select = ({ value, onChange, children }) => <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none">{children}</select>;

export default function RosterFilters({ filters, options, onChange, onClear }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-64 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={filters.search} onChange={(e) => onChange("search", e.target.value)} placeholder="Buscar por nombre o apellido" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none" /></div>
      <span data-tour="players-squad"><Select value={filters.category} onChange={(v) => onChange("category", v)}><option value="all">Todas las categorías</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></span>
      <Select value={filters.position} onChange={(v) => onChange("position", v)}><option value="all">Todas las posiciones</option>{options.positions.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.leg} onChange={(v) => onChange("leg", v)}><option value="all">Pierna hábil</option>{options.legs.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.housing} onChange={(v) => onChange("housing", v)}><option value="all">Todas las pensiones</option>{options.housingTypes.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.residence} onChange={(v) => onChange("residence", v)}><option value="all">Todas las zonas</option>{options.residenceZones.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.contract} onChange={(v) => onChange("contract", v)}><option value="all">Situación contractual</option>{options.contractStatuses.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.birthYear} onChange={(v) => onChange("birthYear", v)}><option value="all">Año de nacimiento</option>{options.years.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.status} onChange={(v) => onChange("status", v)}><option value="all">Todos los estados</option>{options.statuses.map((v) => <option key={v}>{v}</option>)}</Select>
      <Select value={filters.ageMode} onChange={(v) => onChange("ageMode", v)}><option value="exact">Edad exacta</option><option value="under">Menores de</option><option value="over">Mayores de</option></Select>
      <input type="number" min="10" max="50" value={filters.ageValue} onChange={(e) => onChange("ageValue", e.target.value)} placeholder="Edad" className="w-20 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
      <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={14} /> Limpiar</button>
    </div><div className="mt-2 flex items-center gap-2 px-1 text-xs text-zinc-600"><SlidersHorizontal size={13} /> Los filtros se pueden combinar</div>
  </div>;
}