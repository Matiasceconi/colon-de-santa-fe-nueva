import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Goal, Activity, HeartPulse, Apple, User } from 'lucide-react';

const areas = [
  {
    icon: Briefcase,
    title: 'Dirigencia y coordinación',
    points: ['Visión general del club', 'Planteles', 'Planificación', 'Información para toma de decisiones'],
  },
  {
    icon: Goal,
    title: 'Cuerpo técnico',
    points: ['Entrenamientos', 'Calendario', 'Partidos', 'Planificación y seguimiento del plantel'],
  },
  {
    icon: Activity,
    title: 'Preparación física y rendimiento',
    points: ['GPS', 'Cargas', 'Evaluaciones', 'Perfiles físicos individuales y colectivos'],
  },
  {
    icon: HeartPulse,
    title: 'Área médica',
    points: ['Estado de jugadores', 'Lesiones', 'Disponibilidad', 'Seguimiento de la recuperación'],
  },
  {
    icon: Apple,
    title: 'Nutrición y bienestar',
    points: ['Seguimiento individual', 'Wellness', 'RPE', 'Información complementaria del jugador'],
  },
  {
    icon: User,
    title: 'Jugadores',
    points: ['Acceso a información personal', 'Cuestionarios', 'Planificación y contenidos compartidos'],
  },
];

export default function ClubAreas() {
  return (
    <section id="areas" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Áreas conectadas</span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Una plataforma para <span className="text-blue-400">toda la estructura deportiva.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg leading-relaxed">
            Diferentes perfiles utilizan la misma plataforma con información y permisos específicos,
            formando parte de un mismo ecosistema.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <a.icon size={20} className="text-blue-300" />
                </div>
                <h3 className="text-white font-semibold leading-tight">{a.title}</h3>
              </div>
              <ul className="space-y-2">
                {a.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}