import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity, Binoculars, BookOpen, CalendarDays, Dumbbell, Gauge, Heart,
  HeartPulse, LayoutDashboard, Menu, Settings2, ShieldCheck, Shirt,
  Trophy, UserRound, UsersRound, Video, X } from
"lucide-react";
import SquadSelector from "@/components/workspace/SquadSelector";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useUserType } from "@/lib/UserTypeContext";
import { ClubShield } from "@/components/staff/ClubChrome";

const NAV_SECTIONS = [
{
  id: "inicio",
  label: "Inicio",
  items: [
  { label: "Tablero del Club", path: "/club-dashboard", icon: ShieldCheck }]

},
{
  id: "cuerpo_tecnico",
  label: "Cuerpo Técnico",
  items: [
  { label: "Tablero del Cuerpo Técnico", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sesiones", path: "/sessions", icon: Video },
  { label: "Partidos", path: "/matches", icon: Trophy },
  { label: "Calendario", path: "/schedule", icon: CalendarDays },
  { label: "Biblioteca de Campo", path: "/field-library", icon: BookOpen },
  { label: "Biblioteca de Fuerza", path: "/strength-library", icon: Dumbbell }]

},
{
  id: "plantel",
  label: "Plantel",
  items: [
  { label: "Jugadores", path: "/players", icon: UsersRound }]

},
{
  id: "rendimiento",
  label: "Rendimiento",
  items: [
  { label: "Tablero de Rendimiento", path: "/performance/dashboard", icon: Activity },
  { label: "Carga externa / GPS", path: "/gps", icon: Gauge },
  { label: "Carga interna", path: "/performance/internal-load", icon: HeartPulse },
  { label: "Evaluaciones", path: "/evaluations", icon: Activity },
  { label: "Planes individuales", path: "/complementary-strength", icon: Dumbbell },
  { label: "Minutos jugados", path: "/performance/minutes", icon: CalendarDays }]

},
{
  id: "salud",
  label: "Salud y Bienestar",
  items: [
  { label: "Área médica", path: "/performance/medical", icon: Heart },
  { label: "Kinesiología", path: "/performance/kinesiology", icon: HeartPulse },
  { label: "Nutrición", path: "/performance/nutrition", icon: HeartPulse }]

},
{
  id: "scouting",
  label: "Scouting & Recruitment",
  items: [
  { label: "Scouting & Recruitment", path: "/scouting", icon: Binoculars }]

},
{
  id: "operaciones",
  label: "Operaciones",
  items: [
  { label: "Utilería", path: "/club-operations/equipment", icon: Shirt }]

},
{
  id: "gestion",
  label: "Gestión del Club",
  items: [
  { label: "Planteles", path: "/squad-manager", icon: UsersRound },
  { label: "Staff / Cuerpo técnico", path: "/team", icon: UsersRound },
  { label: "Accesos de jugadores", path: "/player-access", icon: UserRound },
  { label: "Competencias", path: "/competencias-afa", icon: Trophy },
  { label: "Guía de jugadores", path: "/player-guide", icon: BookOpen }]

},
{
  id: "configuracion",
  label: "Configuración",
  items: [
  { label: "Configuración general", path: "/admin", icon: Settings2 }]

}];


export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const {
    activeAreaName,
    canSeePath,
    requestAreaChange,
    myAreas,
    clubBrand
  } = useWorkspace();
  const { isPlayer } = useUserType();

  const visibleSections = NAV_SECTIONS.
  map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeePath(item.path))
  })).
  filter((section) => section.items.length > 0);

  const activeColor = clubBrand?.colors?.primary || "#2563EB";
  const activeText = clubBrand?.colors?.onPrimary || "#FFFFFF";
  const accent = clubBrand?.colors?.accent || "#60A5FA";

  function isCurrent(path) {
    if (path === "/players") return location.pathname === path || location.pathname.startsWith("/players/");
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-zinc-900 p-2 text-white shadow-xl lg:hidden"
        aria-label="Abrir menú">
        
        <Menu size={18} />
      </button>
      {open &&
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        onClick={() => setOpen(false)} />

      }

      <aside className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-white/10 bg-zinc-950/96 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="relative border-b border-white/10 p-4">
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(circle at 20% 10%, var(--club-primary), transparent 58%)" }} />
          
          <div className="relative flex items-center gap-3">
            <ClubShield className="h-12 w-11 shrink-0 drop-shadow-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-white">
                {clubBrand?.name || "Club"}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
                Powered by PerformancePitch
              </p>
            </div>
          </div>
          <div className="relative mt-3 space-y-2">
            <SquadSelector />
            {myAreas.length > 1 &&
            <button
              type="button"
              onClick={requestAreaChange}
              className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[10px] font-semibold text-zinc-300 transition hover:bg-white/[0.07]">
              
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="truncate">{activeAreaName || "Cambiar área de trabajo"}</span>
              </button>
            }
          </div>
        </div>

        <nav className="space-y-3 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {visibleSections.map((section) =>
          <div key={section.id}>
              <div className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                const active = isCurrent(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${active ? "shadow-lg shadow-black/30" : "text-zinc-400 hover:bg-white/[0.055] hover:text-white"}`}
                    style={active ? { backgroundColor: activeColor, color: activeText } : undefined}>
                    
                      {active &&
                    <span
                      className="absolute -left-1 h-5 w-1 rounded-full"
                      style={{ backgroundColor: accent }} />

                    }
                      <item.icon
                      size={15}
                      className={`shrink-0 ${active ? "" : "text-zinc-600 group-hover:text-zinc-300"}`} />
                    
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>);

              })}
              </div>
            </div>
          )}
        </nav>

        {isPlayer &&
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/98 p-3">
          <Link
            to="/player"
            className="flex w-full items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20">
            
              <UserRound size={15} /> Portal del Jugador
            </Link>
        </div>
        }

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-zinc-500 lg:hidden"
          aria-label="Cerrar menú">
          
          <X size={18} />
        </button>
      </aside>
    </>);

}