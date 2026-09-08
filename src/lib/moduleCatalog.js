export const MODULE_LIFECYCLE = {
  club_dashboard: { status: "available", label: "Disponible" },
  dashboard: { status: "available", label: "Disponible" },
  sesiones: { status: "available", label: "Disponible" },
  partidos: { status: "available", label: "Disponible" },
  calendario: { status: "available", label: "Disponible" },
  jugadores: { status: "available", label: "Disponible" },
  gestion_planteles: { status: "available", label: "Disponible" },
  cuerpo_tecnico: { status: "available", label: "Disponible" },
  accesos_jugadores: { status: "available", label: "Disponible" },
  rendimiento_dashboard: { status: "available", label: "Disponible" },
  carga_externa: { status: "available", label: "Disponible" },
  carga_interna: { status: "available", label: "Disponible" },
  minutos_jugados: { status: "available", label: "Disponible" },
  evaluaciones: { status: "available", label: "Disponible" },
  area_medica: { status: "available", label: "Disponible" },
  kinesiologia: { status: "available", label: "Disponible" },
  utileria: { status: "available", label: "Disponible" },
  nutricion: { status: "available", label: "Disponible" },
  biblioteca_campo: { status: "available", label: "Disponible" },
  biblioteca_fuerza: { status: "available", label: "Disponible" },
  planes_complementarios: { status: "available", label: "Disponible" },
  competencias_afa: { status: "available", label: "Disponible" },
  scouting: { status: "available", label: "Disponible" },

  catapult: {
    status: "legacy",
    label: "Legacy en uso",
    replacement: "carga_externa",
    note: "Se conserva por compatibilidad con reportes históricos. Nuevos flujos usan GPS / Tracking.",
  },

  mapa_tactico: {
    status: "unavailable",
    label: "No disponible",
    note: "No tiene una ruta operativa activa en esta versión.",
  },
  plan_semanal: {
    status: "unavailable",
    label: "No disponible",
    note: "No tiene una ruta operativa activa en esta versión.",
  },
  estado_plantel: {
    status: "unavailable",
    label: "No disponible",
    note: "La lógica de disponibilidad se absorbió en Sesiones y otros flujos; la ruta anterior no está activa.",
  },

  gestion_nombres: { status: "internal", label: "Técnico" },
  guia_jugadores: { status: "internal", label: "Soporte" },
  configuracion: { status: "internal", label: "Técnico" },
  identidad_club: { status: "internal", label: "Técnico" },
  roles_permisos: { status: "internal", label: "Técnico" },
  diagnostico_plantel: { status: "internal", label: "Técnico" },
  implementacion: { status: "internal", label: "Implementación" },
  configuracion_inicial: { status: "internal", label: "Implementación" },
};

export const LIVE_PRODUCT_MODULE_IDS = Object.entries(MODULE_LIFECYCLE)
  .filter(([, meta]) => meta.status === "available")
  .map(([id]) => id);

export const FEATURE_PRESETS = [
  {
    id: "basic",
    label: "Club básico",
    description: "Plantel, sesiones, partidos y calendario para la operación diaria.",
    moduleIds: [
      "club_dashboard", "dashboard", "sesiones", "partidos", "calendario",
      "jugadores", "gestion_planteles", "cuerpo_tecnico",
    ],
  },
  {
    id: "performance",
    label: "Rendimiento",
    description: "Operación diaria más GPS, carga interna, minutos y evaluaciones.",
    moduleIds: [
      "club_dashboard", "dashboard", "sesiones", "partidos", "calendario",
      "jugadores", "gestion_planteles", "cuerpo_tecnico",
      "rendimiento_dashboard", "carga_externa", "carga_interna", "minutos_jugados", "evaluaciones", "planes_complementarios", "kinesiologia",
    ],
  },
  {
    id: "academy",
    label: "Academia / Juveniles",
    description: "Seguimiento de planteles, sesiones, partidos, evaluaciones y bibliotecas.",
    moduleIds: [
      "club_dashboard", "dashboard", "sesiones", "partidos", "calendario",
      "jugadores", "gestion_planteles", "cuerpo_tecnico", "evaluaciones",
      "biblioteca_campo", "biblioteca_fuerza", "planes_complementarios", "kinesiologia",
    ],
  },
  {
    id: "complete",
    label: "Club completo",
    description: "Activa todas las funcionalidades de producto disponibles en esta versión.",
    moduleIds: LIVE_PRODUCT_MODULE_IDS,
  },
];

export function moduleLifecycle(moduleId) {
  return MODULE_LIFECYCLE[moduleId] || { status: "internal", label: "Técnico" };
}
