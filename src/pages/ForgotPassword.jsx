import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RotateCcw } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { PerformancePitchBrand } from "@/components/auth/AccessBrand";

export default function ForgotPassword() {
  const params = new URLSearchParams(window.location.search);
  const access = params.get("access") || "staff";
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { brand } = usePublicClubBrand();
  const normalizedEmail = email.trim().toLowerCase();
  const loginLink = normalizedEmail
    ? `/login?access=${encodeURIComponent(access)}&email=${encodeURIComponent(normalizedEmail)}`
    : `/login?access=${encodeURIComponent(access)}`;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(normalizedEmail);
      setSent(true);
    } catch {
      setError("No pudimos enviar el enlace. Verificá el email e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080a] px-5 py-6 text-white">
      <div className="pointer-events-none absolute -left-24 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
          <PerformancePitchBrand />
          <div className="flex items-center gap-3">
            {brand.logo_url && <img src={brand.logo_url} alt={brand.club_name} className="h-10 w-10 object-contain" />}
            <span className="hidden text-sm font-bold text-zinc-300 sm:block">{brand.club_name}</span>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-110px)] max-w-md items-center py-8">
          <section className="w-full rounded-[2rem] border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-400">
              <RotateCcw size={24} />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-blue-400">Recuperación de acceso</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">¿Olvidaste tu contraseña?</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Ingresá el email de tu cuenta y te enviaremos un enlace seguro para elegir una nueva contraseña.</p>

            {sent ? (
              <div className="mt-7">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Revisá tu correo</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-200/70">Si existe una cuenta para <strong>{normalizedEmail}</strong>, recibirás el enlace en breve. Revisá también Spam.</p>
                  </div>
                </div>
                <Link to={loginLink} className="mt-5 flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500">Volver al ingreso</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
                <div>
                  <Label className="text-xs font-semibold text-zinc-300">Email de la cuenta</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                    <Input type="email" autoComplete="email" autoFocus placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 border-zinc-700 bg-zinc-950 pl-10 text-white placeholder:text-zinc-600 focus:border-blue-500" required />
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full bg-blue-600 font-black text-white hover:bg-blue-500" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar enlace de recuperación"}
                </Button>
              </form>
            )}

            <Link to={loginLink} className="mt-6 flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"><ArrowLeft size={14} /> Volver al ingreso</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
