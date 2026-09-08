import React, { useState } from "react";
import { Calendar, MapPin, Clock } from "lucide-react";
import moment from "moment";

function normalizeStr(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function TeamShield({ logo, name, logoMap, size = "w-7 h-7" }) {
  const [err, setErr] = useState(false);
  const resolved = logo || logoMap?.[normalizeStr(name)];
  if (!resolved || err) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
    return (
      <div className={`${size} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0`}>
        <span className="text-[9px] font-bold text-zinc-400">{initials}</span>
      </div>
    );
  }
  return <img src={resolved} alt={name} className={`${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

export default function UpcomingMatchList({ matches, selectedTeam, accentColor, logoMap }) {
  const accent = accentColor || "#3b82f6";
  const sorted = [...matches].sort((a, b) => (a.matchDate || "").localeCompare(b.matchDate || ""));

  if (!sorted.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <Calendar size={28} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm font-medium">No hay partidos programados para este club</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((match, i) => {
        const isHome = match.homeTeam === selectedTeam;
        const rival = isHome ? match.awayTeam : match.homeTeam;
        const played = match.status === "played" && (match.homeScore != null || match.awayScore != null);

        return (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-14 shrink-0">
              <span className="text-[10px] uppercase font-bold text-zinc-500">{moment(match.matchDate).format("MMM")}</span>
              <span className="text-2xl font-bold text-white leading-none">{moment(match.matchDate).format("DD")}</span>
            </div>

            <div className="w-px h-12 bg-zinc-800 shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <TeamShield name={isHome ? match.homeTeam : match.awayTeam} logoMap={logoMap} size="w-6 h-6" />
                <span className="text-sm font-bold text-white truncate">{isHome ? match.homeTeam : match.awayTeam}</span>
                <span className="text-zinc-600 text-xs">vs</span>
                <TeamShield name={rival} logoMap={logoMap} size="w-6 h-6" />
                <span className="text-sm font-medium text-zinc-300 truncate">{rival}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: isHome ? `${accent}22` : "#27272a", color: isHome ? accent : "#a1a1aa" }}>
                    {isHome ? "LOCAL" : "VISITANTE"}
                  </span>
                </span>
                {match.category && <span className="text-zinc-400">{match.category}</span>}
                {match.competition && <span className="text-zinc-500 truncate">{match.competition}</span>}
              </div>
            </div>

            <div className="text-right shrink-0">
              {played ? (
                <span className="text-lg font-bold text-white">{match.homeScore} - {match.awayScore}</span>
              ) : (
                <>
                  {match.matchTime && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                      <Clock size={12} /> {match.matchTime}
                    </span>
                  )}
                  {match.venue && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mt-1">
                      <MapPin size={12} /> {match.venue}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}