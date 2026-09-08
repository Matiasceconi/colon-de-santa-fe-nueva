import React from "react";
import { Trophy } from "lucide-react";

export default function ClubAccessVisual({ brand }) {
  const imageUrl = "https://media.base44.com/images/public/6a94832c99d3139ab005f869/b816cfa33_generated_image.png";
  return (
    <div className="relative hidden min-h-[620px] overflow-hidden rounded-3xl border border-white/10 lg:block">
      <img src={imageUrl} alt="Campo de entrenamiento del club" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
          {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-8 w-8 object-contain" /> : <Trophy size={22} style={{ color: brand.accent_color }} />}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">{brand.club_name}</p>
        <p className="mt-3 max-w-md text-3xl font-black leading-tight text-white">Todo el rendimiento del club, conectado.</p>
      </div>
    </div>
  );
}