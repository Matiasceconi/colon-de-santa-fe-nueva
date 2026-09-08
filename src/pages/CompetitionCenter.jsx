import React, { useState } from "react";
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, ChevronRight,
  Clock3, Home, Loader2, MapPin, RefreshCw, Shield, Trophy, UsersRound,
} from "lucide-react";
import {
  YOUTH_CATEGORIES,
  getFixtureIsHome,
  getFixtureRival,
  getResultForClub,
  isClubTeam,
  useCompetitionCenterData,
} from "@/components/afa/useCompetitionCenterData";
import { resolveClubShield } from "@/lib/clubShields";

const VIEW_OPTIONS = [
  { id: "senior", label: "Plantel superior", icon: Trophy },
  { id: "reserve", label: "Reserva · Proyección", icon: Shield },
  { id: "youth", label: "Juveniles", icon: UsersRound },
];

function formatDate(value, options = {}) {
  if (!value) return "Fecha por confirmar";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR", {
    weekday: options.compact ? undefined : "long",
    day: "2-digit",
    month: options.compact ? "short" : "long",
    ...options,
  });
}

function groupLabel(value = "") {
  return String(value).replace(/\s*-\s*/g, " · ") || "Tabla general";
}

function TeamLogo({ name, url, logoMap, size = "h-7 w-7" }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveClubShield(name, url, logoMap);
  if (!resolved || failed) {
    const initials = String(name || "?").split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("");
    return (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[9px] font-black text-zinc-500`}>
        {initials}
      </span>
    );
  }
  return <img src={resolved} alt="" className={`${size} shrink-0 object-contain`} onError={() => setFailed(true)} />;
}

function StatusBadge({ result }) {
  const config = {
    W: { label: "G", className: "bg-emerald-500 text-white" },
    D: { label: "E", className: "bg-zinc-600 text-white" },
    L: { label: "P", className: "bg-red-500 text-white" },
  }[result];
  if (!config) return null;
  return <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${config.className}`}>{config.label}</span>;
}

function DataState({ loading, error, refreshedAt, source, onRefresh }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
        {error ? <AlertTriangle size={12} className="text-amber-400" /> : <CheckCircle2 size={12} className="text-emerald-400" />}
        {error || source}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-500">
        <Clock3 size={12} /> {refreshedAt ? refreshedAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "Sin actualizar"}
      </span>
      <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualizar
      </button>
    </div>
  );
}

