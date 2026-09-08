import React from 'react';
import { Bell, BookOpen, CalendarDays, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DEMO_NAV } from '@/lib/demoNav';
import { DEMO_CLUB_BRAND } from '@/lib/clubBrand';
import { useDemo } from '@/lib/DemoContext';
import { PFCShield } from './DemoClubIdentity';

function currentLabel(pathname) {
  for (const section of DEMO_NAV) {
    const item = section.items.find((entry) => entry.path === pathname);
    if (item) return item.label;
  }
  return 'Tablero del Club';
}

export default function DemoTopHeader() {
  const location = useLocation();
  const { openTutorial } = useDemo();
  const label = currentLabel(location.pathname);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-white/10 bg-zinc-950/88 backdrop-blur-xl lg:left-64">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--club-primary)] via-[var(--club-accent)] to-[var(--club-secondary)]" />
      <div className="flex h-full items-center justify-between gap-3 px-4 pl-16 sm:px-6 lg:pl-6">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">{DEMO_CLUB_BRAND.name}</p>
          <h2 className="truncate text-sm font-bold text-white sm:text-base">{label}</h2>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 md:flex">
            <CalendarDays size={14} className="text-blue-300" /> Temporada {DEMO_CLUB_BRAND.season}
          </span>
          <button onClick={openTutorial} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 text-xs font-bold text-blue-200 transition hover:bg-blue-500/20">
            <BookOpen size={15} /><span className="hidden sm:inline">Tutorial</span>
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10" aria-label="Notificaciones">
            <Bell size={16} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 pr-2 text-left hover:bg-white/10">
            <PFCShield className="h-7 w-7" />
            <span className="hidden text-xs font-semibold text-white xl:block">Staff Demo</span>
            <ChevronDown size={13} className="hidden text-zinc-500 xl:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
