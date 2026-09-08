import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, ArrowLeft, Check } from "lucide-react";
import { trackDemoEvent } from "@/lib/demoAnalytics";

const ROLES = ["Dirigente", "Coordinación", "Cuerpo Técnico", "Preparación Física / Rendimiento", "Área Médica", "Otro"];

export default function DemoRegister() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", role: "", club_name: "" });
  const [step, setStep] = useState("form"); // form | otp
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: form.email.trim(), password: form.password });
      trackDemoEvent("registration_started", { email: form.email.trim() });
      setStep("otp");
    } catch (err) {
      setError(err?.message || "No pudimos crear el acceso. Probá con otro email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: form.email.trim(), otpCode: otp.trim() });
      await base44.auth.loginViaEmailPassword(form.email.trim(), form.password);
      await trackDemoEvent("registration_completed", {
        email: form.email.trim(),
        full_name: form.full_name,
        role_title: form.role,
        club_name: form.club_name,
      });
      window.location.href = "/demo";
    } catch (err) {
      setError(err?.message || "El código no es válido o expiró.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try { await base44.auth.resendOtp(form.email.trim()); } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield size={22} className="text-blue-400" />
          <span className="text-lg font-black text-white">Performance<span className="text-blue-400">Pitch</span></span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Conocé PerformancePitch</h1>
            <p className="text-zinc-400 text-sm mt-1">Creá tu acceso y recorré una demostración completa de la plataforma.</p>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}

          {step === "form" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs font-medium">Nombre y apellido</Label>
                <Input required value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} placeholder="Tu nombre" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs font-medium">Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setF("email", e.target.value)} placeholder="tu@email.com" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs font-medium">Club o institución <span className="text-zinc-600 font-normal">(opcional)</span></Label>
                <Input value={form.club_name} onChange={(e) => setF("club_name", e.target.value)} placeholder="Nombre del club" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs font-medium">Contraseña</Label>
                  <Input type="password" required value={form.password} onChange={(e) => setF("password", e.target.value)} placeholder="••••••••" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs font-medium">Confirmar</Label>
                  <Input type="password" required value={form.confirm} onChange={(e) => setF("confirm", e.target.value)} placeholder="••••••••" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs font-medium">Rol / función <span className="text-zinc-600 font-normal">(informativo)</span></Label>
                <select value={form.role} onChange={(e) => setF("role", e.target.value)} className="w-full h-11 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Seleccioná una opción</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-[10px] text-zinc-600">No limita qué partes de la demo podés recorrer.</p>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-600">Al crear el acceso guardaremos tus datos de contacto y la actividad dentro de la demo para brindarte seguimiento comercial.</p>
              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-500 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : "Crear acceso y entrar a la demo"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Check size={16} /> Te enviamos un código de verificación a tu email.
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs font-medium">Código de verificación</Label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500 tracking-widest text-center text-lg" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-500 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</> : "Verificar y entrar"}
              </Button>
              <button type="button" onClick={resend} className="w-full text-xs text-zinc-500 hover:text-zinc-300">Reenviar código</button>
            </form>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={13} /> Volver</Link>
          <Link to="/demo/login" className="text-zinc-400 hover:text-white transition-colors">¿Ya tenés acceso? <span className="text-blue-400 font-semibold">Ingresá a la demo</span></Link>
        </div>
      </div>
    </div>
  );
}