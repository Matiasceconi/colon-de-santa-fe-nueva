import { isGoalkeeper } from "@/components/squad/squadConstants";
import { aggregateSessionGps } from "@/components/sessions/gps/gpsTaskImportUtils";
import { normalizeGpsReferenceConfig, resolveGpsMetricReference } from "@/components/sessions/gps/gpsReferenceEngine";

export const REPORT_METRICS = [
  { key: "total_distance", label: "Distancia Total", unit: "m", color: "#3b82f6" },
  { key: "m_min", label: "m/min", unit: "", color: "#22c55e" },
  { key: "distance_19_8", label: "D >19.8", unit: "m", color: "#10b981" },
  { key: "distance_25", label: "D >25", unit: "m", color: "#f97316" },
  { key: "sprints", label: "Sprints", unit: "", color: "#06b6d4" },
  { key: "acc_3", label: "ACC +3", unit: "", color: "#f59e0b" },
  { key: "dec_3", label: "DEC +3", unit: "", color: "#ec4899" },
  { key: "player_load", label: "Player Load", unit: "", color: "#a855f7" },
  { key: "smax", label: "Smax", unit: "km/h", color: "#ef4444", decimals: 1 },
  { key: "player_load_per_min", label: "PL/min", unit: "u/min", color: "#818cf8", decimals: 2 },
  { key: "hmld", label: "HMLD", unit: "m", color: "#fb7185" },
  { key: "rhie_bouts", label: "RHIE", unit: "", color: "#c084fc" },
];

export function fmtMetricVal(key, v) {
  if (v == null || v === "" || !Number.isFinite(Number(v))) return "—";
  const metric = REPORT_METRICS.find(item => item.key === key);
  if (metric?.decimals != null) {
    return Number(v).toLocaleString("es-AR", {
      minimumFractionDigits: metric.decimals,
      maximumFractionDigits: metric.decimals,
    });
  }
  return Math.round(Number(v)).toLocaleString("es-AR");
}

function surnameFromName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || "—");
}

function firstInitial(name = "") {
  return (String(name || "").trim().split(/\s+/)[0] || "").charAt(0).toUpperCase();
}

export function withPlayerDisplayNames(rows = []) {
  const bases = rows.map((row) => surnameFromName(row.player_name || row.player_name_original));
  const counts = bases.reduce((acc, base) => ({ ...acc, [base]: (acc[base] || 0) + 1 }), {});
  return rows.map((row, index) => ({
    ...row,
    display_name: counts[bases[index]] > 1 ? `${bases[index]} ${firstInitial(row.player_name || row.player_name_original)}.` : bases[index],
  }));
}

const COMPETITION_KEY_MAP = {
  total_distance: "avg_total_distance",
  m_min: "avg_m_min",
  distance_19_8: "avg_distance_19_8",
  distance_25: "avg_distance_25",
  sprints: "avg_sprints",
  acc_3: "avg_acc_3",
  dec_3: "avg_dec_3",
  player_load: "avg_player_load",
  smax: "avg_smax",
};

const HIGHLIGHT_DEFS = [
  { key: "total_distance", label: "Mayor distancia" },
  { key: "m_min", label: "Mayor m/min" },
  { key: "player_load", label: "Mayor Player Load" },
  { key: "smax", label: "Mayor Smax" },
  { key: "distance_25", label: "Mayor distancia alta velocidad" },
  { key: "sprints", label: "Mayor cantidad de sprints" },
  { key: "acc_3", label: "Mayor ACC" },
  { key: "dec_3", label: "Mayor DEC" },
];

