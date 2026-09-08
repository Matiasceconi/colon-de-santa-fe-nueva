import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const benefits = [
  'Menos información dispersa',
  'Menos tareas manuales',
  'Más comunicación entre áreas',
  'Mayor seguimiento individual del jugador',
  'Información disponible para quienes realmente la necesitan',
  'Procesos adaptados a la metodología del club',
  'Una plataforma que puede crecer junto con la institución',
];

export default function Benefits() {
  return (
    <section id="beneficios" className="py-20 sm:py-28 relative">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Beneficios</span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight">
            Lo que cambia para tu club
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 2) * 0.08 }}
              className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-emerald-500/30 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Check size={15} className="text-emerald-400" />
              </span>
              <span className="text-white text-sm sm:text-base font-medium">{b}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}