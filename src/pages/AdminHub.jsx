import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Lock, Fingerprint, ShieldCheck, UsersRound,
  Settings, Wrench, ClipboardList, ChevronRight, Bug, DatabaseZap, KeyRound, Trophy
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import AdminAccessDebugPanel from "@/components/workspace/AdminAccessDebugPanel";
import PlayerIdentity from "@/pages/PlayerIdentity";
import SquadManager from "@/pages/SquadManager";
import AdminTools from "@/components/admin/AdminTools";
import AdminConfig from "@/components/admin/AdminConfig";
import AdminAudit from "@/components/admin/AdminAudit";
import RolesPermissions from "@/pages/RolesPermissions";
import UsersAccess from "@/pages/UsersAccess";
import CompetitionsAdmin from "@/pages/CompetitionsAdmin";
import ControlledYouthImporter from "@/components/admin/ControlledYouthImporter";

const SECTIONS = [
  {
    id: "users",
    label: "Usuarios y accesos",
    icon: UsersRound,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "Altas, invitaciones, roles, planteles y estado de acceso del staff",
    tags: ["Usuarios", "Invitaciones", "Planteles", "Estados"],
  },
  {
    id: "roles",
    label: "Roles y permisos",
    icon: KeyRound,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    description: "Definir qué puede hacer cada perfil con niveles simples y personalización avanzada",
    tags: ["Consultar", "Trabajar", "Gestionar", "Personalizar"],
  },
  {
    id: "identity",
    label: "Vinculación de jugadores",
    icon: Fingerprint,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    description: "Alias, cruce automático y resolución de identidades entre archivos y jugadores",
    tags: ["Alias", "Cruce automático", "Vinculación manual", "Sin reconocer", "player_id"],
  },
  {
    id: "competitions",
    label: "Competencias",
    icon: Trophy,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    description: "Base central de competencias, alias, normalización y fusión de duplicados",
    tags: ["competition_id", "Alias", "Normalización", "Fusión", "Sin vincular"],
  },
  {
    id: "youth-importer",
    label: "Importador de Juveniles",
    icon: DatabaseZap,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "Agente controlado para fixtures y posiciones de Cuarta a Novena",
    tags: ["Club automático", "Fuente oficial", "Sin duplicados", "Revisión de conflictos"],
  },
  {
    id: "squads",
    label: "Planteles",
    icon: ShieldCheck,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    description: "Crear y modificar planteles, integrantes, historial y temporadas",
    tags: ["Crear planteles", "Modificar planteles", "Integrantes", "Historial", "Temporadas"],
  },
  {
    id: "config",
    label: "Configuración general",
    icon: Settings,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    description: "Identidad, estructura deportiva, funcionalidades, integraciones y preferencias",
    tags: ["Club", "Estructura", "Módulos", "Integraciones", "Preferencias"],
  },
  {
    id: "tools",
    label: "Herramientas",
    icon: Wrench,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    description: "Sincronizar datos, reparar player_id, alias, importaciones y exportaciones",
    tags: ["Sincronizar datos", "Reparar player_id", "Reparar alias", "Recalcular estadísticas", "Importaciones", "Exportaciones"],
  },
  {
    id: "audit",
    label: "Auditoría",
    icon: ClipboardList,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
    description: "Historial de cambios: usuario, fecha, acción y módulo",
    tags: ["Historial de cambios", "Usuario", "Fecha", "Acción", "Módulo"],
  },
];

const CONFIG_SUBSECTIONS = new Set(["overview", "club", "structure", "features", "integrations", "preferences", "delivery", "advanced"]);

const SECTION_GROUPS = [
  { id: "club", label: "Configuración del club", description: "Lo que define cómo funciona esta instancia.", sectionIds: ["config", "squads", "users", "roles"] },
  { id: "data", label: "Datos e integraciones", description: "Identidades, competencias y calidad de fuentes externas.", sectionIds: ["identity", "competitions"] },
  { id: "system", label: "Sistema", description: "Herramientas técnicas y trazabilidad para administradores.", sectionIds: ["tools", "audit", "youth-importer"] },
];

