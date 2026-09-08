import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ROLES = ["entrenador", "PF", "analista", "médico", "kinesiólogo", "nutricionista", "utilero", "coordinador", "dirigente", "admin"];
export default function StaffBasicEditModal({ member, onSaved, onClose }) {
  const [form, setForm] = useState({ first_name: member.first_name || "", last_name: member.last_name || "", phone: member.phone || "", role: member.role || "entrenador", job_title: member.job_title || "", photo_url: member.photo_url || "", notes: member.notes || "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const setF = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const input = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500";
  async function upload(file) { if (!file) return; setUploading(true); const { file_url } = await base44.integrations.Core.UploadFile({ file }); setF("photo_url", file_url); setUploading(false); }
  async function submit(event) { event.preventDefault(); setSaving(true); await base44.entities.StaffMember.update(member.id, form); toast({ title: "Información del staff actualizada" }); onSaved(); setSaving(false); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-white">
    <div className="flex items-center justify-between"><h2 className="font-bold">Editar información del staff</h2><button type="button" onClick={onClose}><X size={18} className="text-zinc-500"/></button></div>
    <div className="mt-5 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-800">{form.photo_url ? <img src={form.photo_url} alt="" className="h-full w-full object-cover"/> : <Camera size={20} className="text-zinc-600"/>}</div><label className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300">{uploading ? "Subiendo…" : "Cambiar foto"}<input type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])}/></label></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs text-zinc-400">Nombre<input required value={form.first_name} onChange={e => setF("first_name", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Apellido<input required value={form.last_name} onChange={e => setF("last_name", e.target.value)} className={input}/></label><label className="text-xs text-zinc-400">Rol laboral<select value={form.role} onChange={e => setF("role", e.target.value)} className={input}>{ROLES.map(item => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-zinc-400">Cargo / función<input value={form.job_title} onChange={e => setF("job_title", e.target.value)} className={input}/></label><label className="col-span-2 text-xs text-zinc-400">Teléfono<input value={form.phone} onChange={e => setF("phone", e.target.value)} className={input}/></label><label className="col-span-2 text-xs text-zinc-400">Notas<textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className={input}/></label></div>
    <p className="mt-4 text-xs text-zinc-500">No modifica el email de acceso, los roles del sistema ni los planteles habilitados.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300">Cancelar</button><button disabled={saving || uploading} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button></div>
  </form></div>;
}