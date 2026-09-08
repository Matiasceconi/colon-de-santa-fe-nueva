import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, HeartPulse, Gauge, History, ArrowLeft, Smartphone } from "lucide-react";
import { InicioView, WellnessView, RpeView, HistoryView, SharedView } from "./DemoPlayerViews";

const NAV = [
  { key: "inicio", label: "Inicio", icon: Home },
  { key: "wellness", label: "Wellness", icon: HeartPulse },
  { key: "rpe", label: "RPE", icon: Gauge },
  { key: "historial", label: "Mis respuestas", icon: History },
];

export default function DemoPlayerPortal() {
  const navigate = useNavigate();
  const [view, setView] = useState("inicio");
  const [shared, setShared] = useState(null);

  // El recorrido contextual de página avisa qué vista mostrar en cada paso.
  useEffect(() => {
    const handler = (e) => { setView(e.detail); setShared(null); };
    window.addEventListener("pp-demo-tour-view", handler);
    return () => window.removeEventListener("pp-demo-tour-view", handler);
  }, []);

  function go(v) { setView(v); setShared(null); }
  function openShared(section) { setShared(section); setView("shared"); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 font-medium">
          <Smartphone size={13} /> Vista demo · Portal del Jugador
        </div>
        <button onClick={() => navigate("/club-dashboard")} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Volver a la vista del club
        </button>
      </div>
      <p className="text-sm text-zinc-400 -mt-1">Así vive PerformancePitch un jugador desde su cuenta personal.</p>

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[2.2rem] border-4 border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[640px] sm:h-[680px]">
          <div className="bg-zinc-900 h-6 flex items-center justify-center shrink-0"><div className="w-24 h-1.5 rounded-full bg-zinc-700" /></div>
          <div className="flex-1 overflow-y-auto">
            {view === "inicio" && <InicioView onNavigate={go} onOpenShared={openShared} />}
            {view === "wellness" && <WellnessView />}
            {view === "rpe" && <RpeView />}
            {view === "historial" && <HistoryView />}
            {view === "shared" && <SharedView section={shared} onBack={() => go("inicio")} />}
          </div>
          <nav className="bg-zinc-900 border-t border-zinc-800 shrink-0">
            <div className="flex items-stretch justify-around">
              {NAV.map((item) => (
                <button key={item.key} onClick={() => go(item.key)} className={`flex flex-col items-center justify-center gap-0.5 py-2.5 flex-1 transition-colors ${view === item.key ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>
                  <item.icon size={20} /><span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}