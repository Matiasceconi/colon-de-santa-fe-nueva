import React from "react";
import { Search } from "lucide-react";

export default function StaffDirectoryFilters({ search, role, status, roles, onSearch, onRole, onStatus }) {
  const control = "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600";
  return <div className="flex flex-wrap gap-3">
    <label className="relative min-w-[240px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Buscar por nombre" className={`${control} w-full pl-9`}/></label>
    <select value={role} onChange={e => onRole(e.target.value)} className={control}><option value="all">Todos los roles</option>{roles.map(item => <option key={item} value={item}>{item}</option>)}</select>
    <select value={status} onChange={e => onStatus(e.target.value)} className={control}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
  </div>;
}