import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { moduleLifecycle } from "@/lib/moduleCatalog";

function normalizeIdentityText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function probableIdentityKey(player) {
  const tokens = normalizeIdentityText(player.full_name || `${player.first_name || ""} ${player.last_name || ""}`)
    .split(/\s+/)
    .filter(Boolean)
    .sort();
  return tokens.length >= 2 ? tokens.join("|") : "";
}

function duplicateGroups(rows, getKey) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return [...map.values()].filter((group) => group.length > 1);
}

function CheckRow({ status, title, detail }) {
  const Icon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;
  const cls = status === "ok" ? "text-emerald-400" : status === "warn" ? "text-amber-400" : "text-red-400";
  return <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><Icon size={16} className={`mt-0.5 shrink-0 ${cls}`} /><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-0.5 text-xs leading-5 text-zinc-500">{detail}</p></div></div>;
}

export default function CommercialReadinessPanel() {
  const { reloadInstitutionProfile } = useWorkspace();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  async function load() {
    setLoading(true);
    const [profiles, squads, roles, accesses, staff, players, memberships, modules, options] = await Promise.all([
      base44.entities.InstitutionProfile.list("-updated_at", 20).catch(() => []),
      base44.entities.Squad.filter({ active: true }, "name", 200).catch(() => []),
      base44.entities.AppRole.list("name", 200).catch(() => []),
      base44.entities.UserAccess.list("-created_date", 500).catch(() => []),
      base44.entities.StaffMember.list("last_name", 500).catch(() => []),
      base44.entities.Player.list("last_name", 1500).catch(() => []),
      base44.entities.SquadMembership.list("-effective_from", 2500).catch(() => []),
      base44.entities.InstitutionModule.list("order", 300).catch(() => []),
      base44.entities.InstitutionOption.list("order", 1000).catch(() => []),
    ]);
    setData({ profiles, squads, roles, accesses, staff, players, memberships, modules, options });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const report = useMemo(() => {
    if (!data) return null;
    const activeProfiles = data.profiles.filter((row) => row.active !== false);
    const profile = activeProfiles[0] || null;
    const activeRoles = data.roles.filter((row) => row.active !== false);
    const activeAccesses = data.accesses.filter((row) => row.active !== false);
    const activePlayers = data.players.filter((row) => row.active !== false);
    const staffIds = new Set(data.staff.map((row) => row.id));
    const playerIds = new Set(data.players.map((row) => row.id));
    const activeMemberships = data.memberships.filter((row) => !row.effective_to && row.status === "activo");
    const membershipPlayerIds = new Set(activeMemberships.map((row) => row.player_id));
    const membershipsByPlayer = new Map();
    activeMemberships.forEach((membership) => {
      if (!membershipsByPlayer.has(membership.player_id)) membershipsByPlayer.set(membership.player_id, []);
      membershipsByPlayer.get(membership.player_id).push(membership);
    });
    const multipleActiveMemberships = [...membershipsByPlayer.entries()].filter(([, rows]) => rows.length > 1);
    const orphanAccesses = activeAccesses.filter((row) => row.staff_id && !staffIds.has(row.staff_id));
    const orphanMemberships = activeMemberships.filter((row) => row.player_id && !playerIds.has(row.player_id));
    const playersWithoutSquad = data.players.filter((row) => row.active !== false && !membershipPlayerIds.has(row.id));
    const pendingAccesses = activeAccesses.filter((row) => ["not_sent", "pending_password"].includes(row.invitation_status || "not_sent"));
    const duplicateDocuments = duplicateGroups(activePlayers, (player) => normalizeIdentityText(player.dni || player.document_number).replace(/\s+/g, ""));
    const probableDuplicateNames = duplicateGroups(activePlayers, probableIdentityKey);
    const incompletePlayers = activePlayers.filter((player) => {
      const residence = player.residence_zone || (["AMBA", "INTERIOR", "EXTERIOR"].includes(player.current_residence) ? player.current_residence : "");
      const contract = player.contract_status || (player.has_contract === true ? "Con contrato" : "Sin información");
      const housing = player.housing_type || "Sin información";
      return !player.dominant_leg || !residence || housing === "Sin información" || contract === "Sin información";
    });
    const productModules = data.modules.filter((row) => moduleLifecycle(row.module_id).status === "available");
    const enabledProductModules = productModules.filter((row) => row.enabled !== false);
    const unavailableEnabledModules = data.modules.filter((row) => moduleLifecycle(row.module_id).status === "unavailable" && row.enabled !== false);
    const seasonOptions = data.options.filter((row) => row.group === "season" && row.active !== false);
    const positionOptions = data.options.filter((row) => row.group === "player_position" && row.active !== false);
    const activeRoleIds = new Set(activeRoles.map((role) => role.id));
    const accessesWithInvalidRoles = activeAccesses.filter((access) => (access.role_ids || []).some((roleId) => !activeRoleIds.has(roleId)));
    const adminRoleIds = new Set(activeRoles.filter((role) => role.can_admin === true || /admin/i.test(role.name || "")).map((role) => role.id));
    const activeAdmins = activeAccesses.filter((access) => access.can_admin || /admin/i.test(String(access.role || "")) || (access.role_ids || []).some((roleId) => adminRoleIds.has(roleId)));
    const defaultSquadValid = !profile?.default_squad_id || data.squads.some((squad) => squad.id === profile.default_squad_id);
    const defaultSeasonValid = !profile?.default_season || seasonOptions.some((season) => String(season.label) === String(profile.default_season));

    const checks = [
      { status: activeProfiles.length === 1 ? "ok" : "error", title: "Perfil institucional único", detail: activeProfiles.length === 1 ? `${profile?.official_name || "Club"} es la única identidad activa.` : `Hay ${activeProfiles.length} perfiles institucionales activos. Debe quedar exactamente uno.` },
      { status: profile?.official_name && profile.official_name !== "Club" && profile?.shield_url ? "ok" : "error", title: "Identidad del club", detail: profile?.official_name && profile.official_name !== "Club" && profile?.shield_url ? "Nombre y escudo institucional configurados." : "Falta completar nombre institucional o escudo antes de entregar." },
      { status: data.squads.length ? "ok" : "error", title: "Planteles", detail: data.squads.length ? `${data.squads.length} planteles activos configurados.` : "No hay planteles activos." },
      { status: activeRoles.length ? "ok" : "error", title: "Roles y permisos", detail: activeRoles.length ? `${activeRoles.length} roles activos disponibles.` : "No hay roles activos configurados." },
      { status: productModules.length ? "ok" : "warn", title: "Funcionalidades del club", detail: productModules.length ? `${enabledProductModules.length} de ${productModules.length} módulos de producto están habilitados. Los flags técnicos y legacy no se cuentan como funcionalidades comerciales.` : "Todavía no existe configuración institucional de funcionalidades." },
      { status: unavailableEnabledModules.length ? "warn" : "ok", title: "Módulos sin ruta operativa", detail: unavailableEnabledModules.length ? `${unavailableEnabledModules.length} módulos marcados como no disponibles siguen habilitados y conviene ocultarlos.` : "No hay módulos sin ruta operativa habilitados." },
      { status: seasonOptions.length && positionOptions.length ? "ok" : "warn", title: "Catálogos institucionales", detail: `${seasonOptions.length} temporadas y ${positionOptions.length} posiciones activas en configuración compartida.` },
      { status: orphanAccesses.length ? "error" : "ok", title: "Integridad de accesos de staff", detail: orphanAccesses.length ? `${orphanAccesses.length} accesos activos apuntan a perfiles de staff inexistentes.` : `${activeAccesses.length} accesos activos sin vínculos rotos detectados.` },
      { status: orphanMemberships.length ? "error" : "ok", title: "Integridad de planteles", detail: orphanMemberships.length ? `${orphanMemberships.length} membresías activas apuntan a jugadores inexistentes.` : "No se detectaron membresías activas huérfanas." },
      { status: multipleActiveMemberships.length ? "error" : "ok", title: "Un solo plantel canónico por jugador", detail: multipleActiveMemberships.length ? `${multipleActiveMemberships.length} jugadores tienen más de una membresía activa. Debe resolverse antes de entregar.` : "No hay jugadores con múltiples planteles activos." },
      { status: playersWithoutSquad.length ? "warn" : "ok", title: "Jugadores sin plantel vigente", detail: playersWithoutSquad.length ? `${playersWithoutSquad.length} jugadores activos no tienen SquadMembership vigente.` : "Todos los jugadores activos tienen un plantel vigente." },
      { status: duplicateDocuments.length ? "error" : "ok", title: "Documentos únicos", detail: duplicateDocuments.length ? `${duplicateDocuments.length} grupos de jugadores activos comparten el mismo documento. Deben resolverse antes de entregar.` : "No se detectaron documentos repetidos entre jugadores activos." },
      { status: probableDuplicateNames.length ? "warn" : "ok", title: "Posibles identidades duplicadas", detail: probableDuplicateNames.length ? `${probableDuplicateNames.length} grupos tienen el mismo nombre aunque esté invertido o escrito con distinto formato. Ejemplo: ${probableDuplicateNames[0].map((player) => player.full_name).join(" / ")}. Revisar antes de fusionar.` : "No se detectaron nombres equivalentes entre jugadores activos." },
      { status: pendingAccesses.length ? "warn" : "ok", title: "Altas de staff pendientes", detail: pendingAccesses.length ? `${pendingAccesses.length} accesos están pendientes de envío o creación de contraseña.` : "No hay altas de staff pendientes detectadas." },
      { status: accessesWithInvalidRoles.length ? "error" : "ok", title: "Roles asignados vigentes", detail: accessesWithInvalidRoles.length ? `${accessesWithInvalidRoles.length} accesos activos referencian roles inexistentes o desactivados.` : "Todos los role_ids asignados pertenecen a roles activos." },
      { status: activeAdmins.length ? (activeAdmins.length > 1 ? "ok" : "warn") : "error", title: "Administradores activos", detail: activeAdmins.length ? `${activeAdmins.length} administrador${activeAdmins.length === 1 ? "" : "es"} activo${activeAdmins.length === 1 ? "" : "s"}. ${activeAdmins.length === 1 ? "Conviene definir un segundo contacto de respaldo." : "Existe respaldo administrativo."}` : "No se detectó ningún administrador activo." },
      { status: defaultSquadValid && defaultSeasonValid ? "ok" : "warn", title: "Predeterminados institucionales", detail: !defaultSquadValid ? "El plantel predeterminado no existe o está inactivo." : !defaultSeasonValid ? "La temporada predeterminada no pertenece al catálogo vigente." : "Plantel y temporada predeterminados son válidos o están sin definir." },
      { status: incompletePlayers.length ? "warn" : "ok", title: "Calidad de datos del jugador", detail: incompletePlayers.length ? `${incompletePlayers.length} jugadores activos tienen pendiente pierna, residencia, pensión o situación contractual.` : "Datos administrativos básicos completos." },
      { status: profile?.domain_status === "activo" ? "ok" : "warn", title: "Dominio y entrega", detail: profile?.domain_status === "activo" ? `Dominio activo${profile?.custom_domain ? `: ${profile.custom_domain}` : "."}` : profile?.custom_domain ? `Dominio solicitado: ${profile.custom_domain} · estado ${profile.domain_status || "pendiente"}. Todavía no se considera entregado.` : "Dominio personalizado pendiente; no bloquea el uso interno de la instancia." },
    ];
    const blockers = checks.filter((item) => item.status === "error").length;
    const warnings = checks.filter((item) => item.status === "warn").length;
    return { profile, checks, blockers, warnings, incompletePlayers: incompletePlayers.length };
  }, [data]);

  async function markReady() {
    if (!report?.profile?.id || report.blockers > 0) return;
    setMarking(true);
    try {
      await base44.entities.InstitutionProfile.update(report.profile.id, { handoff_ready: true, handoff_at: new Date().toISOString() });
      await reloadInstitutionProfile();
      await load();
      toast({ title: "Instancia marcada como lista para entrega" });
    } catch (error) {
      toast({ title: "No se pudo actualizar el estado de entrega", description: error?.message, variant: "destructive" });
    } finally { setMarking(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 size={20} className="mr-2 animate-spin" /> Auditando instancia…</div>;
  if (!report) return null;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-white">Estado de preparación comercial</h2><p className="mt-1 text-xs text-zinc-500">Control de identidad, configuración, accesos, planteles y calidad de datos antes de entregar una instancia.</p></div>
      <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><RefreshCw size={13} /> Recalcular</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Bloqueos</p><p className={`mt-2 text-2xl font-black ${report.blockers ? "text-red-400" : "text-emerald-400"}`}>{report.blockers}</p></div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Advertencias</p><p className={`mt-2 text-2xl font-black ${report.warnings ? "text-amber-400" : "text-emerald-400"}`}>{report.warnings}</p></div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs text-zinc-500">Estado</p><p className="mt-2 flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck size={18} className={report.blockers ? "text-red-400" : "text-emerald-400"} /> {report.blockers ? "Requiere correcciones" : "Sin bloqueos críticos"}</p></div>
    </div>

    <div className="grid gap-2 lg:grid-cols-2">{report.checks.map((check) => <CheckRow key={check.title} {...check} />)}</div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div><p className="text-sm font-semibold text-white">Handoff comercial</p><p className="mt-0.5 text-xs text-zinc-500">Marcar como lista no borra datos ni cambia permisos; registra que la instancia pasó el control técnico.</p></div>
      <button type="button" onClick={markReady} disabled={report.blockers > 0 || marking || report.profile?.handoff_ready} className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40">{report.profile?.handoff_ready ? "Instancia lista" : marking ? "Guardando…" : "Marcar lista para entrega"}</button>
    </div>
  </div>;
}
