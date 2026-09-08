import React from 'react';
import { useDemo } from '@/lib/DemoContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function DemoTourBar() {
  const { demoActive, demoMode, stageIndex, stage, stages, next, prev, exit } = useDemo();
  if (!demoActive || demoMode !== 'guided') return null;

  const isFirst = stageIndex === 0;
  const isLast = stageIndex === stages.length - 1;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl shadow-2xl shadow-black/40 px-4 py-3 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <stage.icon size={16} className="text-blue-300" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider leading-none mb-1">
            Recorrido PerformancePitch · {stageIndex + 1} de {stages.length}
          </div>
          <div className="text-white text-sm font-semibold truncate">{stage.title}</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={prev}
            disabled={isFirst}
            className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <button
            onClick={next}
            disabled={isLast}
            className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={15} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-0.5" />
          <button
            onClick={exit}
            title="Salir del recorrido"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}