function CompetitionHeader({ title, subtitle, icon: Icon, accent }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ backgroundColor: `${accent}18`, borderColor: `${accent}44`, color: accent }}>
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function PositionSummary({ clubRow, total, title, group, accent, shield, clubName, upcoming, results, aliases, logoMap }) {
  const next = upcoming?.[0] || null;
  const last = (results || []).slice(0, 5);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo name={clubName} url={shield} logoMap={logoMap} size="h-12 w-12" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{clubName}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{title}{group ? ` · ${groupLabel(group)}` : ""}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black leading-none" style={{ color: accent }}>{clubRow ? `${clubRow.position}°` : "—"}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{total ? `de ${total} equipos` : "Sin posición"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-zinc-800 sm:grid-cols-6">
          {[
            ["PTS", clubRow?.points],
            ["PJ", clubRow?.played],
            ["G", clubRow?.won],
            ["E", clubRow?.drawn],
            ["P", clubRow?.lost],
            ["DIF", clubRow?.goalDiff ?? clubRow?.goalDifference],
          ].map(([label, value]) => (
            <div key={label} className="bg-zinc-900 px-2 py-3 text-center">
              <p className="text-[9px] font-bold uppercase text-zinc-600">{label}</p>
              <p className="mt-0.5 text-lg font-black text-white">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <span className="mr-1 text-xs font-semibold text-zinc-500">Últimos resultados</span>
          {last.length ? last.map((match, index) => <StatusBadge key={match.id || index} result={getResultForClub(match, aliases)} />) : <span className="text-xs text-zinc-600">Sin resultados</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Próximo partido</p>
        {next ? (
          <div className="mt-4">
            <div className="flex items-center gap-4">
              <TeamLogo name={getFixtureRival(next, aliases)} logoMap={logoMap} size="h-12 w-12" />
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">{getFixtureRival(next, aliases)}</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: accent }}>{getFixtureIsHome(next, aliases) ? "LOCAL" : "VISITANTE"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
              <p className="flex items-center gap-2"><CalendarDays size={14} className="text-zinc-600" /> {formatDate(next.matchDate || next.date)}</p>
              {next.matchTime && <p className="flex items-center gap-2"><Clock3 size={14} className="text-zinc-600" /> {next.matchTime}</p>}
              {next.venue && <p className="flex items-center gap-2"><MapPin size={14} className="text-zinc-600" /> {next.venue}</p>}
              {next.round && <p className="text-zinc-600">{next.round}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">No hay un próximo partido confirmado.</div>
        )}
      </div>
    </div>
  );
}

function StandingsTable({ rows, aliases, accent, logoMap, title }) {
  if (!rows?.length) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">No hay una tabla disponible para esta selección.</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h3 className="text-sm font-black text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{rows.length} equipos · el club aparece resaltado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-600">
              <th className="px-4 py-3 text-left">Pos</th>
              <th className="px-3 py-3 text-left">Equipo</th>
              <th className="px-2 py-3 text-center">Pts</th>
              <th className="px-2 py-3 text-center">PJ</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">E</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center">GF</th>
              <th className="px-2 py-3 text-center">GC</th>
              <th className="px-4 py-3 text-center">DIF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const mine = isClubTeam(row.team || row.teamName, aliases);
              const difference = row.goalDiff ?? row.goalDifference ?? 0;
              return (
                <tr key={row.id || `${row.team}-${index}`} className={`border-b border-zinc-800/70 last:border-0 ${mine ? "font-semibold text-white" : "text-zinc-400"}`} style={mine ? { backgroundColor: `${accent}14`, boxShadow: `inset 3px 0 0 ${accent}` } : undefined}>
                  <td className="px-4 py-3 font-black" style={mine ? { color: accent } : undefined}>{row.position}°</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2.5">
                      <TeamLogo name={row.team || row.teamName} url={row.logo_url} logoMap={logoMap} size="h-6 w-6" />
                      <span className="truncate">{row.team || row.teamName}</span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center font-black text-white">{row.points ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.played ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.won ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.drawn ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.lost ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.goalsFor ?? 0}</td>
                  <td className="px-2 py-3 text-center">{row.goalsAgainst ?? 0}</td>
                  <td className="px-4 py-3 text-center">{difference > 0 ? `+${difference}` : difference}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YouthGroup({ title, subtitle, fixtures, aliases, accent }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {fixtures.map((fixture) => {
          const played = fixture.homeScore != null && fixture.awayScore != null;
          const clubScore = getFixtureIsHome(fixture, aliases) ? fixture.homeScore : fixture.awayScore;
          const rivalScore = getFixtureIsHome(fixture, aliases) ? fixture.awayScore : fixture.homeScore;
          return (
            <div key={fixture.id || fixture.categoryKey} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black" style={{ backgroundColor: `${accent}18`, color: accent }}>{fixture.categoryLabel}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white">{getFixtureIsHome(fixture, aliases) ? "Local" : "Visitante"}</p>
                <p className="truncate text-[10px] text-zinc-500">{fixture.venue || "Sede por confirmar"}</p>
              </div>
              {played ? <span className="text-sm font-black text-white">{clubScore}–{rivalScore}</span> : <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-300">PROGRAMADO</span>}
            </div>
          );
        })}
        {!fixtures.length && <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-600">Sin partidos cargados para este grupo.</div>}
      </div>
    </div>
  );
}

function YouthRoundCard({ round, aliases, accent, logoMap }) {
  const big = round.fixtures.filter((fixture) => fixture.group === "grandes");
  const small = round.fixtures.filter((fixture) => fixture.group === "chicas");
  const bigHome = big[0] ? getFixtureIsHome(big[0], aliases) : null;
  const smallHome = small[0] ? getFixtureIsHome(small[0], aliases) : null;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="flex flex-col gap-4 border-b border-zinc-800 bg-zinc-900 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TeamLogo name={round.rival} logoMap={logoMap} size="h-12 w-12" />
          <div>
            <p className="text-lg font-black text-white">{round.rival || "Rival por confirmar"}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{round.round || "Fecha"} · {formatDate(round.date)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          {bigHome != null && <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">4.ª–6.ª · {bigHome ? "LOCAL" : "VISITANTE"}</span>}
          {smallHome != null && <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300">7.ª–9.ª · {smallHome ? "LOCAL" : "VISITANTE"}</span>}
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <YouthGroup title="Categorías Grandes" subtitle="Cuarta · Quinta · Sexta" fixtures={big} aliases={aliases} accent={accent} />
        <YouthGroup title="Categorías Chicas" subtitle="Séptima · Octava · Novena" fixtures={small} aliases={aliases} accent={accent} />
      </div>
    </div>
  );
}

function YouthPositions({ positions, accent }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-black text-white">Posición por categoría</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {YOUTH_CATEGORIES.map((category) => {
          const row = positions[category.key];
          return (
            <div key={category.key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">{category.label}</p>
                <span className="text-xl font-black" style={{ color: accent }}>{row ? `${row.position}°` : "—"}</span>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">{row ? `${row.points} pts · ${row.played} PJ` : "Sin tabla cargada"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CompetitionCenter() {
  const data = useCompetitionCenterData();
  const [view, setView] = useState("senior");
  const [reserveTable, setReserveTable] = useState("current");
  const [seniorTable, setSeniorTable] = useState("current");

  if (data.loading && !data.refreshedAt) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <Loader2 size={30} className="mx-auto animate-spin text-blue-400" />
          <p className="mt-3 text-sm font-bold text-white">Organizando las competencias del club</p>
          <p className="mt-1 text-xs text-zinc-500">Posiciones, próximos rivales y categorías juveniles…</p>
        </div>
      </div>
    );
  }

  const reserveRows = reserveTable === "annual" ? data.reserve.annualRows : data.reserve.currentRows;
  const reserveRow = reserveTable === "annual" ? data.reserve.annualClubRow : data.reserve.currentClubRow;
  const reserveGroup = reserveTable === "annual" ? data.reserve.annualGroup : data.reserve.currentGroup;
  const seniorRows = seniorTable === "annual" ? data.senior.annualRows : data.senior.currentRows;
  const seniorRow = seniorTable === "annual" ? data.senior.annualClubRow : data.senior.currentClubRow;
  const seniorGroup = seniorTable === "annual" ? data.senior.annualGroup : data.senior.currentGroup;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-950 p-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
              {data.shield ? <img src={data.shield} alt="" className="h-12 w-12 object-contain" /> : <Home size={24} className="text-zinc-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Centro de Competencias</p>
              <h1 className="truncate text-xl font-black text-white">{data.clubName}</h1>
              <p className="mt-1 text-xs text-zinc-500">Temporada {data.season} · Primera, Reserva y Juveniles en una sola vista</p>
            </div>
          </div>
          <DataState loading={data.loading} error={data.error} refreshedAt={data.refreshedAt} source={view === "youth" ? data.youth.source : "Datos de competencia cargados"} onRefresh={data.refresh} />
        </div>
        <div className="grid border-t border-zinc-800 sm:grid-cols-3">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = view === option.id;
            const label = option.id === "senior" ? (data.senior.label || option.label) : option.label;
            return (
              <button key={option.id} onClick={() => setView(option.id)} className={`flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 text-left transition sm:border-b-0 sm:border-r last:border-r-0 ${active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300"}`}>
                <span className="flex items-center gap-2 text-sm font-bold"><Icon size={16} style={active ? { color: data.accent } : undefined} /> {label}</span>
                <ChevronRight size={14} className={active ? "text-zinc-400" : "text-zinc-700"} />
              </button>
            );
          })}
        </div>
      </div>

      {view === "senior" && (
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <CompetitionHeader title={data.senior.label || "Plantel superior"} subtitle={seniorGroup ? groupLabel(seniorGroup) : "La división se detecta según la competencia donde participa el club"} icon={Trophy} accent={data.accent} />
            {!!data.senior.annualRows.length && (
              <div className="inline-flex w-fit rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                <button onClick={() => setSeniorTable("current")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${seniorTable === "current" ? "text-white" : "text-zinc-500"}`} style={seniorTable === "current" ? { backgroundColor: `${data.accent}22`, color: data.accent } : undefined}>Torneo vigente</button>
                <button onClick={() => setSeniorTable("annual")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${seniorTable === "annual" ? "text-white" : "text-zinc-500"}`} style={seniorTable === "annual" ? { backgroundColor: `${data.accent}22`, color: data.accent } : undefined}>Tabla anual</button>
              </div>
            )}
          </div>
          <PositionSummary clubRow={seniorRow} total={seniorRows.length} title={data.senior.label} group={seniorGroup} accent={data.accent} shield={data.shield} clubName={data.clubName} upcoming={data.senior.upcoming} results={data.senior.results} aliases={data.aliases} logoMap={data.logoMap} />
          <StandingsTable rows={seniorRows} aliases={data.aliases} accent={data.accent} logoMap={data.logoMap} title={`Tabla · ${data.senior.label}${seniorGroup ? ` · ${groupLabel(seniorGroup)}` : ""}`} />
        </section>
      )}

      {view === "reserve" && (
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <CompetitionHeader title="Torneo Proyección" subtitle="Reserva · torneo vigente y tabla anual separadas" icon={Shield} accent={data.accent} />
            <div className="inline-flex w-fit rounded-lg border border-zinc-800 bg-zinc-900 p-1">
              <button onClick={() => setReserveTable("current")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${reserveTable === "current" ? "text-white" : "text-zinc-500"}`} style={reserveTable === "current" ? { backgroundColor: `${data.accent}22`, color: data.accent } : undefined}>Torneo vigente</button>
              <button onClick={() => setReserveTable("annual")} disabled={!data.reserve.annualRows.length} className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-30 ${reserveTable === "annual" ? "text-white" : "text-zinc-500"}`} style={reserveTable === "annual" ? { backgroundColor: `${data.accent}22`, color: data.accent } : undefined}>Tabla anual</button>
            </div>
          </div>
          <PositionSummary clubRow={reserveRow} total={reserveRows.length} title="Torneo Proyección" group={reserveGroup} accent={data.accent} shield={data.shield} clubName={data.clubName} upcoming={data.reserve.upcoming} results={data.reserve.results} aliases={data.aliases} logoMap={data.logoMap} />
          <StandingsTable rows={reserveRows} aliases={data.aliases} accent={data.accent} logoMap={data.logoMap} title={`Tabla · ${groupLabel(reserveGroup)}`} />
        </section>
      )}

      {view === "youth" && (
        <section className="space-y-5">
          <CompetitionHeader title="Juveniles AFA" subtitle="Una fecha y un rival, con categorías Grandes y Chicas agrupadas" icon={UsersRound} accent={data.accent} />
          <YouthPositions positions={data.youth.positions} accent={data.accent} />
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><CalendarDays size={16} style={{ color: data.accent }} /> Próximas fechas</h3>
            <div className="space-y-4">
              {data.youth.nextRounds.map((round) => <YouthRoundCard key={round.key} round={round} aliases={data.aliases} accent={data.accent} logoMap={data.logoMap} />)}
              {!data.youth.nextRounds.length && <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-600">No hay próximas fechas juveniles cargadas.</div>}
            </div>
          </div>
          {!!data.youth.results.length && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Activity size={16} style={{ color: data.accent }} /> Fechas anteriores</h3>
              <div className="grid gap-3 lg:grid-cols-3">
                {data.youth.results.map((round) => (
                  <div key={round.key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center gap-3">
                      <TeamLogo name={round.rival} logoMap={data.logoMap} size="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{round.rival}</p>
                        <p className="text-[10px] text-zinc-500">{formatDate(round.date, { compact: true })} · {round.round}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {round.fixtures.map((fixture) => (
                        <span key={fixture.id || fixture.categoryKey} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-300">
                          {fixture.categoryLabel} · {fixture.homeScore ?? "—"}-{fixture.awayScore ?? "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-5 text-zinc-400">
        <span className="font-bold text-blue-200">Criterio de la pantalla:</span> el club se obtiene de Configuración; la división superior se reconoce por la tabla donde participa; Proyección separa torneo vigente y anual; Juveniles agrupa por fecha, rival y localía.
      </div>
    </div>
  );
}