import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Edit2, KeyRound, Plus, Search, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import RoleFormModal from "@/components/admin/RoleFormModal";
import { moduleLifecycle } from "@/lib/moduleCatalog";

function activeModuleCount(role) {
  return Object.entries(role.module_permissions || {}).filter(([moduleId, permissions]) => moduleLifecycle(moduleId).status === "available" && permissions?.can_view).length;
}

function roleMode(role) {
  if (role.can_admin) return { label: "Administración completa", cls: "border-amber-500/25 bg-amber-500/10 text-amber-200" };
  const permissions = Object.values(role.module_permissions || {}).filter((item) => item?.can_view);
  if (!permissions.length) return { label: "Sin acceso configurado", cls: "border-zinc-700 bg-zinc-800 text-zinc-500" };
  if (permissions.every((item) => !item.can_create && !item.can_edit && !item.can_delete && !item.can_admin)) return { label: "Consulta", cls: "border-blue-500/25 bg-blue-500/10 text-blue-200" };
  if (permissions.some((item) => item.can_delete || item.can_admin)) return { label: "Gestión", cls: "border-violet-500/25 bg-violet-500/10 text-violet-200" };
  return { label: "Trabajo", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" };
}

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const [roleRows, userAccessRows] = await Promise.all([
        base44.entities.AppRole.list("name", 300).catch(() => []),
        base44.entities.UserAccess.list("-created_date", 1000).catch(() => []),
      ]);
      setRoles(roleRows || []);
      setAccesses(userAccessRows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function assignedUsers(roleId, onlyActive = true) {
    return accesses.filter((access) => (!onlyActive || access.active !== false) && (access.role_ids || []).includes(roleId));
  }

  async function toggleActive(role) {
    const nextActive = role.active === false;
    const assigned = assignedUsers(role.id, true);
    if (!nextActive && assigned.length > 0) {
      toast({ title: "Rol en uso", description: `Hay ${assigned.length} usuario${assigned.length === 1 ? "" : "s"} activo${assigned.length === 1 ? "" : "s"} con este rol. Reasigná primero esos accesos.`, variant: "destructive" });
      return;
    }
    try {
      const response = await base44.functions.invoke("manage-roles", { action: "toggle", roleId: role.id, payload: { active: nextActive } });
      if (response.data?.error) throw new Error(response.data.error);
      await load();
      toast({ title: nextActive ? "Rol activado" : "Rol desactivado" });
    } catch (error) {
      toast({ title: "No se pudo cambiar el rol", description: error?.response?.data?.error || error?.message, variant: "destructive" });
    }
  }

  const filteredRoles = useMemo(() => roles.filter((role) => {
    if (status === "active" && role.active === false) return false;
    if (status === "inactive" && role.active !== false) return false;
    const term = search.trim().toLowerCase();
    return !term || `${role.name || ""} ${role.description || ""}`.toLowerCase().includes(term);
  }), [roles, search, status]);

  const summary = useMemo(() => ({
    active: roles.filter((role) => role.active !== false).length,
    inUse: roles.filter((role) => assignedUsers(role.id, true).length > 0).length,
    admins: roles.filter((role) => role.active !== false && role.can_admin).length,
  }), [roles, accesses]);

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" /></div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><KeyRound size={18} className="text-blue-400" /><h2 className="text-xl font-black text-white">Roles y permisos</h2></div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Un rol define qué puede hacer una persona. Los planteles se asignan aparte desde Usuarios y accesos, para no mezclar permisos con alcance.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"><Plus size={15} />Nuevo rol</button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Roles activos</p><p className="mt-1 text-2xl font-black text-white">{summary.active}</p></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Roles en uso</p><p className="mt-1 text-2xl font-black text-white">{summary.inUse}</p></div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4"><p className="text-xs text-zinc-500">Administradores del Club</p><p className="mt-1 text-2xl font-black text-amber-200">{summary.admins}</p></div>
      </section>

      <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
        <div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-cyan-300" /><div><p className="text-xs font-black text-white">Modelo simple de seguridad</p><p className="mt-1 text-xs leading-5 text-zinc-500">La mayoría de los roles se puede configurar con cuatro niveles por módulo: <strong className="text-zinc-300">Sin acceso, Consultar, Trabajar o Gestionar</strong>. La matriz técnica de seis permisos queda disponible sólo dentro de “Personalizar acciones”.</p></div></div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar rol…" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-zinc-600" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="active">Activos</option><option value="all">Todos</option><option value="inactive">Desactivados</option></select>
      </div>

      {filteredRoles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">No hay roles para estos filtros.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoles.map((role) => {
            const users = assignedUsers(role.id, true);
            const mode = roleMode(role);
            const modules = role.can_admin ? "Todos los módulos habilitados" : `${activeModuleCount(role)} módulos`;
            return (
              <article key={role.id} className={`rounded-2xl border bg-zinc-900 p-4 ${role.active === false ? "border-zinc-800 opacity-60" : role.can_admin ? "border-amber-500/20" : "border-zinc-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-black text-white">{role.name}</p><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-zinc-500">{role.description || "Sin descripción"}</p></div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${mode.cls}`}>{mode.label}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Acceso</p><p className="mt-1 text-xs font-bold text-zinc-300">{modules}</p></div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Usuarios</p><p className="mt-1 flex items-center gap-1 text-xs font-bold text-zinc-300"><UsersRound size={12} />{users.length} activos</p></div>
                </div>
                {!!(role.areas || []).length && <p className="mt-3 truncate text-[10px] text-zinc-600">Área: {(role.areas || []).join(" · ")}</p>}
                <footer className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
                  <button onClick={() => toggleActive(role)} disabled={role.can_admin && users.length > 0} className="text-[10px] font-bold text-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">{role.active === false ? "Activar" : "Desactivar"}</button>
                  <button onClick={() => { setEditing(role); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-zinc-300 hover:text-white"><Edit2 size={12} />Editar</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex items-start gap-3"><UserRoundCog size={17} className="mt-0.5 shrink-0 text-zinc-500" /><div><p className="text-xs font-black text-white">Roles específicos del club</p><p className="mt-1 text-xs leading-5 text-zinc-600">Podés conservar roles como Entrenador de arqueros, Readaptador o Coordinador médico. No hace falta reducir todo a ocho nombres universales: la simplificación está en cómo se configuran los permisos, no en borrar la estructura real del club.</p></div></div>
      </section>

      {showForm && <RoleFormModal existingRole={editing} onSaved={() => { setShowForm(false); setEditing(null); load(); }} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}