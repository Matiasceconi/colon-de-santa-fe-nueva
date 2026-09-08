import {
  Activity, CalendarDays, Dumbbell, Gift, Hash, HeartPulse, LayoutGrid,
  Link2, ListChecks, MapPin, ShieldCheck, StickyNote, Trophy, Users,
} from "lucide-react";

export const DASHBOARD_LAYOUT_VERSION = 3;

export const WIDGET_CATALOG = [
  {
    type: "competition-overview",
    name: "Panorama de Competencias",
    description: "Primera, Reserva y Juveniles en una sola lectura.",
    category: "competition",
    defaultSize: "full",
    icon: ShieldCheck,
  },
  {
    type: "competition-next-match",
    name: "Próximo Partido",
    description: "Partido del plantel superior, Reserva, Juveniles o plantel activo.",
    category: "competition",
    defaultSize: "md",
    icon: CalendarDays,
    configFields: [{ key: "division", label: "Plantel", type: "select", options: ["active", "senior", "reserve", "youth"], default: "active" }],
  },
  {
    type: "competition-youth-round",
    name: "Próxima Jornada Juvenil",
    description: "Agrupa 4.ª–6.ª y 7.ª–9.ª por rival y localía.",
    category: "competition",
    defaultSize: "full",
    icon: Users,
  },
  {
    type: "competition-table",
    name: "Resumen de Posiciones",
    description: "Tabla compacta con el club resaltado y todos los escudos.",
    category: "competition",
    defaultSize: "md",
    icon: Trophy,
    configFields: [{ key: "division", label: "División", type: "select", options: ["senior", "reserve"], default: "senior" }],
  },
  {
    type: "competition-agenda",
    name: "Agenda Competitiva",
    description: "Próximos compromisos de todo el club ordenados por fecha.",
    category: "competition",
    defaultSize: "full",
    icon: ListChecks,
  },

  {
    type: "upcoming-birthdays",
    name: "Próximos Cumpleaños",
    description: "Cumpleaños de jugadores de todos los planteles autorizados.",
    category: "competition",
    defaultSize: "full",
    icon: Gift,
  },
  {
    type: "staff-day-command",
    name: "Cronograma del Día",
    description: "Agenda operativa conectada al Calendario: muestra lo realizado, lo que está en curso y lo que falta.",
    category: "staff",
    defaultSize: "full",
    icon: ListChecks,
  },
  {
    type: "wellness-priority",
    name: "Wellness prioritario",
    description: "Jugadores con alertas Wellness del día, con foto, nivel y motivo principal.",
    category: "staff",
    defaultSize: "md",
    icon: HeartPulse,
    configFields: [
      { key: "threshold", label: "Nivel mínimo", type: "select", options: ["yellow", "orange", "red"], default: "orange" },
      { key: "limit", label: "Jugadores", type: "number", default: 6 },
    ],
  },
  {
    type: "training-today",
    name: "Entrenamientos de Hoy",
    description: "Sesiones del día o las próximas programadas.",
    category: "staff",
    defaultSize: "md",
    icon: Dumbbell,
  },
  {
    type: "session-day-map",
    name: "Mapa del Día",
    description: "Distribución de jugadores en la cancha para la sesión de hoy.",
    category: "staff",
    defaultSize: "full",
    icon: MapPin,
  },
  {
    type: "squad-status",
    name: "Estado del Plantel",
    description: "Disponibilidad calculada desde la sesión del día.",
    category: "staff",
    defaultSize: "md",
    icon: Users,
  },
  {
    type: "injuries",
    name: "Lesiones Actuales",
    description: "Casos médicos activos y seguimientos.",
    category: "staff",
    defaultSize: "md",
    icon: HeartPulse,
  },
  {
    type: "quick-links",
    name: "Accesos Rápidos",
    description: "Atajos a las páginas operativas más utilizadas.",
    category: "staff",
    defaultSize: "full",
    icon: Link2,
  },

  {
    type: "note",
    name: "Nota Libre",
    description: "Una nota personal que se guarda en tu tablero.",
    category: "custom",
    defaultSize: "md",
    icon: StickyNote,
    configFields: [
      { key: "text", label: "Texto", type: "text", default: "" },
      { key: "title", label: "Título", type: "text", default: "Nota" },
    ],
  },
  {
    type: "counter",
    name: "Contador",
    description: "Contador manual para una necesidad propia.",
    category: "custom",
    defaultSize: "sm",
    icon: Hash,
    configFields: [
      { key: "label", label: "Etiqueta", type: "text", default: "Contador" },
      { key: "value", label: "Valor", type: "number", default: 0 },
      { key: "color", label: "Color", type: "select", options: ["blue", "emerald", "yellow", "red", "purple"], default: "blue" },
    ],
  },
];

