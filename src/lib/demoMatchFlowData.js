// Datos ficticios para el bloque "Un partido conecta todo el trabajo del club".
// Solo modo demo. Sin APIs reales ni clubes reales.

export const DEMO_MATCH_FLOW_MATCH = {
  home: "Performance FC",
  away: "Atlético Central",
  competition: "Liga Nacional",
  round: "Fecha 16",
  date: "2026-08-23T18:00:00",
  venue: "Estadio Performance",
};

export const DEMO_MATCH_FLOW_SOURCES = [
  "Fixture externo",
  "Planificación",
  "Convocatoria",
  "GPS",
  "Video",
];

export const DEMO_MATCH_FLOW_STAGES = [
  { id: "partido", label: "Partido", icon: "Trophy" },
  { id: "planificacion", label: "Planificación", icon: "ClipboardList" },
  { id: "convocatoria", label: "Convocatoria", icon: "Users" },
  { id: "minutos", label: "Minutos", icon: "Clock" },
  { id: "gps", label: "GPS / Rendimiento", icon: "Activity" },
  { id: "video", label: "Video y análisis", icon: "Video" },
  { id: "jugador", label: "Jugador 360°", icon: "UserRound" },
];

export const DEMO_MATCH_FLOW_DETAILS = {
  partido: {
    headline: "Performance FC vs Atlético Central",
    sub: "Liga Nacional · Fecha 16",
    text: "El compromiso ingresa al calendario competitivo del club.",
  },
  planificacion: {
    headline: "Microciclo MD-5 → MD",
    chips: ["Campo", "Fuerza", "Recuperación", "Activación", "Partido"],
    text: "El próximo partido contextualiza la planificación semanal.",
  },
  convocatoria: {
    headline: "23 convocados",
    stats: [{ k: "Titulares", v: "11" }, { k: "Suplentes", v: "12" }],
    avatars: 23,
    text: "Cuerpo técnico y coordinación trabajan sobre el mismo plantel.",
  },
  minutos: {
    headline: "11 jugadores · 90 min",
    lines: ["3 suplentes ingresaron", "9 jugadores sin ingresar"],
    text: "Los minutos del partido pasan a formar parte del historial individual del jugador.",
  },
  gps: {
    headline: "GPS / Rendimiento",
    metrics: [
      { k: "Distancia total promedio", v: "10.420 m" },
      { k: "Alta intensidad", v: "860 m" },
      { k: "Sprint >25 km/h", v: "295 m" },
      { k: "Velocidad máxima", v: "31,2 km/h" },
    ],
    source: "Fuente ejemplo: GPS / Tracking",
    text: "La información física del partido se cruza con jugadores y minutos.",
    detailTitle: "El partido también alimenta el área de rendimiento.",
    detailText: "Los datos provenientes del sistema GPS pueden asociarse al partido, al jugador y a sus minutos para analizarlos dentro del contexto competitivo.",
  },
  video: {
    headline: "Video y análisis",
    chips: ["Partido completo", "Clips individuales", "Observaciones"],
    text: "El video permite completar el análisis táctico e individual del encuentro.",
  },
  jugador: {
    headline: "Tomás Silva",
    sub: "Mediocampista · #8",
    stats: [
      { k: "Minutos", v: "90 min" },
      { k: "Distancia", v: "10,8 km" },
      { k: "V. máxima", v: "31,2 km/h" },
      { k: "Estado", v: "Disponible" },
    ],
    text: "La información generada termina construyendo el historial deportivo del jugador.",
  },
};