import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarDays, Clock3, MapPin, Shield, Trophy, UsersRound } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { resolveClubShield } from "@/lib/clubShields";

function zonedNowParts(timezone, now) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  } catch {
    const fallback = new Date(now);
    return {
      year: String(fallback.getFullYear()),
      month: String(fallback.getMonth() + 1).padStart(2, "0"),
      day: String(fallback.getDate()).padStart(2, "0"),
      hour: String(fallback.getHours()).padStart(2, "0"),
      minute: String(fallback.getMinutes()).padStart(2, "0"),
    };
  }
}

function minutesUntilMatch(match, timezone, now) {
  const time = match?.matchTime || match?.time || "";
  if (!/^\d{1,2}:\d{2}/.test(time)) return null;
  const parts = zonedNowParts(timezone, now);
  const [hour, minute] = time.split(":").map(Number);
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  return hour * 60 + minute - currentMinutes;
}

function stateLabel(entry, timezone, now) {
  const match = entry?.match;
  if (!match) return { eyebrow: "PARTIDO", label: "Partido", tone: "neutral" };
  if (match.status === "played" || (match.homeScore != null && match.awayScore != null)) {
    return { eyebrow: "RESULTADO DE HOY", label: "Finalizado", tone: "finished" };
  }
  const diff = minutesUntilMatch(match, timezone, now);
  if (diff == null) return { eyebrow: "PARTIDO HOY", label: "Horario por confirmar", tone: "today" };
  if (diff > 60) return { eyebrow: "PARTIDO HOY", label: `En ${Math.floor(diff / 60)} h ${diff % 60} min`, tone: "today" };
  if (diff > 0) return { eyebrow: "PARTIDO HOY", label: `En ${diff} min`, tone: "urgent" };
  if (diff >= -150) return { eyebrow: "PARTIDO EN CURSO", label: "Partido en desarrollo", tone: "live" };
  return { eyebrow: "PARTIDO DE HOY", label: "Resultado pendiente de actualización", tone: "pending" };
}

function resultText(entry) {
  const match = entry?.match;
  if (!match || match.homeScore == null || match.awayScore == null) return "";
  const own = entry.isHome ? match.homeScore : match.awayScore;
  const rival = entry.isHome ? match.awayScore : match.homeScore;
  return `${own} - ${rival}`;
}

function TeamLogo({ name, url, logoMap, className = "h-12 w-12" }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveClubShield(name, url, logoMap);
  if (!resolved || failed) {
    return <div className={`${className} flex items-center justify-center rounded-xl border border-white/10 bg-black/25`}><Shield size={20} className="text-zinc-500" /></div>;
  }
  return <img src={resolved} alt="" onError={() => setFailed(true)} className={`${className} object-contain`} />;
}

