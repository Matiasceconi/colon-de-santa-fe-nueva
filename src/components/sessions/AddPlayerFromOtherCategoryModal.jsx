import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X, ArrowRightLeft } from "lucide-react";
import { isGoalkeeper } from "@/components/squad/squadConstants";

/**
 * Modal para buscar y agregar a la sesión un jugador de otra categoría.
 * onAdd(player, baseSquadId, baseSquadName) — el padre decide cuándo moverlo.
 */
export default function AddPlayerFromOtherCategoryModal({ date, currentSquadId, excludePlayerIds, onAdd, onClose }) {
  const [players, setPlayers] = useState([]);
  const [squads, setSquads] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [search, setSearch] = useState("");
  const [squadFilter, setSquadFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Player.list("-created_date", 500).catch(() => []),
      base44.entities.Squad.list("name", 100).catch(() => []),
      base44.entities.SquadMembership.filter({ status: "activo" }, "-effective_from", 1000).catch(() => []),
    ]).then(([allPlayers, allSquads, allMemberships]) => {
      const sMap = {};
      allSquads.forEach(s => { sMap[s.id] = s; });
      setSquads(sMap);
      const valid = allMemberships.filter(m => {
        if (m.effective_from && m.effective_from > date) return false;
        if (m.effective_to && m.effective_to < date) return false;
        return true;
      });
      setMemberships(valid);
      setPlayers(allPlayers.filter(p => p.active !== false));
      setLoading(false);
    });
  }, [date]);

  const excludeSet = new Set(excludePlayerIds || []);
  const playerSquadId = {};
  const playerSquadName = {};
  memberships.forEach(m => {
    if (!playerSquadId[m.player_id]) {
      playerSquadId[m.player_id] = m.squad_id;
      playerSquadName[m.player_id] = m.squad_name || squads[m.squad_id]?.name || "";
    }
  });

  const filtered = players.filter(p => {
    const baseSquadId = playerSquadId[p.id];
    if (excludeSet.has(p.id)) return false;
    if (squadFilter && baseSquadId !== squadFilter) return false;
    if (search && !(p.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-blue-400" /> Agregar jugador
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Si el jugador ya entrena hoy en otro plantel, se lo mueve a esta sesión.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3 border-b border-zinc-800">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:outline-none" autoFocus />
          </div>
          <select value={squadFilter} onChange={e => setSquadFilter(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none">
            <option value="">Todos los planteles</option>
            {Object.values(squads).filter(s => s.active !== false).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-6">Sin jugadores disponibles</p>
          ) : filtered.map(p => {
            const baseSquadId = playerSquadId[p.id];
            const baseSquadName = playerSquadName[p.id] || squads[baseSquadId]?.name || "—";
            const gk = isGoalkeeper(p);
            return (
              <button key={p.id} onClick={() => onAdd(p, baseSquadId, baseSquadName)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:border-blue-500/40 hover:bg-blue-500/10 text-left transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.full_name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{p.position} · {baseSquadName}{gk ? " · ARQ" : ""}</p>
                </div>
                <span className="text-[10px] text-blue-400 shrink-0">+ Agregar</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}