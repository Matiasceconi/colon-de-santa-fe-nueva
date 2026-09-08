import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { STATUS_LABELS } from "./medicalStatusConfig";

function playerName(player) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador";
}

export default function MedicalEpisodeCreateModal({ players = [], onClose, onSaved }) {
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => playerName(a).localeCompare(playerName(b))), [players]);
  const [form, setForm] = useState({
    player_id: "",
    categoria_division: "",
    lesion_consulta: "",
    mmii_afectado: "",
    fecha_inicio_tto: new Date().toISOString().slice(0, 10),
    fecha_final_tto: "",
    perdida_dias: "",
    etapa_rhb: "",
    observaciones: "",
    medical_status: "lesionado",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function selectPlayer(playerId) {
    const player = sortedPlayers.find((item) => item.id === playerId);
    setForm((current) => ({
      ...current,
      player_id: playerId,
      categoria_division: current.categoria_division || player?.division || player?.squad_name || player?.category || "",
    }));
  }

  async function save(event) {
    event.preventDefault();
    const player = sortedPlayers.find((item) => item.id === form.player_id);
    if (!player || !form.lesion_consulta.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();
      const payload = {
        player_id: player.id,
        squad_id: player.squad_id || "",
        season_id: player.season_id || "",
        player_name_original: playerName(player),
        categoria_division: form.categoria_division || player.division || player.squad_name || player.category || "",
        lesion_consulta: form.lesion_consulta.trim(),
        mmii_afectado: form.mmii_afectado,
        fecha_inicio_tto: form.fecha_inicio_tto || undefined,
        fecha_final_tto: form.fecha_final_tto || undefined,
        perdida_dias: form.perdida_dias === "" ? undefined : Number(form.perdida_dias),
        etapa_rhb: form.etapa_rhb,
        observaciones: form.observaciones,
        medical_status: form.medical_status,
        medical_episode_key: `manual|${player.id}|${form.fecha_inicio_tto || now.slice(0, 10)}|${Date.now()}`,
        linked: true,
        source: "app",
        edited_by: user?.full_name || user?.email || "Usuario",
        edited_at: now,
      };
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
      await base44.entities.MedicalEpisode.create(payload);
      await base44.functions.invoke("recalculateMedicalCurrentStatus", {});
      toast({ title: "Registro médico creado", description: `${playerName(player)} quedó agregado a la planilla médica.` });
      onSaved();
    } catch (error) {
      toast({ title: "No se pudo crear el registro", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle>Nuevo registro médico manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-5 text-zinc-400">
            Este registro se guarda directamente en PerformancePitch y convive con los registros sincronizados desde Google Sheets.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Jugador *</label>
              <Select value={form.player_id} onValueChange={selectPlayer}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white"><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {sortedPlayers.map((player) => <SelectItem key={player.id} value={player.id} className="text-white">{playerName(player)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Categoría / división</label>
              <Input value={form.categoria_division} onChange={(e) => setForm((f) => ({ ...f, categoria_division: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Lesión / consulta *</label>
            <Input value={form.lesion_consulta} onChange={(e) => setForm((f) => ({ ...f, lesion_consulta: e.target.value }))} required className="border-zinc-700 bg-zinc-800 text-white" placeholder="Ej: lesión muscular, dolor, control, consulta..." />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Estado</label>
              <Select value={form.medical_status} onValueChange={(value) => setForm((f) => ({ ...f, medical_status: value }))}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className="text-white">{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">MMII afectado</label>
              <Input value={form.mmii_afectado} onChange={(e) => setForm((f) => ({ ...f, mmii_afectado: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" placeholder="Derecho / Izquierdo" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Etapa RHB</label>
              <Input value={form.etapa_rhb} onChange={(e) => setForm((f) => ({ ...f, etapa_rhb: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="mb-1 block text-xs text-zinc-400">Inicio TTO</label><Input type="date" value={form.fecha_inicio_tto} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio_tto: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" /></div>
            <div><label className="mb-1 block text-xs text-zinc-400">Final TTO</label><Input type="date" value={form.fecha_final_tto} onChange={(e) => setForm((f) => ({ ...f, fecha_final_tto: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" /></div>
            <div><label className="mb-1 block text-xs text-zinc-400">Días perdidos</label><Input type="number" min="0" value={form.perdida_dias} onChange={(e) => setForm((f) => ({ ...f, perdida_dias: e.target.value }))} className="border-zinc-700 bg-zinc-800 text-white" /></div>
          </div>
          <div><label className="mb-1 block text-xs text-zinc-400">Observaciones</label><Textarea value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} rows={3} className="resize-none border-zinc-700 bg-zinc-800 text-white" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button><Button type="submit" disabled={saving || !form.player_id || !form.lesion_consulta.trim()} className="bg-white text-zinc-900 hover:bg-zinc-200">{saving ? "Guardando..." : "Guardar registro"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
