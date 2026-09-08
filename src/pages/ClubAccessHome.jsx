import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  LifeBuoy,
  LockKeyhole,
  LogIn,
  UserRound,
} from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { ClubIdentity, PerformancePitchBrand } from "@/components/auth/AccessBrand";

export default function ClubAccessHome() {
  const { brand } = usePublicClubBrand();
  const accent = brand.accent_color || "#60A5FA";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-10 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "54px 54px" }} />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
          <PerformancePitchBrand />
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-semibold text-zinc-500 sm:flex">
            <LockKeyhole size={13} /> Entorno privado del club
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:py-14">
          <section className="flex flex-col items-center lg:items-start">
            <ClubIdentity brand={brand} large centered={false} />
            <p className="mt-7 max-w-xl text-center text-base leading-7 text-zinc-400 lg:text-left lg:text-lg">
              Un único espacio para que el cuerpo técnico, las áreas de rendimiento y los jugadores trabajen con la información autorizada por el club.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
              {["Correo autorizado por el club", "Permisos por función", "Información protegida"].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.035] px-3 py-2 text-[11px] font-semibold text-zinc-400">
                  <CheckCircle2 size={12} style={{ color: accent }} /> {label}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-zinc-900/75 p-5 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur sm:p-7">
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[.22em]" style={{ color: accent }}>Acceso al software</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">¿Cómo querés ingresar?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">El club autoriza tu correo. Después ingresás normalmente o creás tu contraseña si es la primera vez.</p>
            </div>

            <div className="space-y-3">
              <Link
                to="/login?access=staff"
                className="group flex items-center gap-4 rounded-2xl border border-blue-400/30 bg-blue-600 p-5 shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white"><LogIn size={23} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-base font-black">Ingresar como staff</strong>
                  <small className="mt-1 block text-blue-100/75">Ingresar o crear contraseña con un correo autorizado.</small>
                </span>
                <ArrowRight size={19} className="shrink-0 transition group-hover:translate-x-1" />
              </Link>


              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-zinc-600">Acceso del deportista</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <Link
                to="/ingreso-jugador"
                className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-emerald-500/40 hover:bg-emerald-500/[.05]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><UserRound size={23} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold">Portal del jugador</strong>
                  <small className="mt-1 block leading-5 text-zinc-500">Wellness, RPE, agenda, informes y contenidos.</small>
                </span>
                <ArrowRight size={17} className="shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-emerald-400" />
              </Link>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/20 p-4 text-xs leading-5 text-zinc-500">
              <LifeBuoy size={15} className="mt-0.5 shrink-0 text-zinc-400" />
              <span>
                ¿Tu correo no está autorizado o no podés ingresar? Contactá al administrador del club
                {brand.support_email ? <> en <a className="ml-1 font-semibold text-zinc-300 hover:text-white" href={`mailto:${brand.support_email}`}>{brand.support_email}</a>.</> : "."}
              </span>
            </div>
          </section>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/[.07] pt-5 text-[11px] text-zinc-600 sm:flex-row">
          <span>{brand.club_name} · Acceso institucional</span>
          <span>Tecnología provista por PerformancePitch</span>
        </footer>
      </div>
    </main>
  );
}
