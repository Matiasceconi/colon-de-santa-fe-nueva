import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ReadingStatusBadge from "@/components/nutrition/ReadingStatusBadge";

export default function NutritionManualReadingModal({ assessment, interpretation, readingStatuses = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    reading_status_id: interpretation?.reading_status_id || "",
    observation: interpretation?.observation || interpretation?.interpretation_note || "",
    responsible_user_id: interpretation?.responsible_user_id || "",
    next_control_date: interpretation?.next_control_date || "",
    limite_mm: interpretation?.limite_mm ?? assessment?.limite_mm ?? "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const statusMap = useMemo(() => Object.fromEntries(readingStatuses.map((status) => [status.id, status])), [readingStatuses]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();
      const common = {
        reading_status_id: form.reading_status_id || undefined,
        observation: form.observation,
        responsible_user_id: form.responsible_user_id || user?.full_name || user?.email || "",
        next_control_date: form.next_control_date || undefined,
        limite_mm: form.limite_mm === "" ? undefined : Number(form.limite_mm),
        updated_at: now,
      };
      Object.keys(common).forEach((key) => common[key] === undefined && delete common[key]);
      if (interpretation?.id) {
        await base44.entities.NutritionInterpretation.update(interpretation.id, common);
      } else {
        await base44.entities.NutritionInterpretation.create({
          player_id: assessment.player_id,
          club_id: assessment.club_id || "",
          squad_id: assessment.squad_id || "",
          season_id: assessment.season_id || "",
          source_sheet_name: "Carga manual",
          player_name_original: assessment.player_name_original,
          normalized_player_name: assessment.normalized_player_name || "",
          fecha: assessment.fecha,
          peso: assessment.peso,
          triceps: assessment.triceps,
          subescapular: assessment.subescapular,
          supraespinal: assessment.supraespinal,
          abdominal: assessment.abdominal,
          muslo: assessment.muslo,
          pantorrilla: assessment.pantorrilla,
          sumatoria_6p: assessment.sumatoria_6p,
          nutrition_assessment_id: assessment.id,
          nutrition_assessment_key: assessment.nutrition_assessment_key,
          nutrition_interpretation_key: `manual|${assessment.id}|${Date.now()}`,
          linked: true,
          found_in_last_sync: true,
          created_at: now,
          ...common,
        });
      }
      toast({ title: interpretation?.id ? "Interpretación actualizada" : "Interpretación creada" });
      onSaved();
    } catch (error) {
      toast({ title: "No se pudo guardar la interpretación", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader><DialogTitle>Interpretación antropométrica · {assessment?.player_name_original || "Jugador"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-400">Estado de interpretación</label>
            <div className="flex flex-wrap gap-2">
              {readingStatuses.filter((status) => status.active !== false).map((status) => <button key={status.id} type="button" onClick={() => setForm((current) => ({ ...current, reading_status_id: status.id }))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${form.reading_status_id === status.id ? "ring-2 ring-white/20" : "opacity-60 hover:opacity-100"}`} style={{ backgroundColor: status.color ? `${status.color}22` : "#27272a", borderColor: status.color || "#3f3f46", color: status.color || "#a1a1aa" }}>{status.name}</button>)}
            </div>
            {form.reading_status_id && <div className="mt-2"><ReadingStatusBadge statusId={form.reading_status_id} statusMap={statusMap} /></div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs text-zinc-400">Límite 6P (mm)</label><Input type="number" step="0.1" value={form.limite_mm} onChange={(e) => setForm((current) => ({ ...current, limite_mm: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" /></div>
            <div><label className="mb-1 block text-xs text-zinc-400">Próximo control</label><Input type="date" value={form.next_control_date} onChange={(e) => setForm((current) => ({ ...current, next_control_date: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" /></div>
          </div>
          <div><label className="mb-1 block text-xs text-zinc-400">Responsable</label><Input value={form.responsible_user_id} onChange={(e) => setForm((current) => ({ ...current, responsible_user_id: e.target.value }))} placeholder="Nombre del nutricionista" className="border-zinc-700 bg-zinc-800 text-white" /></div>
          <div><label className="mb-1 block text-xs text-zinc-400">Observación</label><Textarea rows={4} value={form.observation} onChange={(e) => setForm((current) => ({ ...current, observation: e.target.value }))} className="resize-none border-zinc-700 bg-zinc-800 text-white" placeholder="Interpretación, objetivos, observaciones y próximos pasos..." /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button><Button type="submit" disabled={saving} className="bg-white text-zinc-900 hover:bg-zinc-200">{saving ? "Guardando..." : "Guardar interpretación"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
