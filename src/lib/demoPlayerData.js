// Datos ficticios del jugador demo. No representan a ninguna persona real.
export const DEMO_PLAYER = {
  first_name: "Tomás",
  full_name: "Tomás Silva",
  position: "Mediocampista",
  number: 8,
  squad: "Performance FC · Primera",
  initials: "TS",
};

export const DEMO_NEXT_TRAINING = {
  day: "Miércoles", time: "10:00", venue: "Campo 1", md: "MD-3", objective: "Alta intensidad",
};

export const DEMO_NEXT_MATCH = {
  home: "Performance FC", away: "Atlético Central", competition: "Liga Nacional", round: "Fecha 16",
};

export const DEMO_WEEK = [
  { day: "Miércoles", label: "Entrenamiento", time: "10:00", md: "MD-3" },
  { day: "Jueves", label: "Entrenamiento", time: "10:00", md: "MD-2" },
  { day: "Viernes", label: "Entrenamiento", time: "11:00", md: "MD-1" },
  { day: "Sábado", label: "Partido", time: "18:30", md: "MD", rival: "Atlético Central" },
  { day: "Domingo", label: "Descanso", time: "—", md: "MD+1" },
];

export const DEMO_PENDING_RPE = [
  { session_id: "s4", title: "SESIÓN 4", date: "2026-08-20", match_day_code: "MD-3", session_type: "Cancha" },
];

export const DEMO_HISTORY_WELLNESS = [
  { id: "w1", response_date: "2026-08-19", wellness_score: 78, sleep_hours: 7, energy_level: 4, muscular_readiness: 4, mood: 4, has_pain: false },
  { id: "w2", response_date: "2026-08-18", wellness_score: 72, sleep_hours: 6, energy_level: 3, muscular_readiness: 4, mood: 4, has_pain: true, pain_intensity: 3, pain_zone: "Isquiotibial" },
  { id: "w3", response_date: "2026-08-17", wellness_score: 85, sleep_hours: 8, energy_level: 5, muscular_readiness: 5, mood: 5, has_pain: false },
];

export const DEMO_HISTORY_RPE = [
  { session_player_id: "r1", title: "SESIÓN 3", date: "2026-08-19", rpe: 7, internal_load: 420 },
  { session_player_id: "r2", title: "SESIÓN 2", date: "2026-08-17", rpe: 5, internal_load: 300 },
  { session_player_id: "r3", title: "SESIÓN 1", date: "2026-08-14", rpe: 6, internal_load: 360 },
];

export const DEMO_SHARED_SECTIONS = [
  { key: "calendario", icon: "CalendarDays", label: "Mi calendario" },
  { key: "rendimiento", icon: "Activity", label: "Mi rendimiento" },
  { key: "videos", icon: "Video", label: "Videos" },
  { key: "informes", icon: "FileText", label: "Informes" },
];

export const DEMO_RENDIMIENTO_METRICS = [
  { label: "Minutos (últimos 5)", value: "412" },
  { label: "Velocidad máxima", value: "31.4 km/h" },
  { label: "Carga semanal", value: "1.240 UA" },
  { label: "Evaluaciones", value: "3 completas" },
];

export const DEMO_VIDEOS = [
  { title: "Devolución táctica — MD-3", meta: "Cuerpo Técnico · 2:14 min" },
  { title: "Clip — Transiciones 5v5", meta: "Análisis · 0:48 min" },
];

export const DEMO_INFORMES = [
  { title: "Informe mensual — Julio", meta: "Compartido por Rendimiento" },
  { title: "Resumen médico", meta: "Compartido por Área Médica" },
];

export const DEMO_CONNECTED_FLOW = ["Jugador", "Wellness / RPE", "Médica / Rendimiento", "Cuerpo Técnico", "Jugador 360°"];