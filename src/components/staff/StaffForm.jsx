import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ALL_ROLES = ["entrenador", "PF", "analista", "médico", "kinesiólogo", "nutricionista", "utilero", "coordinador", "dirigente", "scout", "director_deportivo", "admin"];
export default function StaffForm({ member, squads, onSaved, onClose }) {
  const isEdit = !!member;
  const [form, setForm] = useState({ first_name: member?.first_name || "", last_name: member?.last_name || "", email: member?.email || "", phone: member?.phone || "", role: member?.role || "entrenador", job_title: member?.job_title || "", squad_ids: member?.squad_ids || [], active: member?.active !== false, notes: member?.notes || "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const setF = (key, value) => setForm(current => ({ ...current, [key]: value }));
  function toggleSquad(id) { setForm(current => ({ ...current, squad_ids: current.squad_ids.includes(id) ? current.squad_ids.filter(item => item !== id) : [...current.squad_ids, id] })); }
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    const selected = squads.filter(squad => form.squad_ids.includes(squad.id));
    const payload = { ...form, squad_names: selected.map(squad => squad.name) };
    const saved = isEdit ? await base44.entities.StaffMember.update(member.id, payload) : await base44.entities.StaffMember.create(payload);
    toast({ title: isEdit ? "Miembro actualizado" : "Miembro creado" });
    onSaved({ ...payload, id: saved.id || member?.id }, isEdit); setSaving(false);
  }
  const input = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-white">
    <div className="flex justify-between"><h2 className="font-semibold">{isEdit ? "Editar miembro" : "Nuevo miembro del staff"}</h2><button type="button" onClick={onClose}><X size={16}/></button></div>
    <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs text-zinc-400">Nombre<input required value={form.first_name} onChange={e => setF("first_name", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Apellido<input required value={form.last_name} onChange={e => setF("last_name", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Email<input type="email" value={form.email} onChange={e => setF("email", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Teléfono<input value={form.phone} onChange={e => setF("phone", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Rol<select value={form.role} onChange={e => setF("role", e.target.value)} className={input}>{ALL_ROLES.map(role => <option key={role}>{role}</option>)}</select></label><label className="text-xs text-zinc-400">Cargo<input value={form.job_title} onChange={e => setF("job_title", e.target.value)} className={input}/></label></div>
    <div className="mt-4"><p className="mb-2 text-xs text-zinc-400">Planteles asignados</p><div className="flex flex-wrap gap-2">{squads.map(squad => <button type="button" key={squad.id} onClick={() => toggleSquad(squad.id)} className={`rounded-full border px-3 py-1.5 text-xs ${form.squad_ids.includes(squad.id) ? "border-yellow-500 bg-yellow-500 text-zinc-900" : "border-zinc-700 bg-zinc-800 text-zinc-400"}`}>{squad.name}</button>)}</div></div>
    <label className="mt-4 block text-xs text-zinc-400">Notas<textarea rows={2} value={form.notes} onChange={e => setF("notes", e.target.value)} className={input}/></label>
    <label className="mt-4 flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={form.active} onChange={e => setF("active", e.target.checked)}/>Miembro activo</label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm">Cancelar</button><button disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900">{saving ? "Guardando…" : "Guardar"}</button></div>
  </form></div>;
}