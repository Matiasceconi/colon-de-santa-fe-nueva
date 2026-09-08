import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Network, Layers } from 'lucide-react';

const pillars = [
  {
    icon: SlidersHorizontal,
    title: 'Adaptable',
    text: 'La plataforma evoluciona según las necesidades, áreas y metodología de cada institución.',
    accent: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
  },
  {
    icon: Network,
    title: 'Integrada',
    text: 'Conecta información proveniente de diferentes herramientas, proveedores y departamentos.',
    accent: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Layers,
    title: 'Centralizada',
    text: 'El club puede consultar y relacionar la información deportiva desde un mismo entorno.',
    accent: 'from-cyan-500/20 to-cyan-600/5',
    iconColor: 'text-cyan-400',
  },
];

export default function ValueProposition() {
  return (
    <section id="propuesta" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Propuesta de valor</span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Una plataforma construida <span className="text-blue-400">alrededor de tu club.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg leading-relaxed">
            Cada institución trabaja de una manera diferente. PerformancePitch permite adaptar
            módulos, información, permisos, procesos e integraciones a la estructura real del club.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative group rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-white/20 transition-colors overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                  <p.icon size={22} className={p.iconColor} />
                </div>
                <h3 className="text-xl font-bold text-white">{p.title}</h3>
                <p className="mt-2.5 text-zinc-400 text-sm leading-relaxed">{p.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}