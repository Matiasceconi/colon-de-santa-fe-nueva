import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const fields = [
  ["fecha", "Fecha", "date"], ["edad", "Edad", "number"], ["talla", "Talla", "number"], ["peso", "Peso", "number"],
  ["triceps", "Tríceps", "number"], ["subescapular", "Subescapular", "number"], ["supraespinal", "Supraespinal", "number"], ["abdominal", "Abdominal", "number"], ["muslo", "Muslo", "number"], ["pantorrilla", "Pantorrilla", "number"],
  ["sumatoria_6p", "Sumatoria 6P", "number"], ["imo", "IMO", "number"], ["porcentaje_masa_muscular", "% MM", "number"], ["kg_masa_muscular", "KG MM", "number"], ["porcentaje_grasa", "% grasa", "number"], ["kg_grasa", "KG grasa", "number"],
  ["peso_optimo", "Peso óptimo", "number"], ["peso_observacion", "Peso observación", "number"], ["peso_limite", "Peso límite", "number"],
];

export default function NutritionAssessmentEditModal({ assessment, onClose, onSaved }) {
  const [form, setForm] = useState({ ...assessment });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  async function save(e) {
    e.preventDefault(); setSaving(true);
    const user = await base44.auth.me();
    const payload = { ...form, source: "app", edited_by: user?.full_name || user?.email || "Usuario", edited_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const foldKeys = ["triceps", "subescapular", "supraespinal", "abdominal", "muslo", "pantorrilla"];
    const foldValues = foldKeys.map((key) => Number(payload[key])).filter(Number.isFinite);
    if ((payload.sumatoria_6p === "" || payload.sumatoria_6p == null) && foldValues.length === 6) payload.sumatoria_6p = foldValues.reduce((sum, value) => sum + value, 0);
    if (Number.isFinite(Number(payload.supraespinal)) && Number.isFinite(Number(payload.abdominal))) payload.zona_media_mm = Number(payload.supraespinal) + Number(payload.abdominal);
    fields.forEach(([k, , type]) => { if (type === "number") payload[k] = payload[k] === "" ? undefined : Number(payload[k]); });
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    await base44.entities.NutritionAssessment.update(assessment.id, payload);
    toast({ title: "Medición actualizada" }); setSaving(false); onSaved();
  }
  const origin = assessment.source === "app" && assessment.source_file_id ? "Integrado + ajuste manual" : assessment.source === "app" ? "Manual" : "Integrado desde archivo";
  return <Dialog open onOpenChange={onClose}><DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Editar medición — {assessment.player_name_original}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4"><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">Origen: <span className="font-semibold text-zinc-300">{origin}</span>. Si corregís un registro integrado, el ajuste manual queda protegido frente a próximas sincronizaciones.</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{fields.map(([k, label, type]) => <div key={k}><label className="text-xs text-zinc-400 mb-1 block">{label}</label><Input type={type} step="0.1" value={form[k] ?? ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>)}</div><div><label className="text-xs text-zinc-400 mb-1 block">Categoría / División</label><Input value={form.categoria_division || ""} onChange={e => setForm(f => ({ ...f, categoria_division: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div><div><label className="text-xs text-zinc-400 mb-1 block">Observaciones</label><Textarea value={form.observaciones || ""} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={3} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></div><Button disabled={saving} className="w-full bg-white text-zinc-900 hover:bg-zinc-200">{saving ? "Guardando..." : "Guardar cambios"}</Button></form></DialogContent></Dialog>;
}