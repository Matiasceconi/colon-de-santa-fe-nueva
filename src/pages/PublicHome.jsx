import React from "react";
import { Link } from "react-router-dom";
import { Shield, Users, UserRound, LockKeyhole, LifeBuoy } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";

export default function PublicHome() {
  const { brand } = usePublicClubBrand();
  const accent = brand.accent_color || "#60A5FA";
  const primary = brand.primary_color || "#2563EB";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.club_name} className="h-12 w-12 object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900">
                <Shield size={24} style={{ color: accent }} />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black">{brand.club_name}</h1>
              <p className="text-xs text-zinc-500">Plataforma de gestión deportiva</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <LockKeyhole size={14} /> Acceso privado y seguro
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-3xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Portal institucional</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Elegí cómo querés ingresar</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                Cada cuenta accede únicamente a los módulos y planteles autorizados por el administrador del club.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AccessCard
                to="/login?access=staff"
                icon={Users}
                title="Cuerpo técnico y staff"
                text="Entrenadores, rendimiento, área médica, nutrición, coordinación y administración."
                color={primary}
              />
              <AccessCard
                to="/login?access=player"
                icon={UserRound}
                title="Jugadores"
                text="Wellness, RPE, calendario, reportes y contenidos asignados al jugador."
                color={accent}
              />
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs text-zinc-600 sm:flex-row">
              <span>El alta de usuarios se realiza únicamente por invitación.</span>
              {brand.support_email && (
                <a href={`mailto:${brand.support_email}`} className="inline-flex items-center gap-1 text-zinc-400 hover:text-white">
                  <LifeBuoy size={12} /> {brand.support_email}
                </a>
              )}
            </div>
          </div>
        </main>

        <footer className="border-t border-zinc-800 pt-5 text-center text-[11px] text-zinc-600">
          Tecnología provista por PerformancePitch
        </footer>
      </div>
    </div>
  );
}

function AccessCard({ to, icon: Icon, title, text, color }) {
  return (
    <Link to={to} className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900/80">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950">
        <Icon size={23} style={{ color }} />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p>
      <span className="mt-5 inline-flex text-sm font-semibold" style={{ color }}>Ingresar →</span>
    </Link>
  );
}
