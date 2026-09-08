import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  CirclePlay, HeartPulse, LayoutDashboard, Pause, Play, ShieldCheck,
  Smartphone, Trophy, X,
} from 'lucide-react';
import { useDemo } from '@/lib/DemoContext';

const SLIDE_MS = 6500;

const CHAPTERS = [
  {
    id: 'ecosystem',
    eyebrow: 'Una sola plataforma',
    title: 'Todo el club conectado',
    description: 'PerformancePitch centraliza la información y permite que cada área trabaje con el mismo contexto.',
    bullets: ['Cuerpo Técnico', 'Rendimiento', 'Salud', 'Gestión', 'Jugador'],
    flow: ['Club', 'Áreas conectadas', 'Jugador 360°'],
    icon: LayoutDashboard,
    color: '#3b82f6',
  },
  {
    id: 'planning',
    eyebrow: 'Planificación operativa',
    title: 'Del calendario a la sesión',
    description: 'Partidos, microciclo, objetivos y ejercicios se organizan sin repetir información.',
    bullets: ['Calendario', 'Microciclo', 'Sesiones', 'Bibliotecas'],
    flow: ['Próximo partido', 'MD de la sesión', 'Trabajo planificado'],
    icon: CalendarDays,
    color: '#8b5cf6',
  },
  {
    id: 'matches',
    eyebrow: 'Competencia',
    title: 'Del partido al análisis completo',
    description: 'Convocatoria, formación, minutos, GPS y video quedan conectados al mismo encuentro.',
    bullets: ['Convocatoria', 'Formación', 'Minutos', 'GPS'],
    flow: ['Partido', 'Datos', 'Jugador 360°'],
    icon: Trophy,
    color: '#22c55e',
  },
  {
    id: 'performance',
    eyebrow: 'Rendimiento',
    title: 'Datos que se convierten en decisiones',
    description: 'Un tablero personal conecta GPS, carga interna, wellness, evaluaciones y alertas; luego cada sesión puede analizarse hasta el detalle individual.',
    bullets: ['Tablero editable', 'Sesiones GPS', 'Reglas visuales', 'Alertas'],
    flow: ['Fuentes de rendimiento', 'Tablero personal', 'Sesión / jugador', 'Decisión'],
    icon: BarChart3,
    color: '#10b981',
  },
  {
    id: 'health',
    eyebrow: 'Salud y disponibilidad',
    title: 'El estado del plantel en tiempo real',
    description: 'Médica, kinesiología y nutrición comparten una lectura clara de disponibilidad, alertas y evolución.',
    bullets: ['Disponibilidad', 'Lesiones', 'Nutrición', 'Alertas'],
    flow: ['Jugador', 'Estado diario', 'Decisión del staff'],
    icon: HeartPulse,
    color: '#f43f5e',
  },
  {
    id: 'player',
    eyebrow: 'Experiencia del jugador',
    title: 'Cada futbolista tiene su propio portal',
    description: 'El jugador accede a calendario, wellness, RPE, rendimiento, videos e informes publicados por el club.',
    bullets: ['Próxima actividad', 'Wellness', 'Rendimiento', 'Informes'],
    flow: ['Staff publica', 'Jugador recibe', 'Club conectado'],
    icon: Smartphone,
    color: '#06b6d4',
  },
  {
    id: 'adaptable',
    eyebrow: 'Software adaptable',
    title: 'PerformancePitch se adapta al club',
    description: 'Módulos, permisos, identidad e integraciones se configuran según la estructura y metodología de cada institución.',
    bullets: ['Marca del club', 'Roles y permisos', 'Módulos', 'Integraciones'],
    flow: ['Necesidad del club', 'Configuración', 'Implementación'],
    icon: ShieldCheck,
    color: '#f59e0b',
  },
];

