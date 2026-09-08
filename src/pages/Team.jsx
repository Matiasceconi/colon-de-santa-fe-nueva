import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Mail, Pencil, Phone, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import StaffForm from "@/components/staff/StaffForm";
import { roleGroup } from "@/components/staff/staffDirectoryUtils";

function fullName(member) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ") || "Perfil sin nombre";
}

function Stat({ label, value }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
}

export default function Team() {
  const { activeSquadId, activeSquadName, isAdmin, squads = [] } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await base44.entities.StaffMember.list("first_name", 500);
      setMembers(rows || []);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const squadMembers = useMemo(() => members.filter(member => {
    if (!activeSquadId) return true;
    if ((member.squad_ids || []).includes(activeSquadId)) return true;
    return activeSquadName && (member.squad_names || []).some(name => String(name).trim().toLowerCase() === String(activeSquadName).trim().toLowerCase());
  }), [members, activeSquadId, activeSquadName]);

  const roles = useMemo(() => [...new Set(squadMembers.map(member => member.job_title || member.role).filter(Boolean))].sort(), [squadMembers]);
  const visible = useMemo(() => squadMembers.filter(member => {
    if (status === "active" && member.active === false) return false;
    if (status === "inactive" && member.active !== false) return false;
    if (role !== "all" && (member.job_title || member.role) !== role) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${fullName(member)} ${member.email || ""} ${member.job_title || ""} ${member.role || ""}`.toLowerCase().includes(q)) return false;
    return true;
  }), [squadMembers, search, role, status]);

  const groups = useMemo(() => squadMembers.filter(member => member.active !== false).reduce((acc, member) => {
    acc[roleGroup(member.job_title || member.role || "")] += 1;
    return acc;
  }, { technical: 0, performance: 0, health: 0, other: 0 }), [squadMembers]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white"/></div>;

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div><h1 className="text-2xl font-black tracking-tight text-white">Cuerpo Técnico y Staff</h1><p className="mt-1 text-sm text-zinc-500">{activeSquadName || "Todos los planteles"} · Directorio de personas. Los accesos al software se administran por separado.</p></div>
      {isAdmin && <button onClick={() => setEditing(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-zinc-900"><Plus size={15}/>Agregar persona</button>}
    </header>

    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Staff activo" value={squadMembers.filter(member => member.active !== false).length}/><Stat label="Cuerpo técnico" value={groups.technical}/><Stat label="Rendimiento" value={groups.performance}/><Stat label="Salud" value={groups.health}/></div>

    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:flex-row">
      <label className="relative min-w-[240px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre, email o función…" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-zinc-600"/></label>
      <select value={role} onChange={event => setRole(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="all">Todas las funciones</option>{roles.map(item => <option key={item} value={item}>{item}</option>)}</select>
      <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select>
    </div>

    {visible.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(member => {
      const name = fullName(member);
      return <article key={member.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start gap-3">{member.photo_url ? <img src={member.photo_url} alt={name} className="h-14 w-14 rounded-full object-cover"/> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500"><UserRound size={20}/></div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-black text-white">{name}</p><p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400"><Briefcase size={11}/>{member.job_title || member.role || "Sin función informada"}</p></div>{isAdmin && <button onClick={() => setEditing(member)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-white"><Pencil size={14}/></button>}</div></div></div>
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500"><p className="flex items-center gap-2"><Mail size={12}/><span className="truncate">{member.email || "Sin email de contacto"}</span></p><p className="flex items-center gap-2"><Phone size={12}/>{member.phone || "Sin teléfono"}</p><p className="flex items-center gap-2"><UsersRound size={12}/><span className="truncate">{(member.squad_names || []).join(", ") || "Sin plantel asignado"}</span></p></div>
        <div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${member.active !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>{member.active !== false ? "Miembro activo" : "Miembro inactivo"}</span><span className="text-[10px] text-zinc-700">El acceso se gestiona en Administración</span></div>
      </article>;
    })}</div> : <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center"><UsersRound size={24} className="mx-auto text-zinc-700"/><p className="mt-3 text-sm font-semibold text-zinc-500">No hay personas para estos filtros.</p></div>}

    {isAdmin && editing !== undefined && <StaffForm member={editing} squads={squads} onSaved={() => { setEditing(undefined); load(); }} onClose={() => setEditing(undefined)}/>} 
  </div>;
}
