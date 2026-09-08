import React from "react";
import { Link } from "react-router-dom";
import {
  Activity, CalendarDays, CheckCircle2, Clock3, ExternalLink, HeartPulse,
  Loader2, MapPin, RefreshCw, ShieldCheck, Trophy, UsersRound,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import {
  YOUTH_CATEGORIES,
  getFixtureIsHome,
  getFixtureRival,
  isClubTeam,
} from "@/components/afa/useCompetitionCenterData";
import { resolveClubShield } from "@/lib/clubShields";

function formatDate(value, compact = false) {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR", compact
    ? { day: "2-digit", month: "short" }
    : { weekday: "long", day: "2-digit", month: "long" });
}

function matchDate(match) {
  return match?.matchDate || match?.date || "";
}

function matchTime(match) {
  return match?.matchTime || match?.time || "";
}

function fixtureRivalSafe(match, aliases) {
  return match ? getFixtureRival(match, aliases) : "";
}

function activeCompetitionKey(activeSquad) {
  const name = String(activeSquad?.name || activeSquad?.squad_name || "").toLowerCase();
  if (name.includes("reserva") || name.includes("proye")) return "reserve";
  if (/4ta|5ta|6ta|7ma|8va|9na|cuarta|quinta|sexta|septima|séptima|octava|novena/.test(name)) return "youth";
  return "senior";
}

function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value + "T12:00:00");
  return Math.ceil((target - today) / 86400000);
}

function TeamMark({ name, url, size = "h-10 w-10" }) {
  const { competitionCenter } = useDashboardData();
  const [failed, setFailed] = React.useState(false);
  const resolved = resolveClubShield(name, url, competitionCenter?.logoMap);
  if (!resolved || failed) {
    const initials = String(name || "?").split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("");
    return (
      <span className={size + " flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[10px] font-black text-zinc-500"}>
        {initials}
      </span>
    );
  }
  return <img src={resolved} alt="" className={size + " shrink-0 object-contain"} onError={() => setFailed(true)} />;
}

function WidgetShell({ icon: Icon, title, subtitle, children, action, className = "" }) {
  const { competitionCenter } = useDashboardData();
  const accent = competitionCenter?.accent || "#3b82f6";
  return (
    <section className={"relative h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-xl shadow-black/10 " + className}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, " + accent + ", transparent)" }} />
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border" style={{ color: accent, borderColor: accent + "44", backgroundColor: accent + "14" }}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CompetitionLink({ label = "Abrir Centro" }) {
  return (
    <Link to="/competencias-afa" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white">
      {label} <ExternalLink size={11} />
    </Link>
  );
}

function SyncButton() {
  const { competitionCenter } = useDashboardData();
  return (
    <button
      type="button"
      onClick={() => competitionCenter.refresh(true)}
      disabled={competitionCenter.loading}
      title="Actualizar competencias"
      className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
    >
      {competitionCenter.loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
    </button>
  );
}

function CompetitionPanel({ label, position, points, detail, next, tone, shield }) {
  const color = tone || "#3b82f6";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ backgroundColor: color + "22" }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamMark name={label} url={shield} size="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-white">{detail}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black leading-none" style={{ color }}>{position || "—"}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-600">{points}</p>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Próximo rival</span>
        <span className="truncate text-xs font-bold text-zinc-200">{next || "Por confirmar"}</span>
      </div>
    </div>
  );
}

