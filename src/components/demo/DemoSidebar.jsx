import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDemo } from '@/lib/DemoContext';
import { DEMO_NAV } from '@/lib/demoNav';
import { DEMO_CLUB_BRAND } from '@/lib/clubBrand';
import { BarChart3, BookOpen, LogOut, PanelLeftOpen, PlayCircle } from 'lucide-react';
import { PFCShield } from './DemoClubIdentity';
import { useAuth } from '@/lib/AuthContext';
import { canAccessDemoCrm } from '@/lib/demoCrmAccess';

export default function DemoSidebar() {
  const { demoMode, startGuided, exit, openTutorial } = useDemo();
  const { user } = useAuth();
  const isCrmOwner = canAccessDemoCrm(user?.email);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const matched = new Set();

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-zinc-900 p-2 text-white shadow-xl lg:hidden" aria-label="Abrir menú">
        <PanelLeftOpen size={18} />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-white/10 bg-zinc-950/96 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative overflow-hidden border-b border-white/10 p-4">
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 10%, var(--club-primary), transparent 58%)' }} />
          <div className="relative flex items-center gap-3">
            <PFCShield className="h-12 w-11 shrink-0 drop-shadow-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-white">{DEMO_CLUB_BRAND.name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">Powered by PerformancePitch</p>
            </div>
          </div>
          <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-semibold text-blue-100">Demo activa · datos ficticios</span>
          </div>
        </div>

        <nav className="space-y-3 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 244px)' }}>
          {DEMO_NAV.map((section) => (
            <div key={section.id}>
              <div className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  if (item.comingSoon) {
                    return (
                      <div key={item.label} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700">
                        <item.icon size={15} className="shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] uppercase tracking-wider">Próx.</span>
                      </div>
                    );
                  }
                  const isActive = !matched.has(item.path) && location.pathname === item.path;
                  if (isActive) matched.add(item.path);
                  return (
                    <Link key={item.label} to={item.path} onClick={() => setOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${isActive ? 'bg-[var(--club-primary)] text-white shadow-lg shadow-blue-950/40' : 'text-zinc-400 hover:bg-white/[0.055] hover:text-white'}`}>
                      {isActive && <span className="absolute -left-1 h-5 w-1 rounded-full bg-[var(--club-secondary)]" />}
                      <item.icon size={15} className={`shrink-0 ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-blue-300'}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.transversal && !isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 space-y-1.5 border-t border-white/10 bg-zinc-950/98 p-3">
          {isCrmOwner && (
            <Link to="/administracion/crm" className="flex w-full items-center gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/20">
              <BarChart3 size={15} /> CRM comercial <span className="ml-auto text-[9px] uppercase tracking-wider text-blue-400">Privado</span>
            </Link>
          )}
          <button onClick={openTutorial} className="flex w-full items-center gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/20">
            <BookOpen size={15} /> Ver tutorial
          </button>
          {demoMode !== 'guided' && (
            <button onClick={startGuided} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <PlayCircle size={15} /> Recorrido página a página
            </button>
          )}
          <button onClick={exit} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <LogOut size={14} /> Salir de la demo
          </button>
        </div>
      </aside>
    </>
  );
}
