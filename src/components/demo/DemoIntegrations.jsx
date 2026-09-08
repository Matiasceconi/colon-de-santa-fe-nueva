import React from 'react';
import { motion } from 'framer-motion';
import { useDemo } from '@/lib/DemoContext';
import { Activity, Radio, HeartPulse, Video, BarChart3, FileSpreadsheet, Stethoscope, Database, Plus, MessageCircle, Compass } from 'lucide-react';

const sources = [
  { icon: Radio, label: 'GPS / Tracking' },
  { icon: HeartPulse, label: 'VALD' },
  { icon: Video, label: 'Video' },
  { icon: BarChart3, label: 'Estadísticas' },
  { icon: FileSpreadsheet, label: 'Planillas' },
  { icon: Stethoscope, label: 'Información médica' },
  { icon: Database, label: 'Sistemas internos' },
  { icon: Plus, label: 'Otras fuentes' },
];

export default function DemoIntegrations() {
  const { startFree } = useDemo();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-700/15 rounded-full blur-[130px]" />
      </div>

      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Etapa 7 · Integraciones</span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Tu club ya tiene herramientas.{' '}
            <span className="text-emerald-400">PerformancePitch las conecta.</span>
          </h1>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            La plataforma se adapta a la estructura, metodología y proveedores de cada institución.
          </p>
        </motion.div>

        {/* diagram */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {sources.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <s.icon size={20} className="text-blue-300" />
              </div>
              <span className="text-xs text-zinc-300 font-medium leading-tight">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* connector to hub */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center gap-1 mb-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-blue-400"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <div className="relative">
            <div className="absolute -inset-5 bg-blue-600/20 rounded-full blur-2xl" />
            <div className="relative w-52 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-center shadow-2xl shadow-blue-950/50">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-3">
                <Activity size={24} className="text-white" />
              </div>
              <div className="text-white font-bold">PerformancePitch</div>
              <div className="text-xs text-zinc-400 mt-0.5">Una sola fuente de verdad</div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="https://wa.me/5491122679347?text=Hola%2C%20quiero%20conocer%20PerformancePitch%20para%20mi%20club."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors shadow-xl shadow-emerald-500/20 w-full sm:w-auto"
          >
            <MessageCircle size={18} />
            Hablar por WhatsApp
          </a>
          <button
            onClick={startFree}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors w-full sm:w-auto"
          >
            <Compass size={18} />
            Volver a explorar la demo
          </button>
        </motion.div>
      </div>
    </div>
  );
}