export function CompetitionOverviewWidget() {
  const { competitionCenter: center } = useDashboardData();
  const senior = center.senior;
  const reserve = center.reserve;
  const youthRound = center.youth?.nextRounds?.[0];
  const youthPositions = Object.values(center.youth?.positions || {}).filter(Boolean).length;
  return (
    <WidgetShell
      icon={ShieldCheck}
      title="Panorama de Competencias"
      subtitle={center.clubName + " · Temporada " + center.season}
      action={<div className="flex items-center gap-2"><SyncButton /><CompetitionLink /></div>}
    >
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <CompetitionPanel
          label={senior.label || "Plantel superior"}
          position={senior.currentClubRow ? senior.currentClubRow.position + "°" : null}
          points={senior.currentClubRow ? senior.currentClubRow.points + " puntos" : "Sin tabla"}
          detail={senior.currentGroup || "Competencia vigente"}
          next={fixtureRivalSafe(senior.upcoming?.[0], center.aliases)}
          tone={center.accent}
          shield={center.shield}
        />
        <CompetitionPanel
          label="Torneo Proyección"
          position={reserve.currentClubRow ? reserve.currentClubRow.position + "°" : null}
          points={reserve.currentClubRow ? reserve.currentClubRow.points + " puntos" : "Sin tabla"}
          detail={reserve.currentGroup || "Reserva"}
          next={fixtureRivalSafe(reserve.upcoming?.[0], center.aliases)}
          tone="#22c55e"
          shield={center.shield}
        />
        <CompetitionPanel
          label="Juveniles AFA"
          position={youthPositions ? youthPositions + "/6" : null}
          points="categorías con tabla"
          detail="Grandes · 4.ª a 6.ª / Chicas · 7.ª a 9.ª"
          next={youthRound?.rival}
          tone="#f59e0b"
          shield={center.shield}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-5 py-3 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className={center.freshness?.stale ? "text-amber-400" : "text-emerald-400"} /> {center.freshness?.stale ? "Datos disponibles · actualización pendiente" : "Competencias sincronizadas"}</span>
        <span className={center.freshness?.status === "error" ? "text-red-400" : ""}>
          {center.freshness?.lastSuccessAt
            ? "Fuente actualizada " + center.freshness.lastSuccessAt.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
            : center.freshness?.status === "syncing" ? "Sincronizando fuente…" : "Esperando primera sincronización"}
        </span>
      </div>
      {center.freshness?.lastError && (
        <div className="border-t border-red-500/10 bg-red-500/[0.05] px-5 py-2 text-[10px] text-red-300">
          Último intento con error: {center.freshness.lastError}
        </div>
      )}
    </WidgetShell>
  );
}

