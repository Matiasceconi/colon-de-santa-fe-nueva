import React from 'react';
import { DEMO_CLUB_BRAND } from '@/lib/clubBrand';

export const demoThemeStyle = {
  '--club-primary': DEMO_CLUB_BRAND.colors.primary,
  '--club-primary-dark': DEMO_CLUB_BRAND.colors.primaryDark,
  '--club-secondary': DEMO_CLUB_BRAND.colors.secondary,
  '--club-accent': DEMO_CLUB_BRAND.colors.accent,
};

export function PFCShield({ className = 'h-12 w-12', muted = false }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-label="Escudo de Performance FC" role="img">
      <defs>
        <linearGradient id="pfcShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={DEMO_CLUB_BRAND.colors.accent} />
          <stop offset="58%" stopColor={DEMO_CLUB_BRAND.colors.primary} />
          <stop offset="100%" stopColor={DEMO_CLUB_BRAND.colors.primaryDeep} />
        </linearGradient>
      </defs>
      <path d="M60 4 111 23v42c0 33-19 58-51 71C28 123 9 98 9 65V23L60 4Z" fill={muted ? 'currentColor' : 'url(#pfcShield)'} />
      <path d="M60 13 102 29v35c0 28-15 49-42 61-27-12-42-33-42-61V29L60 13Z" fill="none" stroke="white" strokeOpacity={muted ? '.28' : '.72'} strokeWidth="3" />
      <path d="M27 47h66M25 85h70" stroke="white" strokeOpacity={muted ? '.2' : '.32'} strokeWidth="3" />
      <text x="60" y="76" textAnchor="middle" fill="white" fontSize="27" fontWeight="900" fontFamily="Arial, sans-serif">PFC</text>
      <text x="60" y="103" textAnchor="middle" fill="white" fillOpacity=".82" fontSize="9" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="2">2026</text>
    </svg>
  );
}

export function DemoClubWatermark() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden lg:left-64" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(29,78,216,0.16),transparent_28%),radial-gradient(circle_at_28%_82%,rgba(16,185,129,0.08),transparent_25%)]" />
      <PFCShield muted className="absolute -right-20 top-20 h-[620px] w-[530px] text-white opacity-[0.025] sm:right-6 lg:top-12 lg:h-[760px] lg:w-[650px]" />
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
    </div>
  );
}
