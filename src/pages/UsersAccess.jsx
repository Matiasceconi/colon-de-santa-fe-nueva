import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, Clock3, Copy, Edit2, KeyRound, Mail, Plus, Search, ShieldCheck,
  UserCheck, UserRound, UserX, UsersRound, X,
} from "lucide-react";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";
import { sendPrivateStaffInvitation } from "@/lib/staffInvitations";
import { useWorkspace } from "@/lib/WorkspaceContext";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function accessStatus(access) {
  if (!access) return { id: "without_access", label: "Sin acceso", cls: "text-zinc-400 border-zinc-700 bg-zinc-800/60", icon: UserRound };
  if (access.invitation_status === "disabled" || access.active === false) return { id: "suspended", label: "Suspendido", cls: "text-zinc-400 border-zinc-700 bg-zinc-800/60", icon: UserX };
  if (!access.last_seen) return { id: "first_login", label: "Pendiente de primer ingreso", cls: "text-amber-300 border-amber-500/25 bg-amber-500/10", icon: Clock3 };
  return { id: "active", label: "Activo", cls: "text-emerald-300 border-emerald-500/25 bg-emerald-500/10", icon: CheckCircle2 };
}

function formatLastSeen(value) {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function avatar(member, label) {
  if (member?.photo_url) return <img src={member.photo_url} alt="" className="h-full w-full object-cover" />;
  const initials = String(label || "U").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span className="text-[11px] font-black text-zinc-400">{initials || "U"}</span>;
}

function StatCard({ label, value, tone = "neutral" }) {
  const tones = {
    active: "border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-300",
    pending: "border-amber-500/15 bg-amber-500/[0.05] text-amber-300",
    suspended: "border-zinc-700 bg-zinc-900 text-zinc-300",
    neutral: "border-zinc-800 bg-zinc-900 text-white",
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone] || tones.neutral}`}><p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function StaffPicker({ rows, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter(member => {
    const text = `${member.first_name || ""} ${member.last_name || ""} ${member.email || ""} ${member.job_title || ""}`.toLowerCase();
    return !query || text.includes(query.toLowerCase());
  });
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
    <section className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-white" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">Dar acceso</h3><p className="mt-1 text-xs text-zinc-500">Elegí primero una persona del Cuerpo Técnico y Staff.</p></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X size={16}/></button></div>
      <div className="relative mt-4"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona…" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500"/></div>
      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {filtered.map(member => {
          const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Perfil sin nombre";
          return <button key={member.id} onClick={() => onPick(member)} className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-left transition hover:border-blue-500/30 hover:bg-zinc-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">{avatar(member, name)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{name}</span><span className="mt-0.5 block truncate text-xs text-zinc-600">{member.job_title || member.role || "Staff"}{member.email ? ` · ${member.email}` : ""}</span></span>
            <Plus size={15} className="text-blue-400"/>
          </button>;
        })}
        {!filtered.length && <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">No hay personas sin acceso para mostrar.</div>}
      </div>
    </section>
  </div>;
}

export default function UsersAccess() {
  const { isAdmin } = useWorkspace();
  const [accesses, setAccesses] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [squads, setSquads] = useState([]);
  const [platformAdmins, setPlatformAdmins] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pickingStaff, setPickingStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [squadFilter, setSquadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const [response, squadRows] = await Promise.all([
        base44.functions.invoke("manage-staff-access", { action: "list" }),
        base44.entities.Squad.list("name", 100),
      ]);
      const data = response.data || {};
      setAccesses(data.accesses || []);
      setStaffRows(data.staff || []);
      setRoles(data.roles || []);
      setPlatformAdmins(data.platform_admins || []);
      setRegisteredUsers(data.registered_users || []);
      setSquads(squadRows || []);
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "No se pudieron cargar los accesos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const protectedEmails = useMemo(() => new Set(platformAdmins.map(item => normalizeEmail(item.email))), [platformAdmins]);
  const roleMap = useMemo(() => Object.fromEntries(roles.map(role => [role.id, role])), [roles]);
  const staffMap = useMemo(() => Object.fromEntries(staffRows.map(member => [member.id, member])), [staffRows]);
  const registeredUserMap = useMemo(() => Object.fromEntries(registeredUsers.map(user => [normalizeEmail(user.email), user])), [registeredUsers]);
  const accessByStaff = useMemo(() => Object.fromEntries(accesses.filter(access => access.staff_id && !protectedEmails.has(normalizeEmail(access.user_email))).map(access => [access.staff_id, access])), [accesses, protectedEmails]);

  const rows = useMemo(() => {
    const base = staffRows.map(member => {
      const access = accessByStaff[member.id] || null;
      const status = accessStatus(access);
      const roleNames = access ? (access.role_ids || []).map(id => roleMap[id]?.name).filter(Boolean) : [];
      return { key: `staff:${member.id}`, member, access, status, roleNames, account: access ? registeredUserMap[normalizeEmail(access.user_email)] || null : null };
    });
    const knownStaffIds = new Set(staffRows.map(member => member.id));
    accesses.forEach(access => {
      if (protectedEmails.has(normalizeEmail(access.user_email)) || knownStaffIds.has(access.staff_id)) return;
      const status = accessStatus(access);
      base.push({ key: `access:${access.id}`, member: null, access, status, roleNames: (access.role_ids || []).map(id => roleMap[id]?.name).filter(Boolean), account: registeredUserMap[normalizeEmail(access.user_email)] || null });
    });
    return base;
  }, [staffRows, accessByStaff, accesses, protectedEmails, roleMap, registeredUserMap]);

  const stats = useMemo(() => ({
    active: rows.filter(row => row.status.id === "active").length,
    pending: rows.filter(row => row.status.id === "first_login").length,
    suspended: rows.filter(row => row.status.id === "suspended").length,
    withoutAccess: rows.filter(row => row.status.id === "without_access").length,
  }), [rows]);

  const roleOptions = useMemo(() => [...new Set(rows.flatMap(row => row.roleNames.length ? row.roleNames : [row.member?.job_title || row.member?.role]).filter(Boolean))].sort(), [rows]);

  const visibleRows = useMemo(() => rows.filter(row => {
    const access = row.access;
    const member = row.member;
    const name = access?.staff_name || access?.user_name || [member?.first_name, member?.last_name].filter(Boolean).join(" ") || "Perfil incompleto";
    const email = access?.user_email || member?.email || "";
    const searchable = `${name} ${email} ${row.roleNames.join(" ")} ${member?.job_title || ""}`.toLowerCase();
    if (search && !searchable.includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && row.status.id !== statusFilter) return false;
    if (roleFilter !== "all" && !row.roleNames.includes(roleFilter) && member?.job_title !== roleFilter && member?.role !== roleFilter) return false;
    if (squadFilter !== "all") {
      const ids = access?.all_squads ? squads.map(squad => squad.id) : (access?.squad_ids || member?.squad_ids || []);
      if (!ids.includes(squadFilter)) return false;
    }
    return true;
  }), [rows, search, statusFilter, roleFilter, squadFilter, squads]);

  const withoutAccessStaff = useMemo(() => staffRows.filter(member => !accessByStaff[member.id] && !protectedEmails.has(normalizeEmail(member.email))), [staffRows, accessByStaff, protectedEmails]);

  async function toggle(access) {
    if (!access) return;
    setBusyId(access.id);
    setMessage("");
    try {
      await base44.functions.invoke("manage-staff-access", { action: "set-active", accessId: access.id, form: { active: access.active === false } });
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "No se pudo cambiar el estado.");
    } finally {
      setBusyId("");
    }
  }

  async function invite(access) {
    if (!access) return;
    setBusyId(access.id);
    setMessage("");
    try {
      const result = await sendPrivateStaffInvitation({ accessId: access.id, email: access.user_email, staffName: access.staff_name || access.user_name, sendEmail: true });
      setMessage(result.data?.success ? `Aviso de acceso enviado a ${access.user_email}.` : "No se confirmó el envío; el acceso sigue habilitado y el usuario puede ingresar directamente.");
      await load();
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "No se pudo enviar el aviso de acceso.");
    } finally {
      setBusyId("");
    }
  }

  async function copyAccessLink(access) {
    if (!access) return;
    setBusyId(access.id);
    setMessage("");
    try {
      const result = await sendPrivateStaffInvitation({ accessId: access.id, email: access.user_email, staffName: access.staff_name || access.user_name, sendEmail: false });
      const data = result.data || {};
      const link = data.access_url || (data.access_path ? window.location.origin + data.access_path : "");
      if (!link) throw new Error("No se pudo generar el enlace de ingreso.");
      await navigator.clipboard.writeText(link);
      setMessage(`Enlace de ingreso copiado para ${access.user_email}.`);
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "No se pudo copiar el enlace de ingreso.");
    } finally {
      setBusyId("");
    }
  }

  if (!isAdmin) return <div className="flex h-64 items-center justify-center text-sm text-zinc-500">Acceso restringido a administradores.</div>;
  if (loading) return <div className="p-10 text-center text-zinc-500">Cargando usuarios y accesos…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex items-center gap-2"><KeyRound size={18} className="text-blue-400"/><h1 className="text-xl font-black text-white">Usuarios y accesos</h1></div><p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Dar acceso autoriza un correo inmediatamente. El usuario solo necesita demostrar que ese correo es suyo con contraseña/verificación o Google.</p></div>
        <button onClick={() => setPickingStaff(true)} disabled={!withoutAccessStaff.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15}/>Dar acceso</button>
      </header>

      {!!platformAdmins.length && <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 text-xs leading-5 text-zinc-400"><strong className="text-emerald-300">Administrador General protegido:</strong> se autoriza desde la plataforma, tiene todos los planteles y no puede suspenderse ni modificar sus permisos desde esta página.</div>}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] px-4 py-3 text-xs leading-5 text-zinc-400"><strong className="text-blue-300">Estados simples:</strong> <strong className="text-zinc-200">Pendiente de primer ingreso</strong> significa que el correo ya está habilitado pero todavía nunca entró. <strong className="text-zinc-200">Activo</strong> significa que ya ingresó al menos una vez. <strong className="text-zinc-200">Suspendido</strong> significa que el club le quitó temporalmente el acceso.</div>
      {message && <p className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">{message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Administrador general" value={platformAdmins.length} tone="active"/>
        <StatCard label="Activos" value={stats.active} tone="active"/>
        <StatCard label="Primer ingreso" value={stats.pending} tone="pending"/>
        <StatCard label="Suspendidos" value={stats.suspended} tone="suspended"/>
        <StatCard label="Sin acceso" value={stats.withoutAccess}/>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar usuario, email o rol…" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500"/></div>
          <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white"><option value="all">Todos los roles</option>{roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</select>
          <select value={squadFilter} onChange={event => setSquadFilter(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white"><option value="all">Todos los planteles</option>{squads.map(squad => <option key={squad.id} value={squad.id}>{squad.name}</option>)}</select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white"><option value="all">Todos los estados</option><option value="active">Activos</option><option value="first_login">Pendientes de primer ingreso</option><option value="suspended">Suspendidos</option><option value="without_access">Sin acceso</option></select>
        </div>
      </section>

      {!!platformAdmins.length && <section className="space-y-2"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Administración general</p>{platformAdmins.map(admin => {
        const legacyAccess = accesses.find(access => normalizeEmail(access.user_email) === normalizeEmail(admin.email));
        const member = legacyAccess ? staffMap[legacyAccess.staff_id] : null;
        const name = legacyAccess?.staff_name || legacyAccess?.user_name || [member?.first_name, member?.last_name].filter(Boolean).join(" ") || "Administrador General";
        return <div key={admin.id || admin.email} className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 md:grid-cols-[minmax(260px,1.4fr)_1fr_1fr_130px] md:items-center">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10">{member?.photo_url ? <img src={member.photo_url} alt="" className="h-full w-full object-cover"/> : <ShieldCheck size={18} className="text-emerald-300"/>}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-white">{name}</p><span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">Protegido</span></div><p className="truncate text-xs text-zinc-500">{admin.email}</p></div></div>
          <div><p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Rol</p><p className="mt-1 text-xs font-bold text-white">Administrador General</p></div>
          <div><p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Planteles</p><p className="mt-1 text-xs font-bold text-white">Todos</p></div>
          <span className="justify-self-start rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 md:justify-self-end">Activo</span>
        </div>;
      })}</section>}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">Staff</p><p className="text-[10px] text-zinc-700">{visibleRows.length} resultado{visibleRows.length === 1 ? "" : "s"}</p></div>
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_1fr_1fr_150px_140px] gap-3 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-zinc-600 lg:grid"><span>Usuario</span><span>Rol</span><span>Planteles</span><span>Estado</span><span className="text-right">Acciones</span></div>
          {visibleRows.map(row => {
            const { member, access, status, roleNames, account } = row;
            const StatusIcon = status.icon;
            const name = access?.staff_name || access?.user_name || [member?.first_name, member?.last_name].filter(Boolean).join(" ") || "Perfil incompleto";
            const email = access?.user_email || member?.email || "Sin email";
            const roleText = roleNames.join(", ") || member?.job_title || member?.role || access?.role || "Sin rol";
            const squadText = access?.all_squads ? "Todos los planteles" : (access?.squad_names || member?.squad_names || []).join(", ") || "Sin plantel";
            const firstLogin = status.id === "first_login";
            const suspended = status.id === "suspended";
            return <div key={row.key} className="grid gap-3 border-b border-zinc-800/80 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(260px,1.4fr)_1fr_1fr_150px_140px] lg:items-center">
              <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">{avatar(member, name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{name}</p><p className="truncate text-xs text-zinc-600">{email}</p>{access?.last_seen && <p className="mt-0.5 text-[9px] text-zinc-700">Último acceso: {formatLastSeen(access.last_seen)}</p>}</div></div>
              <div><p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-700 lg:hidden">Rol</p><p className="text-xs font-semibold text-zinc-300">{roleText}</p></div>
              <div><p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-700 lg:hidden">Planteles</p><p className="text-xs text-zinc-400">{squadText}</p></div>
              <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.cls}`}><StatusIcon size={11}/>{status.label}</span>{access && <p className="mt-1 text-[9px] text-zinc-700">{account ? (account.is_verified ? "Cuenta verificada" : "Cuenta creada · falta verificar") : "Cuenta todavía no creada"}</p>}</div>
              <div className="flex items-center justify-start gap-1 lg:justify-end">
                {!access && <button onClick={() => setEditing({ member, access: null })} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white hover:bg-blue-500"><Plus size={12}/>Dar acceso</button>}
                {access && firstLogin && <button disabled={busyId === access.id} onClick={() => invite(access)} className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10" title="Enviar aviso de acceso"><Mail size={14}/></button>}
                {access && firstLogin && <button disabled={busyId === access.id} onClick={() => copyAccessLink(access)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" title="Copiar enlace de ingreso"><Copy size={14}/></button>}
                {access && <button disabled={busyId === access.id} onClick={() => setEditing({ member: member || { id: access.staff_id, first_name: access.user_name || "", email: access.user_email, squad_ids: access.squad_ids || [] }, access })} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" title="Editar rol y planteles"><Edit2 size={14}/></button>}
                {access && <button disabled={busyId === access.id} onClick={() => toggle(access)} className={`rounded-lg p-2 ${suspended ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-500 hover:bg-red-500/10 hover:text-red-300"}`} title={suspended ? "Reactivar acceso" : "Suspender acceso"}>{suspended ? <UserCheck size={14}/> : <UserX size={14}/>}</button>}
              </div>
            </div>;
          })}
          {!visibleRows.length && <div className="p-10 text-center"><UsersRound size={22} className="mx-auto text-zinc-700"/><p className="mt-3 text-sm font-semibold text-zinc-500">No hay usuarios para estos filtros.</p></div>}
        </div>
      </section>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs leading-5 text-zinc-500"><strong className="text-zinc-300">Regla de seguridad:</strong> el rol define qué puede hacer una persona y los planteles definen dónde. Para modificar permisos por módulo usá <strong className="text-zinc-300">Roles y permisos</strong>, no esta tabla.</div>

      {pickingStaff && <StaffPicker rows={withoutAccessStaff} onClose={() => setPickingStaff(false)} onPick={member => { setPickingStaff(false); setEditing({ member, access: null }); }}/>} 
      {editing && <StaffPermissionsModal member={editing.member} squads={squads} existingAccess={editing.access} onSaved={() => { setEditing(null); load(); }} onClose={() => setEditing(null)}/>} 
    </div>
  );
}
