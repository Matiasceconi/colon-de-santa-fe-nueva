import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Users, Dumbbell, Goal, LocateFixed, Calendar, Clock, MapPin, Video, FileText, Edit2, Save, X } from "lucide-react";
import SessionVideoPanel from "@/components/sessions/SessionVideoPanel";
import { useWorkspace } from "@/lib/WorkspaceContext";
import moment from "moment";
import SessionPlayerTable from "@/components/sessions/SessionPlayerTable";
import SessionExercises from "@/components/sessions/SessionExercises";
import SessionGPS from "@/components/sessions/SessionGPS";
import SessionStrength from "@/components/sessions/SessionStrength";
import SessionVideoObs from "@/components/sessions/SessionVideoObs";
import SessionVideoLinks from "@/components/sessions/SessionVideoLinks";
import { useToast } from "@/components/ui/use-toast";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { effectiveSessionMeta, getMicrocycleDefaults, SESSION_MD_CODES, invokeRebuildPlanning } from "@/components/planning/microcycleSync";
import SessionObjectivePicker from "@/components/sessions/SessionObjectivePicker";

const SessionReportBuilderModal = React.lazy(() => import("@/reports/builder/SessionReportBuilderModal"));

const MD_CODES = SESSION_MD_CODES;
const OBJECTIVE_OPTS = ["Tensión", "Volumen", "Activación", "Velocidad", "Recuperación", "Otro"];
const PERIOD_OPTIONS = ["Pretemporada", "Competencia", "Transición"];
const OBJECTIVE_COLORS = {
  "Tensión": "bg-red-500/15 text-red-300 border-red-500/30",
  "Volumen": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Activación": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Velocidad": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Recuperación": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Otro": "bg-zinc-500/15 text-zinc-300 border-zinc-600",
};
const PERIOD_COLORS = {
  Pretemporada: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Competencia: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Transición: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function endTimeFrom(startTime, durationMinutes) {
  if (!startTime || !Number.isFinite(Number(durationMinutes))) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const total = hours * 60 + minutes + Number(durationMinutes);
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const TABS = [
  { key: "players",    label: "Plantel del día", icon: Users },
  { key: "exercises",  label: "Campo",       icon: Goal },
  { key: "strength",   label: "Fuerza",      icon: Dumbbell },
  { key: "gps",        label: "GPS",         icon: LocateFixed },
  { key: "video",      label: "Video / Obs.", icon: Video },
];

export default function SessionDetail({ session, onBack, initialTab = "players", autoOpenPDF = false }) {
  const { toast } = useToast();
  const { can } = useWorkspace();
  const canExportReports = can("export", "/sessions");
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [currentSession, setCurrentSession] = useState(session);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [showPDFExport, setShowPDFExport] = useState(autoOpenPDF);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(session);
  const [saving, setSaving] = useState(false);
  const [planDefaults, setPlanDefaults] = useState(null);
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [gpsPlayerIds, setGpsPlayerIds] = useState(new Set());

  useEffect(() => {
    setCurrentSession(session);
    setEditForm(session);
    setTab(initialTab);
    if (autoOpenPDF) setShowPDFExport(true);
     
  }, [session.id, initialTab, autoOpenPDF]);

  const refreshGpsPlayerIds = useCallback(async () => {
    try {
      const rows = await base44.entities.SessionGPSData.filter({ session_id: session.id }, "player_name", 500);
      setGpsPlayerIds(new Set(rows.map((r) => r.player_id).filter(Boolean)));
    } catch { /* ignore */ }
  }, [session.id]);

  useEffect(() => {
    base44.entities.SessionPlayer.filter({ session_id: session.id }, "player_name", 200)
      .then(sp => { setSessionPlayers(sp); setLoading(false); })
      .catch(() => { setLoading(false); });
    refreshGpsPlayerIds();
  }, [session.id, refreshGpsPlayerIds]);

  useEffect(() => {
    base44.entities.PhysicalObjective.list("order", 100).then(rows => {
      setPhysicalObjectives(rows.filter(o => o.active !== false && o.hidden !== true));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDefaults() {
      const match = await getMicrocycleDefaults({ date: currentSession.date, squadId: currentSession.squad_id, seasonId: currentSession.season_id });
      if (cancelled) return;
      setPlanDefaults(match?.values || null);
    }
    if (currentSession?.date) loadDefaults();
    return () => { cancelled = true; };
  }, [currentSession.id, currentSession.date, currentSession.squad_id, currentSession.season_id]);

  async function handleSaveEdit() {
    setSaving(true);
    const dateChanged = editForm.date !== currentSession.date;
    const sessionNumber = Number(editForm.session_number || currentSession.session_number || 1);
    const updatePayload = {
      title: `Sesión ${sessionNumber}`, session_number: sessionNumber, date: editForm.date, period: editForm.period || "Competencia",
      match_day_code: editForm.match_day_code, microcycle_day: editForm.match_day_code,
      session_objective: editForm.session_objective,
      md_manual_override: planDefaults?.match_day_code ? editForm.match_day_code !== planDefaults.match_day_code : !!editForm.match_day_code,
      md_source: planDefaults?.match_day_code
        ? (editForm.match_day_code === planDefaults.match_day_code ? (planDefaults.md_source || "calculated") : "manual_override")
        : (editForm.match_day_code ? "manual_override" : "no_reference_match"),
      physical_objective_manual_override: planDefaults?.session_objective ? editForm.session_objective !== planDefaults.session_objective : false,
      duration_minutes: editForm.duration_minutes,
      start_time: editForm.start_time || "",
      end_time: endTimeFrom(editForm.start_time, editForm.duration_minutes),
      session_type: editForm.session_type || "",
      location: editForm.location,
    };
    let updated = await base44.entities.TrainingSession.update(currentSession.id, updatePayload);
    // Si cambió la fecha, reconstruir la planificación y recargar la sesión con sus nuevos vínculos
    if (dateChanged) {
      try {
        await invokeRebuildPlanning({ squadId: currentSession.squad_id, seasonId: currentSession.season_id || "", mode: "execute" });
        updated = await base44.entities.TrainingSession.get(currentSession.id);
      } catch { /* mantener updated sin recargar */ }
    }
    setCurrentSession(updated);
    setEditForm(updated);
    setEditing(false);
    setSaving(false);
    toast({ title: "✓ Sesión actualizada" });
  }

  const presentRows = sessionPlayers.filter(sp => sp.attendance === "presente");
  const disponibles = presentRows.length;
  const diferenciados = sessionPlayers.filter(sp => sp.attendance === "diferenciado").length;
  const kinesiologia = sessionPlayers.filter(sp => sp.attendance === "kinesiologia").length;
  const noEntrenan = sessionPlayers.filter(sp => ["ausente", "no_entrena"].includes(sp.attendance)).length;
  const enSesion = sessionPlayers.filter(sp => !["ausente", "no_entrena"].includes(sp.attendance)).length;
  const presentesField = presentRows.filter(sp => !isGoalkeeper({ position: sp.position })).length;
  const presentesGK = presentRows.filter(sp => isGoalkeeper({ position: sp.position })).length;
  const periodClass = PERIOD_COLORS[currentSession.period || "Competencia"] || PERIOD_COLORS.Competencia;
  const effectiveMeta = effectiveSessionMeta(currentSession, planDefaults ? { values: planDefaults } : null);
  const sessionForDisplay = { ...currentSession, ...effectiveMeta };
  const objectiveNames = physicalObjectives.map(o => o.name).filter(Boolean);
  const objectiveColorMap = {};
  physicalObjectives.forEach(o => { if (o.name) objectiveColorMap[o.name] = o; });
  const objectiveOptions = [...new Set([...OBJECTIVE_OPTS, ...objectiveNames, planDefaults?.session_objective, editForm.session_objective].filter(Boolean))];
  const objectiveBadge = (() => {
    const name = effectiveMeta.session_objective;
    if (!name) return null;
    const obj = objectiveColorMap[name];
    if (obj?.color) return { style: { backgroundColor: obj.color + "22", color: obj.text_color || obj.color, borderColor: (obj.border_color || obj.color) + "55" }, className: "text-[11px] font-semibold px-2 py-0.5 rounded-full border", name };
    return { className: `text-[11px] font-semibold px-2 py-0.5 rounded-full border ${OBJECTIVE_COLORS[name] || OBJECTIVE_COLORS["Otro"]}`, name };
  })();

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft size={15} /> Volver a sesiones
      </button>

      {/* Header */}
      <div data-tour="session-summary" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Action buttons */}
          <div data-tour="session-actions" className="w-full flex justify-end gap-2 mb-1">
            {!editing && (
              <button
                onClick={() => { setEditForm({ ...currentSession, match_day_code: effectiveMeta.match_day_code, session_objective: effectiveMeta.session_objective }); setEditing(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Edit2 size={12} /> Editar sesión
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <X size={12} /> Cancelar
                </button>
                <button
                  onClick={handleSaveEdit} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  <Save size={12} /> {saving ? "Guardando..." : "Guardar"}
                </button>
              </>
            )}

            <button
              onClick={() => setShowVideoPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 rounded-lg transition-colors"
            >
              <Video size={12} /> Videos
            </button>
            {canExportReports && <button
              onClick={() => setShowPDFExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 rounded-lg transition-colors"
            >
              <FileText size={12} /> Generar informe
            </button>}
          </div>

          {!editing ? (
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${periodClass}`}>
                  {currentSession.period || "Competencia"}
                </span>
                {effectiveMeta.match_day_code && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {effectiveMeta.match_day_code}
                  </span>
                )}
                {objectiveBadge && (
                  <span style={objectiveBadge.style} className={objectiveBadge.className}>
                    {objectiveBadge.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">SESIÓN {currentSession.session_number || currentSession.title?.replace(/[^0-9]/g, "") || "—"}</h1>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Número de sesión</label>
                <input type="number" min={1} value={editForm.session_number || ""} onChange={e => setEditForm(f => ({ ...f, session_number: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                <p className="mt-1 text-[10px] text-zinc-500">Se mostrará como “SESIÓN {editForm.session_number || "—"}”.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Fecha</label>
                  <input type="date" value={editForm.date || ""} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Período</label>
                  <select value={editForm.period || "Competencia"} onChange={e => setEditForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                    {PERIOD_OPTIONS.map(period => <option key={period}>{period}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Código del día (MD)</label>
                  <select value={editForm.match_day_code || ""} onChange={e => setEditForm(f => ({ ...f, match_day_code: e.target.value, microcycle_day: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                    <option value="">Sin referencia</option>
                    {MD_CODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-zinc-500">{planDefaults?.match_day_code ? "Sugerido desde el partido objetivo" : "Sin partido de referencia"}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Objetivo físico</label>
                  <SessionObjectivePicker value={editForm.session_objective || ""} onChange={v => setEditForm(f => ({ ...f, session_objective: v }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Hora de inicio</label>
                  <input type="time" value={editForm.start_time || ""} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Duración (min)</label>
                  <input type="number" value={editForm.duration_minutes || ""} onChange={e => setEditForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Tipo de sesión</label>
                  <input value={editForm.session_type || ""} onChange={e => setEditForm(f => ({ ...f, session_type: e.target.value }))}
                    placeholder="Campo, Campo + Fuerza..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lugar</label>
                  <input value={editForm.location || ""} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                </div>
              </div>

            </div>
          )}
        </div>

        {!editing && (
          <>
            {/* Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Calendar size={12} className="shrink-0" />
                <span>{moment(currentSession.date).format("DD/MM/YYYY")}</span>
              </div>
              {currentSession.squad_name && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Users size={12} className="shrink-0" />
                  <span>{currentSession.squad_name}</span>
                </div>
              )}
              {(currentSession.start_time || currentSession.duration_minutes) && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock size={12} className="shrink-0" />
                  <span>{currentSession.start_time ? `${currentSession.start_time}${currentSession.end_time ? `–${currentSession.end_time}` : ""}` : `${currentSession.duration_minutes} min`}</span>
                </div>
              )}
              {currentSession.location && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <MapPin size={12} className="shrink-0" />
                  <span>{currentSession.location}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: "En sesión", value: enSesion, color: "text-white" },
                { label: "Con el equipo", value: disponibles, color: "text-emerald-400" },
                { label: "Diferenciados", value: diferenciados, color: "text-amber-400" },
                { label: "Kinesiología", value: kinesiologia, color: "text-sky-400" },
                { label: "No entrenan", value: noEntrenan, color: "text-zinc-400" },
                { label: "Arqueros con equipo", value: presentesGK, color: "text-yellow-400" },
                { label: "Campo con equipo", value: presentesField, color: "text-teal-400" },
              ].map(s => (
                <div key={s.label} className="text-center bg-zinc-800/50 rounded-xl p-3">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Video link */}
            {currentSession.video_url && (
              <a href={currentSession.video_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 border-t border-zinc-800 pt-3 w-fit">
                <Video size={13} /> Ver video de la sesión
              </a>
            )}
          </>
        )}
      </div>

      {/* Tabs — scrollable on mobile */}
      <div data-tour="session-tabs" className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: TabIcon }) => (
          <button key={key} data-tour={`session-tab-${key}`} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
            }`}>
            <TabIcon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showVideoPanel && (
        <SessionVideoPanel session={sessionForDisplay} onClose={() => setShowVideoPanel(false)} />
      )}
      {showPDFExport && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80"><div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300">Cargando PerformancePitch Reports…</div></div>}>
          <SessionReportBuilderModal session={sessionForDisplay} sessionPlayers={sessionPlayers} onClose={() => setShowPDFExport(false)} />
        </React.Suspense>
      )}

      {/* Tab content */}
      <div data-tour={`session-${tab}-content`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "players"   && <SessionPlayerTable key={currentSession.id} session={sessionForDisplay} sessionPlayers={sessionPlayers} sessionId={currentSession.id} sessionDate={currentSession.date} sessionSquadId={currentSession.squad_id} onPlayersUpdate={setSessionPlayers} gpsPlayerIds={gpsPlayerIds} />}
            {tab === "exercises" && <SessionExercises session={sessionForDisplay} sessionPlayers={sessionPlayers} />}
            {tab === "strength"  && <SessionStrength session={sessionForDisplay} onSessionUpdate={setCurrentSession} />}
            {tab === "gps"       && <SessionGPS session={sessionForDisplay} sessionPlayers={sessionPlayers} onPlayersUpdate={setSessionPlayers} onGpsImported={refreshGpsPlayerIds} />}
            {tab === "video"     && (
              <div className="space-y-6">
                <SessionVideoObs session={sessionForDisplay} onUpdate={setCurrentSession} />
                <div className="border-t border-zinc-800 pt-5">
                  <SessionVideoLinks session={currentSession} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}