export function metricAverage(rows = [], key) {
  const values = rows
    .map(row => row[key])
    .filter(value => value != null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function buildExerciseLoads(exercises = [], exerciseRows = []) {
  return exercises.map(exercise => {
    const detail = exerciseRows.filter(row => row.exercise_id === exercise.id);
    const playerTotals = detail.length ? aggregateSessionGps(detail) : [];
    const summary = exercise.external_load_summary || {};
    const metrics = {};
    REPORT_METRICS.forEach(metric => {
      metrics[metric.key] = playerTotals.length
        ? metricAverage(playerTotals, metric.key)
        : (summary[metric.key] ?? null);
    });
    return {
      id: exercise.id,
      name: exercise.name,
      blocks: Number(exercise.blocks) || Math.max(1, ...detail.map(row => Number(row.block_number) || 1)),
      players: playerTotals.length || summary.players_count || exercise.players_count || 0,
      ...metrics,
    };
  }).filter(row => REPORT_METRICS.some(metric => row[metric.key] != null));
}

export function buildReportData({ session, sessionPlayers, gpsRows, players, weekGpsRows = [], competitionProfiles = [], exercises = [], exerciseRows = [], comparisonSession = null, comparisonGpsRows = [], referenceContext = {} }) {
  const playerMap = {};
  players.forEach((p) => { playerMap[p.id] = p; });

  const enrich = (rows) => rows
    .map((r) => ({ ...r, _player: playerMap[r.player_id] }))
    .filter((r) => !isGoalkeeper(r._player || { position: r.player_name_original }));

  const allRows = withPlayerDisplayNames(enrich(gpsRows));
  const principal = allRows.filter((r) => r.include_in_session_average !== false);
  const excluded = allRows.filter((r) => r.include_in_session_average === false);
  const weekPrincipal = enrich(weekGpsRows).filter((r) => r.include_in_session_average !== false);

  const teamAverages = {};
  const weekAverages = {};
  REPORT_METRICS.forEach((m) => {
    teamAverages[m.key] = metricAverage(principal, m.key);
    weekAverages[m.key] = metricAverage(weekPrincipal, m.key);
  });

  const referenceConfig = normalizeGpsReferenceConfig(referenceContext.config, { squad_id: session.squad_id, squad_name: session.squad_name, season_id: session.season_id });
  const referenceByPlayer = {};
  principal.forEach((row) => {
    referenceByPlayer[row.player_id] = {};
    REPORT_METRICS.forEach((metric) => {
      referenceByPlayer[row.player_id][metric.key] = resolveGpsMetricReference({
        metricKey: metric.key,
        row,
        session,
        config: referenceConfig,
        objectiveRules: referenceContext.objectiveRules || [],
        players,
        playerCompetitionProfiles: referenceContext.playerCompetitionProfiles?.length ? referenceContext.playerCompetitionProfiles : competitionProfiles,
        playerMicrocycleProfiles: referenceContext.playerMicrocycleProfiles || [],
        legacyMicrocycleProfiles: referenceContext.legacyMicrocycleProfiles || [],
        playerGpsProfiles: referenceContext.playerGpsProfiles || [],
        teamMicrocycleProfiles: referenceContext.teamMicrocycleProfiles || [],
        teamProfiles: referenceContext.teamProfiles || [],
      });
    });
  });
  const referenceSummary = Object.fromEntries(REPORT_METRICS.map((metric) => {
    const refs = principal.map((row) => referenceByPlayer[row.player_id]?.[metric.key]).filter(Boolean);
    const sufficient = refs.filter((ref) => ref.sufficient && Number.isFinite(Number(ref.pct)));
    const objectiveRefs = sufficient.filter((ref) => ["in_range", "below", "above"].includes(ref.status));
    return [metric.key, {
      averagePct: sufficient.length ? sufficient.reduce((sum, ref) => sum + Number(ref.pct), 0) / sufficient.length : null,
      sufficientCount: sufficient.length,
      totalCount: refs.length,
      objectiveCount: objectiveRefs.length,
      inRangeCount: objectiveRefs.filter((ref) => ref.status === "in_range").length,
      belowCount: objectiveRefs.filter((ref) => ref.status === "below").length,
      aboveCount: objectiveRefs.filter((ref) => ref.status === "above").length,
    }];
  }));

  const presentRows = sessionPlayers.filter((sp) => sp.attendance === "presente");
  const diferenciados = sessionPlayers.filter((sp) => sp.attendance === "diferenciado" || sp.status_at_session === "diferenciado").length;
  const kinesiologia = sessionPlayers.filter((sp) => sp.attendance === "kinesiologia").length;
  const arqueros = presentRows.filter((sp) => isGoalkeeper({ position: sp.position })).length;

  const summary = {
    conGps: principal.length,
    excluidos: excluded.length,
    diferenciados,
    kinesiologia,
    arqueros,
    duracion: session.duration_minutes || null,
  };

  const highlights = HIGHLIGHT_DEFS.map((h) => {
    const sorted = [...principal].filter((r) => r[h.key] != null && r[h.key] > 0).sort((a, b) => (b[h.key] || 0) - (a[h.key] || 0));
    const top = sorted[0];
    if (!top) return null;
    return {
      key: h.key,
      label: h.label,
      player_name: top.display_name || top.player_name,
      photo_url: top._player?.photo_url,
      position: top._player?.position,
      value: fmtMetricVal(h.key, top[h.key]),
    };
  }).filter(Boolean);

  const profileByPlayer = {};
  competitionProfiles.forEach((cp) => { profileByPlayer[cp.player_id] = cp; });
  const comparison = principal.map((r) => {
    const cp = profileByPlayer[r.player_id];
    if (!cp) return null;
    const metrics = REPORT_METRICS.map((m) => {
      const sessionVal = r[m.key];
      const compVal = cp[COMPETITION_KEY_MAP[m.key]];
      const pct = (sessionVal != null && compVal) ? (sessionVal / compVal) * 100 : null;
      return { key: m.key, label: m.label, sessionVal, compVal, pct };
    });
    return { player_id: r.player_id, player_name: r.player_name, display_name: r.display_name, photo_url: r._player?.photo_url, position: r._player?.position, metrics };
  }).filter(Boolean);

  const alerts = [];
  presentRows.forEach((sp) => {
    if (isGoalkeeper({ position: sp.position })) return;
    const hasGps = allRows.some((r) => r.player_id === sp.player_id);
    if (!hasGps) alerts.push({ type: "sin_gps", text: `${surnameFromName(sp.player_name)}: presente sin registro GPS` });
  });
  principal.forEach((r) => {
    const missing = ["total_distance", "player_load"].some((k) => r[k] == null);
    if (missing) alerts.push({ type: "incompleto", text: `${r.display_name || r.player_name}: GPS incompleto` });
  });
  principal.forEach((row) => {
    REPORT_METRICS.forEach((metric) => {
      const ref = referenceByPlayer[row.player_id]?.[metric.key];
      if (!ref?.sufficient || !["below", "above"].includes(ref.status)) return;
      const direction = ref.status === "above" ? "por encima" : "por debajo";
      alerts.push({
        type: `objective_${ref.status}`,
        text: `${row.display_name || row.player_name}: ${metric.label} ${direction} del objetivo configurado (${Math.round(ref.pct || 0)}% de referencia)`,
      });
    });
  });
  excluded.forEach((r) => alerts.push({ type: "excluido", text: `${r.display_name || r.player_name}: excluido del promedio` }));

  const insights = [];
  ["total_distance", "m_min", "distance_25", "player_load"].forEach((key) => {
    const metric = REPORT_METRICS.find((item) => item.key === key);
    const ref = referenceSummary[key];
    if (ref?.sufficientCount && ref.averagePct != null) {
      insights.push(`${metric?.label || key}: promedio del grupo en ${Math.round(ref.averagePct)}% de la referencia configurada (${ref.sufficientCount} jugadores con muestra suficiente).`);
    }
  });
  const objectiveMetrics = REPORT_METRICS.map((metric) => ({ metric, summary: referenceSummary[metric.key] })).filter((item) => item.summary?.objectiveCount > 0);
  if (objectiveMetrics.length) {
    const totalObjectives = objectiveMetrics.reduce((sum, item) => sum + item.summary.objectiveCount, 0);
    const inRange = objectiveMetrics.reduce((sum, item) => sum + item.summary.inRangeCount, 0);
    insights.push(`${inRange}/${totalObjectives} comparaciones jugador-métrica quedaron dentro de los objetivos definidos por el club.`);
  } else {
    insights.push("La sesión se interpreta contra referencias configuradas; todavía no hay rangos objetivo aplicables a este contexto.");
  }
  const topLoad = highlights.find((h) => h.key === "player_load");
  if (topLoad) insights.push(`Mayor Player Load de la sesión: ${topLoad.player_name} (${topLoad.value}).`);
  const insufficientCore = ["total_distance", "m_min", "distance_25"].filter((key) => !referenceSummary[key]?.sufficientCount);
  if (insufficientCore.length) insights.push(`Hay referencias todavía en construcción para ${insufficientCore.map((key) => REPORT_METRICS.find((m) => m.key === key)?.label || key).join(", ")}.`);

  const exerciseLoads = buildExerciseLoads(exercises, exerciseRows);
  const comparisonPrincipal = enrich(comparisonGpsRows).filter(row => row.include_in_session_average !== false);
  const comparisonAverages = {};
  REPORT_METRICS.forEach(metric => {
    comparisonAverages[metric.key] = metricAverage(comparisonPrincipal, metric.key);
  });

  return {
    summary,
    teamAverages,
    weekAverages,
    highlights,
    comparison,
    referenceConfig,
    referenceByPlayer,
    referenceSummary,
    alerts,
    insights,
    principal,
    excluded,
    exerciseLoads,
    comparisonSession,
    comparisonAverages,
  };
}