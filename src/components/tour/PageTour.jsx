import React, { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const STORAGE_PREFIX = "performancepitch_tour_completed_";
const START_EVENT = "performancepitch:start-page-tour";

export function startPageTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function isTourCompleted(pageKey) {
  return !!localStorage.getItem(STORAGE_PREFIX + pageKey);
}

export default function PageTour({ pageKey, steps, autoStart = false, onStepChange }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState(null);
  const [pop, setPop] = useState(null);

  const completedKey = STORAGE_PREFIX + pageKey;
  const step = steps[index];

  const start = useCallback(() => { setIndex(0); setActive(true); }, []);

  // Auto-start solo cuando una página lo solicita explícitamente.
  useEffect(() => {
    if (autoStart && !localStorage.getItem(completedKey)) {
      const t = setTimeout(start, 900);
      return () => clearTimeout(t);
    }
  }, [autoStart, completedKey, start]);

  // Listen for global trigger from the "Guía dinámica" button.
  useEffect(() => {
    const handler = () => start();
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, [start]);

  const measure = useCallback(() => {
    if (!active || !step) return;
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      setSpot({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setSpot(null);
    }
  }, [active, step]);

  // Allow contextual tours to prepare the page (for example, open the correct tab).
  useEffect(() => {
    if (!active || !step) return;
    onStepChange?.(step, index);
  }, [active, index, onStepChange, step]);

  // Scroll target into view + measure on step change
  useEffect(() => {
    if (!active || !step) return;
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 520);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [active, step, index, measure]);

  // Re-measure on resize/scroll
  useEffect(() => {
    if (!active) return;
    const onR = () => measure();
    window.addEventListener("resize", onR);
    window.addEventListener("scroll", onR, true);
    return () => {
      window.removeEventListener("resize", onR);
      window.removeEventListener("scroll", onR, true);
    };
  }, [active, measure]);

  // Position popover
  useLayoutEffect(() => {
    if (!active) return;
    const el = document.getElementById("pp-tour-popover");
    if (!el) return;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placement = step?.placement || "bottom";
    let top, left;
    if (!spot) {
      top = (vh - ph) / 2;
      left = (vw - pw) / 2;
    } else if (placement === "bottom") {
      top = spot.top + spot.height + 14;
      left = spot.left;
    } else if (placement === "top") {
      top = spot.top - ph - 14;
      left = spot.left;
    } else if (placement === "right") {
      top = spot.top;
      left = spot.left + spot.width + 14;
    } else {
      top = spot.top;
      left = spot.left - pw - 14;
    }
    top = Math.max(12, Math.min(top, vh - ph - 12));
    left = Math.max(12, Math.min(left, vw - pw - 12));
    setPop({ top, left });
  }, [active, spot, step, index]);

  if (!active || !step) return null;

  const last = index === steps.length - 1;
  const next = () => setIndex((i) => Math.min(steps.length - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const finish = () => { localStorage.setItem(completedKey, new Date().toISOString()); setActive(false); };
  const skip = () => setActive(false);

  return (
    <>
      {/* Click catcher so the user can't interact with the page during the tour */}
      <div className="fixed inset-0 z-[94]" />

      {/* Spotlight */}
      {spot ? (
        <div
          className="fixed z-[95] pointer-events-none rounded-lg transition-all duration-200"
          style={{
            top: spot.top - 4,
            left: spot.left - 4,
            width: spot.width + 8,
            height: spot.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.66)",
            border: "2px solid rgba(96,165,250,0.85)",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[95] bg-black/66" />
      )}

      {/* Popover */}
      <div
        id="pp-tour-popover"
        className="fixed z-[96] w-[calc(100%-1.5rem)] max-w-[360px] rounded-2xl border border-blue-500/30 bg-zinc-950 p-5 shadow-2xl shadow-black/60"
        style={{ top: pop?.top ?? -9999, left: pop?.left ?? -9999 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-400 font-black text-sm">
            {index + 1}
          </div>
          <button onClick={skip} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Cerrar guía dinámica">
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
          Guía dinámica · Paso {index + 1} de {steps.length}
        </p>
        <h2 className="mt-1.5 text-base font-black text-white leading-tight">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{step.text}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={prev} disabled={index === 0} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-30">
            <ChevronLeft size={14} /> Anterior
          </button>
          <div className="flex items-center gap-2">
            <button onClick={skip} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300">Saltar</button>
            {last ? (
              <button onClick={finish} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
                <CheckCircle2 size={14} /> Finalizar
              </button>
            ) : (
              <button onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">
                Siguiente <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}