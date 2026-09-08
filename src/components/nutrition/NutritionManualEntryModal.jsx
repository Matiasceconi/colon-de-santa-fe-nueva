import React, { useMemo, useState } from "react";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const FOLD_FIELDS = [
  ["triceps", "Tríceps"], ["subescapular", "Subescapular"], ["supraespinal", "Supraespinal"],
  ["abdominal", "Abdominal"], ["muslo", "Muslo"], ["pantorrilla", "Pantorrilla"],
];

function playerName(player) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador";
}

function normalizedName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function NutritionManualEntryModal({ players = [], activeSquad, onClose, onSaved }) {
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => playerName(a).localeCompare(playerName(b))), [players]);
  const [form, setForm] = useState({
    player_id: "",
    fecha: moment().format("YYYY-MM-DD"),
    tipo_medicion: "Control antropométrico manual",
    talla: "", peso: "", triceps: "", subescapular: "", supraespinal: "", abdominal: "", muslo: "", pantorrilla: "",
    sumatoria_6p: "", imo: "", porcentaje_masa_muscular: "", kg_masa_muscular: "", porcentaje_grasa: "", kg_grasa: "",
    peso_optimo: "", peso_observacion: "", peso_limite: "", observaciones: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function patch(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  const foldSum = FOLD_FIELDS.map(([key]) => Number(form[key])).filter(Number.isFinite);
  const calculatedSum = foldSum.length === 6 ? foldSum.reduce((sum, value) => sum + value, 0) : null;

  function selectPlayer(playerId) {
    const player = sortedPlayers.find((item) => item.id === playerId);
    setForm((current) => ({
      ...current,
      player_id: playerId,
      talla: current.talla || player?.height || "",
      peso: current.peso || player?.weight || "",
    }));
  }

  async function save(event) {
    event.preventDefault();
    const player = sortedPlayers.find((item) => item.id === form.player_id);
    if (!player || !form.fecha) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();
      const numericFields = ["talla", "peso", ...FOLD_FIELDS.map(([key]) => key), "sumatoria_6p", "imo", "porcentaje_masa_muscular", "kg_masa_muscular", "porcentaje_grasa", "kg_grasa", "peso_optimo", "peso_observacion", "peso_limite"];
      const values = {};
      numericFields.forEach((key) => {
        if (form[key] !== "") values[key] = Number(form[key]);
      });
      if (values.sumatoria_6p === undefined && calculatedSum !== null) values.sumatoria_6p = calculatedSum;
      if (values.supraespinal !== undefined && values.abdominal !== undefined) values.zona_media_mm = values.supraespinal + values.abdominal;
      const age = player.birth_date ? moment(form.fecha).diff(moment(player.birth_date), "years") : undefined;
      const squadId = player.squad_id || activeSquad?.id || "";
      const seasonId = activeSquad?.season || player.season_id || "";
      const payload = {
        player_id: player.id,
        club_id: player.club_id || "",
        squad_id: squadId,
        season_id: seasonId,
        player_name_original: playerName(player),
        normalized_player_name: normalizedName(playerName(player)),
        fecha: form.fecha,
        tipo_medicion: form.tipo_medicion,
        source_sheet_name: "Carga manual",
        edad: age,
        categoria_division: player.division || player.squad_name || player.category || activeSquad?.name || "",
        observaciones: form.observaciones,
        nutrition_assessment_key: `manual|${player.id}|${form.fecha}|${Date.now()}`,
        linked: true,
        source: "app",
        found_in_last_sync: true,
        created_at: now,
        updated_at: now,
        edited_by: user?.full_name || user?.email || "Usuario",
        edited_at: now,
        ...values,
      };
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
      await base44.entities.NutritionAssessment.create(payload);
      toast({ title: "Control nutricional creado", description: `${playerName(player)} · ${moment(form.fecha).format("DD/MM/YYYY")}` });
      onSaved();
    } catch (error) {
      toast({ title: "No se pudo guardar el control", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "border-zinc-700 bg-zinc-800 text-white";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader><DialogTitle>Nuevo control nutricional manual</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-5 text-zinc-400">Carga directa dentro de PerformancePitch. No depende de Google Drive y queda disponible para gráficos, evolución e informes.</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="mb-1 block text-xs text-zinc-400">Jugador *</label><Select value={form.player_id} onValueChange={selectPlayer}><SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger><SelectContent className="border-zinc-700 bg-zinc-900">{sortedPlayers.map((player) => <SelectItem key={player.id} value={player.id} className="text-white">{playerName(player)}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs text-zinc-400">Fecha *</label><Input type="date" value={form.fecha} onChange={(e) => patch("fecha", e.target.value)} className={inputClass} /></div>
            <div><label className="mb-1 block text-xs text-zinc-400">Tipo de control</label><Input value={form.tipo_medicion} onChange={(e) => patch("tipo_medicion", e.target.value)} className={inputClass} /></div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Medidas generales</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div><label className="mb-1 block text-xs text-zinc-400">Talla (cm)</label><Input type="number" step="0.1" value={form.talla} onChange={(e) => patch("talla", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Peso (kg)</label><Input type="number" step="0.1" value={form.peso} onChange={(e) => patch("peso", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">IMO</label><Input type="number" step="0.01" value={form.imo} onChange={(e) => patch("imo", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Sumatoria 6P (mm)</label><Input type="number" step="0.1" value={form.sumatoria_6p} onChange={(e) => patch("sumatoria_6p", e.target.value)} placeholder={calculatedSum !== null ? `Auto: ${calculatedSum.toFixed(1)}` : ""} className={inputClass} /></div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pliegues (mm)</p>{calculatedSum !== null && <button type="button" onClick={() => patch("sumatoria_6p", calculatedSum.toFixed(1))} className="text-xs font-semibold text-emerald-300">Usar sumatoria automática: {calculatedSum.toFixed(1)} mm</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">{FOLD_FIELDS.map(([key, label]) => <div key={key}><label className="mb-1 block text-xs text-zinc-400">{label}</label><Input type="number" step="0.1" value={form[key]} onChange={(e) => patch(key, e.target.value)} className={inputClass} /></div>)}</div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Composición corporal</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div><label className="mb-1 block text-xs text-zinc-400">% Masa muscular</label><Input type="number" step="0.1" value={form.porcentaje_masa_muscular} onChange={(e) => patch("porcentaje_masa_muscular", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Kg masa muscular</label><Input type="number" step="0.1" value={form.kg_masa_muscular} onChange={(e) => patch("kg_masa_muscular", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">% Grasa</label><Input type="number" step="0.1" value={form.porcentaje_grasa} onChange={(e) => patch("porcentaje_grasa", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Kg grasa</label><Input type="number" step="0.1" value={form.kg_grasa} onChange={(e) => patch("kg_grasa", e.target.value)} className={inputClass} /></div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Objetivos de peso (opcionales)</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div><label className="mb-1 block text-xs text-zinc-400">Peso óptimo</label><Input type="number" step="0.1" value={form.peso_optimo} onChange={(e) => patch("peso_optimo", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Peso observación</label><Input type="number" step="0.1" value={form.peso_observacion} onChange={(e) => patch("peso_observacion", e.target.value)} className={inputClass} /></div>
              <div><label className="mb-1 block text-xs text-zinc-400">Peso límite</label><Input type="number" step="0.1" value={form.peso_limite} onChange={(e) => patch("peso_limite", e.target.value)} className={inputClass} /></div>
            </div>
          </div>

          <div><label className="mb-1 block text-xs text-zinc-400">Observaciones</label><Textarea rows={3} value={form.observaciones} onChange={(e) => patch("observaciones", e.target.value)} className="resize-none border-zinc-700 bg-zinc-800 text-white" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button><Button type="submit" disabled={saving || !form.player_id || !form.fecha} className="bg-white text-zinc-900 hover:bg-zinc-200">{saving ? "Guardando..." : "Guardar control"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