function MatchCard({ entry, compact = false }) {
  const { competitionCenter: center, timezone, playersByStatus, squadStatusTotal, activeInjuries } = useDashboardData();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const state = stateLabel(entry, timezone, now);
  const score = resultText(entry);
  const match = entry.match;
  const homeName = match.homeTeam;
  const awayName = match.awayTeam;
  const matchPath = entry.report?.id ? `/matches/${entry.report.id}?tab=convocados` : `/matches?date=${match.matchDate || match.date}`;
  const position = entry.clubRow?.position ? `${entry.clubRow.position}.º` : "—";
  const points = entry.clubRow?.points != null ? `${entry.clubRow.points} pts` : "";
  const currentGroup = entry.division === "reserve" ? center.reserve?.currentGroup : center.senior?.currentGroup;
  const round = match.round || "Fecha";
  const venue = match.venue || "Sede por confirmar";
  const callupText = entry.report ? `${entry.calledCount} convocados` : "Convocatoria no vinculada";
  const toneClass = {
    urgent: "border-amber-400/35 bg-amber-500/[0.08]",
    live: "border-red-400/35 bg-red-500/[0.08]",
    finished: "border-emerald-400/25 bg-emerald-500/[0.06]",
    pending: "border-orange-400/25 bg-orange-500/[0.06]",
    today: "border-blue-400/25 bg-blue-500/[0.06]",
    neutral: "border-white/10 bg-white/[0.03]",
  }[state.tone] || "border-white/10 bg-white/[0.03]";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${toneClass} p-4 sm:p-5`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{state.eyebrow} · {entry.label}</p>
          <p className="mt-1 text-sm font-black text-white">{state.label}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{score || position}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-500">{score ? `${position} · ${points}` : `${points} · ${currentGroup || "Torneo vigente"}`}</p>
        </div>
      </div>

      <div className={`mt-4 grid items-center gap-3 ${compact ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-[1fr_auto_1fr]"}`}>
        <div className="min-w-0 text-center">
          <TeamLogo name={homeName} url={match.homeLogo} logoMap={center.logoMap} className="mx-auto h-12 w-12 sm:h-14 sm:w-14" />
          <p className="mt-2 truncate text-xs font-black text-white sm:text-sm">{homeName}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">{score ? "Final" : "vs"}</p>
          {score && <p className="mt-1 text-xl font-black text-white">{match.homeScore} - {match.awayScore}</p>}
        </div>
        <div className="min-w-0 text-center">
          <TeamLogo name={awayName} url={match.awayLogo} logoMap={center.logoMap} className="mx-auto h-12 w-12 sm:h-14 sm:w-14" />
          <p className="mt-2 truncate text-xs font-black text-white sm:text-sm">{awayName}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-[10px] text-zinc-400 sm:grid-cols-2 xl:grid-cols-4">
        <span className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-2" title={`Horario local del club · ${timezone}`}><Clock3 size={12} className="text-zinc-600" />{match.matchTime ? `${match.matchTime} · hora del club` : "Horario por confirmar"}</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-2"><CalendarDays size={12} className="text-zinc-600" />{round}</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-2"><MapPin size={12} className="text-zinc-600" />{venue}</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-2"><UsersRound size={12} className="text-zinc-600" />{callupText}</span>
      </div>

      {!compact && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <p className="text-2xl font-black text-emerald-300">{playersByStatus.disponible || 0}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-600">Disponibles de {squadStatusTotal}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <p className="text-2xl font-black text-red-300">{activeInjuries.length}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-600">Alertas médicas</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <p className="text-2xl font-black text-blue-300">{entry.startersCount || 0}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-600">Titulares definidos</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={matchPath} className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[10px] font-black text-zinc-950 transition hover:bg-zinc-200">
          <Trophy size={12} /> {entry.report ? "Abrir partido" : "Ir a Partidos"}
        </Link>
        <Link to="/competencias-afa" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2 text-[10px] font-bold text-zinc-300 transition hover:bg-white/[0.06]">
          Ver competencia
        </Link>
      </div>
    </div>
  );
}

function RecoveryBanner({ entry }) {
  const { activeInjuries, playersByStatus, squadStatusTotal } = useDashboardData();
  const score = resultText(entry);
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] via-zinc-900 to-zinc-900 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"><Activity size={20} /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">MD+1 · Recuperación</p>
            <p className="mt-1 text-base font-black text-white">{entry.label} · vs {entry.rival}{score ? ` · ${score}` : ""}</p>
            <p className="mt-1 text-xs text-zinc-400">Prioridad de hoy: recuperación, disponibilidad y seguimiento médico post partido.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-black/20 px-3 py-2"><p className="text-lg font-black text-white">{playersByStatus.disponible || 0}</p><p className="text-[9px] uppercase text-zinc-600">Disponibles / {squadStatusTotal}</p></div>
          <div className="rounded-xl bg-black/20 px-3 py-2"><p className="text-lg font-black text-red-300">{activeInjuries.length}</p><p className="text-[9px] uppercase text-zinc-600">Médico</p></div>
          <Link to="/sessions" className="col-span-2 rounded-xl bg-emerald-500 px-3 py-2 text-center text-[10px] font-black text-zinc-950 sm:col-span-1">Planificar MD+1</Link>
        </div>
      </div>
    </div>
  );
}

export default function MatchDayPriorityBanner({ dashboardType = "club" }) {
  const { matchDayContext } = useDashboardData();
  const entries = dashboardType === "staff"
    ? (matchDayContext.activeToday ? [matchDayContext.activeToday] : [])
    : (matchDayContext.today || []);

  if (entries.length) {
    return (
      <section className="space-y-3" data-tour="match-day-priority">
        {dashboardType === "club" && entries.length > 1 ? (
          <div className="grid gap-3 xl:grid-cols-2">{entries.map((entry) => <MatchCard key={`${entry.division}-${entry.match.id}`} entry={entry} compact />)}</div>
        ) : (
          <MatchCard entry={entries[0]} compact={dashboardType === "club"} />
        )}
      </section>
    );
  }

  if (dashboardType === "staff" && matchDayContext.activeYesterday) {
    return <RecoveryBanner entry={matchDayContext.activeYesterday} />;
  }

  return null;
}
