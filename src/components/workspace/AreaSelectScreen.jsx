import React from "react";
import { Users, Gauge, Heart, HeartPulse, Apple, Brain, ClipboardList, Settings2, ArrowRight, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ICONS = { Users, Gauge, Heart, HeartPulse, Apple, Brain, ClipboardList, Settings2 };

export default function AreaSelectScreen({ areas, userName, currentAreaId, onSelect, clubBrand }) {
  const { logout } = useAuth();
  const primary = clubBrand?.colors?.primary || "#00843D";
  const accent = clubBrand?.colors?.accent || clubBrand?.colors?.yellow || "#FFD400";
  const primaryDeep = clubBrand?.colors?.primaryDeep || clubBrand?.colors?.primaryDark || "#003D25";
  const logoUrl = clubBrand?.logoUrl;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow background del club */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: primary }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]"
        style={{ background: accent }}
      />

      <div className="w-full max-w-5xl space-y-8 relative z-10">
        {/* Header con escudo */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border shadow-2xl"
              style={{ borderColor: primary, background: `${primary}15` }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={clubBrand?.name} className="h-11 w-11 object-contain" />
              ) : (
                <Shield size={28} style={{ color: primary }} />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
              {clubBrand?.name || "PerformancePitch"}
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">Bienvenido</h1>
            <p className="text-zinc-400 text-sm">
              {userName ? `${userName} — ` : ""}Seleccioná tu área de trabajo
            </p>
          </div>
        </div>

        {/* Grid de áreas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const Icon = ICONS[area.icon] || Users;
            const isCurrent = area.id === currentAreaId;
            return (
              <button
                key={area.id}
                onClick={() => onSelect(area.id)}
                className={`group relative text-left rounded-2xl p-6 transition-all duration-300 overflow-hidden ${
                  isCurrent
                    ? "border-2 shadow-2xl"
                    : "border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-800/60"
                }`}
                style={
                  isCurrent
                    ? { borderColor: primary, background: `${primary}10`, boxShadow: `0 20px 40px -20px ${primary}80` }
                    : undefined
                }
              >
                {/* Barra superior de color */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-opacity"
                  style={{ background: primary, opacity: isCurrent ? 1 : 0 }}
                />

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${primary}18`, border: `1px solid ${primary}40` }}
                >
                  <Icon size={24} style={{ color: primary }} />
                </div>

                <p className="text-white font-bold text-base">{area.name}</p>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">{area.description}</p>

                <div
                  className="flex items-center gap-1.5 text-xs font-bold mt-5 transition-all group-hover:gap-2.5"
                  style={{ color: accent }}
                >
                  Ingresar <ArrowRight size={14} />
                </div>
              </button>
            );
          })}
        </div>

        {areas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">No tenés áreas asignadas. Contactá al administrador.</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => logout("/")}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}