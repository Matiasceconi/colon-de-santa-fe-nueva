import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
} from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { ClubIdentity, PerformancePitchBrand } from "@/components/auth/AccessBrand";

export default function Login() {
  const urlParams = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(urlParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { brand } = usePublicClubBrand();

  const access = urlParams.get("access") || "staff";
  const isPlayer = access === "player";
  const emailVerified = urlParams.get("verified") === "1";
  const normalizedEmail = email.trim().toLowerCase();
  const firstAccessLink = normalizedEmail
    ? `/activate-staff?email=${encodeURIComponent(normalizedEmail)}`
    : "/activate-staff";
  const forgotLink = normalizedEmail
    ? `/forgot-password?email=${encodeURIComponent(normalizedEmail)}&access=${encodeURIComponent(access)}`
    : `/forgot-password?access=${encodeURIComponent(access)}`;

  function handleGoogleLogin() {
    setError("");
    const returnUrl = `${window.location.origin}/login?access=${encodeURIComponent(access)}`;
    try {
      base44.auth.loginWithProvider("google", returnUrl);
    } catch {
      setError("No pudimos ingresar con Google. Intentá nuevamente o utilizá email y contraseña.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(normalizedEmail, password);
      window.location.href = `/login?access=${access}`;
    } catch {
      setError("Email o contraseña incorrectos. Verificá los datos o recuperá tu contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07080a] text-white lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/[.07] bg-zinc-950 p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-20 top-24 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="relative z-10">
          <PerformancePitchBrand />
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <ClubIdentity brand={brand} large centered />
        </div>
        <p className="relative z-10 text-center text-xs text-zinc-600">Acceso privado · Datos protegidos · Permisos por función</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <PerformancePitchBrand compact />
            <Link to="/" className="text-xs text-zinc-500 hover:text-white">Volver</Link>
          </div>

          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-4">
              {brand.logo_url && <img src={brand.logo_url} alt={brand.club_name} className="h-16 w-16 object-contain" />}
              <div>
                <p className="text-lg font-black">{brand.club_name}</p>
                <p className="mt-1 text-xs text-zinc-500">Acceso institucional</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-900/70 p-5 shadow-2xl backdrop-blur sm:p-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-blue-400">
                {isPlayer ? "Portal del jugador" : "Cuerpo técnico y staff"}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                {isPlayer ? "Ingresá a tu portal" : "Ingresá al software"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Usá el correo autorizado por el club y tu contraseña.
              </p>
            </div>

            {emailVerified && !error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                <span>Correo verificado. Ahora ingresá con la contraseña que acabás de crear.</span>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm leading-5 text-red-300">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-semibold text-zinc-300">Contraseña</Label>
                  <Link to={forgotLink} className="text-xs font-semibold text-blue-400 transition hover:text-blue-300">Olvidé mi contraseña</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresá tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 border-zinc-700 bg-zinc-950 pl-10 pr-11 text-white placeholder:text-zinc-600 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition hover:text-zinc-300"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="h-12 w-full bg-blue-600 text-sm font-black text-white transition hover:bg-blue-500" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...</> : "Ingresar al software"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-zinc-600">o usá tu cuenta</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleLogin} className="flex h-11 w-full items-center justify-center gap-2.5 border-zinc-300 bg-white font-semibold text-zinc-900 hover:bg-zinc-100">
              <GoogleIcon className="h-5 w-5" /> Ingresar con Google
            </Button>

            {!isPlayer && (
              <div className="mt-7 rounded-2xl border border-blue-500/20 bg-blue-500/[.06] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><KeyRound size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">¿Es tu primera vez?</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Si el club ya autorizó tu correo, podés crear tu contraseña aunque no hayas recibido ningún enlace.</p>
                  </div>
                </div>
                <Link to={firstAccessLink} className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-zinc-950 text-xs font-bold text-blue-300 transition hover:bg-blue-500/10">
                  Crear contraseña <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-zinc-500 transition hover:text-white">
            <ArrowLeft size={14} /> Volver al portal de acceso
          </Link>
        </div>
      </section>
    </main>
  );
}
