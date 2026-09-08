// Arquitectura de navegación de la demo de PerformancePitch.
// Representa la estructura real del producto (no el recorrido guiado):
// CLUB → CUERPO TÉCNICO → PLANTEL → RENDIMIENTO → SALUD → GESTIÓN → CONFIGURACIÓN.
// El recorrido comercial (demoStages.js) vive como capa overlay por encima de este menú.
//
// Convenciones por item:
//   path         → ruta destino (Link). Si es null, el item es solo estructural.
//   comingSoon   → módulo planificado pero sin pantalla dedicada (se muestra como "Próx.").
//   transversal   → el recurso pertenece conceptualmente a otra área; no roba el highlight
//                   activo del dueño principal de la ruta (regla first-match).
//   subtitle     → texto secundario opcional bajo el label.

import {
  ShieldCheck, LayoutDashboard, Video, Trophy, CalendarDays, ClipboardList,
  BookOpen, Dumbbell, UsersRound, UserRound, Activity, Gauge, HeartPulse, Clock,
  Heart, Apple, Users, Settings2, Network, Building2, Cog, BarChart3, Brain, Smartphone,
} from 'lucide-react';

export const DEMO_NAV = [
  {
    id: 'inicio',
    label: 'Inicio',
    items: [
      {
        label: 'Tablero del Club',
        path: '/club-dashboard',
        icon: ShieldCheck,
        subtitle: 'Control general de la institución',
      },
    ],
  },
  {
    id: 'cuerpo_tecnico',
    label: 'Cuerpo Técnico',
    items: [
      { label: 'Tablero del Cuerpo Técnico', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Sesiones', path: '/sessions', icon: Video },
      { label: 'Partidos', path: '/matches', icon: Trophy },
      { label: 'Calendario', path: '/schedule', icon: CalendarDays, transversal: true },
      { label: 'Planificación semanal', path: '/weekly-planner', icon: ClipboardList },
      { label: 'Biblioteca de Campo', path: '/field-library', icon: BookOpen },
      { label: 'Biblioteca de Fuerza', path: '/strength-library', icon: Dumbbell },
    ],
  },
  {
    id: 'plantel',
    label: 'Plantel',
    items: [
      { label: 'Jugadores', path: '/players', icon: UsersRound },
      { label: 'Estado del plantel', path: '/daily-squad', icon: ShieldCheck },
      { label: 'Jugador 360°', path: '/players', icon: UserRound, transversal: true },
    ],
  },
  {
    id: 'experiencia_jugador',
    label: 'Experiencia del Jugador',
    items: [
      { label: 'Portal del Jugador', path: '/demo/player', icon: Smartphone },
    ],
  },
  {
    id: 'rendimiento',
    label: 'Rendimiento',
    items: [
      { label: 'Tablero de Rendimiento', path: '/performance/dashboard', icon: Activity },
      { label: 'Carga externa / GPS', path: '/gps', icon: Gauge },
      { label: 'Carga interna', path: '/performance/internal-load', icon: HeartPulse },
      { label: 'Evaluaciones', path: '/evaluations', icon: BarChart3 },
      { label: 'Minutos jugados', path: '/performance/minutes', icon: Clock },
    ],
  },
  {
    id: 'salud',
    label: 'Salud y Bienestar',
    items: [
      { label: 'Área médica', path: '/performance/medical', icon: Heart },
      { label: 'Kinesiología', path: null, icon: HeartPulse, comingSoon: true },
      { label: 'Nutrición', path: '/performance/nutrition', icon: Apple },
      { label: 'Wellness / RPE', path: '/performance/internal-load', icon: Activity, transversal: true },
      { label: 'Psicología', path: null, icon: Brain, comingSoon: true },
    ],
  },
  {
    id: 'gestion',
    label: 'Gestión del Club',
    items: [
      { label: 'Planteles', path: '/squad-manager', icon: Users },
      { label: 'Staff / Cuerpo técnico', path: '/team', icon: UsersRound },
      { label: 'Usuarios y accesos', path: '/team', icon: Settings2 },
      { label: 'Accesos de jugadores', path: '/player-access', icon: UserRound },
      { label: 'Integraciones', path: '/demo/integrations', icon: Network },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    items: [
      { label: 'Identidad del club', path: '/admin?section=club', icon: Building2 },
      {
        label: 'Configuración general',
        path: '/admin',
        icon: Cog,
        subtitle: 'Temporadas · Competencias · Áreas · Roles · Módulos',
      },
    ],
  },
];