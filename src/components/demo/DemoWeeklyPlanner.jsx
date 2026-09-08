import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import {
  ClipboardList, Activity, Dumbbell, Heart, Video, Apple,
  Calendar, MapPin, Target, Users, Gauge, TrendingUp, Info, ArrowRight, Database, X, Trophy,
} from "lucide-react";
import {
  DEMO_PLANNER_MICROCYCLE, DEMO_PLANNER_NEXT_MATCH, DEMO_PLANNER_AREAS,
  DEMO_PLANNER_DAYS, DEMO_PLANNER_LOAD_CHART, DEMO_PLANNER_INTEGRATION_FLOW,
} from "@/lib/demoWeeklyPlannerData";

const DETAIL_ICONS = { ClipboardList, Activity, Dumbbell, Heart, Video, Apple };

function loadColor(label) {
  if (label === "Alta") return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (label === "Media") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (label === "Partido") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

function Shield({ initials, tone }) {
  const cls = tone === "blue"
    ? "from-blue-500 to-blue-700 border-blue-400/30"
    : "from-zinc-600 to-zinc-800 border-zinc-500/30";
  return (
    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cls} border flex items-center justify-center text-white font-black text-xs shrink-0`}>
      {initials}
    </span>
  );
}

function Indicator({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

function DayCard({ day, activeArea, onSelect }) {
  const activities = activeArea === "todas"
    ? day.activities
    : day.activities.filter((a) => a.area === activeArea);

  if (day.isMatch) {
    return (
      <button
        onClick={() => onSelect(day)}
        className="text-left w-full rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-600/15 to-zinc-900 p-4 hover:border-blue-400 transition-colors flex flex-col gap-3 min-h-[230px]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-semibold">{day.weekday} · {day.md}</span>
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] text-blue-200 font-bold uppercase tracking-wide">
            <Trophy size={10} /> Partido
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 my-1">
          <Shield initials="PFC" tone="blue" />
          <span className="text-zinc-500 font-bold text-sm">vs</span>
          <Shield initials="AC" tone="zinc" />
        </div>
        <p className="text-center text-white font-bold text-sm">{day.match.home}</p>
        <p className="text-center text-zinc-400 text-xs -mt-2">{day.match.away}</p>
        <p className="text-center text-blue-300 text-xs font-semibold">{day.match.competition}</p>
        <p className="text-center text-white text-lg font-black tabular-nums">{day.match.time}</p>
        <div className="flex flex-wrap gap-1 justify-center mt-auto">
          {day.match.access.map((a) => (
            <span key={a} className="inline-flex items-center h-6 px-2 rounded-md bg-zinc-800/80 border border-zinc-700 text-[10px] text-zinc-300">{a}</span>
          ))}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(day)}
      className="text-left w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors flex flex-col gap-2.5 min-h-[230px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wide">{day.weekday} · {day.md}</span>
        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold border ${loadColor(day.loadLabel)}`}>{day.loadLabel}</span>
      </div>
      <div>
        <p className="text-[11px] text-zinc-500">Objetivo</p>
        <p className="text-sm font-bold text-white leading-tight">{day.objective}</p>
      </div>
      <div className="space-y-1.5 mt-1">
        {activities.length ? activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 tabular-nums w-10 shrink-0">{a.time}</span>
            <span className="text-zinc-200 truncate">{a.label}</span>
          </div>
        )) : (
          <p className="text-xs text-zinc-600 italic">Sin actividad destacada de esta área</p>
        )}
      </div>
      <div className="mt-auto pt-2">
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${day.load}%` }} />
        </div>
      </div>
    </button>
  );
}

function DayDetailModal({ day, onClose }) {
  if (!day) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl"
      >
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-5 flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wide">{day.weekday} · {day.md}</span>
            <h3 className="text-xl font-bold text-white">{day.objective}</h3>
            {!day.isMatch && (
              <span className={`inline-flex items-center mt-1.5 h-6 px-2 rounded-full text-[11px] font-semibold border ${loadColor(day.loadLabel)}`}>
                Carga: {day.loadLabel}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {day.detail.map((sec) => {
            const Icon = DETAIL_ICONS[sec.icon] || ClipboardList;
            return (
              <div key={sec.label} className="rounded-xl bg-zinc-950/50 border border-zinc-800 p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Icon size={14} className="text-blue-300" />
                  </span>
                  <h4 className="text-sm font-semibold text-white">{sec.label}</h4>
                </div>
                <ul className="space-y-1 pl-1">
                  {sec.lines.map((l) => (
                    <li key={l} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70 shrink-0" /> {l}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function FlowChip({ label, highlight }) {
  return (
    <span className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-semibold border whitespace-nowrap ${
      highlight
        ? "bg-blue-600/20 border-blue-500/40 text-blue-200"
        : "bg-zinc-900 border-zinc-700 text-zinc-300"
    }`}>
      {highlight && <Database size={12} className="mr-1.5 text-emerald-400" />}
      {label}
    </span>
  );
}

