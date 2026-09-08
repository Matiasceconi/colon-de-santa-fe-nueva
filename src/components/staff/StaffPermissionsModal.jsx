import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Copy, KeyRound, Loader2, Mail, Save, Shield, X } from "lucide-react";
import { sendPrivateStaffInvitation } from "@/lib/staffInvitations";

const INPUT = "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500";

function roleLabel(role) {
  if (role?.can_admin) return role.name === "Administrador general" ? "Administrador del Club" : role.name;
  return role?.name || "Rol";
}

export default function StaffPermissionsModal({ member, squads = [], existingAccess, onSaved, onClose }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    user_email: existingAccess?.user_email || member?.email || "",
    role_ids: existingAccess?.role_ids || [],
    squad_ids: existingAccess?.squad_ids || member?.squad_ids || [],
    all_squads: !!existingAccess?.all_squads,
  });
  const [record, setRecord] = useState(existingAccess || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activationLink, setActivationLink] = useState("");

  useEffect(() => {
    base44.entities.AppRole.filter({ active: true }, "name", 200).then(setRoles).catch(() => setRoles([]));
  }, []);

  const selectedRole = useMemo(() => roles.find(role => role.id === form.role_ids[0]) || null, [roles, form.role_ids]);
  const isNew = !existingAccess?.id;
  const name = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || existingAccess?.staff_name || existingAccess?.user_name || "Usuario";

  function setF(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function save({ sendInvite = false } = {}) {
    setBusy(true);
    setError("");
    setSuccess("");
    setActivationLink("");
    try {
      if (!form.user_email.trim()) throw new Error("Ingresá un email válido.");
      if (!form.role_ids.length) throw new Error("Elegí un rol.");
      if (!form.all_squads && !form.squad_ids.length) throw new Error("Elegí al menos un plantel.");

      const response = await base44.functions.invoke("manage-staff-access", {
        action: "prepare",
        accessId: record?.id || null,
        staffId: member?.id,
        form: {
          ...form,
          user_email: form.user_email.trim().toLowerCase(),
          role_ids: form.role_ids.slice(0, 1),
          squad_ids: form.all_squads ? [] : form.squad_ids,
        },
      });
      const saved = response.data?.access || response.data;
      setRecord(saved);

      if (sendInvite) {
        const invitation = await sendPrivateStaffInvitation({
          accessId: saved.id,
          email: saved.user_email,
          staffName: saved.staff_name || name,
          sendEmail: true,
        });
        const delivery = invitation.data || {};
        const link = delivery.access_url || (delivery.access_path ? window.location.origin + delivery.access_path : "");
        setActivationLink(link);
        setSuccess(delivery.success ? "Acceso habilitado y aviso enviado." : "Acceso habilitado. El correo no pudo confirmarse; podés compartir el enlace de ingreso.");
      } else {
        setSuccess(isNew ? "Acceso habilitado." : "Rol y planteles actualizados.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No se pudo guardar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!activationLink) return;
    try {
      await navigator.clipboard.writeText(activationLink);
      setSuccess("Enlace copiado. Compartilo únicamente con la persona autorizada.");
    } catch {
      setError("No se pudo copiar automáticamente. Seleccioná el enlace manualmente.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <section className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300"><Shield size={18}/></span>
            <div><h2 className="font-black">{isNew ? "Dar acceso al software" : "Editar acceso"}</h2><p className="mt-1 text-sm text-zinc-400">{name}</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X size={17}/></button>
        </header>

        {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {success && <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-300"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/><span>{success}</span></div>}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Email de acceso</span><input type="email" value={form.user_email} onChange={event => setF("user_email", event.target.value)} readOnly={!isNew} className={`${INPUT} read-only:text-zinc-500`} placeholder="correo@club.com"/><span className="mt-1 block text-[10px] text-zinc-600">{isNew ? "Este correo queda autorizado por el club para ingresar al software." : "El correo de una cuenta existente no se cambia desde permisos."}</span></label>

          <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Rol principal</span><select value={form.role_ids[0] || ""} onChange={event => setF("role_ids", event.target.value ? [event.target.value] : [])} className={INPUT}><option value="">Elegir rol</option>{roles.map(role => <option key={role.id} value={role.id}>{roleLabel(role)}</option>)}</select>{selectedRole?.can_admin && <span className="mt-1 block text-[10px] leading-4 text-amber-400">Este rol administra toda la institución. No es el Administrador General protegido de plataforma.</span>}</label>

          <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Alcance</span><button type="button" onClick={() => setF("all_squads", !form.all_squads)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-bold ${form.all_squads ? "border-blue-500/30 bg-blue-500/10 text-blue-200" : "border-zinc-700 bg-zinc-950 text-zinc-400"}`}><span>Todos los planteles</span><span className={`relative h-5 w-9 rounded-full ${form.all_squads ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.all_squads ? "translate-x-[18px]" : "translate-x-0.5"}`}/></span></button></div>
        </div>

        {!form.all_squads && <div className="mt-4"><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">Planteles permitidos</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{squads.map(squad => { const checked = form.squad_ids.includes(squad.id); return <label key={squad.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${checked ? "border-blue-500/25 bg-blue-500/[0.08] text-blue-200" : "border-zinc-800 bg-zinc-950/60 text-zinc-500"}`}><input type="checkbox" checked={checked} onChange={event => setF("squad_ids", event.target.checked ? [...form.squad_ids, squad.id] : form.squad_ids.filter(id => id !== squad.id))}/><span className="truncate">{squad.name}</span></label>; })}</div></div>}

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs leading-5 text-zinc-500"><KeyRound size={13} className="mr-1.5 inline text-zinc-400"/><strong className="text-zinc-300">Lógica simple:</strong> el rol define qué puede hacer esta persona; los planteles definen dónde puede hacerlo. Los permisos finos se editan en Roles y permisos.</div>

        {activationLink && <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Enlace de ingreso</p><div className="mt-2 flex gap-2"><input readOnly value={activationLink} className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400"/><button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-white"><Copy size={13}/>Copiar</button></div></div>}

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-50">{success ? "Cerrar" : "Cancelar"}</button>
          {!success && isNew && <button onClick={() => save({ sendInvite: true })} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin"/> : <Mail size={14}/>}Dar acceso</button>}
          {!success && !isNew && <button onClick={() => save({ sendInvite: false })} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}Guardar cambios</button>}
          {success && <button onClick={() => onSaved?.(record)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500"><CheckCircle2 size={14}/>Finalizar</button>}
        </footer>
      </section>
    </div>
  );
}
