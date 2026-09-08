import React from 'react';
import { motion } from 'framer-motion';
import { Play, Compass, ArrowRight, Activity, ShieldCheck } from 'lucide-react';
import { useDemo } from '@/lib/DemoContext';
import { trackDemoEvent } from '@/lib/demoAnalytics';

export default function DemoWelcome() {
  const { startGuided, startFree } = useDemo();

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden flex items-center justify-center px-5">
      {/* glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 mb-7">
          <ShieldCheck size={13} /> Entorno de demostración
        </span>

        <div className="flex items-center justify-center gap-3 mb-7">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity size={24} className="text-white" />
          </span>
          <span className="text-2xl font-black tracking-tight">
            Performance<span className="text-blue-400">Pitch</span>
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Bienvenido a{' '}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            PerformancePitch
          </span>
        </h1>

        <p className="mt-5 text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Recorré cómo las diferentes áreas de un club trabajan sobre una misma plataforma.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => { trackDemoEvent('demo_guided_started', { demo_mode: 'guided' }); startGuided(); }}
            className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-xl shadow-blue-600/25 w-full sm:w-auto"
          >
            <Play size={18} className="fill-white" />
            Iniciar recorrido guiado
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => { trackDemoEvent('demo_free_started', { demo_mode: 'free' }); startFree(); }}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors w-full sm:w-auto"
          >
            <Compass size={18} />
            Explorar libremente
          </button>
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Recorrido guiado de 7 etapas · Datos de demostración
        </p>
      </motion.div>
    </div>
  );
}