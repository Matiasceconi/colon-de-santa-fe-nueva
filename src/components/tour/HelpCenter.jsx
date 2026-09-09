import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, Search, ArrowRight, BookOpen,
  Users, Gauge, Heart, HeartPulse, Shirt, Apple, Brain, Binoculars, ClipboardList, Settings2,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { AREAS, MODULES } from "@/lib/areasConfig";
import { moduleLifecycle } from "@/lib/moduleCatalog";
import { GLOBAL_PAGE_TOURS } from "@/lib/globalPageTours";
import { CLUB_DASHBOARD_TOUR, PLAYERS_TOUR, SESSIONS_LIST_TOUR, CALENDAR_TOUR } from "@/lib/pageTours";
import { startPageTour } from "@/components/tour/PageTour";

const OPEN_EVENT = "performancepitch:open-help-center";

export function openHelpCenter() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const AREA_ICONS = { Users, Gauge, Heart, HeartPulse, Shirt, Apple, Brain, Binoculars, ClipboardList, Settings2 };

// Rutas sin operación activa en esta versión (moduleCatalog: status "unavailable"):
// no tiene sentido ofrecerlas en el Centro de Ayuda.
const EXCLUDED_MODULE_IDS = new Set(["mapa_tactico", "plan_semanal", "estado_plantel"]);

// areasConfig.js define módulos independientes sin un área "padre" explícita.
// Esta es la única vista que necesita agruparlos por área para mostrarlos de forma ordenada.
const AREA_BY_MODULE = {
  club_dashboard: "coordinacion_general",
  dashboard: "cuerpo_tecnico",
  sesiones: "cuerpo_tecnico",
  catapult: "rendimiento_fisico",
  partidos: "cuerpo_tecnico",
  rendimiento_dashboard: "rendimiento_fisico",
  carga_externa: "rendimiento_fisico",
  carga_interna: "rendimiento_fisico",
  area_medica: "area_medica",
  kinesiologia: "kinesiologia",
  nutricion: "nutricion",
  minutos_jugados: "rendimiento_fisico",
  evaluaciones: "rendimiento_fisico",
  calendario: "cuerpo_tecnico",
  jugadores: "cuerpo_tecnico",
  gestion_planteles: "administracion",
  cuerpo_tecnico: "cuerpo_tecnico",
  accesos_jugadores: "administracion",
  biblioteca_campo: "cuerpo_tecnico",
  biblioteca_fuerza: "cuerpo_tecnico",
  planes_complementarios: "rendimiento_fisico",
  utileria: "utileria",
  competencias_afa: "cuerpo_tecnico",
  scouting: "scouting",
  gestion_nombres: "administracion",
  guia_jugadores: "administracion",
  configuracion: "administracion",
  identidad_club: "administracion",
  roles_permisos: "administracion",
  diagnostico_plantel: "administracion",
  implementacion: "administracion",
  configuracion_inicial: "administracion",
};

// Reutiliza el contenido ya redactado: las 4 páginas con recorrido dedicado tienen su
// propio primer paso (más específico); el resto usa la guía global de esa ruta.
const DEDICATED_INTRO = {
  "/club-dashboard": CLUB_DASHBOARD_TOUR[0]?.text,
  "/players": PLAYERS_TOUR[0]?.text,
  "/sessions": SESSIONS_LIST_TOUR[0]?.text,
  "/schedule": CALENDAR_TOUR[0]?.text,
};

function synopsisFor(path) {
  return (
    DEDICATED_INTRO[path] ||
    GLOBAL_PAGE_TOURS[path]?.[0]?.text ||
    "Esta pantalla todavía no tiene una guía escrita; podés seguir usándola con normalidad."
  );
}

const HELP_MODULES = MODULES
  .filter((m) => !EXCLUDED_MODULE_IDS.has(m.id) && AREA_BY_MODULE[m.id])
  .map((m) => ({
    ...m,
    areaId: AREA_BY_MODULE[m.id],
    synopsis: synopsisFor(m.path),
    lifecycle: moduleLifecycle(m.id),
  }));

export default function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { canSeePath, isAdmin, allowedPages } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const accessible = useMemo(
    () => HELP_MODULES.filter((m) => canSeePath(m.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSeePath, isAdmin, allowedPages]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accessible;
    return accessible.filter((m) => m.label.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q));
  }, [accessible, query]);

  const grouped = useMemo(() => {
    return AREAS
      .map((area) => ({ area, modules: filtered.filter((m) => m.areaId === area.id) }))
      .filter((g) => g.modules.length > 0);
  }, [filtered]);

  if (!open) return null;

  const goToGuide = (path) => {
    setOpen(false);
    navigate(path);
    // Le da tiempo a la nueva pantalla a montarse (y a su PageTour a suscribirse)
    // antes de disparar el recorrido paso a paso, igual que el autoStart existente.
    window.setTimeout(() => startPageTour(), 1000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-3 sm:items-center sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centro de ayuda"
        className="flex w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <BookOpen size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Centro de Ayuda</p>
              <h2 className="truncate text-base font-black text-white sm:text-lg">Cómo funciona cada pantalla</h2>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar centro de ayuda" className="shrink-0 p-2 text-zinc-500 transition-colors hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-zinc-800 p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar una pantalla (sesiones, GPS, kinesiología...)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {grouped.length === 0 && (
            <p className="py-10 text-center text-sm text-zinc-500">
              {accessible.length === 0 ? "Tu usuario todavía no tiene pantallas habilitadas." : "No encontramos pantallas para esa búsqueda."}
            </p>
          )}
          <div className="space-y-6">
            {grouped.map(({ area, modules }) => {
              const Icon = AREA_ICONS[area.icon] || ClipboardList;
              return (
                <section key={area.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon size={14} className="text-zinc-500" />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{area.name}</h3>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {modules.map((m) => (
                      <div key={m.id} className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">{m.label}</p>
                            {m.lifecycle.status === "legacy" && (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">Legacy</span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-zinc-400">{m.synopsis}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToGuide(m.path)}
                          className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-bold text-blue-400 hover:text-blue-300"
                        >
                          Ver guía visual <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
