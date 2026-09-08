import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Activity, AlertTriangle, Apple, Boxes, Building2, CheckCircle2, ChevronRight,
  Database, ExternalLink, Gauge, HeartPulse, Layers3, Plug, Plus, Save, Settings2,
  ShieldCheck, SlidersHorizontal, Trash2, Trophy, UsersRound, Wrench
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import NutritionSettingsPanel from "@/components/nutrition/NutritionSettingsPanel";
import ClubSettingsPanel from "@/components/clubs/ClubSettingsPanel";
import InstitutionSettingsPanel from "@/components/admin/InstitutionSettingsPanel";
import GPSReferenceSettingsPanel from "@/components/admin/GPSReferenceSettingsPanel";
import CompetitionIntegrationPanel from "@/components/admin/CompetitionIntegrationPanel";
import CommercialReadinessPanel from "@/components/admin/CommercialReadinessPanel";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { MODULES } from "@/lib/areasConfig";
import { FEATURE_PRESETS, moduleLifecycle } from "@/lib/moduleCatalog";
import { POSITION_GROUP_OPTIONS, inferPositionGroup } from "@/lib/sportsStructure";

const DEFAULT_SEASONS = ["2026"];
const DEFAULT_CATEGORIES = ["Sub-14", "Sub-15", "Sub-16", "Sub-17", "Sub-18", "Sub-20", "Reserva", "Primera"];
const DEFAULT_POSITIONS = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Interno", "Extremo Derecho", "Extremo Izquierdo",
  "Delantero Centro"
];

const NAV_ITEMS = [
  { id: "overview", label: "Resumen", description: "Estado general de la configuración", icon: ShieldCheck },
  { id: "club", label: "Club e identidad", description: "Nombre, escudo, colores y datos", icon: Building2 },
  { id: "structure", label: "Estructura deportiva", description: "Planteles, temporadas y posiciones", icon: Layers3 },
  { id: "features", label: "Funcionalidades", description: "Qué partes usa este club", icon: Boxes },
  { id: "integrations", label: "Integraciones", description: "Fuentes externas y modo manual", icon: Plug },
  { id: "preferences", label: "Preferencias y exportaciones", description: "Zona horaria, unidades e informes", icon: SlidersHorizontal },
  { id: "delivery", label: "Diagnóstico y entrega", description: "Accesos, integridad y preparación comercial", icon: ShieldCheck },
  { id: "advanced", label: "Configuración avanzada", description: "GPS, nutrición y datos maestros", icon: Wrench },
];

const PRODUCT_GROUPS = [
  {
    id: "operation",
    label: "Operación deportiva",
    description: "Trabajo diario del cuerpo técnico, planteles y accesos.",
    icon: UsersRound,
    moduleIds: ["club_dashboard", "dashboard", "sesiones", "partidos", "calendario", "jugadores", "cuerpo_tecnico", "gestion_planteles", "accesos_jugadores"],
  },
  {
    id: "performance",
    label: "Rendimiento",
    description: "Carga, evaluaciones y seguimiento del rendimiento.",
    icon: Gauge,
    moduleIds: ["rendimiento_dashboard", "carga_externa", "carga_interna", "minutos_jugados", "evaluaciones"],
  },
  {
    id: "health",
    label: "Salud",
    description: "Áreas médica y nutricional.",
    icon: HeartPulse,
    moduleIds: ["area_medica", "nutricion"],
  },
  {
    id: "resources",
    label: "Recursos de entrenamiento",
    description: "Bibliotecas y planes complementarios.",
    icon: Database,
    moduleIds: ["biblioteca_campo", "biblioteca_fuerza", "planes_complementarios"],
  },
  {
    id: "competition",
    label: "Competencias",
    description: "Fixture, tablas y contexto competitivo.",
    icon: Trophy,
    moduleIds: ["competencias_afa"],
  },
];

const PRODUCT_MODULE_IDS = new Set(PRODUCT_GROUPS.flatMap((group) => group.moduleIds));
const MODULE_MAP = new Map(MODULES.map((module) => [module.id, module]));

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function optionKey(value) {
  return normalizeLabel(value).replace(/\s+/g, "-") || "opcion";
}

function ListEditor({ items, placeholder, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-200">
            {item}
            <button type="button" onClick={() => onRemove(index)} className="ml-1 text-zinc-500 transition hover:text-red-400" title={`Quitar ${item}`}>
              <Trash2 size={10} />
            </button>
          </span>
        ))}
        {!items.length && <span className="text-xs italic text-zinc-600">Sin elementos</span>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); const value = input.trim(); if (!value) return; onAdd(value); setInput(""); }} className="flex gap-2">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/60" />
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"><Plus size={12} />Agregar</button>
      </form>
    </div>
  );
}

