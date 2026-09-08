import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Radio, HeartPulse, Video, BarChart3, FileSpreadsheet, Stethoscope, Database, Plus } from 'lucide-react';

const sources = [
  { icon: Radio, label: 'GPS y tracking', sub: 'Catapult · sistemas de monitoreo' },
  { icon: HeartPulse, label: 'VALD', sub: 'Saltos · fuerza · evaluaciones' },
  { icon: Video, label: 'Plataformas de video', sub: 'Análisis de partidos y entrenamientos' },
  { icon: BarChart3, label: 'Estadísticas y datos', sub: 'Proveedores externos de datos' },
  { icon: FileSpreadsheet, label: 'Planillas', sub: 'Sheets · Excel · registros manuales' },
  { icon: Stethoscope, label: 'Información médica', sub: 'Lesiones · seguimientos' },
  { icon: Database, label: 'Sistemas internos', sub: 'Herramientas propias del club' },
  { icon: Plus, label: 'Nuevas fuentes', sub: 'Incorporación según disponibilidad' },
];

export default function Integrations() {
  return (
    <section id="integraciones" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-[130px]" />
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Integraciones</span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            No reemplazamos lo que ya funciona. <span className="text-emerald-400">Lo conectamos.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg leading-relaxed">
            PerformancePitch puede integrarse con las herramientas y fuentes de información que el club
            ya utiliza, evitando que los datos queden repartidos en distintas plataformas.
          </p>
        </motion.div>

        {/* diagram */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-6 items-center">
          {/* sources */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            {sources.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 hover:border-blue-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <s.icon size={18} className="text-blue-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{s.label}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{s.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* connector */}
          <div className="hidden lg:flex flex-col items-center justify-center px-4">
            <div className="relative w-px h-40 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent" />
            <div className="absolute flex flex-col items-center">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 my-3"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto"
          >
            <div className="absolute -inset-6 bg-blue-600/20 rounded-full blur-2xl" />
            <div className="relative w-56 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl shadow-blue-950/50">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Activity size={26} className="text-white" />
              </div>
              <div className="text-white font-bold">PerformancePitch</div>
              <div className="text-xs text-zinc-400 mt-1">Una sola fuente de verdad</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-lg sm:text-xl text-white font-semibold max-w-2xl mx-auto">
            “La información deja de estar separada y empieza a{' '}
            <span className="text-emerald-400">trabajar junta.</span>”
          </p>
          <p className="mt-4 text-sm text-zinc-500 max-w-xl mx-auto">
            La capacidad de integración y adaptación depende de la disponibilidad técnica de cada proveedor.
          </p>
        </motion.div>
      </div>
    </section>
  );
}