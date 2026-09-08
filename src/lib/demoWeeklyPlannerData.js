// Datos ficticios para la etapa "Planificación" del modo demo.
// Sin APIs reales, sin clubes reales. Coherente con Performance FC vs Atlético Central.

export const DEMO_PLANNER_MICROCYCLE = {
  number: 16,
  range: "17/08 — 24/08",
  objective: "Preparación competitiva",
  targetMatch: "vs Atlético Central",
  sessions: 8,
  availability: "24 / 27",
  loadCurve: "Moderada → Alta → Descarga",
};

export const DEMO_PLANNER_NEXT_MATCH = {
  home: "Performance FC",
  away: "Atlético Central",
  competition: "Liga Nacional",
  round: "Fecha 16",
  date: "Domingo 23/08",
  time: "18:00",
  venue: "Estadio Performance",
};

export const DEMO_PLANNER_AREAS = [
  { id: "todas", label: "Todas las áreas" },
  { id: "cuerpo_tecnico", label: "Cuerpo Técnico" },
  { id: "rendimiento", label: "Rendimiento" },
  { id: "medico", label: "Área Médica" },
  { id: "nutricion", label: "Nutrición" },
];

// area tags: cuerpo_tecnico (incluye video), rendimiento (incluye fuerza), medico, nutricion
export const DEMO_PLANNER_DAYS = [
  {
    id: "md5", weekday: "Lunes", md: "MD-5",
    objective: "Recuperación + reinicio", load: 40, loadLabel: "Baja",
    activities: [
      { time: "09:00", label: "Wellness", area: "rendimiento" },
      { time: "10:00", label: "Campo", area: "cuerpo_tecnico" },
      { time: "11:30", label: "Fuerza compensatoria", area: "rendimiento" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Movilidad + pase controlado", "Rondo 4v2 · 20 min"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Distancia objetivo: 4.800 m", "HSR: 180 m", "RPE esperado: 3"] },
      { label: "Fuerza", icon: "Dumbbell", lines: ["Compensatorio tren inferior · 25 min"] },
      { label: "Médico", icon: "Heart", lines: ["24 disponibles", "2 diferenciados", "1 lesionado"] },
      { label: "Nutrición", icon: "Apple", lines: ["Hidratación post-partido anterior"] },
    ],
  },
  {
    id: "md4", weekday: "Martes", md: "MD-4",
    objective: "Volumen", load: 65, loadLabel: "Media",
    activities: [
      { time: "10:00", label: "Campo", area: "cuerpo_tecnico" },
      { time: "11:30", label: "Fuerza", area: "rendimiento" },
      { time: "16:00", label: "Video colectivo", area: "cuerpo_tecnico" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Posesión 11v11 + transiciones", "Volumen táctico"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Distancia: 7.800 m", "HSR: 420 m", "Sprint: 110 m"] },
      { label: "Fuerza", icon: "Dumbbell", lines: ["Fuerza máxima · 30 min"] },
      { label: "Video", icon: "Video", lines: ["Análisis colectivo del rival"] },
      { label: "Médico", icon: "Heart", lines: ["24 disponibles", "2 diferenciados"] },
    ],
  },
  {
    id: "md3", weekday: "Miércoles", md: "MD-3",
    objective: "Alta intensidad", load: 90, loadLabel: "Alta",
    activities: [
      { time: "10:00", label: "Campo", area: "cuerpo_tecnico" },
      { time: "—", label: "Situaciones reducidas", area: "cuerpo_tecnico" },
      { time: "—", label: "Fuerza preventiva", area: "rendimiento" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Juegos reducidos + transiciones", "Bloques de alta intensidad"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Distancia: 6.200 m", "HSR: 520 m", "Sprint: 160 m"] },
      { label: "Fuerza", icon: "Dumbbell", lines: ["Preventivo tren inferior · 25 min"] },
      { label: "Médico", icon: "Heart", lines: ["24 disponibles", "2 diferenciados", "1 lesionado"] },
      { label: "Video", icon: "Video", lines: ["Clips de transiciones del próximo rival"] },
    ],
  },
  {
    id: "md2", weekday: "Jueves", md: "MD-2",
    objective: "Táctico", load: 70, loadLabel: "Media",
    activities: [
      { time: "10:00", label: "Campo", area: "cuerpo_tecnico" },
      { time: "—", label: "Organización defensiva", area: "cuerpo_tecnico" },
      { time: "—", label: "ABP", area: "cuerpo_tecnico" },
      { time: "16:00", label: "Video rival", area: "cuerpo_tecnico" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Organización defensiva", "ABP · pelota parada"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Distancia: 5.400 m", "HSR: 280 m", "Sprint: 90 m"] },
      { label: "Video", icon: "Video", lines: ["Análisis táctico del rival", "Set pieces"] },
      { label: "Médico", icon: "Heart", lines: ["24 disponibles", "2 diferenciados"] },
    ],
  },
  {
    id: "md1", weekday: "Viernes", md: "MD-1",
    objective: "Activación precompetitiva", load: 35, loadLabel: "Baja",
    activities: [
      { time: "10:30", label: "Campo", area: "cuerpo_tecnico" },
      { time: "—", label: "Pelota parada", area: "cuerpo_tecnico" },
      { time: "—", label: "Activación", area: "rendimiento" },
      { time: "—", label: "Convocatoria", area: "cuerpo_tecnico" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Activación táctica", "Pelota parada", "Convocatoria oficial"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Activación neuromuscular", "Distancia: 3.200 m", "RPE esperado: 2"] },
      { label: "Médico", icon: "Heart", lines: ["24 disponibles", "2 diferenciados", "1 lesionado"] },
      { label: "Nutrición", icon: "Apple", lines: ["Plan de hidratación pre-partido"] },
    ],
  },
  {
    id: "md", weekday: "Sábado / Domingo", md: "MD",
    objective: "Partido", load: 100, loadLabel: "Partido", isMatch: true,
    match: {
      home: "Performance FC", away: "Atlético Central",
      competition: "Liga Nacional · Fecha 16", time: "18:00",
      access: ["Convocados", "Formación", "Plan de partido"],
    },
    activities: [],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Plan de partido", "Formación inicial", "Convocatoria"] },
      { label: "Rendimiento", icon: "Activity", lines: ["GPS del partido", "Minutos por jugador", "Carga competitiva"] },
      { label: "Video", icon: "Video", lines: ["Partido completo", "Clips individuales"] },
      { label: "Médico", icon: "Heart", lines: ["Disponibilidad final", "Controles post-partido"] },
    ],
  },
  {
    id: "mdp1", weekday: "Lunes", md: "MD+1",
    objective: "Recuperación", load: 25, loadLabel: "Muy baja",
    activities: [
      { time: "09:00", label: "Wellness", area: "rendimiento" },
      { time: "—", label: "Recuperación titulares", area: "medico" },
      { time: "—", label: "Compensatorio no titulares", area: "rendimiento" },
      { time: "—", label: "Revisión médica", area: "medico" },
    ],
    detail: [
      { label: "Cuerpo Técnico", icon: "ClipboardList", lines: ["Reunión de partido", "Análisis posterior"] },
      { label: "Rendimiento", icon: "Activity", lines: ["Wellness post-partido", "RPE de partido", "Compensatorio no titulares"] },
      { label: "Médico", icon: "Heart", lines: ["Recuperación titulares", "Revisión médica", "Diferenciados"] },
      { label: "Nutrición", icon: "Apple", lines: ["Recuperación post-partido"] },
    ],
  },
];

export const DEMO_PLANNER_LOAD_CHART = [
  { day: "MD-5", load: 40 },
  { day: "MD-4", load: 65 },
  { day: "MD-3", load: 90 },
  { day: "MD-2", load: 70 },
  { day: "MD-1", load: 35 },
  { day: "MD", load: 100 },
  { day: "MD+1", load: 25 },
];

export const DEMO_PLANNER_INTEGRATION_FLOW = [
  "Calendario competitivo",
  "Estado del plantel",
  "GPS / cargas",
  "Wellness y RPE",
  "Área médica",
  "Planificación",
  "Sesiones",
  "Partido",
  "Análisis posterior",
];