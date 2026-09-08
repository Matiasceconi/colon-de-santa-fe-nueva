import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, CalendarDays, ArrowRight } from 'lucide-react';
import DashboardMockup from './DashboardMockup';
import { trackDemoEvent } from '@/lib/demoAnalytics';

export default function Hero() {
  return (
    <section id="top" className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
      {/* glow background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Plataforma integral para clubes de fútbol
          </span>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] max-w-4xl">
            Toda la información de tu club.
            <br />
            Todas las áreas.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-emerald-400 bg-clip-text text-transparent">
              Una sola plataforma.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            PerformancePitch conecta gestión, planificación, rendimiento, salud y análisis
            en una plataforma diseñada alrededor de la forma de trabajar de cada club.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/demo/registro"
              onClick={() => trackDemoEvent("demo_cta_click", { placement: "hero" })}
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-xl shadow-blue-600/25"
            >
              <Play size={18} className="fill-white" />
              Probar demo
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#contacto"
              onClick={(e) => { e.preventDefault(); trackDemoEvent('meeting_click', { placement: 'hero' }); document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors"
            >
              <CalendarDays size={18} />
              Solicitar una reunión
            </a>
          </div>
        </motion.div>

        {/* mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-14 sm:mt-20 max-w-6xl mx-auto"
        >
          <div className="relative">
            <div className="absolute -inset-x-8 -inset-y-6 bg-gradient-to-b from-blue-600/20 to-transparent rounded-3xl blur-2xl -z-10" />
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  );
}