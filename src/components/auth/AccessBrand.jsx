import React from "react";
import { Shield } from "lucide-react";
import { PERFORMANCE_PITCH_LOGO } from "@/lib/performancePitchLogo";

export function PerformancePitchBrand({ compact = false, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={PERFORMANCE_PITCH_LOGO}
        alt="PerformancePitch"
        className={compact ? "h-9 w-9 rounded-xl object-contain" : "h-11 w-11 rounded-2xl object-contain shadow-[0_8px_24px_rgba(37,99,235,.2)]"}
      />
      <div>
        <p className={`font-black tracking-tight text-white ${compact ? "text-sm" : "text-base"}`}>
          Performance<span className="text-blue-400">Pitch</span>
        </p>
        {!compact && <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Sports Intelligence</p>}
      </div>
    </div>
  );
}

export function ClubIdentity({ brand, large = false, centered = false }) {
  const accent = brand?.accent_color || "#60A5FA";
  const clubName = brand?.club_name || "Portal del Club";

  return (
    <div className={centered ? "text-center" : ""}>
      <div className={`flex ${centered ? "justify-center" : ""}`}>
        <div
          className={`flex items-center justify-center overflow-hidden border border-white/10 bg-white/[.04] shadow-2xl ${large ? "h-36 w-36 rounded-[2rem] sm:h-44 sm:w-44" : "h-16 w-16 rounded-2xl"}`}
          style={{ boxShadow: `0 24px 70px ${accent}22` }}
        >
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={clubName} className={large ? "h-[78%] w-[78%] object-contain" : "h-11 w-11 object-contain"} />
          ) : (
            <Shield size={large ? 62 : 28} style={{ color: accent }} />
          )}
        </div>
      </div>
      <h1 className={`font-black tracking-tight text-white ${large ? "mt-7 text-4xl leading-tight sm:text-5xl" : "mt-3 text-xl"}`}>
        {clubName}
      </h1>
      <p className={`font-medium text-zinc-500 ${large ? "mt-3 text-base" : "mt-1 text-xs"}`}>
        Software integral de gestión y rendimiento
      </p>
    </div>
  );
}
