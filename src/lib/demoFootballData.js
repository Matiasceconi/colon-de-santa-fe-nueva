// Datos ficticios de demostración para la pantalla "Visión del club".
// Únicamente para modo demo. No representa datos reales ni depende de APIs externas.

export const DEMO_CLUB = {
  name: "Performance FC",
  short: "PFC",
  division: "Primera División",
  season: "Temporada 2026",
};

export const DEMO_COMPETITIONS = [
  { id: "liga", name: "Liga Nacional", badge: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { id: "copa", name: "Copa Nacional", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { id: "internacional", name: "Torneo Internacional", badge: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
];

export const DEMO_SQUADS = [
  { id: "primera", label: "Primera", available: true },
  { id: "reserva", label: "Reserva", available: true },
  { id: "juveniles", label: "Juveniles", available: true },
];

export const DEMO_STATS = {
  liga: { position: 4, points: 27, played: 15, gd: 8 },
  copa: { position: 2, points: 9, played: 4, gd: 5 },
  internacional: { position: 1, points: 6, played: 3, gd: 3 },
};

export const DEMO_STANDINGS = {
  liga: [
    { position: 1, team: "Deportivo Norte", played: 15, won: 10, drawn: 3, lost: 2, gf: 30, gc: 15, gd: 15, points: 33 },
    { position: 2, team: "Atlético Central", played: 15, won: 9, drawn: 3, lost: 3, gf: 28, gc: 20, gd: 8, points: 30 },
    { position: 3, team: "Unión Metropolitana", played: 15, won: 9, drawn: 2, lost: 4, gf: 26, gc: 22, gd: 4, points: 29 },
    { position: 4, team: "Performance FC", played: 15, won: 7, drawn: 6, lost: 2, gf: 25, gc: 17, gd: 8, points: 27 },
    { position: 5, team: "Sporting del Sur", played: 15, won: 7, drawn: 3, lost: 5, gf: 20, gc: 22, gd: -2, points: 24 },
    { position: 6, team: "Club del Oeste", played: 15, won: 6, drawn: 3, lost: 6, gf: 18, gc: 24, gd: -6, points: 21 },
    { position: 7, team: "Racing Federal", played: 15, won: 5, drawn: 3, lost: 7, gf: 16, gc: 26, gd: -10, points: 18 },
    { position: 8, team: "Atlético del Parque", played: 15, won: 4, drawn: 3, lost: 8, gf: 14, gc: 30, gd: -16, points: 15 },
  ],
  copa: [
    { position: 1, team: "Deportivo Norte", played: 4, won: 3, drawn: 1, lost: 0, gf: 9, gc: 3, gd: 6, points: 10 },
    { position: 2, team: "Performance FC", played: 4, won: 3, drawn: 0, lost: 1, gf: 8, gc: 3, gd: 5, points: 9 },
    { position: 3, team: "Unión Metropolitana", played: 4, won: 2, drawn: 0, lost: 2, gf: 6, gc: 5, gd: 1, points: 6 },
    { position: 4, team: "Sporting del Sur", played: 4, won: 1, drawn: 1, lost: 2, gf: 4, gc: 5, gd: -1, points: 4 },
    { position: 5, team: "Club del Oeste", played: 4, won: 1, drawn: 0, lost: 3, gf: 3, gc: 6, gd: -3, points: 3 },
    { position: 6, team: "Atlético del Parque", played: 4, won: 0, drawn: 1, lost: 3, gf: 2, gc: 9, gd: -7, points: 1 },
  ],
  internacional: [
    { position: 1, team: "Performance FC", played: 3, won: 2, drawn: 0, lost: 1, gf: 7, gc: 4, gd: 3, points: 6 },
    { position: 2, team: "Unión del Pacífico", played: 3, won: 2, drawn: 0, lost: 1, gf: 5, gc: 4, gd: 1, points: 6 },
    { position: 3, team: "Atlántico FC", played: 3, won: 1, drawn: 0, lost: 2, gf: 4, gc: 5, gd: -1, points: 3 },
    { position: 4, team: "Norte United", played: 3, won: 0, drawn: 0, lost: 3, gf: 2, gc: 5, gd: -3, points: 0 },
  ],
};

export const DEMO_UPCOMING = [
  { compId: "liga", home: "Performance FC", away: "Atlético Central", date: "2026-08-23T18:00:00", venue: "Estadio Performance", round: "Fecha 16" },
  { compId: "copa", home: "Deportivo Norte", away: "Performance FC", date: "2026-08-26T21:00:00", venue: "Estadio Norte", round: "Cuartos de final" },
  { compId: "internacional", home: "Performance FC", away: "Unión del Pacífico", date: "2026-09-01T19:30:00", venue: "Estadio Performance", round: "Fase de grupos" },
];

export const DEMO_RESULTS = [
  { compId: "liga", home: "Performance FC", away: "Sporting del Sur", homeGoals: 2, awayGoals: 1 },
  { compId: "liga", home: "Atlético Central", away: "Performance FC", homeGoals: 1, awayGoals: 1 },
  { compId: "liga", home: "Performance FC", away: "Club del Oeste", homeGoals: 3, awayGoals: 0 },
];