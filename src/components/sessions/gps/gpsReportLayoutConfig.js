export const DEFAULT_GPS_REPORT_LAYOUT = {
  table_config: {
    ranking_metric: "total_distance",
    limit: "all",
    show_references: true,
    detail_mode: "simple",
  },
  charts: [
    { id: "distance-player", title: "Distancia total por jugador", metric: "total_distance", dimension: "player", type: "bar", showReference: true },
    { id: "player-load-player", title: "Player Load por jugador", metric: "player_load", dimension: "player", type: "bar", showReference: true },
    { id: "smax-player", title: "Smax por jugador", metric: "smax", dimension: "player", type: "bar", showReference: true },
  ],
};

export function normalizeGpsReportLayout(row = null) {
  const table = { ...DEFAULT_GPS_REPORT_LAYOUT.table_config, ...(row?.table_config || {}) };
  const charts = Array.isArray(row?.charts) && row.charts.length
    ? row.charts.map((chart, index) => ({
      id: chart.id || `chart-${index + 1}`,
      title: chart.title || "Gráfico GPS",
      metric: chart.metric || "total_distance",
      dimension: chart.dimension === "exercise" ? "exercise" : "player",
      type: chart.type === "line" ? "line" : "bar",
      showReference: chart.showReference !== false,
    }))
    : DEFAULT_GPS_REPORT_LAYOUT.charts.map(chart => ({ ...chart }));
  return { table_config: table, charts };
}

export function layoutMatchesSeason(row, seasonId) {
  return !seasonId || !row?.season_id || String(row.season_id) === String(seasonId);
}