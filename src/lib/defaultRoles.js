import { base44 } from "@/api/base44Client";
import { MODULES, PAGES } from "@/lib/areasConfig";
import { LIVE_PRODUCT_MODULE_IDS } from "@/lib/moduleCatalog";

const editable = { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, can_admin: false };
const readable = { can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: true, can_admin: false };
const full = { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_admin: true };

function makeRole(name, description, areas, modules, permissions = editable, canAdmin = false) {
  const selected = canAdmin ? MODULES.map(m => m.id) : modules;
  const module_permissions = Object.fromEntries(selected.map(id => [id, canAdmin ? full : permissions]));
  return {
    name,
    description,
    areas,
    module_permissions,
    allowed_pages: PAGES.filter(p => selected.includes(p.module_id)).map(p => p.path),
    can_view: true,
    can_create: canAdmin || !!permissions.can_create,
    can_edit: canAdmin || !!permissions.can_edit,
    can_delete: canAdmin || !!permissions.can_delete,
    can_export: canAdmin || !!permissions.can_export,
    can_admin: canAdmin,
    active: true,
  };
}

export const DEFAULT_ROLES = [
  makeRole("Administrador del Club", "Control total de configuración, usuarios, planteles y módulos.", ["administracion", "coordinacion_general"], [], full, true),
  makeRole("Coordinación General", "Visión integral del club sin administración de seguridad.", ["coordinacion_general"], LIVE_PRODUCT_MODULE_IDS.filter((id) => id !== "accesos_jugadores")),
  makeRole("Director Técnico", "Planificación deportiva, partidos y gestión del plantel.", ["cuerpo_tecnico"], ["club_dashboard", "dashboard", "sesiones", "partidos", "rendimiento_dashboard", "competencias_afa", "calendario", "jugadores", "guia_jugadores", "biblioteca_campo", "biblioteca_fuerza", "cuerpo_tecnico"]),
  makeRole("Preparación Física / Rendimiento", "Carga, evaluaciones, planes individuales y seguimiento físico.", ["rendimiento_fisico"], ["club_dashboard", "dashboard", "sesiones", "rendimiento_dashboard", "carga_externa", "carga_interna", "minutos_jugados", "evaluaciones", "jugadores", "biblioteca_campo", "biblioteca_fuerza", "planes_complementarios", "calendario"]),
  makeRole("Analista de Video", "Partidos y reportes de minutos.", ["cuerpo_tecnico"], ["club_dashboard", "dashboard", "partidos", "rendimiento_dashboard", "competencias_afa", "minutos_jugados", "calendario"]),
  makeRole("Dirección Deportiva / Recruitment", "Planificación de plantel, mercado, scouting y decisiones de incorporación.", ["scouting", "coordinacion_general"], ["club_dashboard", "partidos", "calendario", "jugadores", "competencias_afa", "scouting"]),
  makeRole("Scout", "Prospectos, observaciones, informes, watchlists y seguimiento de mercado.", ["scouting"], ["scouting"]),
  makeRole("Área Médica / Kinesiología", "Seguimiento médico, rehabilitación, evaluaciones y disponibilidad del plantel.", ["area_medica", "kinesiologia"], ["club_dashboard", "area_medica", "kinesiologia", "evaluaciones", "jugadores", "calendario"]),
  makeRole("Nutrición", "Seguimiento nutricional y consulta del plantel.", ["nutricion"], ["club_dashboard", "nutricion", "jugadores", "calendario"]),
  makeRole("Utilero", "Indumentaria, material, stock, lavandería y preparación operativa.", ["utileria"], ["club_dashboard", "utileria", "calendario"]),
  makeRole("Dirigencia / Solo lectura", "Consulta ejecutiva sin posibilidad de modificar información.", ["coordinacion_general"], ["club_dashboard", "dashboard", "rendimiento_dashboard", "partidos", "competencias_afa", "minutos_jugados", "calendario", "jugadores"], readable),
];

export async function ensureDefaultRoles() {
  const res = await base44.functions.invoke("manage-roles", { action: "seed-defaults", payload: { defaults: DEFAULT_ROLES } });
  return res.data?.roles || [];
}