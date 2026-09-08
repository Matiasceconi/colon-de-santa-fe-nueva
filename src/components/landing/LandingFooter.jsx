import React from 'react';
import { Activity } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="mt-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </span>
          <span className="text-white font-bold text-sm tracking-tight">
            Performance<span className="text-blue-400">Pitch</span>
          </span>
        </div>
        <p className="text-xs text-zinc-500 text-center">
          Plataforma integral de gestión y rendimiento para clubes de fútbol.
        </p>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} PerformancePitch</p>
      </div>
    </footer>
  );
}