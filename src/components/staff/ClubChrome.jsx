import React from "react";
import { Bell, BookOpen, CalendarDays, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { startPageTour } from "@/components/tour/PageTour";
import SquadSelector from "@/components/workspace/SquadSelector";

export const CLUB_NAV_SECTIONS = [
  {
    id: "inicio",
    label: "Inicio",
    items: [
      { label: "Tablero del Club", path: "/club-dashboard" },
    ],
  },
  {
    id: "cuerpo_tecnico",
    label: "Cuerpo Técnico",
    items: [
      { label: "Tablero del Cuerpo Técnico", path: "/dashboard" },
      { label: "Sesiones", path: "/sessions" },
      { label: "Partidos", path: "/matches" },
      { label: "Calendario", path: "/schedule" },
      { label: "Biblioteca de Campo", path: "/field-library" },
      { label: "Biblioteca de Fuerza", path: "/strength-library" },
    ],
  },
  {
    id: "plantel",
    label: "Plantel",
    items: [
      { label: "Jugadores", path: "/players" },
    ],
  },
  {
    id: "rendimiento",
    label: "Rendimiento",
    items: [
      { label: "Tablero de Rendimiento", path: "/performance/dashboard" },
      { label: "Carga externa / GPS", path: "/gps" },
      { label: "Carga interna", path: "/performance/internal-load" },
      { label: "Evaluaciones", path: "/evaluations" },
      { label: "Minutos jugados", path: "/performance/minutes" },
    ],
  },
  {
    id: "salud",
    label: "Salud y Bienestar",
    items: [
      { label: "Área médica", path: "/performance/medical" },
      { label: "Nutrición", path: "/performance/nutrition" },
    ],
  },
  {
    id: "gestion",
    label: "Gestión del Club",
    items: [
      { label: "Planteles", path: "/squad-manager" },
      { label: "Staff / Cuerpo técnico", path: "/team" },
      { label: "Usuarios y accesos", path: "/team" },
      { label: "Accesos de jugadores", path: "/player-access" },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    items: [
      { label: "Configuración general", path: "/admin" },
    ],
  },
];

export function ClubShield({ className = "h-10 w-10", muted = false }) {
  const { clubBrand } = useWorkspace();
  const name = clubBrand?.name || "Club";
  const initials = clubBrand?.shortName || name.slice(0, 4).toUpperCase();
  const logoUrl = clubBrand?.logoUrl;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Escudo de ${name}`}
        className={`${className} object-contain ${muted ? "grayscale brightness-200" : ""}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Identidad de ${name}`}
      className={`${className} flex shrink-0 items-center justify-center rounded-xl border border-white/20 font-black text-white ${muted ? "opacity-50" : "shadow-xl"}`}
      style={{
        background: muted
          ? "rgba(255,255,255,.08)"
          : "linear-gradient(145deg, var(--club-accent), var(--club-primary) 58%, var(--club-primary-dark))",
      }}
    >
      <span className="max-w-full truncate px-1 text-[0.62em]">{initials}</span>
    </div>
  );
}

function currentLabel(pathname) {
  for (const section of CLUB_NAV_SECTIONS) {
    const item = section.items.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
    if (item) return item.label;
  }
  return "Tablero del Club";
}

export function ClubTopHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const { clubBrand, activeSquad } = useWorkspace();
  const label = currentLabel(location.pathname);
  const season = clubBrand?.season || activeSquad?.season || new Date().getFullYear();

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-white/10 bg-zinc-950/88 backdrop-blur-xl lg:left-64">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background: "linear-gradient(90deg, var(--club-primary), var(--club-accent), var(--club-secondary))",
        }}
      />
      <div className="flex h-full items-center justify-between gap-3 px-4 pl-16 sm:px-6 lg:pl-6">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--club-accent)" }}>
            {clubBrand?.name || "Club"}
          </p>
          <h2 className="truncate text-sm font-bold text-white sm:text-base">{label}</h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden min-w-[205px] md:block">
            <SquadSelector />
          </div>
          <span className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 xl:flex">
            <CalendarDays size={14} style={{ color: "var(--club-accent)" }} />
            Temporada {season}
          </span>
          <button
            type="button"
            onClick={startPageTour}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10"
          >
            <BookOpen size={15} style={{ color: "var(--club-accent)" }} />
            <span className="hidden sm:inline">Tutorial</span>
          </button>
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            <Bell size={16} />
          </button>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 pr-2">
            <ClubShield className="h-7 w-7" />
            <span className="hidden max-w-36 truncate text-xs font-semibold text-white xl:block">
              {user?.full_name || user?.email || "Usuario"}
            </span>
            <ChevronDown size={13} className="hidden text-zinc-500 xl:block" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function ClubWatermark() {
  const { clubBrand } = useWorkspace();
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden lg:left-64" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 14%, color-mix(in srgb, var(--club-primary) 18%, transparent), transparent 30%), radial-gradient(circle at 28% 82%, color-mix(in srgb, var(--club-secondary) 10%, transparent), transparent 27%)",
        }}
      />
      {clubBrand?.logoUrl ? (
        <img
          src={clubBrand.logoUrl}
          alt=""
          className="absolute -right-20 top-20 h-[620px] w-[530px] object-contain opacity-[0.025] grayscale brightness-200 sm:right-6 lg:top-12 lg:h-[760px] lg:w-[650px]"
        />
      ) : (
        <div className="absolute -right-10 top-32 opacity-[0.025]">
          <ClubShield muted className="h-[520px] w-[520px] rounded-[110px] text-8xl" />
        </div>
      )}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}