import React, { useState, useEffect } from "react";
import { Users, Search, Plus, CheckSquare, Square, HeartPulse, Activity, UserX, RotateCcw } from "lucide-react";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { loadSquadRoster } from "./sessionRosterUtils";
import AddPlayerFromOtherCategoryModal from "./AddPlayerFromOtherCategoryModal";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_OPTIONS,
  SESSION_STATUS_OPTIONS,
  STATUS_LABELS,
  defaultAttendanceForStatus,
} from "./sessionPlayerUtils";

const ATTENDANCE_TONE = {
  presente: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  diferenciado: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  kinesiologia: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  ausente: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
  no_entrena: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

/**
 * Selector del plantel para crear una sesión.
 * Separa dos conceptos:
 * - status: contexto previo del jugador ese día.
 * - attendance: trabajo asignado para esta sesión.
 * El checkbox indica si la persona forma parte de la sesión; desmarcar no equivale a ausente.
 */
export default function SessionRosterSelector({ squadId, date, squadName, onChange }) {
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!squadId || !date) return;
    let cancelled = false;
    setLoading(true);
    loadSquadRoster(squadId, date).then(rows => {
      if (cancelled) return;
      const mapped = rows.map(({ player, baseSquadId, baseSquadName, suggestedStatus, suggestedAttendance, statusSource }) => ({
        player,
        baseSquadId: baseSquadId || squadId,
        baseSquadName: baseSquadName || squadName || "",
        status: suggestedStatus || "disponible",
        attendance: suggestedAttendance || "presente",
        statusSource: statusSource || "Predeterminado",
        included: true,
      }));
      setRoster(mapped);
      onChange?.(mapped);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [squadId, date, squadName, onChange]);

  function update(next) { setRoster(next); onChange?.(next); }
  function setStatus(playerId, status) {
    update(roster.map(r => r.player.id === playerId
      ? { ...r, status, attendance: defaultAttendanceForStatus(status), statusSource: "Staff" }
      : r));
  }
  function setAttendance(playerId, attendance) {
    update(roster.map(r => r.player.id === playerId ? { ...r, attendance, statusSource: r.statusSource } : r));
  }
  function toggleIncluded(playerId) { update(roster.map(r => r.player.id === playerId ? { ...r, included: !r.included } : r)); }
  function includeWholeSquad() { update(roster.map(r => ({ ...r, included: true }))); }
  function selectAllAvailable() { update(roster.map(r => ({ ...r, included: r.attendance === "presente" }))); }
  function clearSelection() { update(roster.map(r => ({ ...r, included: false }))); }
  function resetSuggestions() {
    update(roster.map(r => ({ ...r, status: r.status, attendance: defaultAttendanceForStatus(r.status), included: true })));
  }

  function handleAddFromOther(player, baseSquadId, baseSquadName) {
    if (roster.some(r => r.player.id === player.id)) { setShowAddModal(false); return; }
    update([...roster, {
      player,
      baseSquadId,
      baseSquadName,
      status: "disponible",
      attendance: "presente",
      statusSource: "Staff",
      included: true,
    }]);
    setShowAddModal(false);
  }

  const allPositions = [...new Set(roster.map(r => r.player.position).filter(Boolean))];
  const filtered = roster.filter(({ player }) => {
    if (search && !(player.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (posFilter && player.position !== posFilter) return false;
    return true;
  });

  const included = roster.filter(r => r.included);
  const withTeam = included.filter(r => r.attendance === "presente");
  const differentiated = included.filter(r => r.attendance === "diferenciado");
  const kinesio = included.filter(r => r.attendance === "kinesiologia");
  const absent = included.filter(r => ["ausente", "no_entrena"].includes(r.attendance));
  const fieldWithTeam = withTeam.filter(r => !isGoalkeeper(r.player)).length;
  const gkWithTeam = withTeam.filter(r => isGoalkeeper(r.player)).length;

  const sections = [
    { key: "team", title: "Trabajo con el equipo", tone: "text-emerald-400", rows: filtered.filter(r => r.attendance === "presente") },
    { key: "diff", title: "Trabajo diferenciado", tone: "text-amber-400", rows: filtered.filter(r => r.attendance === "diferenciado") },
    { key: "kin", title: "Kinesiología", tone: "text-sky-400", rows: filtered.filter(r => r.attendance === "kinesiologia") },
    { key: "out", title: "No entrenan / ausentes", tone: "text-zinc-500", rows: filtered.filter(r => ["ausente", "no_entrena"].includes(r.attendance)) },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users size={15} className="text-zinc-400" /> Plantel del día
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">Definí quién forma parte de la sesión y qué trabajo realizará. Desmarcar a un jugador no lo registra como ausente.</p>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="text-xs px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/25 flex items-center gap-1">
          <Plus size={12} /> Otra categoría
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Summary icon={Users} label="En sesión" value={included.length} tone="text-white" />
        <Summary icon={Activity} label="Con el equipo" value={withTeam.length} detail={`Campo ${fieldWithTeam} · ARQ ${gkWithTeam}`} tone="text-emerald-300" />
        <Summary icon={RotateCcw} label="Diferenciado" value={differentiated.length} tone="text-amber-300" />
        <Summary icon={HeartPulse} label="Kinesiología" value={kinesio.length} tone="text-sky-300" />
        <Summary icon={UserX} label="No entrenan" value={absent.length} tone="text-zinc-300" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={includeWholeSquad} className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700">Todo el plantel</button>
        <button type="button" onClick={selectAllAvailable} className="text-xs px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/25">Solo con el equipo</button>
        <button type="button" onClick={resetSuggestions} className="text-xs px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-lg hover:bg-sky-500/20">Reaplicar sugerencias</button>
        <button type="button" onClick={clearSelection} className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-500 rounded-lg hover:text-zinc-300">Limpiar selección</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none" />
        </div>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
          <option value="">Todas las posiciones</option>
          {allPositions.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {sections.map(section => section.rows.length > 0 && (
            <div key={section.key}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${section.tone}`}>{section.title} ({section.rows.filter(r => r.included).length}/{section.rows.length})</p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {section.rows.map(r => <RosterRow key={r.player.id} r={r} onToggle={() => toggleIncluded(r.player.id)} onStatus={s => setStatus(r.player.id, s)} onAttendance={a => setAttendance(r.player.id, a)} />)}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-zinc-600 text-xs text-center py-8">No hay jugadores que coincidan con los filtros.</p>}
        </div>
      )}

      {showAddModal && (
        <AddPlayerFromOtherCategoryModal date={date} currentSquadId={squadId} excludePlayerIds={roster.map(r => r.player.id)} onAdd={handleAddFromOther} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value, detail, tone }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500"><Icon size={11} />{label}</div>
    <p className={`text-xl font-black mt-0.5 ${tone}`}>{value}</p>
    {detail && <p className="text-[9px] text-zinc-600 mt-0.5">{detail}</p>}
  </div>;
}

function RosterRow({ r, onToggle, onStatus, onAttendance }) {
  const { player, status, attendance, included } = r;
  return (
    <div className={`grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_135px_140px] items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${included ? "bg-zinc-800/60 border-zinc-700" : "bg-zinc-950/40 border-zinc-800 opacity-55"}`}>
      <button type="button" onClick={onToggle} className="shrink-0" title={included ? "Quitar de esta sesión" : "Agregar a esta sesión"}>
        {included ? <CheckSquare size={15} className="text-emerald-400" /> : <Square size={15} className="text-zinc-600" />}
      </button>
      <div className="min-w-0">
        <PlayerAvatar player={player} size="sm" showName className="min-w-0" />
        <p className="text-[9px] text-zinc-500 mt-1 ml-10 truncate">{player.position || "Sin posición"}{r.baseSquadName ? ` · ${r.baseSquadName}` : ""} · {r.statusSource || "Staff"}</p>
      </div>
      <div className="sm:block col-span-2 sm:col-span-1">
        <label className="text-[9px] uppercase tracking-wide text-zinc-600 block mb-1">Estado previo</label>
        <select value={status} onChange={e => onStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none">
          {SESSION_STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="text-[9px] uppercase tracking-wide text-zinc-600 block mb-1">Trabajo del día</label>
        <select value={attendance} onChange={e => onAttendance(e.target.value)} className={`w-full rounded-lg border px-2 py-1.5 text-[10px] font-semibold focus:outline-none ${ATTENDANCE_TONE[attendance] || ATTENDANCE_TONE.no_entrena}`}>
          {ATTENDANCE_OPTIONS.map(a => <option key={a} value={a} className="bg-zinc-900 text-white">{ATTENDANCE_LABELS[a]}</option>)}
        </select>
      </div>
    </div>
  );
}
