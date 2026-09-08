import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMicrocycleDefaults, SESSION_MD_CODES, invokeRebuildPlanning } from "@/components/planning/microcycleSync";
import SessionObjectivePicker from "@/components/sessions/SessionObjectivePicker";
import { useToast } from "@/components/ui/use-toast";
import SessionRosterSelector from "@/components/sessions/SessionRosterSelector";
import { movePlayerFromOtherSession } from "@/components/sessions/sessionRosterUtils";

const MD_CODES = SESSION_MD_CODES;
const PERIOD_OPTIONS = ["Pretemporada", "Competencia", "Transición"];
const SESSION_TYPE_OPTIONS = ["Campo", "Campo + Fuerza", "Gimnasio", "Compensatorio", "Activación", "Readaptación", "Video", "Otro"];

function endTimeFrom(startTime, durationMinutes) {
  if (!startTime || !Number.isFinite(Number(durationMinutes))) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const total = hours * 60 + minutes + Number(durationMinutes);
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function SessionForm({ onCreated, onCancel, nextSessionNumber }) {
  const { activeSquadId, activeSeasonId } = useWorkspace();
  const { toast } = useToast();
  const [squads, setSquads] = useState([]);
  const [form, setForm] = useState({
    title: "", session_number: nextSessionNumber || "", date: moment().format("YYYY-MM-DD"),
    squad_id: activeSquadId || "", period: "Competencia", match_day_code: "",
    duration_minutes: 60, start_time: "", session_type: "Campo", location: "", session_objective: "Volumen", md_override_reason: "",
  });
  const [roster, setRoster] = useState([]);
  const [saving, setSaving] = useState(false);
  const [planDefaults, setPlanDefaults] = useState(null);

  useEffect(() => {
    base44.entities.Squad.list("name", 100).then(sq => {
      const active = sq.filter(s => s.active !== false);
      setSquads(active);
      const defaultId = activeSquadId || (active.length > 0 ? active[0].id : "");
      setForm(f => ({ ...f, squad_id: defaultId }));
    });
  }, [activeSquadId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMicrocycleDefaults() {
      if (!form.squad_id || !form.date) return;
      const squad = squads.find(s => s.id === form.squad_id);
      const match = await getMicrocycleDefaults({ date: form.date, squadId: form.squad_id, seasonId: activeSeasonId || squad?.season });
      if (cancelled) return;
      const defaults = match?.values || null;
      const planId = match?.plan?.id || "";
      const dayId = match?.day?.id || "";
      setPlanDefaults(defaults ? { ...defaults, weekly_plan_id: planId, weekly_plan_day_id: dayId } : null);
      if (defaults) {
        setForm(prev => ({
          ...prev,
          match_day_code: defaults.match_day_code || prev.match_day_code,
          microcycle_day: defaults.microcycle_day || defaults.match_day_code || prev.microcycle_day,
        }));
      }
    }
    loadMicrocycleDefaults();
    return () => { cancelled = true; };
  }, [form.squad_id, form.date, squads.length, activeSeasonId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.squad_id) return;
    setSaving(true);
    const squad = squads.find(s => s.id === form.squad_id);
    const sessionNumber = Number(form.session_number || nextSessionNumber || 1);

    let session;
    try {
      session = await base44.entities.TrainingSession.create({
        ...form,
        title: `Sesión ${sessionNumber}`,
        session_number: sessionNumber,
        microcycle_day: form.match_day_code,
        weekly_plan_id: planDefaults?.weekly_plan_id || "",
        weekly_plan_day_id: planDefaults?.weekly_plan_day_id || "",
        md_manual_override: planDefaults?.match_day_code ? form.match_day_code !== planDefaults.match_day_code : !!form.match_day_code,
        md_source: planDefaults?.match_day_code
          ? (planDefaults.match_day_code === form.match_day_code ? (planDefaults?.md_source || "calculated") : "manual_override")
          : (form.match_day_code ? "manual_override" : "no_reference_match"),
        md_override_reason: "",
        md_reference_match_id: planDefaults?.target_match_id || "",
        md_calculated_at: new Date().toISOString(),
        squad_name: squad?.name || "",
        season_id: activeSeasonId || squad?.season || "",
        end_time: endTimeFrom(form.start_time, form.duration_minutes),
        players_available: roster.filter(r => r.included && r.attendance === "presente").length,
        players_selected: roster.filter(r => r.included).length,
        players_absent: roster.filter(r => r.included && ["ausente", "no_entrena"].includes(r.attendance)).length,
        players_differentiated: roster.filter(r => r.included && r.attendance === "diferenciado").length,
      });
    } catch (error) {
      setSaving(false);
      toast({ title: "Error al crear la sesión", description: error?.message || "Intentá nuevamente", variant: "destructive" });
      return;
    }

    // Mover jugadores de otras categorías: sacarlos de la sesión original del día
    try {
      await Promise.all(
        roster
          .filter(r => r.included && r.baseSquadId && r.baseSquadId !== form.squad_id)
          .map(r => movePlayerFromOtherSession(r.player.id, form.date, session.id).catch(() => null))
      );
    } catch (error) {
      console.error("Error moviendo jugadores de otras categorías:", error);
    }

    // Crear SessionPlayer solamente para quienes forman parte de esta sesión.
    // Desmarcar a una persona significa “no pertenece a esta sesión”, no “ausente”.
    const spRecords = roster.filter(r => r.included).map(r => {
      const status = r.status || "disponible";
      const attendance = r.attendance || "presente";
      return {
        session_id: session.id,
        player_id: r.player.id,
        player_name: r.player.full_name || "",
        position: r.player.position || "",
        squad_name: r.baseSquadName || squad?.name || "",
        status_at_session: status,
        attendance,
        minutes: attendance === "presente" ? (form.duration_minutes || 60) : 0,
      };
    });

    try {
      if (spRecords.length > 0) await base44.entities.SessionPlayer.bulkCreate(spRecords);
    } catch (error) {
      console.error("Error saving session players:", error);
    }

    try {
      const seasonId = activeSeasonId || squad?.season || "";
      await invokeRebuildPlanning({ squadId: form.squad_id, seasonId, mode: "execute" });
      let reloaded = await base44.entities.TrainingSession.get(session.id);

      // Reparación defensiva: si el motor creó el día pero el vínculo no quedó persistido,
      // resolver nuevamente la fecha y vincular la sesión sin duplicar planificación.
      if (!reloaded?.weekly_plan_day_id) {
        const repaired = await getMicrocycleDefaults({ date: form.date, squadId: form.squad_id, seasonId });
        if (repaired?.plan?.id && repaired?.day?.id) {
          reloaded = await base44.entities.TrainingSession.update(session.id, {
            weekly_plan_id: repaired.plan.id,
            weekly_plan_day_id: repaired.day.id,
            plan_sync_updated_at: new Date().toISOString(),
          });
        }
      }

      if (!reloaded?.weekly_plan_day_id) {
        toast({ title: "Sesión creada", description: "La sesión quedó guardada, pero la planificación semanal requiere revisión." });
      }
      // Mantener Cronograma del día conectado sin duplicar la sesión.
      base44.functions.invoke('manageDailySchedule', { action: 'sync', squad_id: form.squad_id, squad_name: squad?.name || '', season_id: seasonId, from: form.date, to: form.date }).catch(() => {});
      setSaving(false);
      onCreated(reloaded || session);
    } catch (error) {
      console.error("Error vinculando planificación de sesión:", error);
      const seasonId = activeSeasonId || squad?.season || "";
      base44.functions.invoke('manageDailySchedule', { action: 'sync', squad_id: form.squad_id, squad_name: squad?.name || '', season_id: seasonId, from: form.date, to: form.date }).catch(() => {});
      setSaving(false);
      onCreated(session);
    }
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }
  function setDateOrSquad(key, val) { setF(key, val); }

  const squad = squads.find(s => s.id === form.squad_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session details */}
      <div data-tour="session-create-basics" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Datos de la sesión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Número de sesión *</label>
            <input required type="number" min={1} value={form.session_number || ""} onChange={e => setF("session_number", e.target.value)}
              placeholder="Ej: 99"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            <p className="mt-1 text-[10px] text-zinc-500">Se mostrará automáticamente como “SESIÓN {form.session_number || nextSessionNumber || "—"}”.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
            <input required type="date" value={form.date} onChange={e => setDateOrSquad("date", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Plantel *</label>
            <select required value={form.squad_id} onChange={e => setDateOrSquad("squad_id", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Período</label>
            <select value={form.period} onChange={e => setF("period", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {PERIOD_OPTIONS.map(period => <option key={period}>{period}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Código del día (MD)</label>
            <select value={form.match_day_code} onChange={e => setF("match_day_code", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              <option value="">Sin referencia</option>
              {MD_CODES.map(m => <option key={m}>{m}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-zinc-500">{planDefaults?.target_match_id ? "Sugerido desde el partido objetivo" : "Sin partido de referencia en el microciclo"}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Hora de inicio</label>
            <input type="time" value={form.start_time || ""} onChange={e => setF("start_time", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            <p className="mt-1 text-[10px] text-zinc-500">{form.start_time ? `Final estimado: ${endTimeFrom(form.start_time, form.duration_minutes) || "—"}` : "Opcional, útil para calendario y portal jugador"}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Duración (min)</label>
            <input type="number" min={0} value={form.duration_minutes} onChange={e => setF("duration_minutes", parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tipo de sesión</label>
            <select value={form.session_type || "Campo"} onChange={e => setF("session_type", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {SESSION_TYPE_OPTIONS.map(type => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Objetivo físico</label>
            <SessionObjectivePicker value={form.session_objective || ""} onChange={v => setF("session_objective", v)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Lugar</label>
            <input value={form.location} onChange={e => setF("location", e.target.value)}
              placeholder="Campo 1, Gimnasio..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      </div>

      {/* Player roster with inline status */}
      <div data-tour="session-create-players"><SessionRosterSelector squadId={form.squad_id} date={form.date} squadName={squad?.name || ""} onChange={setRoster} /></div>

      {/* Actions */}
      <div data-tour="session-create-actions" className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !form.squad_id}
          className="px-5 py-2 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
          {saving ? "Creando..." : "Crear sesión"}
        </button>
      </div>
    </form>
  );
}