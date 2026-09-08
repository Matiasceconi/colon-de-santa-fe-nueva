import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemo } from '@/lib/DemoContext';
import { PAGE_TOURS } from '@/lib/demoPageTours';
import { ChevronLeft, ChevronRight, X, ArrowRight, Info } from 'lucide-react';

// Recorrido contextual de página. Coexiste con el recorrido general (DemoTourBar):
// cuando el usuario llega a una página con tour definido en modo guiado, se activan
// los pasos internos. Al finalizar, "Continuar recorrido PerformancePitch" avanza
// al siguiente módulo del recorrido general.

export default function DemoPageTour() {
  const { demoActive, demoMode, next } = useDemo();
  const location = useLocation();
  const tour = PAGE_TOURS[location.pathname];
  const steps = tour?.steps || [];
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  // (Re)inicia el recorrido al entrar a una página con tour, en modo guiado.
  useEffect(() => {
    if (demoActive && demoMode === 'guided' && steps.length) {
      setActive(true);
      setStep(0);
      setRect(null);
    } else {
      setActive(false);
    }
     
  }, [location.pathname, demoActive, demoMode, tour]);

  // Resalta el target del paso actual. Si el paso define `view`, lo activa
  // (vía evento) para que la página muestre el sector correspondiente antes de medir.
  useEffect(() => {
    if (!active || !steps.length) return;
    const cur = steps[step];
    if (!cur) return;
    if (cur.view) window.dispatchEvent(new CustomEvent('pp-demo-tour-view', { detail: cur.view }));
    if (!cur.target) { setRect(null); return; }
    const t = setTimeout(() => {
      const el = document.querySelector(cur.target);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setRect(el.getBoundingClientRect()), 220);
    }, cur.view ? 450 : 80);
    return () => clearTimeout(t);
     
  }, [step, active, tour]);

  // Re-medir al hacer scroll o resize (sin re-scroll, para evitar jitter).
  useEffect(() => {
    if (!active || !steps.length) return;
    const handler = () => {
      const cur = steps[step];
      if (!cur || !cur.target) return;
      const el = document.querySelector(cur.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
     
  }, [active, tour, step]);

  if (!demoActive || demoMode !== 'guided' || !active || !steps.length) return null;

  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const pad = 8;
  const hasRect = !!rect;

  // Posición del tooltip: debajo del target si está en el tercio superior,
  // arriba si está abajo. Siempre evitando tapar el elemento explicado.
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const tooltipW = 340;
  const tooltipH = 250; // estimación
  let tooltipStyle;
  if (hasRect) {
    const placeBelow = rect.top + rect.height / 2 < VH / 2;
    let top = placeBelow ? rect.bottom + 12 : rect.top - tooltipH - 12;
    if (top < 12) top = rect.bottom + 12;
    if (top + tooltipH > VH - 12) top = Math.max(12, rect.top - tooltipH - 12);
    let left = Math.max(rect.left, 12);
    left = Math.min(left, VW - tooltipW - 12);
    tooltipStyle = { top, left, width: tooltipW };
  } else {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: tooltipW };
  }

  const finish = () => { setActive(false); next(); };
  const skip = () => setActive(false);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay / spotlight */}
      {hasRect ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ height: '100vh' }}>
          <mask id="pp-page-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - pad} y={rect.top - pad}
              width={rect.width + pad * 2} height={rect.height + pad * 2}
              rx="14" fill="black"
            />
          </mask>
          <rect width="100%" height="100%" fill="rgba(9,9,11,0.55)" mask="url(#pp-page-tour-mask)" />
          <rect
            x={rect.left - pad} y={rect.top - pad}
            width={rect.width + pad * 2} height={rect.height + pad * 2}
            rx="14" fill="none" stroke="rgba(59,130,246,0.9)" strokeWidth="2"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-zinc-950/60" />
      )}

      {/* Tooltip */}
      <div className="absolute z-50" style={tooltipStyle}>
        <div className="w-full max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {tour.label} · Paso {step + 1} de {steps.length}
            </span>
            <button
              onClick={skip}
              title="Omitir recorrido de la página"
              className="text-zinc-500 hover:text-white p-0.5 -mt-1 -mr-1"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <h3 className="text-white text-sm font-semibold leading-snug mb-1.5">{cur.title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-2.5">{cur.text}</p>

          {cur.example && (
            <div className="mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300">
                <Info size={12} /> {cur.example}
              </span>
            </div>
          )}

          {cur.chips && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {cur.chips.map((c) => (
                <span key={c} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">{c}</span>
              ))}
            </div>
          )}

          {cur.flow && (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              {cur.flow.map((node, i) => (
                <React.Fragment key={node}>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">{node}</span>
                  {i < cur.flow.length - 1 && <ArrowRight size={12} className="text-zinc-600" />}
                </React.Fragment>
              ))}
            </div>
          )}

          {cur.closing && (
            <p className="text-[11px] text-blue-300 font-medium mb-2.5">{cur.closing}</p>
          )}

          {cur.note && (
            <p className="text-[11px] text-zinc-500 mb-2.5">{cur.note}</p>
          )}

          {/* Progreso */}
          <div className="flex items-center gap-1 mb-3">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-blue-500' : i < step ? 'w-3 bg-blue-500/40' : 'w-3 bg-zinc-700'}`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {isLast ? (
              <button
                onClick={finish}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Continuar recorrido PerformancePitch <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}