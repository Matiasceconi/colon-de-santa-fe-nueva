import React, { useMemo } from "react";
import moment from "moment";
import { Gift } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

function nextBirthday(player) {
  const birth = moment(player.birth_date, "YYYY-MM-DD", true);
  if (!birth.isValid()) return null;
  const today = moment().startOf("day");
  let next = moment({ year: today.year(), month: birth.month(), day: birth.date() });
  if (next.isBefore(today, "day")) next = next.add(1, "year");
  return { ...player, next, days: next.diff(today, "days"), turns: next.year() - birth.year() };
}

export default function BirthdayWidget() {
  const { birthdayPlayers = [], staffLoading } = useDashboardData();
  const upcoming = useMemo(() => birthdayPlayers.map(nextBirthday).filter(Boolean).sort((a, b) => a.days - b.days).slice(0, 8), [birthdayPlayers]);
  const todayCount = upcoming.filter((player) => player.days === 0).length;
  if (staffLoading) return <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400"><Gift size={16} className={todayCount ? "text-amber-300" : "text-blue-400"} /> Próximos cumpleaños</h2>
      {todayCount > 0 && <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-sm font-bold text-amber-200">Cumpleaños hoy: {todayCount} {todayCount === 1 ? "jugador" : "jugadores"}</div>}
      {upcoming.length ? <div className="grid gap-2 sm:grid-cols-2">
        {upcoming.map((player) => <div key={player.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${player.days === 0 ? "border-amber-400/40 bg-amber-400/10" : "border-zinc-800 bg-zinc-950/50"}`}>
          <PlayerPhoto player={player} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim()}</p><p className="text-[11px] text-zinc-500">{player.categoryName || "Sin categoría"} · cumple {player.turns}</p></div>
          <div className="shrink-0 text-right"><p className={`text-xs font-black ${player.days === 0 ? "text-amber-300" : "text-zinc-300"}`}>{player.days === 0 ? "HOY" : player.next.format("DD MMM")}</p>{player.days > 0 && <p className="text-[10px] text-zinc-600">en {player.days} días</p>}</div>
        </div>)}
      </div> : <p className="py-6 text-center text-sm text-zinc-500">No hay fechas de nacimiento cargadas.</p>}
    </div>
  );
}