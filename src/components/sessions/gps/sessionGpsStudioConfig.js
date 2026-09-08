export const SESSION_GPS_STUDIO_KEY = "session-gps-studio-v2";

export const DEFAULT_SESSION_GPS_STUDIO_CONFIG = {
  charts: [
    { id: "exercise-distance", title: "Distancia por ejercicio", metric: "total_distance", dimension: "exercise", type: "bar", showAverage: true },
    { id: "player-load", title: "Player Load por jugador", metric: "player_load", dimension: "player", type: "bar", showAverage: true },
  ],
  selectedPlayerIds: [],
  comparisonSessionId: "",
};

export function loadSessionGpsStudioConfig(sessionId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${SESSION_GPS_STUDIO_KEY}:${sessionId}`) || "null");
    return parsed ? { ...DEFAULT_SESSION_GPS_STUDIO_CONFIG, ...parsed } : { ...DEFAULT_SESSION_GPS_STUDIO_CONFIG };
  } catch {
    return { ...DEFAULT_SESSION_GPS_STUDIO_CONFIG };
  }
}

export function saveSessionGpsStudioConfig(sessionId, config) {
  localStorage.setItem(`${SESSION_GPS_STUDIO_KEY}:${sessionId}`, JSON.stringify(config));
  return config;
}