function resolveRequestedAdminSection(value) {
  if (!value) return null;
  if (CONFIG_SUBSECTIONS.has(value)) return "config";
  return SECTIONS.some((section) => section.id === value) ? value : null;
}

function SectionCard({ section, onClick }) {
  const Icon = section.icon;
  return (
    <button
      onClick={() => onClick(section.id)}
      className={`w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 transition-all group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${section.bg}`}>
          <Icon size={18} className={section.color} />
        </div>
        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 mt-1 shrink-0 transition-colors" />
      </div>
      <h3 className="text-white font-semibold mt-3 mb-1">{section.label}</h3>
      <p className="text-zinc-500 text-xs mb-3">{section.description}</p>
      <div className="flex flex-wrap gap-1">
        {section.tags.map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function AdminHub() {
  const { isAdmin } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedSection = new URLSearchParams(location.search).get("section");
  const [activeSection, setActiveSection] = useState(() => resolveRequestedAdminSection(requestedSection));
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const resolved = resolveRequestedAdminSection(requestedSection);
    setActiveSection((current) => current === resolved ? current : resolved);
  }, [requestedSection]);

  function closeSection() {
    setActiveSection(null);
    if (location.search) navigate("/admin", { replace: true });
  }

  // Guard: solo administradores
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Acceso restringido a administradores</p>
        </div>
      </div>
    );
  }

  const currentSection = SECTIONS.find(s => s.id === activeSection);

  function renderContent() {
    switch (activeSection) {
      case "users":    return <UsersAccess />;
      case "roles":    return <RolesPermissions />;
      case "identity": return <PlayerIdentity />;
      case "competitions": return <CompetitionsAdmin />;
      case "youth-importer": return <ControlledYouthImporter />;
      case "squads":   return <SquadManager />;
      case "config":   return <AdminConfig />;
      case "tools":    return <AdminTools />;
      case "audit":    return <AdminAudit />;
      default:         return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administración</h1>
          <p className="text-zinc-500 text-sm mt-1">Centro de gestión de la plataforma · solo administradores</p>
        </div>
        <button
          onClick={() => setShowDebug(true)}
          title="Diagnóstico de acceso a Administración"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-yellow-400 border border-zinc-800 hover:border-yellow-500/30 hover:bg-zinc-900 transition-colors shrink-0">
          <Bug size={13} /> Diagnóstico
        </button>
      </div>

      {showDebug && <AdminAccessDebugPanel onClose={() => setShowDebug(false)} />}

      {/* Breadcrumb / back */}
      {activeSection && (
        <div className="flex items-center gap-2">
          <button
            onClick={closeSection}
            className="text-zinc-500 hover:text-white text-sm transition-colors flex items-center gap-1.5"
          >
            ← Administración
          </button>
          <span className="text-zinc-700">/</span>
          {currentSection && (
            <div className="flex items-center gap-1.5">
              {React.createElement(currentSection.icon, { size: 14, className: currentSection.color })}
              <span className="text-sm text-white font-medium">{currentSection.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid de secciones o contenido */}
      {!activeSection ? (
        <div className="space-y-7">
          {SECTION_GROUPS.map((group) => {
            const sections = group.sectionIds.map((id) => SECTIONS.find((section) => section.id === id)).filter(Boolean);
            return <section key={group.id}><div className="mb-3"><h2 className="text-sm font-black text-white">{group.label}</h2><p className="mt-1 text-xs text-zinc-600">{group.description}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{sections.map((section) => <SectionCard key={section.id} section={section} onClick={setActiveSection} />)}</div></section>;
          })}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs leading-5 text-zinc-500"><strong className="text-zinc-300">Puesta en marcha y entrega:</strong> ahora se revisan desde Configuración General → Diagnóstico y entrega. El flujo inicial <span className="font-mono text-zinc-400">/setup</span> se conserva para una instancia nueva.</div>
        </div>
      ) : (
        <div>
          {renderContent()}
        </div>
      )}
    </div>
  );
}