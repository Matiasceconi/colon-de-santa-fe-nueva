import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeCompetitionName } from "@/lib/competitions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, X, Trophy } from "lucide-react";
import SquadMultiSelect from "@/components/admin/competitions/SquadMultiSelect";

const EMPTY = { name: "", short_name: "", category: "", organizer: "", competition_type: "torneo", season_id: "", squad_id: "", squad_ids: [], country: "Argentina", division: "", age_category: "", official: true, active: true, color: "#F0C800", logo: "", description: "" };

const TYPES = [
  { value: "torneo", label: "Torneo" },
  { value: "liga", label: "Liga" },
  { value: "copa", label: "Copa" },
  { value: "juveniles", label: "Juveniles" },
  { value: "amistoso", label: "Amistoso" },
  { value: "otro", label: "Otro" },
];

const DIVISIONS = [
  { value: "", label: "Sin división" },
  { value: "primera", label: "Primera" },
  { value: "reserva", label: "Reserva" },
  { value: "juveniles", label: "Juveniles" },
];

function Field({ label, children, full }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/60 transition-colors";

export default function CompetitionForm({ competition, squads, onCancel, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (competition) {
      const ids = Array.isArray(competition.squad_ids) ? competition.squad_ids : (competition.squad_id ? [competition.squad_id] : []);
      setForm({ ...EMPTY, ...competition, squad_ids: ids });
    } else {
      setForm(EMPTY);
    }
  }, [competition]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo", file_url);
    } catch (e) {
      alert("Error al subir el logo");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = { ...form, normalized_name: normalizeCompetitionName(form.name), updated_at: now, created_at: form.created_at || now };
      if (competition?.id) await base44.entities.Competitions.update(competition.id, payload);
      else await base44.entities.Competitions.create(payload);
      setOpen(false);
      onSaved?.();
    } catch (e) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setOpen(false);
    onCancel?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700 text-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400"><Trophy size={18} /></span>
            {competition?.id ? "Editar competencia" : "Nueva competencia"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-xl border border-zinc-700 bg-zinc-800 flex items-center justify-center overflow-hidden">
                {form.logo ? <img src={form.logo} alt="" className="h-full w-full object-contain" /> : <Trophy size={28} className="text-zinc-600" />}
              </div>
              {uploading && <div className="absolute inset-0 rounded-xl bg-zinc-950/80 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-yellow-400" /></div>}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-zinc-400">Logo de la competencia</p>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-colors">
                  <Upload size={13} /> {uploading ? "Subiendo..." : "Cargar archivo"}
                  <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                </label>
                {form.logo && <button onClick={() => set("logo", "")} className="inline-flex items-center gap-1 px-2 py-2 rounded-lg text-zinc-500 hover:text-red-400 text-xs"><X size={13} /> Quitar</button>}
              </div>
              <input className={inputCls + " h-8 text-xs"} placeholder="O pegá la URL del logo" value={form.logo || ""} onChange={(e) => set("logo", e.target.value)} />
            </div>
          </div>

          {/* ── Grid de campos ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre oficial *">
              <input className={inputCls} placeholder="Ej: Liga Profesional de Fútbol" value={form.name || ""} onChange={(e) => set("name", e.target.value)} autoFocus />
            </Field>
            <Field label="Nombre corto">
              <input className={inputCls} placeholder="Ej: Liga Profesional" value={form.short_name || ""} onChange={(e) => set("short_name", e.target.value)} />
            </Field>
            <Field label="Tipo de competencia">
              <select className={inputCls} value={form.competition_type || "torneo"} onChange={(e) => set("competition_type", e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Color identificatorio">
              <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-1 cursor-pointer" value={form.color || "#F0C800"} onChange={(e) => set("color", e.target.value)} />
                <input className={inputCls + " flex-1"} value={form.color || ""} onChange={(e) => set("color", e.target.value)} />
              </div>
            </Field>
            <Field label="División">
              <select className={inputCls} value={form.division || ""} onChange={(e) => set("division", e.target.value)}>
                {DIVISIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Categoría de edad">
              <input className={inputCls} placeholder="Ej: 4ta, 5ta, 6ta" value={form.age_category || ""} onChange={(e) => set("age_category", e.target.value)} />
            </Field>
            <Field label="País">
              <input className={inputCls} value={form.country || ""} onChange={(e) => set("country", e.target.value)} />
            </Field>
            <Field label="Organizador">
              <input className={inputCls} placeholder="Ej: AFA, Conmebol" value={form.organizer || ""} onChange={(e) => set("organizer", e.target.value)} />
            </Field>
            <Field label="Categoría administrativa">
              <input className={inputCls} placeholder="Ej: Profesional, Amateur" value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
            </Field>
            <Field label="Planteles vinculados" full>
              <SquadMultiSelect squads={squads || []} value={form.squad_ids || []} onChange={(ids) => setForm((current) => ({ ...current, squad_ids: ids, squad_id: ids[0] || "" }))} />
            </Field>
          </div>

          <Field label="Descripción" full>
            <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/60 min-h-[80px] resize-y" placeholder="Detalles de la competencia, formato, reglas..." value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input type="checkbox" checked={!!form.official} onChange={(e) => set("official", e.target.checked)} className="accent-yellow-500" /> Competencia oficial
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} className="accent-yellow-500" /> Activa
            </label>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 bg-zinc-900">
          <button onClick={handleClose} className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={save} disabled={!form.name?.trim() || saving} className="px-5 py-2.5 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-bold disabled:opacity-40 flex items-center gap-2 hover:bg-yellow-400 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />} Guardar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}