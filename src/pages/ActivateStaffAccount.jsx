import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  MailCheck,
} from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";
import { PerformancePitchBrand } from "@/components/auth/AccessBrand";

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

export default function ActivateStaffAccount() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const invitedEmail = useMemo(() => (params.get("email") || "").trim().toLowerCase(), [params]);
  const [email, setEmail] = useState(invitedEmail);
  const [stage, setStage] = useState("identify");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const { brand } = usePublicClubBrand();

  const normalizedEmail = email.trim().toLowerCase();
  const loginLink = normalizedEmail ? `/login?access=staff&email=${encodeURIComponent(normalizedEmail)}` : "/login?access=staff";

  async function checkAuthorization() {
    const response = await base44.functions.invoke("check-staff-authorization", { email: normalizedEmail });
    return response?.data || response;
  }

  async function continueWithEmail(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const status = await checkAuthorization();
      if (!status?.authorized) {
        setError("Este correo no tiene acceso al staff. Pedile al administrador del club que lo habilite.");
        return;
      }
      if (status.account_exists && status.is_verified) {
        setStage("existing");
      } else if (status.account_exists && !status.is_verified) {
        try { await base44.auth.resendOtp(normalizedEmail); } catch { /* Puede requerir crear contraseña primero. */ }
        setStage("verify");
      } else {
        setStage("create");
      }
    } catch (err) {
      setError(errorMessage(err, "No pudimos validar el acceso."));
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const status = await checkAuthorization();
      if (!status?.authorized) throw new Error("Este correo ya no tiene acceso habilitado.");
      await base44.auth.register({ email: normalizedEmail, password });
      setStage("verify");
    } catch (err) {
      const message = String(err?.message || "").toLowerCase();
      const statusCode = err?.response?.status || err?.status;
      if (statusCode === 409 || message.includes("exist") || message.includes("registr")) {
        setStage("existing");
      } else {
        setError(errorMessage(err, "No se pudo crear la cuenta. Podés intentar con Google o recuperar una contraseña existente."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndEnter(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await base44.auth.verifyOtp({ email: normalizedEmail, otpCode: otp.trim() });
      localStorage.setItem("performancepitch_tutorial_pending_v1", "true");
      if (password) {
        try {
          await base44.auth.loginViaEmailPassword(normalizedEmail, password);
          window.location.replace("/login?access=staff&verified=1");
          return;
        } catch { /* Si era una cuenta previa, ofrecer ingreso o recuperación. */ }
      }
      setStage("existing");
    } catch (err) {
      setError(errorMessage(err, "El código no es válido o venció."));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setError("");
    try { await base44.auth.resendOtp(normalizedEmail); }
    catch (err) { setError(errorMessage(err, "No se pudo reenviar el código.")); }
    finally { setLoading(false); }
  }

  async function requestPasswordLink() {
    setLoading(true);
    setError("");
    try {
      const status = await checkAuthorization();
      if (!status?.authorized) throw new Error("Este correo no tiene acceso habilitado.");
      await base44.auth.resetPasswordRequest(normalizedEmail);
      setResetSent(true);
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar el correo para crear o recuperar la contraseña."));
    } finally {
      setLoading(false);
    }
  }

  async function googleAccess() {
    setLoading(true);
    setError("");
    try {
      const status = await checkAuthorization();
      if (!status?.authorized) throw new Error("Este correo no tiene acceso habilitado.");
      base44.auth.loginWithProvider("google", `${window.location.origin}/login?access=staff`);
    } catch (err) {
      setError(errorMessage(err, "No se pudo iniciar con Google."));
      setLoading(false);
    }
  }

  const queryStep = params.get("step");
  React.useEffect(() => {
    if (queryStep === "verify" && invitedEmail) setStage("verify");
  }, [queryStep, invitedEmail]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080a] px-5 py-6 text-white sm:px-8">
      <div className="pointer-events-none absolute -left-24 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
          <PerformancePitchBrand />
          <div className="flex items-center gap-3">{brand.logo_url && <img src={brand.logo_url} alt={brand.club_name} className="h-10 w-10 object-contain" />}<span className="hidden text-sm font-bold text-zinc-300 sm:block">{brand.club_name}</span></div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-110px)] max-w-xl items-center py-8">
          <section className="w-full rounded-[2rem] border border-white/10 bg-zinc-900/80 p-5 shadow-[0_30px_90px_rgba(0,0,0,.5)] backdrop-blur sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
              {stage === "verify" ? <MailCheck className="text-blue-400" /> : stage === "existing" ? <KeyRound className="text-blue-400" /> : <LockKeyhole className="text-blue-400" />}
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-blue-400">Primer ingreso del staff</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {stage === "identify" ? "Ingresá tu correo" : stage === "create" ? "Creá tu contraseña" : stage === "verify" ? "Verificá tu email" : "Tu cuenta ya existe"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {stage === "identify" && "Si el club ya autorizó este correo, podés configurar tu cuenta sin depender de un enlace de invitación."}
              {stage === "create" && <>Tu acceso ya está autorizado para <strong className="text-zinc-200">{normalizedEmail}</strong>. Solo falta crear tu contraseña.</>}
              {stage === "verify" && <>Ingresá el código enviado a <strong className="text-zinc-200">{normalizedEmail}</strong>.</>}
              {stage === "existing" && <>El correo <strong className="text-zinc-200">{normalizedEmail}</strong> ya tiene una cuenta. Podés ingresar o crear una nueva contraseña.</>}
            </p>

            {error && <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm leading-5 text-red-300">{error}</div>}

            {stage === "identify" && <form onSubmit={continueWithEmail} className="mt-7 space-y-4">
              <div><Label className="text-xs font-semibold text-zinc-300">Email autorizado por el club</Label><Input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" autoFocus placeholder="correo@club.com" className="mt-1.5 h-12 border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-blue-500" required /></div>
              <Button disabled={loading || !normalizedEmail} className="h-12 w-full bg-blue-600 font-black hover:bg-blue-500">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continuar</Button>
              <Link to={loginLink} className="block text-center text-xs font-semibold text-zinc-500 hover:text-white">Ya tengo contraseña</Link>
            </form>}

            {stage === "create" && <form onSubmit={createAccount} className="mt-7 space-y-5">
              <div><Label className="text-xs font-semibold text-zinc-300">Nueva contraseña</Label><div className="relative mt-1.5"><Input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" className="h-12 border-zinc-700 bg-zinc-950 pr-11 focus:border-blue-500" placeholder="Mínimo 8 caracteres" required/><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
              <div><Label className="text-xs font-semibold text-zinc-300">Repetir contraseña</Label><Input type={showPassword ? "text" : "password"} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" className="mt-1.5 h-12 border-zinc-700 bg-zinc-950 focus:border-blue-500" required/><div className="mt-2 flex gap-3 text-[10px] font-semibold"><span className={password.length >= 8 ? "text-emerald-400" : "text-zinc-600"}><Check size={10} className="mr-1 inline"/>8 caracteres</span><span className={password && password === confirmation ? "text-emerald-400" : "text-zinc-600"}><Check size={10} className="mr-1 inline"/>Coinciden</span></div></div>
              <Button disabled={loading} className="h-12 w-full bg-blue-600 font-black hover:bg-blue-500">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Crear contraseña</Button>
              <div className="flex items-center gap-3"><div className="h-px flex-1 bg-zinc-800"/><span className="text-[10px] text-zinc-600">o</span><div className="h-px flex-1 bg-zinc-800"/></div>
              <Button type="button" variant="outline" onClick={googleAccess} disabled={loading} className="h-11 w-full border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"><GoogleIcon className="mr-2 h-5 w-5"/>Continuar con Google</Button>
            </form>}

            {stage === "verify" && <form onSubmit={verifyAndEnter} className="mt-7 space-y-5">
              <div><Label className="text-xs font-semibold text-zinc-300">Código recibido</Label><Input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} className="mt-1.5 h-16 border-zinc-700 bg-zinc-950 text-center text-2xl font-black tracking-[.35em] focus:border-blue-500" placeholder="000000" autoFocus/></div>
              <Button disabled={loading || otp.length < 4} className="h-12 w-full bg-blue-600 font-black hover:bg-blue-500">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Verificar y entrar</Button>
              <button type="button" onClick={resendOtp} disabled={loading} className="w-full text-xs font-semibold text-blue-400 hover:text-blue-300">Reenviar código</button>
            </form>}

            {stage === "existing" && <div className="mt-7 space-y-3">
              <Link to={loginLink} className="flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500">Ingresar con mi contraseña</Link>
              {resetSent ? <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 size={16} className="mt-0.5 shrink-0"/>Te enviamos el correo para crear o cambiar tu contraseña.</div> : <Button onClick={requestPasswordLink} disabled={loading} variant="outline" className="h-12 w-full border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800">Crear / recuperar contraseña</Button>}
              <Button onClick={googleAccess} disabled={loading} variant="outline" className="h-11 w-full border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"><GoogleIcon className="mr-2 h-5 w-5"/>Continuar con Google</Button>
            </div>}

            {stage !== "identify" && <button onClick={() => { setStage("identify"); setError(""); }} className="mt-6 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white"><ArrowLeft size={13}/>Cambiar correo</button>}
          </section>
        </div>
      </div>
    </main>
  );
}
