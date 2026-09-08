import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { PerformancePitchBrand } from "@/components/auth/AccessBrand";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const access = params.get("access") || "staff";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const { brand } = usePublicClubBrand();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("El enlace no contiene un código válido. Solicitá uno nuevo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      setDone(true);
    } catch {
      setError("El enlace es inválido o expiró. Solicitá uno nuevo.");
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
              {done ? <CheckCircle2 size={25} className="text-emerald-400" /> : <LockKeyhole size={24} />}
            </div>

            {done ? (
              <div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-emerald-400">Acceso actualizado</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Contraseña creada</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">El cambio se guardó correctamente. Ya podés ingresar al software con tu nueva contraseña.</p>
                <Link to={`/login?access=${encodeURIComponent(access)}`} className="mt-7 flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500">Ingresar al software</Link>
              </div>
            ) : (
              <>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-blue-400">Enlace seguro</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Elegí una nueva contraseña</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400">Debe tener al menos 8 caracteres. Esta contraseña reemplazará la anterior.</p>

                {!token && (
                  <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-5 text-amber-300">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> Este enlace está incompleto. Solicitá uno nuevo desde “Olvidé mi contraseña”.
                  </div>
                )}
                {error && <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-300">Nueva contraseña</Label>
                    <div className="relative mt-1.5">
                      <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                      <Input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 border-zinc-700 bg-zinc-950 pl-10 pr-11 text-white placeholder:text-zinc-600 focus:border-blue-500" required />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-zinc-300">Repetir contraseña</Label>
                    <Input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Escribila nuevamente" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1.5 h-12 border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-blue-500" required />
                    <div className="mt-2 flex gap-3 text-[10px] font-semibold">
                      <span className={password.length >= 8 ? "text-emerald-400" : "text-zinc-600"}><Check size={10} className="mr-1 inline" />8 caracteres</span>
                      <span className={password && password === confirm ? "text-emerald-400" : "text-zinc-600"}><Check size={10} className="mr-1 inline" />Coinciden</span>
                    </div>
                  </div>
                  <Button type="submit" className="h-12 w-full bg-blue-600 font-black text-white hover:bg-blue-500" disabled={loading || !token}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar nueva contraseña"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to={`/forgot-password?access=${encodeURIComponent(access)}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300">Solicitar un nuevo enlace</Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