export default function DemoWeeklyPlanner() {
  const [activeArea, setActiveArea] = useState("todas");
  const [selectedDay, setSelectedDay] = useState(null);
  const mc = DEMO_PLANNER_MICROCYCLE;
  const m = DEMO_PLANNER_NEXT_MATCH;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-stretch">
        <div className="bg-gradient-to-br from-blue-600/10 via-zinc-900 to-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Planificación semanal</h1>
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-medium">
              <Info size={11} /> Datos de demostración
            </span>
          </div>
          <p className="text-zinc-300 font-semibold">Performance FC · Primera División</p>
          <p className="text-zinc-500 text-sm mt-1">Microciclo {mc.number} · {mc.range}</p>
        </div>

        {/* Próximo partido */}
        <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-5 flex flex-col justify-center min-w-[260px]">
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] text-blue-300 font-bold uppercase tracking-wide w-fit mb-3">
            <Calendar size={11} /> Próximo partido
          </span>
          <div className="flex items-center gap-2.5">
            <Shield initials="PFC" tone="blue" />
            <span className="text-zinc-500 font-bold text-xs">vs</span>
            <Shield initials="AC" tone="zinc" />
          </div>
          <p className="text-white font-bold text-base mt-2">{m.home} vs {m.away}</p>
          <p className="text-blue-300 text-xs font-semibold mt-0.5">{m.competition} · {m.round}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
            <span>{m.date} · {m.time}</span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1"><MapPin size={11} /> {m.venue}</span>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Indicator icon={Target} label="Objetivo semanal" value={mc.objective} accent="bg-blue-500/15 text-blue-400" />
        <Indicator icon={Trophy} label="Partido objetivo" value={mc.targetMatch} accent="bg-emerald-500/15 text-emerald-400" />
        <Indicator icon={ClipboardList} label="Sesiones" value={mc.sessions} accent="bg-yellow-500/15 text-yellow-400" />
        <Indicator icon={Users} label="Disponibilidad" value={mc.availability} accent="bg-purple-500/15 text-purple-400" />
        <Indicator icon={TrendingUp} label="Carga prevista" value="Mod → Alta → Descarga" accent="bg-orange-500/15 text-orange-400" />
      </div>

      {/* Vista por área */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Ver planificación como</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_PLANNER_AREAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveArea(a.id)}
                className={`inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-semibold border transition-colors ${
                  activeArea === a.id
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-400 italic lg:text-right max-w-xs">Una misma planificación, diferentes vistas para cada área.</p>
      </div>

      {/* Microciclo */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Microciclo · MD-5 → MD+1</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {DEMO_PLANNER_DAYS.map((day) => (
            <DayCard key={day.id} day={day} activeArea={activeArea} onSelect={setSelectedDay} />
          ))}
        </div>
      </div>

      {/* Gráfico de carga */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Gauge size={16} className="text-blue-400" /> Carga prevista del microciclo
          </h2>
          <span className="text-[11px] text-zinc-500">Construcción → pico → descarga → competencia → recuperación</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={DEMO_PLANNER_LOAD_CHART} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#27272a" }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(v) => [`${v}%`, "Carga"]}
              />
              <Area type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={2.5} fill="url(#loadGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Integración de información */}
      <div className="bg-gradient-to-br from-blue-600/10 to-zinc-900 border border-blue-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-1">La planificación no trabaja aislada.</h2>
        <p className="text-sm text-zinc-400 mb-4 max-w-2xl">
          PerformancePitch puede utilizar información de distintas áreas para contextualizar y organizar cada microciclo.
        </p>
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-1 flex-wrap">
          {DEMO_PLANNER_INTEGRATION_FLOW.map((label, i) => (
            <React.Fragment key={label}>
              <FlowChip label={label} highlight={label === "Planificación"} />
              {i < DEMO_PLANNER_INTEGRATION_FLOW.length - 1 && (
                <ArrowRight size={14} className="text-zinc-600 rotate-90 lg:rotate-0 mx-0.5" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-600 pt-1">Todos los datos, jugadores y actividades son ficticios · Datos de demostración</p>

      <AnimatePresence>
        {selectedDay && <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
      </AnimatePresence>
    </div>
  );
}