function PositionCatalogEditor({ items, groups, onItemsChange, onGroupChange }) {
  const [input, setInput] = useState("");
  function add() {
    const label = input.trim();
    if (!label || items.some((item) => normalizeLabel(item) === normalizeLabel(label))) return;
    onItemsChange([...items, label]);
    onGroupChange(optionKey(label), inferPositionGroup(label) || "");
    setInput("");
  }
  return <div className="space-y-3">
    <div className="space-y-2">{items.map((item, index) => {
      const key = optionKey(item);
      return <div key={`${key}-${index}`} className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 sm:grid-cols-[1fr_150px_auto] sm:items-center">
        <input value={item} onChange={(event) => { const next = [...items]; const previousKey = optionKey(item); next[index] = event.target.value; onItemsChange(next); const nextKey = optionKey(event.target.value); if (nextKey !== previousKey) onGroupChange(nextKey, groups[previousKey] || inferPositionGroup(event.target.value) || ""); }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-500/60" />
        <select value={groups[key] || inferPositionGroup(item) || ""} onChange={(event) => onGroupChange(key, event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none">
          <option value="">Sin grupo</option>{POSITION_GROUP_OPTIONS.map((group) => <option key={group} value={group}>{group}</option>)}
        </select>
        <button type="button" onClick={() => onItemsChange(items.filter((_, i) => i !== index))} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400" title={`Quitar ${item}`}><Trash2 size={14}/></button>
      </div>;
    })}</div>
    <div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="ej: Carrilero" className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/60"/><button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"><Plus size={12}/>Agregar</button></div>
  </div>;
}

function StatusPill({ tone = "neutral", children }) {
  const cls = tone === "ok"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    : tone === "warn"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
      : tone === "error"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-400";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${cls}`}>{children}</span>;
}

function SectionHeader({ eyebrow, title, description, action = null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ModuleToggle({ module, row, saving, onToggle, isAdmin }) {
  const enabled = row ? row.enabled !== false : true;
  const protectedModule = row?.protected === true;
  return (
    <button
      type="button"
      onClick={() => onToggle(module)}
      disabled={!isAdmin || protectedModule || saving}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${enabled ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-zinc-800 bg-zinc-950/50"} disabled:cursor-default`}
    >
      <div className="min-w-0">
        <p className={`truncate text-xs font-bold ${enabled ? "text-white" : "text-zinc-500"}`}>{module.label}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{protectedModule ? "Esencial · siempre activo" : enabled ? "Habilitado" : "Oculto"}</p>
      </div>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

export default function AdminConfig() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, squads = [], institutionError, institutionProfile, activeSquadId, activeSeasonId, reloadWorkspace } = useWorkspace();
  const requestedSection = new URLSearchParams(location.search).get("section");
  const validRequestedSection = NAV_ITEMS.some((item) => item.id === requestedSection) ? requestedSection : null;
  const [section, setSection] = useState(validRequestedSection || "overview");
  const [advancedTab, setAdvancedTab] = useState("gps");
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [positionGroups, setPositionGroups] = useState(() => Object.fromEntries(DEFAULT_POSITIONS.map((position) => [optionKey(position), inferPositionGroup(position)])));
  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [institutionModuleRows, setInstitutionModuleRows] = useState([]);
  const [moduleSavingId, setModuleSavingId] = useState("");
  const [savingCatalogs, setSavingCatalogs] = useState(false);
  const [nutritionStatuses, setNutritionStatuses] = useState([]);
  const [nutritionReferences, setNutritionReferences] = useState([]);
  const [rivalClubs, setRivalClubs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [structureRepairing, setStructureRepairing] = useState("");
  const [competitionSettings, setCompetitionSettings] = useState([]);
  const [gpsConfigs, setGpsConfigs] = useState([]);

  async function loadAll() {
    const [statuses, references, clubRows, matchRows, options, modules, playerRows, membershipRows, competitionRows, gpsRows] = await Promise.all([
      base44.entities.NutritionReadingStatus.list("order", 100).catch(() => []),
      base44.entities.NutritionReferenceRange.list("order", 200).catch(() => []),
      base44.entities.RivalClub.list("official_name", 500).catch(() => []),
      base44.entities.MatchReport.list("-date", 500).catch(() => []),
      base44.entities.InstitutionOption.list("order", 500).catch(() => []),
      base44.entities.InstitutionModule.list("order", 200).catch(() => []),
      base44.entities.Player.list("full_name", 1500).catch(() => []),
      base44.entities.SquadMembership.list("-effective_from", 2500).catch(() => []),
      base44.entities.CompetitionIntegrationSettings.list("-updated_at", 50).catch(() => []),
      base44.entities.GPSReferenceConfiguration.list("-updated_at", 200).catch(() => []),
    ]);
    setNutritionStatuses(statuses);
    setNutritionReferences(references);
    setRivalClubs(clubRows);
    setMatches(matchRows);
    setInstitutionOptions(options);
    setInstitutionModuleRows(modules);
    setPlayers(playerRows);
    setMemberships(membershipRows);
    setCompetitionSettings(competitionRows);
    setGpsConfigs(gpsRows);

    const active = (group) => options
      .filter((row) => row.group === group && row.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((row) => row.label);
    const seasonRows = active("season");
    const categoryRows = active("player_category");
    const positionRows = active("player_position");
    setSeasons(seasonRows.length ? seasonRows : DEFAULT_SEASONS);
    setCategories(categoryRows.length ? categoryRows : DEFAULT_CATEGORIES);
    const resolvedPositions = positionRows.length ? positionRows : DEFAULT_POSITIONS;
    setPositions(resolvedPositions);
    const activePositionRows = options.filter((row) => row.group === "player_position" && row.active !== false);
    setPositionGroups(Object.fromEntries(resolvedPositions.map((label) => {
      const row = activePositionRows.find((item) => optionKey(item.label) === optionKey(label));
      return [optionKey(label), row?.metadata?.position_group || inferPositionGroup(label) || ""];
    })));
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (validRequestedSection && validRequestedSection !== section) setSection(validRequestedSection);
  }, [validRequestedSection]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("section") === section) return;
    params.set("section", section);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [section]);

  async function syncOptionGroup(group, labels) {
    const existing = institutionOptions.filter((row) => row.group === group);
    const byKey = new Map(existing.map((row) => [row.key, row]));
    const desiredKeys = new Set();
    for (let index = 0; index < labels.length; index += 1) {
      const label = labels[index].trim();
      if (!label) continue;
      const key = optionKey(label);
      desiredKeys.add(key);
      const current = byKey.get(key);
      const metadata = group === "player_position"
        ? { ...(current?.metadata || {}), position_group: positionGroups[key] || inferPositionGroup(label) || "" }
        : (current?.metadata || {});
      if (current) await base44.entities.InstitutionOption.update(current.id, { label, order: index, active: true, metadata });
      else await base44.entities.InstitutionOption.create({ group, key, label, order: index, active: true, system: group === "player_position", metadata });
    }
    await Promise.all(existing.filter((row) => !desiredKeys.has(row.key) && row.active !== false).map((row) => base44.entities.InstitutionOption.update(row.id, { active: false })));
  }

  async function saveCatalogs() {
    if (!isAdmin) return;
    setSavingCatalogs(true);
    try {
      await syncOptionGroup("season", seasons);
      await syncOptionGroup("player_category", categories);
      await syncOptionGroup("player_position", positions);
      await loadAll();
      await reloadWorkspace();
      toast({ title: "✓ Estructura deportiva guardada", description: "Temporadas, categorías y posiciones quedaron actualizadas para toda la institución." });
    } catch (error) {
      toast({ title: "No se pudo guardar la estructura", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSavingCatalogs(false);
    }
  }

  function addPositionToCatalog(position) {
    if (!position || positions.some((item) => normalizeLabel(item) === normalizeLabel(position))) return;
    setPositions((current) => [...current, position]);
    setPositionGroups((current) => ({ ...current, [optionKey(position)]: inferPositionGroup(position) || "" }));
    toast({ title: `${position} agregado al borrador`, description: "Elegí su grupo posicional y guardá la estructura para confirmarlo." });
  }

  async function normalizePositionGroups() {
    if (!isAdmin || !structureAudit.positionGroupMismatches.length) return;
    setStructureRepairing("positions");
    try {
      await Promise.all(structureAudit.positionGroupMismatches.map((player) => {
        const group = positionGroups[optionKey(player.position)] || inferPositionGroup(player.position);
        return base44.entities.Player.update(player.id, { position_group: group, player_type: group === "Arqueros" ? "arquero" : "jugador_campo" });
      }));
      await loadAll();
      toast({ title: "✓ Grupos posicionales sincronizados", description: "No se cambió la posición escrita de ningún jugador." });
    } catch (error) {
      toast({ title: "No se pudieron sincronizar los grupos", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setStructureRepairing("");
    }
  }

  async function syncPlayerSquadSnapshots() {
    if (!isAdmin || !structureAudit.snapshotMismatches.length) return;
    setStructureRepairing("squads");
    try {
      await Promise.all(structureAudit.snapshotMismatches.map((player) => {
        const membership = (structureAudit.membershipsByPlayer.get(player.id) || [])[0];
        if (!membership) return Promise.resolve();
        return base44.entities.Player.update(player.id, { squad_id: membership.squad_id, squad_name: membership.squad_name || "", division: membership.squad_name || "" });
      }));
      await loadAll();
      toast({ title: "✓ Planteles sincronizados", description: "SquadMembership sigue siendo la fuente canónica; solo se actualizaron campos legacy de lectura." });
    } catch (error) {
      toast({ title: "No se pudo sincronizar", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setStructureRepairing("");
    }
  }

  async function applyFeaturePreset(preset) {
    if (!isAdmin || !preset) return;
    setModuleSavingId(`preset:${preset.id}`);
    try {
      const desired = new Set(preset.moduleIds || []);
      const productModuleIds = new Set(PRODUCT_GROUPS.flatMap((group) => group.moduleIds));
      for (const moduleId of productModuleIds) {
        const current = institutionModuleRows.find((row) => row.module_id === moduleId);
        const lifecycle = moduleLifecycle(moduleId);
        if (lifecycle.status !== "available") continue;
        const nextEnabled = desired.has(moduleId) || current?.protected === true;
        if (current) {
          if ((current.enabled !== false) !== nextEnabled) await base44.entities.InstitutionModule.update(current.id, { enabled: nextEnabled });
        } else {
          await base44.entities.InstitutionModule.create({
            module_id: moduleId,
            enabled: nextEnabled,
            order: MODULES.findIndex((item) => item.id === moduleId),
            protected: moduleId === "club_dashboard",
          });
        }
      }
      const rows = await base44.entities.InstitutionModule.list("order", 200).catch(() => []);
      setInstitutionModuleRows(rows);
      await reloadWorkspace();
      toast({ title: `Preset “${preset.label}” aplicado`, description: "Solo se modificaron funcionalidades de producto; permisos, herramientas técnicas y módulos legacy quedaron intactos." });
    } catch (error) {
      toast({ title: "No se pudo aplicar el preset", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setModuleSavingId("");
    }
  }

  async function toggleInstitutionModule(module) {
    if (!isAdmin) return;
    const current = institutionModuleRows.find((row) => row.module_id === module.id);
    if (current?.protected) return;
    const nextEnabled = current ? current.enabled === false : false;
    setModuleSavingId(module.id);
    try {
      if (current) await base44.entities.InstitutionModule.update(current.id, { enabled: nextEnabled });
      else await base44.entities.InstitutionModule.create({ module_id: module.id, enabled: nextEnabled, order: MODULES.findIndex((item) => item.id === module.id), protected: false });
      const rows = await base44.entities.InstitutionModule.list("order", 200).catch(() => []);
      setInstitutionModuleRows(rows);
      await reloadWorkspace();
      toast({ title: nextEnabled ? `${module.label} habilitado` : `${module.label} ocultado`, description: "El cambio se aplicó inmediatamente." });
    } catch (error) {
      toast({ title: "No se pudo actualizar el módulo", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setModuleSavingId("");
    }
  }

  async function setProductGroupEnabled(group, enabled) {
    if (!isAdmin) return;
    setModuleSavingId(`group:${group.id}`);
    try {
      const modules = group.moduleIds.map((id) => MODULE_MAP.get(id)).filter(Boolean);
      for (const module of modules) {
        const current = institutionModuleRows.find((row) => row.module_id === module.id);
        if (current?.protected) continue;
        if (current) await base44.entities.InstitutionModule.update(current.id, { enabled });
        else await base44.entities.InstitutionModule.create({ module_id: module.id, enabled, order: MODULES.findIndex((item) => item.id === module.id), protected: false });
      }
      const rows = await base44.entities.InstitutionModule.list("order", 200).catch(() => []);
      setInstitutionModuleRows(rows);
      await reloadWorkspace();
      toast({ title: enabled ? `${group.label}: módulos habilitados` : `${group.label}: módulos ocultados`, description: "Los módulos protegidos no se modificaron." });
    } catch (error) {
      toast({ title: "No se pudo actualizar el grupo", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setModuleSavingId("");
    }
  }

  const structureAudit = useMemo(() => {
    const configuredPositions = new Set(positions.map(normalizeLabel).filter(Boolean));
    const squadNames = new Set(squads.filter((row) => row.active !== false).map((row) => normalizeLabel(row.name)).filter(Boolean));
    const activePlayers = players.filter((player) => player.active !== false);
    const activeMemberships = memberships.filter((membership) => membership.status === "activo" && !membership.effective_to);
    const membershipsByPlayer = new Map();
    activeMemberships.forEach((membership) => {
      if (!membershipsByPlayer.has(membership.player_id)) membershipsByPlayer.set(membership.player_id, []);
      membershipsByPlayer.get(membership.player_id).push(membership);
    });
    const unknownPositions = [...new Set(activePlayers.map((player) => player.position).filter((value) => value && !configuredPositions.has(normalizeLabel(value))))].sort();
    const unknownDivisions = [...new Set(activePlayers.map((player) => player.division).filter((value) => value && !squadNames.has(normalizeLabel(value))))].sort();
    const ungroupedCatalog = positions.filter((position) => !(positionGroups[optionKey(position)] || inferPositionGroup(position)));
    const positionGroupMismatches = activePlayers.filter((player) => {
      const expected = positionGroups[optionKey(player.position)] || inferPositionGroup(player.position);
      return expected && expected !== player.position_group;
    });
    const multipleActiveMemberships = [...membershipsByPlayer.entries()].filter(([, rows]) => rows.length > 1).map(([playerId, rows]) => ({ playerId, rows }));
    const snapshotMismatches = activePlayers.filter((player) => {
      const rows = membershipsByPlayer.get(player.id) || [];
      if (rows.length !== 1) return false;
      const membership = rows[0];
      return player.squad_id !== membership.squad_id || normalizeLabel(player.squad_name) !== normalizeLabel(membership.squad_name) || normalizeLabel(player.division) !== normalizeLabel(membership.squad_name);
    });
    const playersWithoutMembership = activePlayers.filter((player) => !(membershipsByPlayer.get(player.id) || []).length);
    const categorySquadDuplicates = categories.filter((category) => squadNames.has(normalizeLabel(category)));
    const defaultSeasonMissing = !!institutionProfile?.default_season && !seasons.some((season) => normalizeLabel(season) === normalizeLabel(institutionProfile.default_season));
    const defaultSquadMissing = !institutionProfile?.default_squad_id || !squads.some((squad) => squad.id === institutionProfile.default_squad_id && squad.active !== false);
    return { unknownPositions, unknownDivisions, ungroupedCatalog, positionGroupMismatches, multipleActiveMemberships, snapshotMismatches, playersWithoutMembership, categorySquadDuplicates, membershipsByPlayer, defaultSeasonMissing, defaultSquadMissing };
  }, [players, memberships, positions, positionGroups, seasons, categories, squads, institutionProfile]);

  const identityReady = !!(institutionProfile?.official_name && institutionProfile.official_name !== "Club" && institutionProfile?.shield_url && institutionProfile?.brand_primary);
  const structureIssues = structureAudit.unknownPositions.length + structureAudit.unknownDivisions.length + structureAudit.ungroupedCatalog.length + structureAudit.positionGroupMismatches.length + structureAudit.multipleActiveMemberships.length + structureAudit.snapshotMismatches.length + structureAudit.playersWithoutMembership.length + structureAudit.categorySquadDuplicates.length + Number(structureAudit.defaultSeasonMissing) + Number(structureAudit.defaultSquadMissing);
  const enabledProductModules = [...PRODUCT_MODULE_IDS].filter((moduleId) => {
    const row = institutionModuleRows.find((item) => item.module_id === moduleId);
    return row ? row.enabled !== false : true;
  }).length;
  const competitionIntegration = competitionSettings.find((row) => row.enabled !== false) || null;
  const currentGpsConfig = gpsConfigs.find((row) => (!activeSquadId || row.squad_id === activeSquadId) && (!activeSeasonId || !row.season_id || String(row.season_id) === String(activeSeasonId))) || null;
  const technicalModuleCount = institutionModuleRows.filter((row) => !PRODUCT_MODULE_IDS.has(row.module_id)).length;

  function openAdvanced(tab) {
    setAdvancedTab(tab);
    setSection("advanced");
  }

  function renderOverview() {
    const warnings = [];
    if (structureAudit.defaultSquadMissing) warnings.push("No hay un plantel predeterminado válido.");
    if (structureAudit.defaultSeasonMissing) warnings.push("La temporada predeterminada no existe en el catálogo institucional.");
    if (structureAudit.unknownPositions.length) warnings.push(`Hay ${structureAudit.unknownPositions.length} posiciones usadas fuera del catálogo.`);
    if (structureAudit.ungroupedCatalog.length) warnings.push(`Hay ${structureAudit.ungroupedCatalog.length} posiciones del catálogo sin grupo posicional.`);
    if (structureAudit.positionGroupMismatches.length) warnings.push(`${structureAudit.positionGroupMismatches.length} jugadores tienen el grupo posicional desactualizado.`);
    if (structureAudit.snapshotMismatches.length) warnings.push(`${structureAudit.snapshotMismatches.length} jugadores tienen textos de plantel que no coinciden con su membresía vigente.`);
    if (structureAudit.multipleActiveMemberships.length) warnings.push(`${structureAudit.multipleActiveMemberships.length} jugadores tienen más de una membresía activa y requieren revisión manual.`);
    if (structureAudit.playersWithoutMembership.length) warnings.push(`${structureAudit.playersWithoutMembership.length} jugadores activos no tienen un SquadMembership vigente.`);
    if (structureAudit.categorySquadDuplicates.length) warnings.push(`${structureAudit.categorySquadDuplicates.length} categorías repiten nombres de planteles y conviene revisarlas.`);
    if (structureAudit.unknownDivisions.length) warnings.push(`Hay ${structureAudit.unknownDivisions.length} denominaciones legacy de división fuera del nombre canónico del plantel.`);
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Configuración general" title={institutionProfile?.official_name || "Club"} description="Una sola página para entender qué está configurado, qué falta y dónde modificar cada parte de PerformancePitch." />
        {institutionError && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{institutionError}</div>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { id: "club", label: "Identidad", value: identityReady ? "Configurada" : "Incompleta", detail: institutionProfile?.short_name || institutionProfile?.official_name || "Sin nombre", tone: identityReady ? "ok" : "error" },
            { id: "structure", label: "Estructura", value: structureIssues ? `${structureIssues} avisos` : "Sin avisos", detail: `${squads.filter((s) => s.active !== false).length} planteles · ${seasons.length} temporada${seasons.length === 1 ? "" : "s"}`, tone: structureIssues ? "warn" : "ok" },
            { id: "features", label: "Funcionalidades", value: `${enabledProductModules} activas`, detail: "Módulos de producto visibles para el club", tone: "ok" },
            { id: "integrations", label: "Integraciones", value: competitionIntegration ? "Competencias activas" : "Modo manual", detail: currentGpsConfig ? "GPS configurado para el contexto activo" : "GPS funciona con configuración recomendada", tone: competitionIntegration ? "ok" : "neutral" },
          ].map((card) => (
            <button key={card.id} type="button" onClick={() => setSection(card.id)} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">{card.label}</p><StatusPill tone={card.tone}>{card.tone === "ok" ? "OK" : card.tone === "warn" ? "REVISAR" : card.tone === "error" ? "FALTA" : "MANUAL"}</StatusPill></div>
              <p className="mt-4 text-xl font-black text-white">{card.value}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{card.detail}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Abrir <ChevronRight size={11} /></p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-white">Revisión automática</h3><p className="mt-1 text-xs text-zinc-500">Inconsistencias que pueden afectar filtros, referencias o navegación.</p></div><StatusPill tone={warnings.length ? "warn" : "ok"}>{warnings.length ? `${warnings.length} avisos` : "Sin avisos"}</StatusPill></div>
            <div className="mt-4 space-y-2">
              {warnings.length ? warnings.map((warning) => <div key={warning} className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2.5 text-xs leading-5 text-zinc-300"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />{warning}</div>) : <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-3 text-xs text-emerald-200"><CheckCircle2 size={15} />La configuración estructural no presenta inconsistencias básicas.</div>}
            </div>
            {warnings.length > 0 && <button onClick={() => setSection("structure")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200">Revisar estructura deportiva <ChevronRight size={13} /></button>}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h3 className="font-black text-white">Regla de la página</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Cada bloque guarda únicamente lo que administra. Ya no existe un botón ambiguo de “Guardar todo”.</p>
            <div className="mt-4 space-y-2 text-xs text-zinc-400">
              <p>• Identidad y preferencias: botón propio.</p>
              <p>• Estructura deportiva: guardado conjunto.</p>
              <p>• Funcionalidades: cambios inmediatos.</p>
              <p>• Metodologías: guardado dentro de cada módulo.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderClub() {
    return <div className="space-y-5"><SectionHeader eyebrow="Institución" title="Club e identidad" description="Esta es la única fuente editable para nombre, escudo y colores. La pantalla pública de ingreso se sincroniza automáticamente desde acá." /><InstitutionSettingsPanel isAdmin={isAdmin} squads={squads} visibleTabs={["info", "visual"]} defaultTab="info" onSaved={reloadWorkspace} /></div>;
  }

  function renderStructure() {
    const activeSquads = squads.filter((squad) => squad.active !== false);
    return (
      <div className="space-y-5">
        <SectionHeader
          eyebrow="Estructura deportiva"
          title="Planteles, temporadas y posiciones"
          description="SquadMembership → Squad es la fuente del plantel actual. Categoría es opcional y la posición específica siempre pertenece a un grupo estable para análisis y referencias."
          action={<button onClick={saveCatalogs} disabled={!isAdmin || savingCatalogs} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white hover:bg-cyan-500 disabled:opacity-50"><Save size={14} />{savingCatalogs ? "Guardando…" : "Guardar catálogos"}</button>}
        />

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <p className="text-sm font-black text-cyan-100">Modelo de estructura</p>
          <div className="mt-3 grid gap-2 text-xs text-zinc-400 md:grid-cols-3">
            <div className="rounded-xl bg-black/20 p-3"><strong className="text-white">Plantel</strong><p className="mt-1 leading-5">Primera, Reserva, Cuarta… Se gestiona con Squad y SquadMembership.</p></div>
            <div className="rounded-xl bg-black/20 p-3"><strong className="text-white">Categoría</strong><p className="mt-1 leading-5">Dato adicional como 2007 o Sub-20. No define dónde juega el futbolista.</p></div>
            <div className="rounded-xl bg-black/20 p-3"><strong className="text-white">Posición</strong><p className="mt-1 leading-5">Es configurable por el club, pero se agrupa en Arquero, Defensa, Medio, Extremo o Delantero.</p></div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs text-zinc-500">Planteles activos</p><p className="mt-2 text-2xl font-black text-white">{activeSquads.length}</p><Link to="/squad-manager" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Gestionar planteles <ExternalLink size={10}/></Link></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs text-zinc-500">Membresías múltiples</p><p className={`mt-2 text-2xl font-black ${structureAudit.multipleActiveMemberships.length ? "text-red-300" : "text-emerald-300"}`}>{structureAudit.multipleActiveMemberships.length}</p><p className="mt-2 text-[10px] text-zinc-600">Más de un plantel activo para el mismo jugador.</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs text-zinc-500">Grupos posicionales</p><p className={`mt-2 text-2xl font-black ${structureAudit.positionGroupMismatches.length ? "text-amber-300" : "text-emerald-300"}`}>{structureAudit.positionGroupMismatches.length}</p><p className="mt-2 text-[10px] text-zinc-600">Jugadores con grupo para sincronizar.</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs text-zinc-500">Jugadores sin plantel vigente</p><p className={`mt-2 text-2xl font-black ${structureAudit.playersWithoutMembership.length ? "text-amber-300" : "text-emerald-300"}`}>{structureAudit.playersWithoutMembership.length}</p><p className="mt-2 text-[10px] text-zinc-600">Requieren asignación o revisión de identidad.</p></div>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-black text-white">Integridad de la estructura</h3><p className="mt-1 text-xs text-zinc-600">Las correcciones automáticas nunca cambian de plantel a un jugador ni borran historial.</p></div><StatusPill tone={structureIssues ? "warn" : "ok"}>{structureIssues ? `${structureIssues} revisiones` : "Sin inconsistencias"}</StatusPill></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-white">Plantel canónico</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{structureAudit.snapshotMismatches.length} jugadores tienen campos de lectura antiguos distintos de su única membresía activa.</p></div><button onClick={syncPlayerSquadSnapshots} disabled={!isAdmin || !structureAudit.snapshotMismatches.length || structureRepairing === "squads"} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-cyan-300 disabled:opacity-40">{structureRepairing === "squads" ? "Sincronizando…" : "Sincronizar"}</button></div></div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-white">Grupo posicional</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{structureAudit.positionGroupMismatches.length} jugadores pueden actualizarse desde la posición configurada sin cambiar esa posición.</p></div><button onClick={normalizePositionGroups} disabled={!isAdmin || !structureAudit.positionGroupMismatches.length || structureRepairing === "positions"} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-bold text-cyan-300 disabled:opacity-40">{structureRepairing === "positions" ? "Sincronizando…" : "Sincronizar"}</button></div></div>
          </div>

          {(structureAudit.defaultSquadMissing || structureAudit.defaultSeasonMissing || structureAudit.multipleActiveMemberships.length || structureAudit.playersWithoutMembership.length || structureAudit.categorySquadDuplicates.length || structureAudit.ungroupedCatalog.length) && <div className="mt-3 grid gap-2 md:grid-cols-2">
            {structureAudit.defaultSquadMissing && <p className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2 text-xs text-zinc-300">Falta definir un plantel predeterminado en Preferencias.</p>}
            {structureAudit.defaultSeasonMissing && <p className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2 text-xs text-zinc-300">La temporada predeterminada no pertenece al catálogo vigente.</p>}
            {!!structureAudit.ungroupedCatalog.length && <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2 text-xs text-zinc-300"><p className="font-bold text-white">Posiciones sin grupo</p><p className="mt-1 text-zinc-500">{structureAudit.ungroupedCatalog.join(" · ")}</p></div>}
            {!!structureAudit.multipleActiveMemberships.length && <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2 text-xs text-zinc-300"><p className="font-bold text-red-200">Revisión manual: múltiples planteles activos</p><div className="mt-2 space-y-1 text-zinc-500">{structureAudit.multipleActiveMemberships.slice(0, 8).map(({ playerId, rows }) => <p key={playerId}>{players.find((player) => player.id === playerId)?.full_name || playerId}: {rows.map((row) => row.squad_name).join(" + ")}</p>)}</div><Link to="/squad-manager" className="mt-2 inline-flex text-[10px] font-bold text-red-300">Resolver en Planteles →</Link></div>}
            {!!structureAudit.playersWithoutMembership.length && <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2 text-xs text-zinc-300"><p className="font-bold text-white">Jugadores sin membresía vigente</p><p className="mt-1 text-zinc-500">{structureAudit.playersWithoutMembership.slice(0, 8).map((player) => player.full_name).join(" · ")}{structureAudit.playersWithoutMembership.length > 8 ? "…" : ""}</p><Link to="/squad-manager" className="mt-2 inline-flex text-[10px] font-bold text-amber-300">Asignar en Planteles →</Link></div>}
            {!!structureAudit.categorySquadDuplicates.length && <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2 text-xs text-zinc-300"><p className="font-bold text-white">Categorías que duplican planteles</p><p className="mt-1 text-zinc-500">{structureAudit.categorySquadDuplicates.join(" · ")}</p><p className="mt-1 text-[10px] text-zinc-600">No se desactivan automáticamente porque pueden existir registros históricos que las usen.</p></div>}
          </div>}
        </section>

        {!!structureAudit.unknownPositions.length && <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4"><div><h3 className="text-sm font-black text-amber-100">Posiciones existentes fuera del catálogo</h3><p className="mt-1 text-xs text-zinc-500">No se modifican automáticamente. Podés incorporarlas al catálogo y asignarles un grupo, o corregir luego al jugador desde su ficha.</p></div><div className="mt-3 flex flex-wrap gap-2">{structureAudit.unknownPositions.map((position) => <button key={position} onClick={() => addPositionToCatalog(position)} className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-black/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/10"><Plus size={11}/>{position}<span className="font-normal text-zinc-600">· {inferPositionGroup(position) || "sin grupo"}</span></button>)}</div></section>}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h3 className="text-sm font-black text-white">Temporadas disponibles</h3><p className="mb-4 mt-1 text-xs text-zinc-600">La temporada predeterminada y la de cada plantel se seleccionan desde este catálogo.</p><ListEditor items={seasons} placeholder="ej: 2027" onAdd={(value) => setSeasons((current) => [...current, value])} onRemove={(index) => setSeasons((current) => current.filter((_, i) => i !== index))} /></section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><h3 className="text-sm font-black text-white">Categorías opcionales</h3><p className="mb-4 mt-1 text-xs text-zinc-600">Úsalas para edad/año competitivo si aporta valor. Primera, Reserva y Juveniles deben ser planteles, no categorías duplicadas.</p><ListEditor items={categories} placeholder="ej: 2008 / Sub-19" onAdd={(value) => setCategories((current) => [...current, value])} onRemove={(index) => setCategories((current) => current.filter((_, i) => i !== index))} /></section>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-black text-white">Posiciones y grupos posicionales</h3><p className="mt-1 text-xs text-zinc-600">La posición puede adaptarse a la metodología del club. El grupo queda estable para GPS, filtros, formaciones y comparaciones.</p></div><StatusPill tone={structureAudit.ungroupedCatalog.length ? "warn" : "ok"}>{positions.length} posiciones</StatusPill></div><PositionCatalogEditor items={positions} groups={positionGroups} onItemsChange={setPositions} onGroupChange={(key, group) => setPositionGroups((current) => ({ ...current, [key]: group }))} /></section>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs leading-5 text-zinc-500"><strong className="text-zinc-300">Importante:</strong> desactivar un plantel ya no elimina sus membresías. Los movimientos de jugadores conservan historial y sincronizan los campos legacy solo como copia de lectura.</div>
      </div>
    );
  }

  function renderFeatures() {
    const transitionRows = institutionModuleRows.filter((row) => ["legacy_in_use", "pending_migration", "safe_to_retire"].includes(row.metadata?.lifecycle));
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Funcionalidades" title="Qué utiliza este club" description="Mostramos módulos que un cliente reconoce como producto. Compatibilidad histórica y herramientas internas quedan separadas para que esta pantalla sea simple." />
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-4 py-3 text-xs leading-5 text-zinc-400"><strong className="text-blue-200">Acceso en dos capas:</strong> primero el club habilita el módulo; después cada rol define quién puede verlo o editarlo. Ocultar un módulo no borra datos.</div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-black text-white">Configuración rápida</h3><p className="mt-1 text-xs text-zinc-600">Elegí una base y después ajustá módulos individuales. Los presets nunca tocan permisos, datos ni herramientas técnicas.</p></div><StatusPill tone="neutral">Opcional</StatusPill></div><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{FEATURE_PRESETS.map((preset) => { const saving = moduleSavingId === `preset:${preset.id}`; return <button key={preset.id} disabled={!isAdmin || saving || !!moduleSavingId} onClick={() => applyFeaturePreset(preset)} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition hover:border-cyan-500/30 hover:bg-zinc-900 disabled:opacity-50"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-white">{preset.label}</p><span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">{saving ? "Aplicando…" : "Aplicar"}</span></div><p className="mt-1 text-[10px] leading-4 text-zinc-600">{preset.description}</p></button>; })}</div></section>

        <div className="space-y-4">{PRODUCT_GROUPS.map((group) => {
          const Icon = group.icon;
          const groupModules = group.moduleIds.map((id) => MODULE_MAP.get(id)).filter(Boolean);
          const enabled = groupModules.filter((module) => { const row = institutionModuleRows.find((item) => item.module_id === module.id); return row ? row.enabled !== false : true; }).length;
          const groupSaving = moduleSavingId === `group:${group.id}`;
          return <section key={group.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-cyan-400"><Icon size={17}/></span><div><h3 className="text-sm font-black text-white">{group.label}</h3><p className="mt-0.5 text-xs text-zinc-600">{group.description}</p></div></div><div className="flex items-center gap-2"><StatusPill tone={enabled === groupModules.length ? "ok" : "neutral"}>{enabled}/{groupModules.length} activos</StatusPill>{isAdmin && <><button disabled={groupSaving || enabled === groupModules.length} onClick={() => setProductGroupEnabled(group, true)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white disabled:opacity-30">Activar grupo</button><button disabled={groupSaving || enabled === 0} onClick={() => setProductGroupEnabled(group, false)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-amber-300 disabled:opacity-30">Ocultar grupo</button></>}</div></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{groupModules.map((module) => <ModuleToggle key={module.id} module={module} row={institutionModuleRows.find((item) => item.module_id === module.id)} saving={moduleSavingId === module.id || groupSaving} onToggle={toggleInstitutionModule} isAdmin={isAdmin} />)}</div></section>;
        })}</div>

        {!!transitionRows.length && <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-amber-100">Compatibilidad y transición</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Estos flags se conservan para no romper rutas, permisos o datos históricos. No forman parte de la oferta principal del producto.</p></div><StatusPill tone="warn">{transitionRows.length} internos</StatusPill></div><div className="mt-3 grid gap-2 md:grid-cols-2">{transitionRows.map((row) => { const module = MODULE_MAP.get(row.module_id); const lifecycle = row.metadata?.lifecycle; const label = lifecycle === "legacy_in_use" ? "Legacy en uso" : lifecycle === "safe_to_retire" ? "Seguro para retirar" : "Pendiente de migración"; return <div key={row.id} className="rounded-xl border border-zinc-800 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-white">{module?.label || row.module_id}</p><span className="text-[9px] font-black uppercase tracking-wider text-amber-300">{label}</span></div><p className="mt-1 text-[10px] leading-4 text-zinc-600">{row.metadata?.note || "Compatibilidad interna."}</p></div>; })}</div></section>}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-500"><strong className="text-zinc-300">Administración interna:</strong> {technicalModuleCount} flags técnicos quedan fuera de la vista comercial. No se eliminan porque sostienen permisos, diagnósticos y puesta en marcha.</div>
      </div>
    );
  }

  function renderIntegrations() {
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Integraciones" title="Fuentes externas y modo manual" description="PerformancePitch funciona completo en modo manual. Una integración solamente automatiza la entrada o sincronización de datos; nunca reemplaza la entidad canónica ni una corrección hecha por el staff." />
        <CompetitionIntegrationPanel settings={competitionIntegration} onReload={loadAll} isAdmin={isAdmin} />
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><Activity size={18}/></span><div><h3 className="font-black text-white">GPS / Tracking</h3><p className="text-xs text-zinc-600">CSV canónico hoy · adapters futuros.</p></div></div><StatusPill tone="ok">MANUAL LISTO</StatusPill></div><p className="mt-4 text-xs leading-5 text-zinc-500">Catapult, STATSports, WIMU u otro proveedor deben terminar en la misma capa de SessionGPSData/ExerciseGPSData. El proveedor no define la lógica del informe.</p><button onClick={() => openAdvanced("gps")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-300">Configurar metodología GPS <ChevronRight size={12}/></button></section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><Apple size={18}/></span><div><h3 className="font-black text-white">Nutrición</h3><p className="text-xs text-zinc-600">Carga manual + referencias configurables.</p></div></div><StatusPill tone="ok">MANUAL LISTO</StatusPill></div><p className="mt-4 text-xs leading-5 text-zinc-500">Las planillas o APIs futuras alimentan NutritionAssessment; una corrección manual dentro de PerformancePitch conserva prioridad.</p><button onClick={() => openAdvanced("nutrition")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-300">Configurar nutrición <ChevronRight size={12}/></button></section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-300"><HeartPulse size={18}/></span><div><h3 className="font-black text-white">Área médica</h3><p className="text-xs text-zinc-600">Episodios y estado actual.</p></div></div><StatusPill tone="ok">MANUAL LISTO</StatusPill></div><p className="mt-4 text-xs leading-5 text-zinc-500">MedicalEpisode y MedicalCurrentStatus son la fuente operativa. Una integración futura debe respetar ajustes manuales del médico o kinesiólogo.</p><Link to="/performance/medical" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-300">Abrir módulo médico <ExternalLink size={12}/></Link></section>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs leading-5 text-zinc-500"><strong className="text-zinc-300">Regla comercial:</strong> ninguna integración es requisito para vender o usar PerformancePitch. La instancia debe poder cargarse, corregirse y exportarse aunque el proveedor externo esté caído o no exista.</div>
      </div>
    );
  }

  function renderPreferences() {
    return <div className="space-y-5"><SectionHeader eyebrow="Preferencias" title="Preferencias y exportaciones" description="Configuración transversal: plantel y temporada predeterminados, zona horaria, unidades y apariencia de los exportables." /><InstitutionSettingsPanel isAdmin={isAdmin} squads={squads} seasonOptions={seasons} visibleTabs={["prefs", "exports"]} defaultTab="prefs" titleMode="compact" onSaved={reloadWorkspace} /></div>;
  }

  function renderDelivery() {
    return <div className="space-y-5"><SectionHeader eyebrow="Diagnóstico" title="Integridad y preparación de entrega" description="Un único lugar para revisar identidad, planteles, roles, accesos, catálogos y calidad de datos antes de habilitar una instancia a un club." /><CommercialReadinessPanel /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Link to="/users-access" className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"><p className="text-xs font-black text-white">Usuarios y accesos</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Revisar invitaciones, roles, planteles y estado de acceso.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Abrir accesos <ExternalLink size={10}/></span></Link><Link to="/roles-permissions" className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"><p className="text-xs font-black text-white">Roles y permisos</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Verificar permisos por módulo antes de entregar accesos.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Abrir roles <ExternalLink size={10}/></span></Link><Link to="/implementation-guide" className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"><p className="text-xs font-black text-white">Guía de entrega</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Dominio, pruebas finales y procedimiento de handoff.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Abrir guía <ExternalLink size={10}/></span></Link><Link to="/provisioning" className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 transition hover:border-emerald-500/30"><p className="text-xs font-black text-white">Portal de preparación</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">Herramienta de implementación para preparar una copia sin abandonar el software operativo.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">Abrir portal <ExternalLink size={10}/></span></Link></div></div>;
  }

  function renderAdvanced() {
    const tabs = [
      { id: "gps", label: "GPS y referencias", icon: Activity },
      { id: "nutrition", label: "Nutrición", icon: Apple },
      { id: "rivals", label: "Clubes y rivales", icon: Trophy },
    ];
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Avanzado" title="Configuración especializada" description="Estas metodologías viven en sus propios módulos. Configuración General solamente las organiza y te lleva al lugar correcto." />
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setAdvancedTab(item.id)} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${advancedTab === item.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}><Icon size={13}/>{item.label}</button>; })}</div>
        {advancedTab === "gps" && <GPSReferenceSettingsPanel isAdmin={isAdmin} />}
        {advancedTab === "nutrition" && <NutritionSettingsPanel readingStatuses={nutritionStatuses} referenceRanges={nutritionReferences} onReload={loadAll} />}
        {advancedTab === "rivals" && <ClubSettingsPanel clubs={rivalClubs} matches={matches} onReload={loadAll} />}
        <div className="grid gap-3 md:grid-cols-2"><Link to="/evaluations" className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"><p className="text-xs font-black text-white">Evaluaciones</p><p className="mt-1 text-xs text-zinc-600">VALD, métricas y reglas específicas se configuran dentro del módulo de Evaluaciones.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Abrir evaluaciones <ExternalLink size={10}/></span></Link><Link to="/roles-permissions" className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700"><p className="text-xs font-black text-white">Roles y permisos</p><p className="mt-1 text-xs text-zinc-600">Los permisos de usuarios no se mezclan con los módulos habilitados del club.</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">Administrar permisos <ExternalLink size={10}/></span></Link></div>
      </div>
    );
  }

  const activeNav = NAV_ITEMS.find((item) => item.id === section) || NAV_ITEMS[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2 xl:sticky xl:top-20">
        <div className="px-3 pb-3 pt-2"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Configuración general</p><p className="mt-1 text-xs leading-5 text-zinc-500">Ordenada por concepto, no por entidad técnica.</p></div>
        <nav className="space-y-1">{NAV_ITEMS.map((item) => { const Icon = item.icon; const selected = item.id === section; return <button key={item.id} onClick={() => setSection(item.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-cyan-500/30 bg-cyan-500/[0.08]" : "border-transparent hover:border-zinc-800 hover:bg-zinc-900"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-cyan-500/10 text-cyan-300" : "bg-zinc-900 text-zinc-600"}`}><Icon size={15}/></span><span className="min-w-0 flex-1"><span className={`block truncate text-xs font-bold ${selected ? "text-white" : "text-zinc-300"}`}>{item.label}</span><span className="mt-0.5 block truncate text-[9px] text-zinc-600">{item.description}</span></span><ChevronRight size={13} className={selected ? "text-cyan-400" : "text-zinc-800"}/></button>; })}</nav>
      </aside>

      <main className="min-w-0">
        <div className="mb-4 flex items-center gap-2 text-[10px] text-zinc-600"><Settings2 size={12}/><span>Configuración</span><ChevronRight size={10}/><span className="font-bold text-zinc-400">{activeNav.label}</span></div>
        {section === "overview" && renderOverview()}
        {section === "club" && renderClub()}
        {section === "structure" && renderStructure()}
        {section === "features" && renderFeatures()}
        {section === "integrations" && renderIntegrations()}
        {section === "preferences" && renderPreferences()}
        {section === "delivery" && renderDelivery()}
        {section === "advanced" && renderAdvanced()}
      </main>
    </div>
  );
}
