import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Loader2, ArrowLeft } from "lucide-react";
import { trackDemoEvent } from "@/lib/demoAnalytics";

export default function DemoLogin() {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const safeReturnTo = returnTo === '/administracion/crm' ? returnTo : '/demo';
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      await trackDemoEvent("login_completed", { email: email.trim() });
      window.location.href = safeReturnTo;
    } catch (err) {
      setError("Email o contraseña incorrectos. Verificá tus datos e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-white">Ingreso a la demo</h1>
            <p className="text-zinc-400 text-sm mt-1">Ingresá con tu cuenta de la demostración de PerformancePitch.</p>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs font-medium">Email</Label>
              <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-xs font-medium">Contraseña</Label>
                <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Recuperar contraseña</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-500 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingresando...</> : "Ingresar a la demo"}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={13} /> Volver</Link>
          <Link to="/demo/registro" className="text-zinc-400 hover:text-white transition-colors">¿No tenés cuenta? <span className="text-blue-400 font-semibold">Crear acceso</span></Link>
        </div>
      </div>
    </div>
  );
}