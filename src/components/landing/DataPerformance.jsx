import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  ClipboardList,
  Heart,
  Zap,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const modules = [
  { icon: BarChart3, label: "Rendimiento" },
  { icon: Activity, label: "GPS" },
  { icon: Clock, label: "Minutos" },
  { icon: ClipboardList, label: "Evaluaciones" },
  { icon: Heart, label: "Carga interna" },
  { icon: Zap, label: "Carga externa" },
  { icon: ShieldCheck, label: "Disponibilidad" },
  { icon: TrendingUp, label: "Evolución individual" },
];

const showcases = [
  {
    image: "/landing/external-load-evolution.png",
    eyebrow: "Carga externa · Partidos",
    title: "Evolución competitiva del jugador",
    description:
      "Lectura longitudinal de métricas GPS, comparación con el perfil competitivo y contexto de cada partido.",
    accent: "text-blue-300",
  },
  {
    image: "/landing/anthropometry-evolution.png",
    eyebrow: "Evaluaciones · Seguimiento",
    title: "Evolución antropométrica",
    description:
      "Controles históricos, valor actual, objetivo individual y cambio entre evaluaciones en una sola lectura.",
    accent: "text-emerald-300",
  },
];

export default function DataPerformance() {
  return (
    <section id="datos" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 right-1/4 w-[580px] h-[430px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Datos y rendimiento</span>
            <span className="inline-flex items-center h-7 px-3 rounded-full border border-amber-400/20 bg-amber-400/10 text-[11px] font-semibold text-amber-200">
              Vista anticipada · próximamente en la demo
            </span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            De los datos a <span className="text-emerald-400">decisiones deportivas.</span>
          </h2>
          <p className="mt-5 max-w-3xl text-zinc-400 text-base sm:text-lg leading-relaxed">
            PerformancePitch reúne información de distintas áreas para interpretar la evolución del jugador dentro de su contexto competitivo, físico y médico.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {modules.map((module) => (
            <div key={module.label} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
              <module.icon size={18} className="text-blue-300" />
              <span className="text-[11px] text-zinc-300 leading-tight">{module.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-6">
          {showcases.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-70px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-black/25"
            >
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-white/10 p-5 sm:p-7">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${item.accent}`}>{item.eyebrow}</p>
                  <h3 className="mt-2 text-xl sm:text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm sm:text-base text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
                <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 group-hover:text-white group-hover:border-white/20 transition-colors">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <div className="bg-[#101114] p-2 sm:p-4">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="block w-full rounded-xl border border-white/10 object-contain"
                />
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:p-6">
          <p className="text-base sm:text-lg font-bold text-white">
            Los tableros, métricas, gráficos e informes se configuran según las necesidades de cada club.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Estas imágenes muestran el alcance previsto del módulo de análisis. Su incorporación a la demo se realizará progresivamente.
          </p>
        </div>
      </div>
    </section>
  );
}
