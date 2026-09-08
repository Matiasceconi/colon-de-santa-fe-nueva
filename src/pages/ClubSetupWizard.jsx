import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Building2, UsersRound, KeyRound, UserPlus, ShieldCheck, Globe2, CheckCircle2, Circle, Lock, RefreshCw, BookOpen } from "lucide-react";

const STEPS = [
  { id: "identity", title: "Identidad del club", description: "Nombre, escudo, colores y datos institucionales desde Configuración General.", icon: Building2, path: "/admin?section=club" },
  { id: "squads", title: "Planteles", description: "Crear Primera, Reserva, Juveniles y definir la temporada de cada uno.", icon: UsersRound, path: "/squad-manager" },
  { id: "roles", title: "Roles y permisos", description: "Definir qué puede ver, crear, editar, borrar y exportar cada rol.", icon: KeyRound, path: "/roles-permissions" },
  { id: "staff", title: "Staff y usuarios", description: "Vincular personas, asignar planteles y enviar invitaciones individuales.", icon: UserPlus, path: "/team" },
  { id: "security", title: "Revisión de seguridad", description: "Comprobar administradores, usuarios activos y accesos mínimos necesarios.", icon: ShieldCheck, path: "/team" },
  { id: "domain", title: "Dominio y entrega", description: "Conectar el dominio propio, probar accesos y completar el acta de entrega.", icon: Globe2, path: "/implementation-guide" },
];

export default function ClubSetupWizard() {
  const { isAdmin, institutionProfile, squads = [], clubBrand } = useWorkspace();
  const [counts, setCounts] = useState({ roles: 0, staff: 0, users: 0, admins: 0 });
  const [loading, setLoading] = useState(true);

  async function loadReadiness() {
    setLoading(true);
    try {
      const [roles, staff, users] = await Promise.all([
        base44.entities.AppRole.list("-created_date", 200),
        base44.entities.StaffMember.list("-created_date", 500),
        base44.entities.UserAccess.list("-created_date", 500),
      ]);
      const activeRoles = (roles || []).filter((role) => role.active !== false);
      const adminRoleIds = new Set(activeRoles.filter((role) => role.can_admin === true || /admin/i.test(role.name || "")).map((role) => role.id));
      const activeUsers = (users || []).filter((u) => u.active !== false);
      setCounts({
        roles: activeRoles.length,
        staff: staff?.filter(s => s.active !== false).length || 0,
        users: activeUsers.length,
        admins: activeUsers.filter((u) => u.can_admin || /admin/i.test(String(u.role || "")) || (u.role_ids || []).some((roleId) => adminRoleIds.has(roleId))).length,
      });
    } catch (error) {
      console.error("No se pudo calcular la preparación", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) loadReadiness(); }, [isAdmin]);

  const ready = useMemo(() => ({
    identity: Boolean(institutionProfile?.official_name && institutionProfile?.official_name !== "Club" && institutionProfile?.shield_url && institutionProfile?.brand_primary),
    squads: squads.some(s => s.active !== false),
    roles: counts.roles > 0,
    staff: counts.staff > 0 && counts.users > 0,
    security: counts.admins > 0,
    domain: institutionProfile?.domain_status === "activo",
  }), [institutionProfile, squads, counts]);

  const completed = Object.values(ready).filter(Boolean).length;
  const percentage = Math.round((completed / STEPS.length) * 100);

  if (!isAdmin) return <div className="flex h-64 items-center justify-center text-center"><div><Lock className="mx-auto mb-3 text-zinc-600" /><p className="text-sm text-zinc-500">Esta puesta en marcha es exclusiva para administradores.</p></div></div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Puesta en marcha</span>
            <h1 className="mt-2 text-3xl font-black text-white">{clubBrand?.name || "Nuevo club"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Completá estos pasos antes de entregar el acceso. La configuración se aplica solo a esta copia y no comparte datos con otros clubes.</p>
          </div>
          <div className="min-w-52 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-5">
            <div className="flex items-end justify-between"><strong className="text-3xl text-white">{percentage}%</strong><span className="text-xs text-zinc-500">{completed}/{STEPS.length} pasos</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: percentage + "%" }} /></div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-white">Lista de preparación</h2><p className="text-sm text-zinc-500">El estado se calcula con los datos reales de esta instancia.</p></div>
        <button onClick={loadReadiness} disabled={loading} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = ready[step.id];
          return (
            <Link key={step.id} to={step.path} className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-blue-500/40 hover:bg-zinc-900/80">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-blue-400"><Icon size={20} /></span>
                {done ? <CheckCircle2 className="text-emerald-400" size={21} /> : <Circle className="text-zinc-700" size={21} />}
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-600">Paso {index + 1}</p>
              <h3 className="mt-1 font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{step.description}</p>
              <p className="mt-4 text-xs font-bold text-blue-400">{done ? "Revisar configuración" : "Configurar ahora"} →</p>
            </Link>
          );
        })}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white"><ShieldCheck size={18} className="text-emerald-400" /> Reglas obligatorias antes de entregar</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li>• Debe existir al menos un administrador activo y un segundo contacto de respaldo.</li>
            <li>• Cada usuario debe tener únicamente sus planteles y áreas de trabajo.</li>
            <li>• Las invitaciones son personales; no se comparten cuentas entre integrantes.</li>
            <li>• Probar ingreso de staff y jugador en una ventana privada antes de publicar el dominio.</li>
          </ul>
        </div>
        <Link to="/implementation-guide" className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-cyan-500/40">
          <BookOpen className="text-cyan-400" size={22} />
          <h3 className="mt-4 font-bold text-white">Guía completa de configuración y entrega</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Incluye permisos recomendados, altas y bajas, dominio propio, prueba de seguridad y procedimiento de clonación.</p>
          <p className="mt-4 text-xs font-bold text-cyan-400">Abrir guía →</p>
        </Link>
      </section>
    </div>
  );
}
