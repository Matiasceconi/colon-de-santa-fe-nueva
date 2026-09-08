import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, LockKeyhole, LogOut, Mail } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { PerformancePitchBrand } from "@/components/auth/AccessBrand";

export default function FirstTimePasswordGate({ email, onLogout }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const requestedOnce = useRef(false);
  const { brand } = usePublicClubBrand();

  useEffect(() => {
    if (!email || requestedOnce.current) return;
    requestedOnce.current = true;
    resendPasswordEmail();
  }, [email]);

  async function resendPasswordEmail() {
    setSending(true);
    setError("");
    try {
      await base44.auth.resetPasswordRequest((email || "").trim().toLowerCase());
      setSent(true);
    } catch {
      setError("No pudimos enviar el correo. Pedile al administrador que reenvíe la invitación.");
    } finally {
      setSending(false);
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
          <section className="w-full rounded-[2rem] border border-white/10 bg-zinc-900/80 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
              <LockKeyhole className="h-7 w-7 text-blue-400" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-blue-400">Último paso de activación</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Creá tu contraseña</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Este acceso está vinculado exclusivamente a
              <strong className="mt-1 block text-zinc-200">{email}</strong>
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <span className="text-[10px] font-black text-blue-400">1</span>
                <p className="mt-1 text-xs font-semibold text-zinc-300">Abrí el correo y elegí una contraseña.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <span className="text-[10px] font-black text-blue-400">2</span>
                <p className="mt-1 text-xs font-semibold text-zinc-300">Volvé e ingresá con email y contraseña.</p>
              </div>
            </div>

            {sent && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-left">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-xs leading-5 text-emerald-300">Correo enviado. Revisá también Spam o Correo no deseado.</p>
              </div>
            )}
            {error && <p className="mt-4 text-xs leading-5 text-red-400">{error}</p>}

            <Button onClick={resendPasswordEmail} disabled={sending || !email} className="mt-6 h-12 w-full bg-blue-600 font-black hover:bg-blue-500">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {sent ? "Reenviar correo" : "Enviar correo para crear contraseña"}
            </Button>
            <button onClick={onLogout} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Salir y volver al ingreso
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