export const WIDGET_MAP = Object.fromEntries(WIDGET_CATALOG.map((widget) => [widget.type, widget]));

export const CATEGORY_LABELS = {
  competition: "Competencias",
  staff: "Cuerpo Técnico",
  custom: "Personalizado",
};

export const SIZE_LABELS = {
  sm: "Chico",
  md: "Mediano",
  lg: "Grande",
  full: "Ancho completo",
};

export const SIZE_ORDER = ["sm", "md", "lg", "full"];

export const SIZE_CLASSES = {
  sm: "lg:col-span-1",
  md: "sm:col-span-2 lg:col-span-2",
  lg: "sm:col-span-2 lg:col-span-3",
  full: "sm:col-span-2 lg:col-span-4",
};

let idCounter = 0;

export function generateWidgetId() {
  idCounter += 1;
  return "w_" + Date.now() + "_" + idCounter;
}

export function buildDefaultWidget(type) {
  const definition = WIDGET_MAP[type];
  if (!definition) return null;
  const config = {};
  (definition.configFields || []).forEach((field) => {
    config[field.key] = field.default;
  });
  return {
    id: generateWidgetId(),
    type,
    size: definition.defaultSize || "md",
    config,
  };
}

export const DEFAULT_STAFF_LAYOUT = [
  { id: "staff_v2_command", type: "staff-day-command", size: "full", config: {} },
  { id: "staff_v2_next", type: "competition-next-match", size: "md", config: { division: "active" } },
  { id: "staff_v4_wellness", type: "wellness-priority", size: "md", config: { threshold: "orange", limit: 6 } },
  { id: "staff_v2_status", type: "squad-status", size: "md", config: {} },
  { id: "staff_v2_injuries", type: "injuries", size: "md", config: {} },
  { id: "staff_v2_daymap", type: "session-day-map", size: "full", config: {} },
  { id: "staff_v2_agenda", type: "competition-agenda", size: "full", config: {} },
  { id: "staff_v3_birthdays", type: "upcoming-birthdays", size: "full", config: {} },
  { id: "staff_v2_links", type: "quick-links", size: "full", config: {} },
];

export const DEFAULT_LAYOUT = [
  { id: "club_v2_overview", type: "competition-overview", size: "full", config: {} },
  { id: "club_v3_birthdays", type: "upcoming-birthdays", size: "full", config: {} },
  { id: "club_v2_senior_next", type: "competition-next-match", size: "md", config: { division: "senior" } },
  { id: "club_v2_reserve_next", type: "competition-next-match", size: "md", config: { division: "reserve" } },
  { id: "club_v2_youth", type: "competition-youth-round", size: "full", config: {} },
  { id: "club_v2_senior_table", type: "competition-table", size: "md", config: { division: "senior" } },
  { id: "club_v2_reserve_table", type: "competition-table", size: "md", config: { division: "reserve" } },
  { id: "club_v2_agenda", type: "competition-agenda", size: "full", config: {} },
];

export const DASHBOARD_ICONS = { LayoutGrid };