import React, { useState } from "react";
import {
  HeartPulse, Gauge, CalendarDays, Activity, Video, FileText, Info,
  ArrowRight, Check, ChevronLeft,
} from "lucide-react";
import {
  DEMO_PLAYER, DEMO_NEXT_TRAINING, DEMO_NEXT_MATCH, DEMO_WEEK,
  DEMO_HISTORY_WELLNESS, DEMO_HISTORY_RPE,
  DEMO_SHARED_SECTIONS, DEMO_RENDIMIENTO_METRICS, DEMO_VIDEOS, DEMO_INFORMES,
  DEMO_CONNECTED_FLOW,
} from "@/lib/demoPlayerData";

const SHARED_ICONS = { CalendarDays, Activity, Video, FileText };

function scoreColor(s) {
  if (s == null) return "text-zinc-500";
  if (s <= 40) return "text-red-400";
  if (s <= 60) return "text-yellow-400";
  return "text-emerald-400";
}

function fmtDate(d) {
  try { return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" }); }
  catch { return d; }
}

export function InicioView({ onNavigate, onOpenShared }) {
  return (
    <div className="p-5 space-y-5">
      <div data-tour="dp-home" className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 flex items-center justify-center shrink-0">
          <span className="text-lg font-black text-white">{DEMO_PLAYER.initials}</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-tight">Hola, {DEMO_PLAYER.first_name}</h1>
          <p className="text-sm text-zinc-400">{DEMO_PLAYER.position} · #{DEMO_PLAYER.number} · {DEMO_PLAYER.squad}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Próximo entrenamiento</p>
        <p className="text-base font-bold text-white mt-1">{DEMO_NEXT_TRAINING.day} · {DEMO_NEXT_TRAINING.time}</p>
        <p className="text-sm text-zinc-400">{DEMO_NEXT_TRAINING.venue} · {DEMO_NEXT_TRAINING.md} · {DEMO_NEXT_TRAINING.objective}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Próximo partido</p>
        <p className="text-base font-bold text-white mt-1">{DEMO_NEXT_MATCH.home} vs {DEMO_NEXT_MATCH.away}</p>
        <p className="text-sm text-zinc-400">{DEMO_NEXT_MATCH.competition} · {DEMO_NEXT_MATCH.round}</p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><HeartPulse size={18} className="text-emerald-400" /><h2 className="font-bold text-white">Wellness de hoy</h2></div>
          <span className="text-xs text-amber-300 font-semibold">Pendiente</span>
        </div>
        <p className="text-sm text-zinc-300 mt-2">Todavía no respondiste hoy.</p>
        <button onClick={() => onNavigate("wellness")} className="mt-3 w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-black hover:bg-emerald-400 transition-colors">Responder</button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Gauge size={18} className="text-emerald-400" /><h2 className="font-bold text-white">RPE</h2></div>
          <span className="text-xs text-amber-300 font-semibold">1 pendiente</span>
        </div>
        <button onClick={() => onNavigate("rpe")} className="mt-3 w-full text-left p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors">
          <p className="font-semibold text-white text-sm">SESIÓN 4 · MD-3</p>
          <p className="text-xs text-emerald-400 font-semibold mt-0.5">Responder →</p>
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-bold text-white mb-3 text-sm">Mi semana</h2>
        <div className="space-y-2">
          {DEMO_WEEK.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{d.day} · {d.label}{d.rival ? ` vs ${d.rival}` : ""}</span>
              <span className="text-zinc-500">{d.time} {d.md && `· ${d.md}`}</span>
            </div>
          ))}
        </div>
      </div>

      <div data-tour="dp-shared" className="space-y-3">
        <h2 className="text-sm font-bold text-white">Información compartida</h2>
        <div className="grid grid-cols-2 gap-3">
          {DEMO_SHARED_SECTIONS.map((s) => {
            const Icon = SHARED_ICONS[s.icon] || Info;
            return (
              <button key={s.key} onClick={() => onOpenShared(s.key)} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col items-center gap-2 hover:border-emerald-500/40 transition-colors">
                <Icon size={18} className="text-emerald-400" />
                <span className="text-xs font-semibold text-white">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div data-tour="dp-connected" className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-600/10 to-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><Info size={14} className="text-blue-300" /> Información conectada</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {DEMO_CONNECTED_FLOW.map((n, i) => (
            <React.Fragment key={n}>
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">{n}</span>
              {i < DEMO_CONNECTED_FLOW.length - 1 && <ArrowRight size={12} className="text-zinc-600" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400">El jugador también forma parte del ecosistema de información del club.</p>
      </div>
    </div>
  );
}

const SCALE_LABELS = { 1: "Muy mal", 2: "Mal", 3: "Normal", 4: "Bien", 5: "Muy bien" };

export function WellnessView() {
  const [done, setDone] = useState(false);
  const [v, setV] = useState({ sleep: 0, energy: 0, mood: 0, has_pain: null, comment: "" });

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"><Check size={32} className="text-emerald-400" /></div>
        <h2 className="text-xl font-black text-white">¡Respuesta enviada!</h2>
        <p className="text-zinc-400 text-sm">Información simple para el jugador. Información útil para el staff.</p>
      </div>
    );
  }

  return (
    <div data-tour="dp-wellness" className="p-5 space-y-5">
      <h1 className="text-lg font-black text-white">Wellness de hoy</h1>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300">¿Cuántas horas dormiste?</p>
        <div className="grid grid-cols-4 gap-2">
          {[3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
            <button key={h} onClick={() => setV({ ...v, sleep: h })} className={`py-3 rounded-xl text-sm font-bold transition-all ${v.sleep === h ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}>{h}h</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300">¿Con cuánta energía te sentís?</p>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <button key={n} onClick={() => setV({ ...v, energy: n })} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${v.energy === n ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-200"}`}>
              <span className="w-7 h-7 rounded-full bg-zinc-950/30 flex items-center justify-center font-black text-sm">{n}</span>
              <span className="text-sm font-semibold">{SCALE_LABELS[n]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300">¿Tenés algún dolor o molestia?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setV({ ...v, has_pain: false })} className={`py-4 rounded-xl font-black transition-all ${v.has_pain === false ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}>No</button>
          <button onClick={() => setV({ ...v, has_pain: true })} className={`py-4 rounded-xl font-black transition-all ${v.has_pain === true ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}>Sí</button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300">Comentario (opcional)</p>
        <textarea value={v.comment} onChange={(e) => setV({ ...v, comment: e.target.value })} rows={3} placeholder="Escribí acá..." className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:border-emerald-500" />
      </div>

      <button onClick={() => setDone(true)} disabled={v.sleep === 0 || v.energy === 0 || v.has_pain === null} className="w-full py-4 rounded-xl bg-emerald-500 text-zinc-950 font-black disabled:opacity-40 hover:bg-emerald-400 transition-colors">Enviar respuesta</button>
    </div>
  );
}

const RPE_LABELS = {
  0: "Reposo", 1: "Muy suave", 2: "Suave", 3: "Moderado", 4: "Algo exigente",
  5: "Exigente", 6: "Bastante exigente", 7: "Muy exigente", 8: "Muy, muy exigente", 9: "Casi máximo", 10: "Máximo",
};

export function RpeView() {
  const [done, setDone] = useState(false);
  const [rpe, setRpe] = useState(null);

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"><Check size={32} className="text-emerald-400" /></div>
        <h2 className="text-xl font-black text-white">¡RPE enviado!</h2>
        <p className="text-zinc-400 text-sm">Tu respuesta alimenta la carga interna del club.</p>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap justify-center">
          <span className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700">Carga interna</span>
          <ArrowRight size={12} className="text-zinc-600" />
          <span className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700">Rendimiento</span>
          <ArrowRight size={12} className="text-zinc-600" />
          <span className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700">Jugador 360°</span>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="dp-rpe" className="p-5 space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h1 className="text-lg font-black text-white">SESIÓN 4 · MD-3</h1>
        <p className="text-sm text-zinc-400">Miércoles 20/08/2026</p>
      </div>
      <p className="text-xl font-bold text-white">¿Qué tan exigente fue la sesión?</p>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button key={n} onClick={() => setRpe(n)} className={`aspect-square rounded-xl font-black text-lg transition-all ${rpe === n ? "bg-emerald-500 text-zinc-950 scale-105" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{n}</button>
        ))}
      </div>
      {rpe != null && <p className="text-center text-sm font-semibold text-emerald-400">{RPE_LABELS[rpe]}</p>}
      <button onClick={() => setDone(true)} disabled={rpe == null} className="w-full py-4 rounded-xl bg-emerald-500 text-zinc-950 font-black disabled:opacity-40 hover:bg-emerald-400 transition-colors">Enviar RPE</button>
    </div>
  );
}

export function HistoryView() {
  const [tab, setTab] = useState("wellness");
  return (
    <div className="p-5 space-y-4">
      <h1 className="text-lg font-black text-white">Mis respuestas</h1>
      <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        <button onClick={() => setTab("wellness")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "wellness" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400"}`}>Wellness</button>
        <button onClick={() => setTab("rpe")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "rpe" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400"}`}>RPE</button>
      </div>
      {tab === "wellness" ? (
        <div className="space-y-2">
          {DEMO_HISTORY_WELLNESS.map((w) => (
            <div key={w.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{fmtDate(w.response_date)}</p>
                <span className={`text-xl font-black ${scoreColor(w.wellness_score)}`}>{w.wellness_score}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span>😴 {w.sleep_hours}h</span><span>⚡ {w.energy_level}/5</span><span>💪 {w.muscular_readiness}/5</span><span>😊 {w.mood}/5</span>
                {w.has_pain && <span className="text-amber-400">⚠ Dolor {w.pain_intensity}/10</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {DEMO_HISTORY_RPE.map((r) => (
            <div key={r.session_player_id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-semibold text-white">{r.title}</p><p className="text-xs text-zinc-400">{fmtDate(r.date)}</p></div>
                <div className="text-right"><p className="text-lg font-black text-emerald-400">{r.rpe}</p><p className="text-xs text-zinc-500">{r.internal_load} UA</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SharedView({ section, onBack }) {
  const titles = { calendario: "Mi calendario", rendimiento: "Mi rendimiento", videos: "Videos", informes: "Informes" };
  return (
    <div className="p-5 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-zinc-400 text-sm"><ChevronLeft size={18} /> Volver</button>
      <h1 className="text-lg font-black text-white">{titles[section]}</h1>

      {section === "calendario" && (
        <div className="space-y-2">
          {DEMO_WEEK.map((d, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-between">
              <div><p className="text-sm font-semibold text-white">{d.day} · {d.label}{d.rival ? ` vs ${d.rival}` : ""}</p><p className="text-xs text-zinc-500">{d.md}</p></div>
              <span className="text-sm text-zinc-400">{d.time}</span>
            </div>
          ))}
        </div>
      )}

      {section === "rendimiento" && (
        <div className="grid grid-cols-2 gap-3">
          {DEMO_RENDIMIENTO_METRICS.map((m) => (
            <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
              <p className="text-xl font-black text-white">{m.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {section === "videos" && (
        <div className="space-y-2">
          {DEMO_VIDEOS.map((v, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-2"><Video size={20} className="text-zinc-600" /></div>
              <p className="text-sm font-semibold text-white">{v.title}</p>
              <p className="text-xs text-zinc-500">{v.meta}</p>
            </div>
          ))}
        </div>
      )}

      {section === "informes" && (
        <div className="space-y-2">
          {DEMO_INFORMES.map((r, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center gap-3">
              <FileText size={18} className="text-blue-400 shrink-0" />
              <div><p className="text-sm font-semibold text-white">{r.title}</p><p className="text-xs text-zinc-500">{r.meta}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2">
        <Info size={14} className="text-blue-300 shrink-0 mt-0.5" />
        <p className="text-[11px] text-zinc-400">Capacidad demostrativa · Evolución del portal. El club define qué contenidos individuales comparte con cada jugador.</p>
      </div>
    </div>
  );
}