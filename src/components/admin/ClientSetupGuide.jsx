import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, Circle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

const emptyCounts = { squads: 0, roles: 0, staff: 0, accesses: 0 };

export default function ClientSetupGuide() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState(emptyCounts);
  const [institutionReady, setInstitutionReady] = useState(false);
  const [institution, setInstitution] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [institutions, squads, roles, staff, accesses] = await Promise.all([
        base44.entities.InstitutionProfile.filter({ active: true }, "-updated_at", 1).catch(() => []),
        base44.entities.Squad.filter({ active: true }, "name", 100).catch(() => []),
        base44.entities.AppRole.filter({ active: true }, "name", 100).catch(() => []),
        base44.entities.StaffMember.filter({ active: true }, "first_name", 200).catch(() => []),
        base44.entities.UserAccess.filter({ active: true }, "-created_date", 200).catch(() => []),
      ]);
      const activeInstitution = institutions[0] || null;
      setInstitution(activeInstitution);
      setInstitutionReady(!!activeInstitution && activeInstitution.official_name !== "Club" && !!activeInstitution.shield_url);
      setCounts({ squads: squads.length, roles: roles.length, staff: staff.length, accesses: accesses.length });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const steps = useMemo(() => [
    { done: institutionReady, title: "Identidad institucional", detail: "Nombre, escudo, colores, zona horaria y datos del club.", action: "Administración → Configuración" },
    { done: counts.squads > 0, title: "Planteles y temporadas", detail: "Creá los planteles que utilizarán la plataforma.", action: "Administración → Planteles" },
    { done: counts.roles > 0, title: "Roles y permisos", detail: "Definí qué módulos puede ver, crear, editar, eliminar y exportar cada rol.", action: "Administración → Roles, Áreas y Permisos" },
    { done: counts.staff > 0, title: "Cuerpo técnico y staff", detail: "Cargá a las personas antes de crearles una cuenta.", action: "Administración → Cuerpo Técnico y Staff" },
    { done: counts.accesses > 0, title: "Usuarios e invitaciones", detail: "Vinculá cada email con un miembro del staff, un rol y uno o más planteles.", action: "Administración → Usuarios y Accesos" },
    { done: false, title: "Dominio propio", detail: "En Base44 abrí Settings → Domains, agregá el dominio o subdominio del club y completá los registros DNS solicitados.", action: "Se completa fuera de la aplicación" },
    { done: false, title: "Prueba final de entrega", detail: "Probá un administrador, un usuario de lectura y un jugador; verificá recuperación de contraseña y cierre de sesión.", action: "Usar cuentas de prueba distintas" },
  ], [institutionReady, counts]);

  const completed = steps.filter((s) => s.done).length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-blue-400" size={22} />
          <div>
            <h2 className="font-bold text-white">Puesta en marcha del club</h2>
            <p className="mt-1 text-sm text-zinc-400">Esta copia es una instancia independiente. Su appId, usuarios y base de datos quedan separados de los demás clubes.</p>
            <p className="mt-2 text-xs text-zinc-500">Administrador actual: {user?.email || "—"} · Avance: {completed}/{steps.length}</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
            {institution?.shield_url ? <img src={institution.shield_url} alt="" className="h-10 w-10 object-contain" /> : <ShieldCheck size={20} className="text-zinc-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white">Pantalla pública de ingreso</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Ya no se configura por separado. Nombre, escudo, colores y email se sincronizan automáticamente desde la identidad institucional para evitar dos versiones distintas del club.</p>
            <p className="mt-3 text-sm font-bold text-white">{institution?.official_name || "Club sin configurar"}</p>
            <p className="text-xs text-zinc-600">{institution?.institutional_email || "Sin email institucional"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            {step.done ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={19} /> : <Circle className="mt-0.5 shrink-0 text-zinc-600" size={19} />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{index + 1}. {step.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{step.detail}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-400"><ExternalLink size={11} /> {step.action}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
        Antes de clonar esta plantilla, no cargues datos reales de ningún club. Después de clonar, cambiá el nombre de la app, configurá el dominio y verificá que la nueva copia tenga su propio appId.
      </div>
    </div>
  );
}
