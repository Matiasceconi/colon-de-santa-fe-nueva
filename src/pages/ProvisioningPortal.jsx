import React, { useMemo, useState } from "react";
import {
  Building2, CheckCircle2, ChevronRight, DatabaseZap, Globe2, KeyRound, LogOut,
  ShieldCheck, Trophy, Plug, UserCog, UserPlus, UsersRound
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import InstitutionSettingsPanel from "@/components/admin/InstitutionSettingsPanel";
import SquadManager from "@/pages/SquadManager";
import Players from "@/pages/Players";
import StaffManager from "@/pages/StaffManager";
import RolesPermissions from "@/pages/RolesPermissions";
import UsersAccess from "@/pages/UsersAccess";
import CompetitionsAdmin from "@/pages/CompetitionsAdmin";
import FootballApiPanel from "@/components/admin/FootballApiPanel";
import ControlledYouthImporter from "@/components/admin/ControlledYouthImporter";
import DomainDeliveryPanel from "@/components/admin/DomainDeliveryPanel";

const SECTIONS = [
  { id: "club", label: "Configuración del club", short: "Escudo, colores e información", icon: Building2 },
  { id: "squads", label: "Planteles", short: "Categorías y temporadas", icon: UsersRound },
  { id: "competitions", label: "Competencias", short: "Torneos, copas y logo", icon: Trophy },
  { id: "football-api", label: "API de Fútbol", short: "Conexión con API-Football", icon: Plug },
  { id: "youth-importer", label: "Importador juveniles", short: "Cuarta a Novena · control automático", icon: DatabaseZap },
  { id: "players", label: "Jugadores", short: "Carga y asignación", icon: UserPlus },
  { id: "staff", label: "Cuerpo técnico y staff", short: "Personas responsables", icon: UserCog },
  { id: "roles", label: "Roles y permisos", short: "Módulos y acciones", icon: KeyRound },
  { id: "users", label: "Usuarios y accesos", short: "Invitaciones y planteles", icon: ShieldCheck },
  { id: "domain", label: "Dominio y entrega", short: "DNS y control final", icon: Globe2 },
];

export default function ProvisioningPortal() {
  const { user, logout } = useAuth();
  const { isAdmin, squads = [], institutionProfile, clubBrand } = useWorkspace();
  const [active, setActive] = useState("club");

  const completed = useMemo(() => ({
    club: !!(institutionProfile?.official_name && institutionProfile?.official_name !== "Club" && institutionProfile?.shield_url && institutionProfile?.brand_primary),
    squads: squads.some((s) => s.active !== false),
    domain: !!institutionProfile?.handoff_ready,
  }), [institutionProfile, squads]);

  if (!isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-zinc-400">Tu cuenta no tiene permisos de preparación.</div>;
  }

  function content() {
    switch (active) {
      case "club": return <InstitutionSettingsPanel isAdmin squads={squads} />;
      case "squads": return <SquadManager />;
      case "competitions": return <CompetitionsAdmin />;
      case "football-api": return <FootballApiPanel />;
      case "youth-importer": return <ControlledYouthImporter />;
      case "players": return <Players />;
      case "staff": return <StaffManager />;
      case "roles": return <RolesPermissions />;
      case "users": return <UsersAccess />;
      case "domain": return <DomainDeliveryPanel />;
      default: return null;
    }
  }

  const activeSection = SECTIONS.find((section) => section.id === active);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
              {clubBrand?.logoUrl ? <img src={clubBrand.logoUrl} alt="" className="h-8 w-8 object-contain" /> : <ShieldCheck size={20} className="text-blue-400" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{clubBrand?.name || "Software Base para Clubes"}</p>
              <p className="truncate text-xs text-zinc-500">Preparación del cliente · {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/portal-preview" target="_blank" rel="noreferrer" className="hidden rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 sm:inline-flex">Vista previa del ingreso</a>
            <button onClick={() => logout("/")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"><LogOut size={14} /> Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-5 px-4 py-5 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-6">
        <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900 p-3 lg:sticky lg:top-20">
          <div className="px-3 pb-3 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400">Configuración de entrega</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Solo aparecen las herramientas necesarias para preparar esta copia.</p>
          </div>
          <nav className="space-y-1">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const selected = section.id === active;
              const done = !!completed[section.id];
              return (
                <button key={section.id} onClick={() => setActive(section.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-blue-500/35 bg-blue-500/12" : "border-transparent hover:border-zinc-700 hover:bg-zinc-800/60"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-blue-500/15 text-blue-300" : "bg-zinc-800 text-zinc-500"}`}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${selected ? "text-white" : "text-zinc-300"}`}>{index + 1}. {section.label}</span>
                    <span className="block truncate text-[10px] text-zinc-600">{section.short}</span>
                  </span>
                  {done ? <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> : <ChevronRight size={15} className="shrink-0 text-zinc-700" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Paso de configuración</p>
            <h1 className="mt-1 text-xl font-black text-white">{activeSection?.label}</h1>
            <p className="mt-1 text-xs text-zinc-500">{activeSection?.short}</p>
          </div>
          <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-1 sm:p-2 lg:p-4">
            {content()}
          </section>
        </main>
      </div>
    </div>
  );
}