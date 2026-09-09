// Configuración de áreas, módulos y catálogo de páginas del sistema.
// La navegación y los permisos se basan en módulos independientes, no en categorías padre.

export const AREAS = [
  { id: "cuerpo_tecnico",       name: "Cuerpo Técnico",       description: "Sesiones, partidos, plantel y táctica",        icon: "Users" },
  { id: "rendimiento_fisico",   name: "Rendimiento Físico",   description: "Carga externa, GPS y evaluaciones físicas",    icon: "Gauge" },
  { id: "area_medica",          name: "Área Médica",          description: "Seguimiento médico de los jugadores",         icon: "Heart" },
  { id: "kinesiologia",         name: "Kinesiología",         description: "Rehabilitación, readaptación y retorno progresivo", icon: "HeartPulse" },
  { id: "utileria",             name: "Utilería",             description: "Indumentaria, material, stock y logística deportiva", icon: "Shirt" },
  { id: "nutricion",            name: "Nutrición",            description: "Seguimiento nutricional del plantel",         icon: "Apple" },
  { id: "psicologia",           name: "Psicología",           description: "Seguimiento psicológico del plantel",         icon: "Brain" },
  { id: "scouting",             name: "Scouting & Recruitment", description: "Mercado, prospectos y decisiones de incorporación", icon: "Binoculars" },
  { id: "coordinacion_general", name: "Coordinación General", description: "Visión global de todas las áreas",            icon: "ClipboardList" },
  { id: "administracion",       name: "Administración",       description: "Usuarios, roles, planteles y configuración",  icon: "Settings2" },
];

export const MODULE_ACTIONS = [
  { key: "can_view", label: "Ver" },
  { key: "can_create", label: "Crear" },
  { key: "can_edit", label: "Editar" },
  { key: "can_delete", label: "Eliminar" },
  { key: "can_export", label: "Exportar" },
  { key: "can_admin", label: "Administrar" },
];

export const MODULES = [
  { id: "club_dashboard", label: "Tablero del Club", path: "/club-dashboard" },
  { id: "dashboard", label: "Tablero del Cuerpo Técnico", path: "/dashboard" },
  { id: "sesiones", label: "Sesiones", path: "/sessions" },
  { id: "partidos", label: "Partidos", path: "/matches" },
  { id: "mapa_tactico", label: "Pizarra Táctica", path: "/tactical" },
  { id: "rendimiento_dashboard", label: "Tablero de Rendimiento", path: "/performance/dashboard" },
  { id: "carga_externa", label: "Carga Externa / GPS", path: "/performance/external-load" },
  { id: "carga_interna", label: "Carga Interna", path: "/performance/internal-load" },
  { id: "area_medica", label: "Área Médica", path: "/performance/medical" },
  { id: "kinesiologia", label: "Kinesiología", path: "/performance/kinesiology" },
  { id: "nutricion", label: "Nutrición", path: "/performance/nutrition" },
  { id: "minutos_jugados", label: "Minutos Jugados", path: "/performance/minutes" },
  { id: "evaluaciones", label: "Evaluaciones", path: "/evaluations" },
  { id: "calendario", label: "Calendario", path: "/schedule" },
  { id: "plan_semanal", label: "Plan Semanal", path: "/weekly-planner" },
  { id: "estado_plantel", label: "Estado del Plantel", path: "/daily-squad" },
  { id: "jugadores", label: "Jugadores", path: "/players" },
  { id: "gestion_nombres", label: "Gestión de Nombres", path: "/player-names" },
  { id: "guia_jugadores", label: "Guía de Jugadores", path: "/player-guide" },
  { id: "biblioteca_campo", label: "Biblioteca de Campo", path: "/field-library" },
  { id: "biblioteca_fuerza", label: "Biblioteca de Fuerza", path: "/strength-library" },
  { id: "planes_complementarios", label: "Planes Individuales", path: "/complementary-strength" },
  { id: "utileria", label: "Utilería", path: "/club-operations/equipment" },
  { id: "cuerpo_tecnico", label: "Cuerpo Técnico y Staff", path: "/team" },
  { id: "competencias_afa", label: "Competencias", path: "/competencias-afa" },
  { id: "scouting", label: "Scouting & Recruitment", path: "/scouting" },
  { id: "gestion_planteles", label: "Gestión de Planteles", path: "/squad-manager" },
  { id: "accesos_jugadores", label: "Accesos de Jugadores", path: "/player-access" },
  { id: "configuracion", label: "Administración General", path: "/admin" },
  { id: "identidad_club", label: "Mapeo de clubes externos", path: "/club-identity-admin" },
  { id: "roles_permisos", label: "Roles y Permisos", path: "/roles-permissions" },
  { id: "diagnostico_plantel", label: "Diagnóstico de Plantel", path: "/plantil-diagnostic" },
  { id: "implementacion", label: "Guía de Implementación", path: "/implementation-guide" },
  { id: "configuracion_inicial", label: "Configuración Inicial", path: "/setup" },
];

export const PAGES = [
  ...MODULES.map((m) => ({ path: m.path, label: m.label, module_id: m.id })),
  { path: "/gps", label: "Carga Externa / GPS", module_id: "carga_externa" },
  { path: "/performance/microcycle-history", label: "Histórico de Microciclos", module_id: "carga_externa" },
];