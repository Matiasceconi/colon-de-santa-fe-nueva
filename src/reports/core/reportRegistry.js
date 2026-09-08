export const SESSION_REPORT_TYPE = "session.professional";
export const SESSION_REPORT_TEMPLATE_VERSION = "1.0.0";
export const SESSION_REPORT_SNAPSHOT_VERSION = 1;

export const SESSION_REPORT_SECTIONS = [
  { id: "summary", label: "Resumen", description: "Datos principales y KPIs de la sesión.", default: true },
  { id: "players", label: "Plantel del día", description: "Jugadores seleccionados, disponibilidad y foto/fallback.", default: true },
  { id: "field", label: "Campo", description: "Ejercicios, bloques, formato, espacio y EII.", default: true },
  { id: "strength", label: "Fuerza", description: "Prescripción de fuerza y series registradas.", default: true },
  { id: "gps", label: "GPS", description: "Tabla completa de carga externa de los jugadores seleccionados.", default: true },
  { id: "charts", label: "Gráficos", description: "Gráficos vectoriales generados desde los mismos datos del snapshot.", default: true },
  { id: "videos", label: "Videos", description: "Material audiovisual vinculado a la sesión.", default: true },
  { id: "observations", label: "Observaciones", description: "Notas de sesión y observaciones GPS.", default: true },
  { id: "ai", label: "Resumen IA", description: "Síntesis opcional generada a partir del snapshot y editable por el profesional.", default: false },
];

export const REPORT_REGISTRY = {
  [SESSION_REPORT_TYPE]: {
    id: SESSION_REPORT_TYPE,
    name: "Informe profesional de sesión",
    sourceType: "TrainingSession",
    moduleId: "sesiones",
    permissionPath: "/sessions",
    requiredPermission: "export",
    templateVersion: SESSION_REPORT_TEMPLATE_VERSION,
    snapshotSchemaVersion: SESSION_REPORT_SNAPSHOT_VERSION,
    renderer: "react-pdf",
    rendererVersion: "4.9.0",
    sections: SESSION_REPORT_SECTIONS,
    defaultOrientation: "auto",
  },
};

export function reportDefinition(reportType) {
  return REPORT_REGISTRY[reportType] || null;
}

export function defaultSessionReportSections() {
  return SESSION_REPORT_SECTIONS.filter((section) => section.default).map((section) => section.id);
}
