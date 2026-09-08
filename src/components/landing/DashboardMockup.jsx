import React from 'react';
import {
  LayoutDashboard, Users, Calendar, Activity, HeartPulse,
  Dumbbell, ClipboardList, BarChart3, Search, Bell, Settings,
  TrendingUp, ChevronRight,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Planteles' },
  { icon: Calendar, label: 'Calendario' },
  { icon: Activity, label: 'GPS' },
  { icon: BarChart3, label: 'Rendimiento' },
  { icon: ClipboardList, label: 'Evaluaciones' },
  { icon: HeartPulse, label: 'Médica' },
  { icon: Dumbbell, label: 'Fuerza' },
];

const kpis = [
  { label: 'Disponibilidad', value: '82%', trend: '+4%', color: 'text-emerald-400' },
  { label: 'Carga semanal', value: '342 AU', trend: '-6%', color: 'text-blue-400' },
  { label: 'Minutos jugados', value: '1.840', trend: '+12%', color: 'text-emerald-400' },
  { label: 'Wellness prom.', value: '7.4', trend: '+0.3', color: 'text-emerald-400' },
];

const players = [
  { name: 'L. Martínez', pos: 'DEL', status: 'Titular', tone: 'emerald' },
  { name: 'F. Gómez', pos: 'MED', status: 'Disponible', tone: 'blue' },
  { name: 'J. Pereyra', pos: 'DEF', status: 'En recuperación', tone: 'amber' },
  { name: 'A. Soto', pos: 'MED', status: 'Disponible', tone: 'blue' },
];

const toneMap = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
};

function AreaChart() {
  // simple SVG area chart
  return (
    <svg viewBox="0 0 320 120" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="areaFill2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[24, 48, 72, 96].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      <path d="M0,80 L40,64 L80,72 L120,48 L160,56 L200,32 L240,40 L280,20 L320,28 L320,120 L0,120 Z" fill="url(#areaFill)" />
      <path d="M0,80 L40,64 L80,72 L120,48 L160,56 L200,32 L240,40 L280,20 L320,28" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      <path d="M0,96 L40,88 L80,92 L120,76 L160,84 L200,64 L240,72 L280,56 L320,60 L320,120 L0,120 Z" fill="url(#areaFill2)" />
      <path d="M0,96 L40,88 L80,92 L120,76 L160,84 L200,64 L240,72 L280,56 L320,60" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

export default function DashboardMockup() {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/90 shadow-2xl shadow-blue-950/40 backdrop-blur">
      {/* window chrome */}
      <div className="h-9 flex items-center gap-2 px-4 border-b border-white/5 bg-zinc-950/60">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-amber-500/70" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-[11px] text-zinc-500 font-mono">app.performance-pitch.com</span>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden sm:flex flex-col w-14 lg:w-44 shrink-0 border-r border-white/5 bg-zinc-950/40 py-4">
          <div className="px-3 lg:px-4 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </span>
            <span className="hidden lg:block text-white text-xs font-bold tracking-tight">PerformancePitch</span>
          </div>
          <div className="px-2 lg:px-3 space-y-1">
            {navItems.map((it) => (
              <div
                key={it.label}
                className={`flex items-center gap-2.5 h-9 px-2 lg:px-2.5 rounded-lg text-xs ${
                  it.active
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <it.icon size={16} className="shrink-0" />
                <span className="hidden lg:block truncate">{it.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* main */}
        <div className="flex-1 min-w-0 p-4 lg:p-5">
          {/* topbar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Plantel profesional</div>
              <div className="text-white font-semibold text-sm lg:text-base">Resumen semanal</div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-xs w-40">
                <Search size={13} />
                <span className="truncate">Buscar jugador…</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                <Bell size={14} />
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500" />
            </div>
          </div>

          {/* kpis */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.label}</div>
                <div className="flex items-end justify-between mt-1">
                  <span className="text-white font-bold text-lg">{k.value}</span>
                  <span className={`text-[11px] font-semibold ${k.color} flex items-center gap-0.5`}>
                    <TrendingUp size={11} />{k.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
            {/* chart */}
            <div className="lg:col-span-2 rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white text-xs font-semibold">Carga externa · Distancia (m)</div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-blue-300"><span className="w-2 h-2 rounded-full bg-blue-500" />Equipo</span>
                  <span className="flex items-center gap-1 text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-500" />Objetivo</span>
                </div>
              </div>
              <div className="h-28"><AreaChart /></div>
            </div>

            {/* player list */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-white text-xs font-semibold">Disponibilidad</div>
                <Settings size={13} className="text-zinc-500" />
              </div>
              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.name} className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                      {p.name.split(' ')[0][0]}{p.name.split(' ')[1][0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-zinc-500">{p.pos}</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${toneMap[p.tone]}`}>{p.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-blue-300">
                Ver plantel completo <ChevronRight size={11} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}