function YouthCompact({ round, center }) {
  if (!round) return <div className="p-7 text-center text-sm text-zinc-500">No hay una próxima fecha juvenil confirmada.</div>;
  const big = round.fixtures.filter((fixture) => fixture.group === "grandes");
  const small = round.fixtures.filter((fixture) => fixture.group === "chicas");
  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <TeamMark name={round.rival} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-white">{round.rival}</p>
          <p className="mt-1 text-xs text-zinc-500">{formatDate(round.date)} · {round.round || "Fecha"}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["Grandes", big],
          ["Chicas", small],
        ].map(([label, fixtures]) => {
          const isHome = fixtures[0] ? getFixtureIsHome(fixtures[0], center.aliases) : null;
          return (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</p>
              <p className="mt-1 text-sm font-black text-white">{isHome == null ? "Sin definir" : isHome ? "Local" : "Visitante"}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{label === "Grandes" ? "4.ª · 5.ª · 6.ª" : "7.ª · 8.ª · 9.ª"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompetitionNextMatchWidget({ widget, onConfigChange }) {
  const { competitionCenter: center, activeSquad } = useDashboardData();
  const configured = widget.config?.division || "active";
  const division = configured === "active" ? activeCompetitionKey(activeSquad) : configured;
  const match = division === "senior" ? center.senior.upcoming?.[0] : center.reserve.upcoming?.[0];
  const label = division === "senior" ? center.senior.label : division === "reserve" ? "Torneo Proyección" : "Juveniles AFA";

  const controls = (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1">
      {[["senior", "Superior"], ["reserve", "Reserva"], ["youth", "Juveniles"]].map(([key, text]) => (
        <button
          type="button"
          key={key}
          onClick={() => onConfigChange?.({ ...widget.config, division: key })}
          className={"rounded-md px-2 py-1 text-[9px] font-bold transition " + (division === key ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300")}
        >
          {text}
        </button>
      ))}
    </div>
  );

  if (division === "youth") {
    return (
      <WidgetShell icon={CalendarDays} title="Próxima fecha · Juveniles" subtitle="Grandes y Chicas agrupadas" action={controls}>
        <YouthCompact round={center.youth.nextRounds?.[0]} center={center} />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell icon={CalendarDays} title={"Próximo partido · " + label} subtitle={match?.round || "Programación oficial"} action={controls}>
      {match ? (
        <div className="p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0 text-center">
              <TeamMark name={match.homeTeam} url={match.homeLogo} size="mx-auto h-14 w-14" />
              <p className="mt-2 truncate text-sm font-black text-white">{match.homeTeam}</p>
            </div>
            <div className="text-center">
              <span className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] font-black text-zinc-500">VS</span>
            </div>
            <div className="min-w-0 text-center">
              <TeamMark name={match.awayTeam} url={match.awayLogo} size="mx-auto h-14 w-14" />
              <p className="mt-2 truncate text-sm font-black text-white">{match.awayTeam}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-400 sm:grid-cols-2">
            <p className="flex items-center gap-2"><CalendarDays size={13} className="text-zinc-600" /> {formatDate(matchDate(match), true)}</p>
            <p className="flex items-center gap-2"><Clock3 size={13} className="text-zinc-600" /> {matchTime(match) || "Horario por confirmar"}</p>
            <p className="flex items-center gap-2 sm:col-span-2"><MapPin size={13} className="text-zinc-600" /> {match.venue || "Sede por confirmar"}</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-zinc-500">No hay un próximo partido confirmado.</div>
      )}
    </WidgetShell>
  );
}

export function YouthRoundWidget() {
  const { competitionCenter: center } = useDashboardData();
  const round = center.youth.nextRounds?.[0];
  const positions = center.youth.positions || {};
  return (
    <WidgetShell icon={UsersRound} title="Próxima jornada juvenil" subtitle="Una fecha, un rival y dos localías" action={<CompetitionLink label="Ver Juveniles" />}>
      {round ? (
        <div className="grid gap-4 p-4 lg:grid-cols-[.75fr_1.25fr]">
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black/20 p-5">
            <div className="flex items-center gap-4">
              <TeamMark name={round.rival} size="h-16 w-16" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-zinc-600">Próximo rival</p>
                <p className="mt-1 truncate text-xl font-black text-white">{round.rival}</p>
                <p className="mt-1 text-xs text-zinc-500">{round.round || "Fecha"} · {formatDate(round.date)}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-6 gap-1.5">
              {YOUTH_CATEGORIES.map((category) => {
                const row = positions[category.key];
                return (
                  <div key={category.key} className="rounded-lg border border-white/[0.07] bg-white/[0.03] py-2 text-center">
                    <p className="text-[9px] font-bold text-zinc-600">{category.label}</p>
                    <p className="mt-0.5 text-sm font-black text-white">{row ? row.position + "°" : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["Categorías Grandes", "4.ª · 5.ª · 6.ª", "grandes"], ["Categorías Chicas", "7.ª · 8.ª · 9.ª", "chicas"]].map(([title, subtitle, group]) => {
              const fixtures = round.fixtures.filter((fixture) => fixture.group === group);
              const isHome = fixtures[0] ? getFixtureIsHome(fixtures[0], center.aliases) : null;
              return (
                <div key={group} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">{subtitle}</p>
                    </div>
                    <span className={"rounded-full px-2.5 py-1 text-[9px] font-black " + (isHome ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300")}>
                      {isHome == null ? "POR DEFINIR" : isHome ? "LOCAL" : "VISITANTE"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {fixtures.map((fixture) => (
                      <div key={fixture.id || fixture.categoryKey} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                        <span className="text-xs font-black text-zinc-300">{fixture.categoryLabel}</span>
                        <span className="text-[10px] text-zinc-600">{fixture.venue || "Sede por confirmar"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-zinc-500">No hay una próxima jornada juvenil confirmada.</div>
      )}
    </WidgetShell>
  );
}

export function CompetitionTableSnapshotWidget({ widget, onConfigChange }) {
  const { competitionCenter: center } = useDashboardData();
  const division = widget.config?.division || "senior";
  const annual = widget.config?.table === "annual";
  const rows = division === "senior"
    ? (annual ? center.senior?.annualRows : center.senior?.currentRows) || []
    : (annual ? center.reserve?.annualRows : center.reserve?.currentRows) || [];
  const group = division === "senior"
    ? annual ? center.senior?.annualGroup : center.senior?.currentGroup
    : annual ? center.reserve?.annualGroup : center.reserve?.currentGroup;
  const clubRow = rows.find((row) => isClubTeam(row.team || row.teamName, center?.aliases));
  const visibleRows = rows.slice(0, 5);
  if (clubRow && !visibleRows.some((row) => row.id === clubRow.id)) visibleRows.push(clubRow);

  const action = (
    <div className="flex gap-1">
      {[["senior", "Superior"], ["reserve", "Reserva"]].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onConfigChange?.({ ...widget.config, division: key })}
          className={"rounded-lg px-2.5 py-1.5 text-[9px] font-bold " + (division === key ? "bg-white/10 text-white" : "text-zinc-600")}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <WidgetShell icon={Trophy} title="Posiciones" subtitle={group || "Tabla vigente"} action={action}>
      <div className="p-3">
        <div className="grid grid-cols-[34px_1fr_42px_34px] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-zinc-700">
          <span>Pos</span><span>Equipo</span><span className="text-center">Pts</span><span className="text-center">PJ</span>
        </div>
        <div className="space-y-1">
          {visibleRows.map((row) => {
            const mine = isClubTeam(row.team || row.teamName, center.aliases);
            return (
              <div key={row.id || row.team} className={"grid grid-cols-[34px_1fr_42px_34px] items-center rounded-xl border px-3 py-2.5 " + (mine ? "border-blue-500/25 bg-blue-500/[0.08] text-white" : "border-transparent bg-white/[0.025] text-zinc-400")}>
                <span className="text-xs font-black">{row.position}°</span>
                <span className="flex min-w-0 items-center gap-2">
                  <TeamMark name={row.team || row.teamName} url={row.logo_url} size="h-6 w-6" />
                  <span className="truncate text-xs font-bold">{row.team || row.teamName}</span>
                </span>
                <span className="text-center text-xs font-black text-white">{row.points ?? 0}</span>
                <span className="text-center text-xs">{row.played ?? 0}</span>
              </div>
            );
          })}
          {!visibleRows.length && <p className="py-8 text-center text-sm text-zinc-500">Tabla no disponible.</p>}
        </div>
      </div>
    </WidgetShell>
  );
}

export function CompetitionAgendaWidget({ widget, onConfigChange }) {
  const { competitionCenter: center } = useDashboardData();
  const category = widget?.config?.category || "all";
  const FILTERS = [
    { key: "all", label: "Todas" },
    { key: "senior", label: "Primera" },
    { key: "reserve", label: "Reserva" },
    { key: "youth", label: "Juveniles" },
  ];
  const allEntries = [
    ...(center.senior?.upcoming || []).map((match) => ({ cat: "senior", type: center.senior?.label, date: matchDate(match), time: matchTime(match), rival: getFixtureRival(match, center.aliases), home: getFixtureIsHome(match, center.aliases), match })),
    ...(center.reserve?.upcoming || []).map((match) => ({ cat: "reserve", type: "Reserva", date: matchDate(match), time: matchTime(match), rival: getFixtureRival(match, center.aliases), home: getFixtureIsHome(match, center.aliases), match })),
    ...(center.youth?.nextRounds || []).map((round) => ({ cat: "youth", type: "Juveniles", date: round.date, time: "", rival: round.rival, home: null, round })),
  ];
  const entries = allEntries
    .filter((entry) => category === "all" || entry.cat === category)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 6);

  return (
    <WidgetShell icon={CalendarDays} title="Agenda competitiva" subtitle="Próximos compromisos del club" action={<CompetitionLink />}>
      <div className="flex flex-wrap gap-1 border-b border-white/[0.07] px-4 py-2.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => onConfigChange?.({ ...widget?.config, category: f.key })} className={"rounded-lg px-2.5 py-1 text-[10px] font-bold transition " + (category === f.key ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400")}>{f.label}</button>
        ))}
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, index) => (
          <div key={entry.type + entry.date + entry.rival + index} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <div className="min-w-[46px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center">
              <p className="text-lg font-black leading-none text-white">{entry.date ? new Date(entry.date + "T12:00:00").getDate() : "—"}</p>
              <p className="mt-1 text-[8px] font-black uppercase text-zinc-600">{entry.date ? new Date(entry.date + "T12:00:00").toLocaleDateString("es-AR", { month: "short" }) : ""}</p>
            </div>
            <TeamMark name={entry.rival} size="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">{entry.type}</p>
              <p className="mt-0.5 truncate text-xs font-black text-white">{entry.rival || "Rival por confirmar"}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{entry.home == null ? "Jornada juvenil" : entry.home ? "Local" : "Visitante"}{entry.time ? " · " + entry.time : ""}</p>
            </div>
          </div>
        ))}
        {!entries.length && <p className="sm:col-span-2 lg:col-span-3 py-8 text-center text-sm text-zinc-500">No hay partidos próximos cargados.</p>}
      </div>
    </WidgetShell>
  );
}

export function StaffDayCommandWidget() {
  const {
    activeSquad, trainingSessions, playersByStatus, squadStatusTotal,
    activeInjuries, staffLoading, competitionCenter: center, matchDayContext, todayKey,
  } = useDashboardData();
  const today = todayKey;
  const sessions = trainingSessions.filter((session) => session.date === today && (!activeSquad?.id || !session.squad_id || session.squad_id === activeSquad.id));
  const session = sessions[0];
  const todayMatch = matchDayContext?.activeToday;
  const key = activeCompetitionKey(activeSquad);
  const next = key === "reserve" ? center.reserve.upcoming?.[0] : key === "youth" ? center.youth.nextRounds?.[0] : center.senior.upcoming?.[0];
  const nextDate = next?.date || matchDate(next);
  const remaining = daysUntil(nextDate);

  return (
    <WidgetShell icon={Activity} title="Comando del día" subtitle={(activeSquad?.name || "Plantel activo") + " · " + formatDate(today)}>
      {staffLoading ? (
        <div className="h-40 animate-pulse bg-white/[0.02]" />
      ) : (
        <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1.35fr_.65fr_.65fr_.9fr]">
          <div className="bg-zinc-900 p-5">
            <p className={"text-[10px] font-black uppercase tracking-[0.13em] " + (todayMatch ? "text-amber-400" : "text-zinc-600")}>{todayMatch ? "Partido hoy" : "Plan de hoy"}</p>
            <p className="mt-2 text-lg font-black text-white">{todayMatch ? `vs ${todayMatch.rival}` : (session?.title || session?.session_type || "Sin sesión programada")}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-400">
              {todayMatch ? <>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-bold text-amber-300"><Clock3 size={10} className="mr-1 inline" />{todayMatch.match?.matchTime || "Horario por confirmar"}</span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1"><MapPin size={10} className="mr-1 inline" />{todayMatch.isHome ? "Local" : "Visitante"}</span>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-bold text-blue-300">{todayMatch.calledCount || 0} convocados</span>
              </> : <>
                {session?.start_time && <span className="rounded-full bg-white/[0.05] px-2.5 py-1"><Clock3 size={10} className="mr-1 inline" />{session.start_time}</span>}
                {session?.location && <span className="rounded-full bg-white/[0.05] px-2.5 py-1"><MapPin size={10} className="mr-1 inline" />{session.location}</span>}
                {session?.match_day_code && <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-bold text-blue-300">{session.match_day_code}</span>}
              </>}
            </div>
            <Link to={todayMatch?.report?.id ? `/matches/${todayMatch.report.id}?tab=convocados` : todayMatch ? `/matches?date=${today}` : "/sessions"} className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-blue-200">{todayMatch ? "Abrir partido" : "Abrir sesiones"} <ExternalLink size={10} /></Link>
          </div>
          <div className="bg-zinc-900 p-5">
            <UsersRound size={18} className="text-emerald-400" />
            <p className="mt-3 text-3xl font-black text-white">{playersByStatus.disponible || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Disponibles de {squadStatusTotal}</p>
          </div>
          <div className="bg-zinc-900 p-5">
            <HeartPulse size={18} className={activeInjuries.length ? "text-red-400" : "text-emerald-400"} />
            <p className="mt-3 text-3xl font-black text-white">{activeInjuries.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Alertas médicas</p>
          </div>
          <div className="bg-zinc-900 p-5">
            <Trophy size={18} className="text-amber-400" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-zinc-600">Próximo compromiso</p>
            <p className="mt-1 truncate text-sm font-black text-white">{key === "youth" ? next?.rival : fixtureRivalSafe(next, center.aliases) || "Por confirmar"}</p>
            <p className="mt-1 text-xs text-zinc-500">{remaining == null ? "Sin fecha" : remaining === 0 ? "Hoy" : remaining === 1 ? "Mañana" : "En " + remaining + " días"}</p>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}