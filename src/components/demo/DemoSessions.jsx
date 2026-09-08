import React from 'react';
import {
  Calendar, Users, Clock, MapPin, Dumbbell, Video, Library,
  Activity, HeartPulse, ShieldCheck, ArrowRight, Info, Goal,
} from 'lucide-react';

// Vista de demostración de Sesiones. Muestra una sesión ficticia ya creada
// (Performance FC · Primera) con todos los sectores que el recorrido contextual
// señala. No usa datos ni imágenes de clubes reales.

const WORK_TYPES = [
  { icon: Activity, label: 'Campo', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  { icon: Dumbbell, label: 'Fuerza', tone: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  { icon: ShieldCheck, label: 'Preventivo', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  { icon: HeartPulse, label: 'Recuperación', tone: 'text-teal-300 bg-teal-500/10 border-teal-500/30' },
];

const EXERCISES = [
  { name: 'Entrada en calor', type: 'Campo', meta: '15 min · 4 series' },
  { name: 'Juego reducido 4v4', type: 'Campo', meta: '20 min · 2 series' },
  { name: 'Transiciones 5v5', type: 'Campo', meta: '18 min · 3 series' },
  { name: 'Trabajo táctico — salida por abajo', type: 'Campo', meta: '25 min' },
  { name: 'Preventivo tren inferior', type: 'Fuerza', meta: '3 x 10' },
];

const PLAYER_STATS = [
  { label: 'Jugadores', value: 27, color: 'text-white' },
  { label: 'Disponibles', value: 24, color: 'text-emerald-400' },
  { label: 'Diferenciados', value: 2, color: 'text-amber-400' },
  { label: 'Lesionado', value: 1, color: 'text-red-400' },
];

const GPS_FLOW = ['Sesión', 'GPS / Tracking', 'Carga individual', 'Rendimiento'];

const FULL_FLOW = ['Estado del Plantel', 'Sesión', 'Planificación semanal', 'Calendario', 'GPS / Rendimiento', 'Jugador 360°'];

export default function DemoSessions() {
  return (
    <div className="space-y-5">
      {/* Datos de la sesión */}
      <div data-tour="session-data" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Competencia</span>
              <span data-tour="session-md" className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">MD-3</span>
              <span data-tour="session-objective" className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">Alta intensidad</span>
            </div>
            <h1 className="text-xl font-bold text-white">SESIÓN 4</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400"><Calendar size={12} className="shrink-0" /> Miércoles 20/08/2026</div>
          <div className="flex items-center gap-1.5 text-zinc-400"><Users size={12} className="shrink-0" /> Performance FC · Primera</div>
          <div className="flex items-center gap-1.5 text-zinc-400"><Clock size={12} className="shrink-0" /> 85 min</div>
          <div className="flex items-center gap-1.5 text-zinc-400"><MapPin size={12} className="shrink-0" /> Campo 1</div>
        </div>
        <p className="text-[10px] text-zinc-500">El MD se calcula automáticamente desde la planificación semanal y el próximo partido.</p>
      </div>

      {/* Tipos de trabajo */}
      <div data-tour="session-work-types" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Tipos de trabajo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WORK_TYPES.map((b) => (
            <div key={b.label} className={`rounded-xl border p-4 flex flex-col items-center gap-2 ${b.tone}`}>
              <b.icon size={18} />
              <span className="text-xs font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ejercicios */}
      <div data-tour="session-exercises" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white">Ejercicios</h2>
          <div className="flex gap-2">
            <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              <Library size={12} /> Biblioteca de Campo
            </button>
            <button type="button" className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
              <Library size={12} /> Biblioteca de Fuerza
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {EXERCISES.map((ex, i) => (
            <div key={i} className="flex items-center justify-between gap-3 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Goal size={13} className="text-zinc-400" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{ex.name}</p>
                  <p className="text-[10px] text-zinc-500">{ex.meta}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ex.type === 'Fuerza' ? 'text-blue-300 bg-blue-500/10 border-blue-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>
                {ex.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido multimedia */}
      <div data-tour="session-media" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Video size={14} className="text-zinc-400" /> Videos, imágenes y consignas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-xs gap-2">
            <Video size={16} /> Clip explicativo de tarea
          </div>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 text-xs text-zinc-400 space-y-1">
            <p className="text-zinc-300 font-semibold text-[11px] uppercase tracking-wide">Consignas</p>
            <p>Presión alta tras pérdida. 4 series de 2 min.</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 text-xs text-zinc-400 space-y-1">
            <p className="text-zinc-300 font-semibold text-[11px] uppercase tracking-wide">Tiempos y series</p>
            <p>Series: 4 · Descanso: 90 s · Duración: 85 min</p>
          </div>
        </div>
      </div>

      {/* Jugadores y disponibilidad */}
      <div data-tour="session-players" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Users size={14} className="text-zinc-400" /> Jugadores y disponibilidad</h2>
          <span className="text-[11px] text-zinc-500">Desde Estado del Plantel</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLAYER_STATS.map((s) => (
            <div key={s.label} className="text-center bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500">La disponibilidad puede compartirse entre Cuerpo Técnico, Rendimiento y Área Médica según los permisos del club.</p>
      </div>

      {/* Conexión con GPS / Rendimiento */}
      <div data-tour="session-gps" className="bg-gradient-to-br from-blue-600/10 via-zinc-900 to-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity size={14} className="text-blue-300" /> Después del entrenamiento, llegan los datos</h2>
        <div className="flex flex-wrap items-center gap-2">
          {GPS_FLOW.map((node, i) => (
            <React.Fragment key={node}>
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">{node}</span>
              {i < GPS_FLOW.length - 1 && <ArrowRight size={14} className="text-zinc-600" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">La sesión puede recibir información de GPS y otras fuentes de rendimiento para relacionar lo planificado con lo realizado.</p>
      </div>

      {/* Conexión con el club */}
      <div data-tour="session-flow" className="bg-gradient-to-br from-blue-600/10 via-zinc-900 to-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Info size={14} className="text-blue-300" /> La sesión no queda aislada</h2>
        <div className="flex flex-wrap items-center gap-2">
          {FULL_FLOW.map((node, i) => (
            <React.Fragment key={node}>
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">{node}</span>
              {i < FULL_FLOW.length - 1 && <ArrowRight size={14} className="text-zinc-600" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          La información generada durante el entrenamiento empieza a formar parte del contexto completo del jugador y del plantel.
        </p>
        <p className="text-xs text-blue-300 font-medium">El dato se carga una vez y empieza a generar valor en diferentes áreas.</p>
      </div>
    </div>
  );
}