import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Layers3,
  Palette,
  Play,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

const factors = [
  {
    icon: Layers3,
    title: "Alcance deportivo",
    text: "Cantidad de planteles, categorías y módulos que necesita conectar la institución.",
  },
  {
    icon: Users,
    title: "Usuarios y áreas",
    text: "Perfiles para cuerpo técnico, rendimiento, médica, nutrición, coordinación y jugadores.",
  },
  {
    icon: Settings2,
    title: "Procesos e integraciones",
    text: "Flujos propios del club, importaciones, proveedores de datos y automatizaciones específicas.",
  },
  {
    icon: Palette,
    title: "Identidad y acompañamiento",
    text: "Configuración con escudo y colores, carga inicial, capacitación y soporte de implementación.",
  },
];

const included = [
  "Reunión de diagnóstico sin costo",
  "Propuesta funcional adaptada al club",
  "Presupuesto privado y transparente",
  "Implementación por etapas",
  "Capacitación para el equipo de trabajo",
  "Acompañamiento posterior a la puesta en marcha",
];

function scrollToContacto(e) {
  e.preventDefault();
  document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
}

export default function Pricing() {
  return (
    <section id="cotizacion" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[760px] h-[440px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
            className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-600/15 via-zinc-900 to-zinc-950 p-7 sm:p-10 shadow-2xl shadow-blue-950/30"
          >
            <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs text-blue-200 mb-6">
              <Sparkles size={12} className="text-blue-400" /> Software a medida
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Cada club es distinto.
              <span className="block text-blue-400">La cotización también.</span>
            </h2>
            <p className="mt-5 text-zinc-300 text-base sm:text-lg leading-relaxed">
              PerformancePitch se configura alrededor de la estructura, los procesos y los objetivos reales de cada institución.
              Por eso no publicamos un precio estándar.
            </p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Cotización privada</p>
              <p className="mt-2 text-xl font-bold text-white">Primero entendemos tu club. Después diseñamos la propuesta.</p>
              <p className="mt-2 text-sm text-zinc-400">
                La reunión inicial nos permite definir módulos, cantidad de planteles, usuarios, integraciones y etapas de implementación.
              </p>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href="#contacto"
                onClick={scrollToContacto}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-xl shadow-blue-600/25"
              >
                <CalendarDays size={18} /> Solicitar cotización privada
              </a>
              <Link
                to="/demo/registro"
                className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors"
              >
                <Play size={17} className="fill-white" /> Probar demo
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {factors.map((factor, index) => (
              <motion.article
                key={factor.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-blue-500/25 transition-colors"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
                  <factor.icon size={20} className="text-blue-300" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{factor.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{factor.text}</p>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-9">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr] gap-8 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Qué recibe el club</p>
              <h3 className="mt-3 text-2xl sm:text-3xl font-black text-white">Una implementación pensada para funcionar.</h3>
              <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
                No se trata de comprar una plataforma cerrada: construimos una solución que acompañe la forma de trabajo de la institución.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {included.map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
