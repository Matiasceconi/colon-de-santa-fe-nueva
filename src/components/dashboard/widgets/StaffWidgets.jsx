import React from "react";
import SessionDayMap from "@/components/sessions/SessionDayMap";
import DayScheduleAgenda from "@/components/dashboard/DayScheduleAgenda";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { Dumbbell, Users, HeartPulse, Link2, Calendar, Activity, Map as MapIcon, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";

export function StaffDayScheduleWidget() {
  const {
    todayCalendarEvents, tomorrowCalendarEvents, todayKey, tomorrowKey,
    timezone, refreshStaffData, staffLoading,
  } = useDashboardData();

  if (staffLoading) return <div className="h-64 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />;

  return (
    <DayScheduleAgenda
      todayEvents={todayCalendarEvents || []}
      tomorrowEvents={tomorrowCalendarEvents || []}
      todayDate={todayKey}
      tomorrowDate={tomorrowKey}
      timezone={timezone}
      onRefresh={refreshStaffData}
    />
  );
}

const WELLNESS_LEVELS = {
  red: { label: "Roja", rank: 4, dot: "bg-red-500", badge: "border-red-500/25 bg-red-500/10 text-red-300" },
  orange: { label: "Naranja", rank: 3, dot: "bg-orange-500", badge: "border-orange-500/25 bg-orange-500/10 text-orange-300" },
  yellow: { label: "Amarilla", rank: 2, dot: "bg-yellow-500", badge: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300" },
  green: { label: "Verde", rank: 1, dot: "bg-emerald-500", badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" },
};

function PlayerAvatar({ row }) {
  if (row.photo_url) return <img src={row.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />;
  const initials = String(row.player_name || "J").split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("");
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-zinc-400">{initials}</span>;
}

export function WellnessPriorityWidget({ widget }) {
  const { wellnessSummary, staffLoading, activeSquad } = useDashboardData();
  const threshold = widget?.config?.threshold || "orange";
  const limit = Math.max(3, Math.min(12, Number(widget?.config?.limit || 6)));
  const thresholdRank = WELLNESS_LEVELS[threshold]?.rank || WELLNESS_LEVELS.orange.rank;
  const alerts = (wellnessSummary?.alerts || [])
    .filter((row) => (WELLNESS_LEVELS[row.alert_level]?.rank || 0) >= thresholdRank)
    .slice(0, limit);

  if (staffLoading) return <div className="h-52 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />;

  return (
    <section data-tour="staff-wellness" className="h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300"><AlertTriangle size={17} /></span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white">Wellness prioritario</h2>
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{activeSquad?.name || "Plantel activo"} · alertas del día</p>
          </div>
        </div>
        <Link to="/performance/internal-load" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white">
          Abrir <ExternalLink size={11} />
        </Link>
      </div>

      <div className="p-4">
        {alerts.length ? (
          <div className="space-y-2">
            {alerts.map((row) => {
              const level = WELLNESS_LEVELS[row.alert_level] || WELLNESS_LEVELS.yellow;
              const reasons = Array.isArray(row.alert_reasons) ? row.alert_reasons : [];
              return (
                <div key={row.id || row.player_id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-2.5">
                  <PlayerAvatar row={row} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{row.player_name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">{reasons[0] || "Revisar respuesta de Wellness"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black ${level.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${level.dot}`} />{level.label}</span>
                    {row.wellness_score != null && <p className="mt-1 text-[9px] text-zinc-600">Score {Number(row.wellness_score).toFixed(1)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity size={24} className="text-emerald-400" />
            <p className="mt-2 text-sm font-bold text-zinc-300">Sin alertas en este nivel</p>
            <p className="mt-1 text-[10px] text-zinc-600">Podés bajar el umbral desde la configuración del widget.</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 text-[10px] text-zinc-500">
        <span>{wellnessSummary?.answered || 0}/{wellnessSummary?.total || 0} respuestas</span>
        <span>{wellnessSummary?.missing?.length || 0} pendientes</span>
      </div>
    </section>
  );
}

export function TrainingTodayWidget() {
  const { trainingSessions, staffLoading } = useDashboardData();
  const today = moment().format("YYYY-MM-DD");
  const todaySessions = (trainingSessions || []).filter((s) => s.date === today);
  const upcoming = (trainingSessions || []).filter((s) => s.date > today).slice(0, 3);
  const display = todaySessions.length ? todaySessions : upcoming;

  if (staffLoading) return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse h-32" />;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Dumbbell size={16} className="text-blue-400" /> {todaySessions.length ? "Entrenamientos de Hoy" : "Próximos Entrenamientos"}
      </h2>
      {display.length ? (
        <div className="space-y-2">
          {display.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Calendar size={14} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.title || s.session_type || "Entrenamiento"}</p>
                <p className="text-xs text-zinc-500">{moment(s.date).format("DD MMM")} · {s.start_time || s.time || "—"}</p>
              </div>
              {s.squad_name && <span className="text-[10px] text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded-full shrink-0">{s.squad_name}</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm text-center py-6">No hay entrenamientos programados.</p>
      )}
    </div>
  );
}

const STATUS_CONFIG = [
  { key: "disponible", label: "Disponibles", dotClass: "bg-emerald-500" },
  { key: "lesionado", label: "Lesionados", dotClass: "bg-red-500" },
  { key: "en_recuperacion", label: "En Recuperación", dotClass: "bg-yellow-500" },
  { key: "suspendido", label: "Suspendidos", dotClass: "bg-orange-500" },
];

export function SquadStatusWidget() {
  const { playersByStatus, squadStatusTotal, todaySessionPlayers, staffLoading } = useDashboardData();
  if (staffLoading) return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse h-32" />;

  const total = squadStatusTotal;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Users size={16} className="text-emerald-400" /> Estado del Plantel
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {STATUS_CONFIG.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <div className={`w-2.5 h-2.5 rounded-full ${s.dotClass} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold text-white leading-tight">{playersByStatus[s.key] || 0}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">{todaySessionPlayers.length > 0 ? "En la sesión de hoy" : "Total jugadores"}</span>
        <span className="text-sm font-bold text-white">{total}</span>
      </div>
    </div>
  );
}

const INJURY_STYLE = {
  lesionado: { bar: "bg-red-500", badge: "bg-red-500/15 text-red-300" },
  en_recuperacion: { bar: "bg-yellow-500", badge: "bg-yellow-500/15 text-yellow-300" },
  kinesiologia: { bar: "bg-orange-500", badge: "bg-orange-500/15 text-orange-300" },
  seguimiento: { bar: "bg-blue-500", badge: "bg-blue-500/15 text-blue-300" },
};

const INJURY_LABEL = {
  lesionado: "Lesionado",
  en_recuperacion: "En recuperación",
  kinesiologia: "Kinesiología",
  seguimiento: "Seguimiento",
};

export function InjuriesWidget() {
  const { activeInjuries, staffLoading } = useDashboardData();
  if (staffLoading) return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse h-32" />;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <HeartPulse size={16} className="text-red-400" /> Lesiones y Seguimientos
      </h2>
      {activeInjuries.length ? (
        <div className="space-y-2">
          {activeInjuries.slice(0, 6).map((m) => {
            const style = INJURY_STYLE[m.status] || INJURY_STYLE.lesionado;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
                <div className={`w-2 h-8 rounded-full ${style.bar} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.player_name || "Jugador"}</p>
                  <p className="text-xs text-zinc-500 truncate">{INJURY_LABEL[m.status] || m.status}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
                  {INJURY_LABEL[m.status] || m.status}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Activity size={24} className="text-emerald-400" />
          <p className="text-zinc-400 text-sm text-center">Sin lesiones activas</p>
        </div>
      )}
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Sesiones", path: "/sessions", icon: Dumbbell },
  { label: "Jugadores", path: "/players", icon: Users },
  { label: "Calendario", path: "/schedule", icon: Calendar },
  { label: "Partidos", path: "/matches", icon: Activity },
  { label: "Competencias", path: "/competencias-afa", icon: Calendar },
  { label: "GPS", path: "/gps", icon: Activity },
];

export function QuickLinksWidget() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Link2 size={16} className="text-blue-400" /> Accesos Rápidos
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.path}
            to={l.path}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors group"
          >
            <l.icon size={20} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SessionDayMapWidget() {
  const { todaySessionPlayers, trainingSessions, players, staffLoading } = useDashboardData();
  const today = moment().format("YYYY-MM-DD");
  const todaySession = (trainingSessions || []).find((s) => s.date === today);

  const playerPhotos = {};
  (players || []).forEach((p) => { if (p.photo_url) playerPhotos[p.id] = p.photo_url; });

  if (staffLoading) return <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse h-48" />;

  if (!todaySession || todaySessionPlayers.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <MapIcon size={16} className="text-emerald-400" /> Mapa del Día
        </h2>
        <p className="text-zinc-500 text-sm text-center py-6">No hay sesión creada para hoy. Creá una sesión en Sesiones para ver el mapa del día.</p>
      </div>
    );
  }

  return <SessionDayMap players={todaySessionPlayers} playerPhotos={playerPhotos} session={todaySession} />;
}