function ProductVisual({ chapter }) {
  const Icon = chapter.icon;
  return (
    <div className="relative h-full min-h-[330px] overflow-hidden rounded-2xl border border-white/10 bg-[#080b12]">
      <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 78% 18%, ${chapter.color}35, transparent 34%)` }} />
      <div className="relative flex h-full">
        <div className="hidden w-40 shrink-0 border-r border-white/10 bg-black/25 p-4 sm:block">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600"><Activity size={16} /></span>
            <span className="text-xs font-black">Performance<span className="text-blue-400">Pitch</span></span>
          </div>
          {['Club', 'Cuerpo Técnico', 'Plantel', 'Rendimiento', 'Salud'].map((item, index) => (
            <div key={item} className={`mb-1.5 rounded-lg px-2.5 py-2 text-[10px] ${index === 3 ? 'bg-white/10 text-white' : 'text-zinc-600'}`}>{item}</div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: chapter.color }}>{chapter.eyebrow}</p>
              <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{chapter.title}</h3>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5" style={{ color: chapter.color }}><Icon size={22} /></span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {chapter.bullets.map((item, index) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-3 h-1.5 rounded-full bg-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${58 + index * 11}%` }} transition={{ duration: 0.65, delay: index * 0.08 }} className="h-full rounded-full" style={{ backgroundColor: chapter.color }} /></div>
                <p className="text-[11px] font-semibold text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex h-28 items-end gap-2">
              {[38, 64, 48, 82, 58, 91, 72, 96].map((height, index) => (
                <motion.div key={index} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.55, delay: index * 0.06 }} className="flex-1 rounded-t-md opacity-80" style={{ backgroundColor: chapter.color }} />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chapter.flow.map((item, index) => (
              <React.Fragment key={item}>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-zinc-300">{item}</span>
                {index < chapter.flow.length - 1 && <ArrowRight size={13} className="text-zinc-600" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoTutorialCenter() {
  const navigate = useNavigate();
  const { tutorialOpen, closeTutorial, demoActive, startGuided } = useDemo();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!tutorialOpen || !playing) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => current === CHAPTERS.length - 1 ? 0 : current + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [tutorialOpen, playing]);

  useEffect(() => {
    if (!tutorialOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeTutorial();
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(CHAPTERS.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tutorialOpen, closeTutorial]);

  const chapter = useMemo(() => CHAPTERS[index], [index]);

  const beginTour = () => {
    closeTutorial();
    if (demoActive) startGuided();
    else navigate('/demo/registro');
  };

  return (
    <AnimatePresence>
      {tutorialOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && closeTutorial()}>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/70">
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-300 ring-1 ring-blue-500/25"><CirclePlay size={21} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Centro de tutoriales</p>
                  <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Conocé PerformancePitch</h2>
                  <p className="mt-1 text-xs text-zinc-500">Introducción general · 7 capítulos · Datos de demostración</p>
                </div>
              </div>
              <button onClick={closeTutorial} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar tutorial"><X size={17} /></button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="hidden overflow-y-auto border-r border-white/10 p-3 lg:block">
                <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Capítulos</p>
                {CHAPTERS.map((item, itemIndex) => {
                  const ItemIcon = item.icon;
                  return (
                    <button key={item.id} onClick={() => { setIndex(itemIndex); setPlaying(false); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${itemIndex === index ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20" style={{ color: item.color }}><ItemIcon size={15} /></span>
                      <span className="min-w-0"><span className="block text-[10px] text-zinc-600">0{itemIndex + 1}</span><span className="block truncate text-xs font-semibold">{item.title}</span></span>
                    </button>
                  );
                })}
              </aside>

              <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div key={chapter.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28 }}>
                    <ProductVisual chapter={chapter} />
                    <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-400">{chapter.description}</p>
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>

            <footer className="border-t border-white/10 bg-black/20 px-4 py-3 sm:px-6">
              <div className="mb-3 flex gap-1">
                {CHAPTERS.map((item, itemIndex) => (
                  <button key={item.id} onClick={() => { setIndex(itemIndex); setPlaying(false); }} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-label={`Ir al capítulo ${itemIndex + 1}`}>
                    <motion.span key={`${item.id}-${index}-${playing}`} initial={{ width: itemIndex < index ? '100%' : '0%' }} animate={{ width: itemIndex < index ? '100%' : itemIndex === index && playing ? '100%' : itemIndex === index ? '100%' : '0%' }} transition={{ duration: itemIndex === index && playing ? SLIDE_MS / 1000 : 0.2, ease: 'linear' }} className="block h-full rounded-full bg-blue-500" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={17} /></button>
                  <button onClick={() => setPlaying((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">{playing ? <Pause size={16} /> : <Play size={16} className="fill-current" />}</button>
                  <button onClick={() => setIndex((current) => Math.min(CHAPTERS.length - 1, current + 1))} disabled={index === CHAPTERS.length - 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={17} /></button>
                  <span className="ml-1 text-xs tabular-nums text-zinc-600">{index + 1} / {CHAPTERS.length}</span>
                </div>
                <button onClick={beginTour} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500">
                  {demoActive ? 'Iniciar recorrido guiado' : 'Probar la demo'} <ArrowRight size={16} />
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
