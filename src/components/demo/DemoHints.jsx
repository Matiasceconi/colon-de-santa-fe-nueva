import React, { useState, useEffect } from 'react';
import { useDemo } from '@/lib/DemoContext';
import { X, Info } from 'lucide-react';

export default function DemoHints() {
  const { demoActive, demoMode, stage } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setDismissed(false); }, [stage?.id]);

  if (!demoActive || demoMode !== 'guided' || !stage || !stage.hints?.length || dismissed) return null;

  return (
    <div className="fixed top-20 right-4 z-30 w-[calc(100%-2rem)] max-w-xs">
      <div className="rounded-xl border border-blue-500/20 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
            <stage.icon size={14} className="text-blue-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold leading-snug">{stage.message}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-500 hover:text-white shrink-0 -mt-1 -mr-1 p-1"
            aria-label="Cerrar indicación"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{stage.text}</p>
        <ul className="space-y-1.5">
          {stage.hints.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
              <Info size={12} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}