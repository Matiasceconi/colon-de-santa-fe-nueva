import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, ClipboardList, Users, Clock, Activity, Video, UserRound,
  ChevronRight, ChevronDown, MapPin, Calendar, Sparkles, ArrowRight, Database,
} from "lucide-react";
import {
  DEMO_MATCH_FLOW_MATCH, DEMO_MATCH_FLOW_SOURCES, DEMO_MATCH_FLOW_STAGES,
  DEMO_MATCH_FLOW_DETAILS,
} from "@/lib/demoMatchFlowData";

const ICONS = { Trophy, ClipboardList, Users, Clock, Activity, Video, UserRound };

function fmtMatchDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function StageNode({ stage, active, onClick }) {
  const Icon = ICONS[stage.icon];
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2 w-full lg:w-32 shrink-0 p-3 rounded-xl border transition-all ${
        active
          ? "bg-blue-600/15 border-blue-500 text-white"
          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
      }`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${active ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 group-hover:text-white"}`}>
        <Icon size={18} />
      </span>
      <span className="text-xs font-semibold text-center leading-tight">{stage.label}</span>
    </button>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center shrink-0 text-zinc-700">
      <ChevronRight size={18} className="hidden lg:block" />
      <ChevronDown size={18} className="lg:hidden" />
    </div>
  );
}

function DetailPanel({ stageId }) {
  const d = DEMO_MATCH_FLOW_DETAILS[stageId];
  if (!d) return null;
  const explanationTitle = d.detailTitle || d.headline;
  const explanationText = d.detailText || d.text;

  return (
    <motion.div
      key={stageId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5"
    >
      <div className="grid md:grid-cols-2 gap-5">
        {/* Contenido específico de la etapa */}
        <div>
          <h4 className="text-white font-bold text-base mb-1">{d.headline}</h4>
          {d.sub && <p className="text-sm text-blue-300 font-medium mb-3">{d.sub}</p>}

          {d.chips && (
            <div className="flex flex-wrap gap-2 mt-3">
              {d.chips.map((c) => (
                <span key={c} className="inline-flex items-center h-7 px-2.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">{c}</span>
              ))}
            </div>
          )}

          {d.avatars && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from({ length: d.avatars }).map((_, i) => (
                <span key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <UserRound size={12} className="text-zinc-400" />
                </span>
              ))}
            </div>
          )}

          {d.stats && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {d.stats.map((s) => (
                <div key={s.k} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{s.k}</p>
                  <p className="text-white font-bold text-sm">{s.v}</p>
                </div>
              ))}
            </div>
          )}

          {d.lines && (
            <ul className="mt-3 space-y-1.5">
              {d.lines.map((l) => (
                <li key={l} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {l}
                </li>
              ))}
            </ul>
          )}

          {d.metrics && (
            <div className="space-y-2 mt-3">
              {d.metrics.map((m) => (
                <div key={m.k} className="flex items-center justify-between rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
                  <span className="text-xs text-zinc-400">{m.k}</span>
                  <span className="text-sm font-bold text-white tabular-nums">{m.v}</span>
                </div>
              ))}
              {d.source && (
                <p className="inline-flex items-center gap-1 text-[11px] text-emerald-300 mt-1">
                  <Database size={11} /> {d.source}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Explicación comercial */}
        <div className="md:border-l md:border-zinc-800 md:pl-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-blue-400" />
            <h5 className="text-white font-semibold text-sm">{explanationTitle}</h5>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{explanationText}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DemoMatchFlow() {
  const [expanded, setExpanded] = useState(false);
  const [activeStage, setActiveStage] = useState("partido");
  const m = DEMO_MATCH_FLOW_MATCH;

  return (
    <div className="bg-gradient-to-br from-blue-600/10 via-zinc-900 to-zinc-900 border border-blue-500/20 rounded-2xl p-5 sm:p-6">
      {/* Encabezado */}
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Un partido conecta todo el trabajo del club.</h2>
        <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl">
          Desde que aparece en el calendario hasta el análisis posterior, cada partido puede conectar información de diferentes áreas dentro de PerformancePitch.
        </p>
      </div>

      {/* Partido destacado */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] text-blue-300 font-semibold">
            <Calendar size={11} /> Próximo partido
          </span>
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-400 font-medium">
            Datos de demostración
          </span>
          <span className="inline-flex items-center h-6 px-2 rounded-md bg-blue-500/15 text-blue-300 text-[11px] font-semibold border border-blue-500/30">{m.competition}</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 flex items-center justify-center text-white font-black text-xs">PFC</span>
            <span className="text-white font-bold text-lg">{m.home}</span>
          </div>
          <span className="text-zinc-500 font-semibold text-sm">vs</span>
          <span className="text-white font-bold text-lg">{m.away}</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400 flex-wrap">
          <span>{m.competition} · {m.round}</span>
          <span className="text-zinc-600">·</span>
          <span>{fmtMatchDate(m.date)}</span>
          <span className="text-zinc-600">·</span>
          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {m.venue}</span>
        </div>
      </div>

      {/* Botón comercial */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          {expanded ? <>Cerrar recorrido del partido</> : <>Explorar cómo se conecta un partido</>}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-5">
              {/* Concepto de integración: fuentes convergiendo al partido */}
              <div className="bg-zinc-950/40 border border-zinc-800/70 rounded-xl p-4">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3 text-center">Fuentes conectadas al mismo evento</p>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-1 justify-center">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {DEMO_MATCH_FLOW_SOURCES.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300">
                        <Database size={11} className="text-emerald-400" /> {s}
                      </span>
                    ))}
                  </div>
                  <ArrowRight size={16} className="hidden lg:block text-zinc-600 mx-1 rotate-90 lg:rotate-0" />
                  <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-blue-600/15 border border-blue-500/30 text-[11px] text-blue-300 font-semibold">
                    <Trophy size={11} /> Partido
                  </span>
                  <ArrowRight size={16} className="hidden lg:block text-zinc-600 mx-1" />
                  <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
                    <UserRound size={11} /> Jugador 360°
                  </span>
                </div>
              </div>

              {/* Flujo de etapas */}
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Recorrido del partido</p>
                <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 lg:gap-1 overflow-x-auto pb-1">
                  {DEMO_MATCH_FLOW_STAGES.map((stage, i) => (
                    <React.Fragment key={stage.id}>
                      <StageNode stage={stage} active={activeStage === stage.id} onClick={() => setActiveStage(stage.id)} />
                      {i < DEMO_MATCH_FLOW_STAGES.length - 1 && <Arrow />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Panel de detalle de la etapa seleccionada */}
              <DetailPanel stageId={activeStage} />

              {/* Mensaje final */}
              <div className="text-center bg-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                <p className="text-lg sm:text-xl font-bold text-white">“El dato se carga una vez. El valor aparece cuando empieza a conectarse.”</p>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl mx-auto">
                  Competencia, planificación, cuerpo técnico, rendimiento y análisis pueden trabajar alrededor del mismo evento.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}