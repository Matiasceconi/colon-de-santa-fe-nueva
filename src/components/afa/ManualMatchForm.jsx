import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import ClubPicker from "@/components/afa/ClubPicker";

const SEASON = "2026";
const CATEGORIES = ["Cuarta", "Quinta", "Sexta", "Séptima", "Octava", "Novena", "Primera", "Proyección", "B Nacional", "Copa Argentina"];

export default function ManualMatchForm({ onClose, onSaved }) {
  const [homeClub, setHomeClub] = useState(null);
  const [awayClub, setAwayClub] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [competition, setCompetition] = useState("");
  const [category, setCategory] = useState("Primera");
  const [round, setRound] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function save() {
    if (!homeClub || !awayClub || !date || !competition) {
      toast({ title: "Faltan datos obligatorios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.UpcomingMatch.create({
        competition,
        category,
        season: SEASON,
        homeTeam: homeClub.name,
        awayTeam: awayClub.name,
        matchDate: date,
        matchTime: time || null,
        venue: venue || null,
        round: round || null,
        status: "scheduled",
        source: "manual",
      });
      toast({ title: "Partido creado" });
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast({ title: "Error al crear el partido", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Crear partido manual</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ClubPicker
              label="Club local *"
              selectedClubId={homeClub?.id || ""}
              onSelect={(id, patch) => setHomeClub(id ? { id, name: patch.homeTeam, logo_url: patch.logo_url } : null)}
              placeholder="Seleccionar local"
              excludeId={awayClub?.id}
            />
            <ClubPicker
              label="Club visitante *"
              selectedClubId={awayClub?.id || ""}
              onSelect={(id, patch) => setAwayClub(id ? { id, name: patch.homeTeam, logo_url: patch.logo_url } : null)}
              placeholder="Seleccionar visitante"
              excludeId={homeClub?.id}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Hora</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Competencia *</label>
              <input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Liga Profesional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha / jornada</label>
              <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Fecha 1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Estadio</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Estadio" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1"><X size={14} /> Cancelar</button>
          <button onClick={save} disabled={saving || !homeClub || !awayClub || !date || !competition} className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"><Check size={14} /> {saving ? "Guardando..." : "Crear partido"}</button>
        </div>
      </div>
    </div>
  );
}