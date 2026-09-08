import React, { useState } from "react";
import { Trophy } from "lucide-react";
import { resolveClubShield } from "@/lib/clubShields";

function TeamShield({ logo, name, logoMap, size = "w-6 h-6" }) {
  const [err, setErr] = useState(false);
  const resolved = resolveClubShield(name, logo, logoMap);
  if (!resolved || err) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
    return (
      <div className={`${size} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0`}>
        <span className="text-[8px] font-bold text-zinc-500">{initials}</span>
      </div>
    );
  }
  return <img src={resolved} alt={name} className={`${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

export default function StandingsCard({ competition, standings, selectedTeam, accentColor, logoMap }) {
  const sorted = [...standings].sort((a, b) => (a.position || 999) - (b.position || 999));
  const clubRow = sorted.find((row) => row.team === selectedTeam);
  const accent = accentColor || "#3b82f6";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}55` }}>
            <Trophy size={18} style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{competition.competition}</h3>
            <p className="text-xs text-zinc-500">Temporada {competition.season}{competition.group ? ` · ${competition.group}` : ""}</p>
          </div>
        </div>
        {clubRow && (
          <div className="text-right">
            <p className="text-3xl font-bold leading-none" style={{ color: accent }}>{clubRow.position}°</p>
            <p className="text-xs text-zinc-500 mt-0.5">{clubRow.points} pts</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
              <th className="px-3 py-2.5 text-left font-semibold w-10">Pos</th>
              <th className="px-3 py-2.5 text-left font-semibold">Equipo</th>
              <th className="px-2 py-2.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-2.5 text-center font-semibold">J</th>
              <th className="px-2 py-2.5 text-center font-semibold hidden sm:table-cell">G</th>
              <th className="px-2 py-2.5 text-center font-semibold hidden sm:table-cell">E</th>
              <th className="px-2 py-2.5 text-center font-semibold hidden sm:table-cell">P</th>
              <th className="px-2 py-2.5 text-center font-semibold hidden sm:table-cell">GF</th>
              <th className="px-2 py-2.5 text-center font-semibold hidden sm:table-cell">GC</th>
              <th className="px-3 py-2.5 text-center font-semibold">DIF</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isClub = row.team === selectedTeam;
              return (
                <tr
                  key={`${row.team}-${row.position}`}
                  className={`border-b border-zinc-800/50 ${isClub ? "" : ""}`}
                  style={isClub ? { backgroundColor: `${accent}1a` } : undefined}
                >
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${isClub ? "text-white" : "text-zinc-400"}`} style={isClub ? { backgroundColor: accent } : { backgroundColor: "#27272a" }}>
                      {row.position}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamShield logo={row.logo_url} name={row.team} logoMap={logoMap} />
                      <span className="font-medium text-white truncate">{row.team}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-white">{row.points}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400">{row.played}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400 hidden sm:table-cell">{row.won}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400 hidden sm:table-cell">{row.drawn}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400 hidden sm:table-cell">{row.lost}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400 hidden sm:table-cell">{row.goalsFor}</td>
                  <td className="px-2 py-2.5 text-center text-zinc-400 hidden sm:table-cell">{row.goalsAgainst}</td>
                  <td className="px-3 py-2.5 text-center font-medium" style={{ color: (row.goalDiff || 0) > 0 ? "#34d399" : (row.goalDiff || 0) < 0 ? "#f87171" : "#a1a1aa" }}>
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}