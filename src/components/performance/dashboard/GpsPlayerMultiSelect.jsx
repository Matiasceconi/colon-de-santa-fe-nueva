import React, { useMemo, useState } from "react";
import { Check, Search, UserRoundCheck, Users, X } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";

function nameOf(player, row) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || row?.player_name || "Jugador";
}

export default function GpsPlayerMultiSelect({ rows = [], playerMap = {}, selectedPlayerIds = [], onChange }) {
  const [search, setSearch] = useState("");

  const availablePlayers = useMemo(() => {
    const byId = new Map();
    rows.forEach((row) => {
      if (!row.player_id || byId.has(row.player_id)) return;
      const player = playerMap[row.player_id];
      byId.set(row.player_id, {
        id: row.player_id,
        name: nameOf(player, row),
        position: player?.position || row.position || "Sin posición",
        player,
      });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [rows, playerMap]);

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availablePlayers;
    return availablePlayers.filter((player) => `${player.name} ${player.position}`.toLowerCase().includes(query));
  }, [availablePlayers, search]);

  const allSelected = selectedPlayerIds.length === 0;
  const selectedCount = allSelected ? availablePlayers.length : selectedPlayerIds.filter((id) => availablePlayers.some((player) => player.id === id)).length;

  function toggle(id) {
    if (allSelected) {
      onChange([id]);
      return;
    }
    const next = selectedPlayerIds.includes(id)
      ? selectedPlayerIds.filter((playerId) => playerId !== id)
      : [...selectedPlayerIds, id];
    onChange(next.length === availablePlayers.length || next.length === 0 ? [] : next);
  }

  if (!availablePlayers.length) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300"><UserRoundCheck size={19} /></span>
          <div>
            <h3 className="text-sm font-black text-white">Jugadores a visualizar</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{allSelected ? "Se muestran todos los jugadores con datos en las sesiones elegidas." : `${selectedCount} de ${availablePlayers.length} jugadores seleccionados.`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[230px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador o posición..." className="h-9 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-8 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X size={14} /></button>}
          </div>
          <button type="button" onClick={() => onChange([])} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${allSelected ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white"}`}>
            <Users size={14} /> Todos con datos
          </button>
        </div>
      </div>

      <div className="mt-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {visiblePlayers.map((player) => {
          const selected = allSelected || selectedPlayerIds.includes(player.id);
          return (
            <button key={player.id} type="button" onClick={() => toggle(player.id)} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${selected ? "border-cyan-500/35 bg-cyan-500/10 text-white" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"}`}>
              <PlayerPhoto
                player={player.player}
                alt={player.name}
                className={`h-7 w-7 shrink-0 rounded-lg object-cover ${selected ? "border-cyan-400/60" : "border-zinc-700"} border`}
                fallbackClassName={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${selected ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-zinc-700 bg-zinc-800 text-zinc-400"}`}
                textClassName="text-[10px] font-black"
              />
              <span className="min-w-0">
                <span className="block max-w-[170px] truncate text-xs font-bold">{player.name}</span>
                <span className="block max-w-[170px] truncate text-[10px] text-zinc-500">{player.position}</span>
              </span>
              {selected && <Check size={13} className="ml-1 shrink-0 text-cyan-300" />}
            </button>
          );
        })}
        {!visiblePlayers.length && <p className="w-full py-4 text-center text-xs text-zinc-500">No hay jugadores que coincidan con la búsqueda.</p>}
      </div>
    </section>
  );
}