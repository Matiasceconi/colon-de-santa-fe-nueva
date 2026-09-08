export const GPS_REFERENCE_TYPES = [
  { id: "player_md", label: "Histórico individual del mismo MD", family: "md" },
  { id: "player_competition", label: "Demanda competitiva individual", family: "competition" },
  { id: "player_history", label: "Histórico individual de entrenamiento", family: "history" },
  { id: "player_max", label: "Máximo individual", family: "max" },
  { id: "position_md", label: "Histórico MD por posición", family: "md" },
  { id: "position_competition", label: "Demanda competitiva por posición", family: "competition" },
  { id: "squad_md", label: "Histórico MD del plantel", family: "md" },
  { id: "squad_history", label: "Histórico general del plantel", family: "history" },
  { id: "manual", label: "Valor manual", family: "manual" },
  { id: "none", label: "Sin referencia", family: "none" },
];

export const DEFAULT_GPS_METRIC_RULES = {
  total_distance: { reference_type: "player_md" },
  m_min: { reference_type: "player_md" },
  distance_19_8: { reference_type: "player_competition" },
  distance_25: { reference_type: "player_competition" },
  sprints: { reference_type: "player_competition" },
  acc_3: { reference_type: "player_md" },
  dec_3: { reference_type: "player_md" },
  player_load: { reference_type: "player_md" },
  smax: { reference_type: "player_max" },
  player_load_per_min: { reference_type: "player_md" },
  hmld: { reference_type: "player_md" },
  rhie_bouts: { reference_type: "player_competition" },
};

export const DEFAULT_GPS_THRESHOLD_DEFINITIONS = {
  hsr: { mode: "absolute", min_kmh: 19.8, max_kmh: 25, label: "HSR 19.8–25 km/h" },
  sprint: { mode: "absolute", min_kmh: 25, label: "Sprint >25 km/h" },
  acceleration: { mode: "absolute", threshold_ms2: 3, label: "ACC >3 m/s²" },
  deceleration: { mode: "absolute", threshold_ms2: -3, label: "DEC <-3 m/s²" },
};

export const DEFAULT_GPS_REFERENCE_CONFIG = {
  model: "hybrid",
  metric_rules: DEFAULT_GPS_METRIC_RULES,
  fallback_order: ["individual", "position", "squad"],
  min_competition_matches: 3,
  min_match_minutes: 80,
  competition_window: 5,
  min_md_sessions: 3,
  md_window: 5,
  min_position_players: 3,
  threshold_definitions: DEFAULT_GPS_THRESHOLD_DEFINITIONS,
  active: true,
};

const METRIC_PROFILE_FIELDS = {
  total_distance: "avg_total_distance",
  m_min: "avg_m_min",
  distance_19_8: "avg_distance_19_8",
  distance_25: "avg_distance_25",
  sprints: "avg_sprints",
  acc_3: "avg_acc_3",
  dec_3: "avg_dec_3",
  player_load: "avg_player_load",
  player_load_per_min: "avg_player_load_per_min",
  hmld: "avg_hmld",
  rhie_bouts: "avg_rhie",
  smax: "avg_smax",
};

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function avg(values = []) {
  const valid = values.map(num).filter((value) => value != null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function normalizeSeason(value) {
  return String(value || "").trim();
}

function sameSeason(record, seasonId) {
  if (!seasonId) return true;
  return !record?.season_id || normalizeSeason(record.season_id) === normalizeSeason(seasonId);
}

function playerPositionKey(player) {
  return player?.position_group || player?.position || "";
}

function metricField(metricKey, referenceType) {
  if (referenceType === "player_max") return metricKey === "smax" ? "max_smax" : METRIC_PROFILE_FIELDS[metricKey];
  if (referenceType === "squad_history" && metricKey === "player_load_per_min") return "avg_player_load_per_min";
  return METRIC_PROFILE_FIELDS[metricKey] || `avg_${metricKey}`;
}

export function normalizeGpsReferenceConfig(row, context = {}) {
  const metricRules = { ...DEFAULT_GPS_METRIC_RULES, ...(row?.metric_rules || {}) };
  const thresholds = { ...DEFAULT_GPS_THRESHOLD_DEFINITIONS, ...(row?.threshold_definitions || {}) };
  return {
    ...DEFAULT_GPS_REFERENCE_CONFIG,
    ...(row || {}),
    squad_id: row?.squad_id || context.squad_id || "",
    squad_name: row?.squad_name || context.squad_name || "",
    season_id: row?.season_id || context.season_id || "",
    metric_rules: metricRules,
    threshold_definitions: thresholds,
    fallback_order: Array.isArray(row?.fallback_order) && row.fallback_order.length ? row.fallback_order : DEFAULT_GPS_REFERENCE_CONFIG.fallback_order,
  };
}

export function referenceTypeLabel(type) {
  return GPS_REFERENCE_TYPES.find((item) => item.id === type)?.label || type || "Sin referencia";
}

function matchingPlayer(players, playerId) {
  return players.find((item) => item.id === playerId) || null;
}

function matchingMdProfile(profiles, playerId, session, seasonId) {
  const md = session?.microcycle_day || session?.match_day_code || "";
  return profiles.find((item) => item.player_id === playerId && sameSeason(item, seasonId) && (item.microcycle_day || item.md) === md) || null;
}

function candidatePlayerMd({ metricKey, row, session, config, playerMicrocycleProfiles }) {
  const profile = matchingMdProfile(playerMicrocycleProfiles, row.player_id, session, config.season_id);
  const field = metricField(metricKey, "player_md");
  const value = num(profile?.[field]);
  const sampleCount = Number(profile?.sessions_used ?? profile?.sessions_count ?? 0);
  return value != null ? {
    value,
    type: "player_md",
    sourceLabel: `Individual · ${session?.microcycle_day || session?.match_day_code || "MD"}`,
    sampleCount,
    sampleUnit: "sesiones",
    sufficient: sampleCount >= Number(config.min_md_sessions || 0),
  } : null;
}

function candidatePlayerCompetition({ metricKey, row, config, playerCompetitionProfiles }) {
  const profile = playerCompetitionProfiles.find((item) => item.player_id === row.player_id && sameSeason(item, config.season_id));
  const field = metricField(metricKey, "player_competition");
  const value = num(profile?.[field]);
  const sampleCount = Number(profile?.matches_used || 0);
  return value != null ? {
    value,
    type: "player_competition",
    sourceLabel: "Individual · competencia",
    sampleCount,
    sampleUnit: "partidos",
    sufficient: sampleCount >= Number(config.min_competition_matches || 0),
  } : null;
}

function candidatePlayerHistory({ metricKey, row, config, playerGpsProfiles }) {
  const profile = playerGpsProfiles.find((item) => item.player_id === row.player_id && sameSeason(item, config.season_id));
  const field = metricField(metricKey, "player_history");
  const value = num(profile?.[field]);
  const sampleCount = Number(profile?.total_sessions || 0);
  return value != null ? {
    value,
    type: "player_history",
    sourceLabel: "Individual · histórico",
    sampleCount,
    sampleUnit: "sesiones",
    sufficient: sampleCount >= Number(config.min_md_sessions || 0),
  } : null;
}

function candidatePlayerMax({ metricKey, row, playerGpsProfiles }) {
  const profile = playerGpsProfiles.find((item) => item.player_id === row.player_id);
  const field = metricField(metricKey, "player_max");
  const value = num(profile?.[field]);
  return value != null ? {
    value,
    type: "player_max",
    sourceLabel: metricKey === "smax" ? "Máximo individual histórico" : "Máximo / perfil individual",
    sampleCount: Number(profile?.total_sessions || 0),
    sampleUnit: "sesiones",
    sufficient: true,
  } : null;
}

function positionProfiles({ profiles, players, player, seasonId, predicate = () => true }) {
  const position = playerPositionKey(player);
  const ids = new Set(players.filter((item) => playerPositionKey(item) === position).map((item) => item.id));
  return profiles.filter((profile) => ids.has(profile.player_id) && sameSeason(profile, seasonId) && predicate(profile));
}

function candidatePositionMd({ metricKey, session, config, player, players, playerMicrocycleProfiles }) {
  const md = session?.microcycle_day || session?.match_day_code || "";
  const profiles = positionProfiles({
    profiles: playerMicrocycleProfiles,
    players,
    player,
    seasonId: config.season_id,
    predicate: (profile) => (profile.microcycle_day || profile.md) === md,
  });
  const field = metricField(metricKey, "position_md");
  const value = avg(profiles.map((profile) => profile[field]));
  return value != null ? {
    value,
    type: "position_md",
    sourceLabel: `${playerPositionKey(player) || "Posición"} · ${md || "MD"}`,
    sampleCount: profiles.length,
    sampleUnit: "jugadores",
    sufficient: profiles.length >= Number(config.min_position_players || 0),
  } : null;
}

function candidatePositionCompetition({ metricKey, config, player, players, playerCompetitionProfiles }) {
  const profiles = positionProfiles({ profiles: playerCompetitionProfiles, players, player, seasonId: config.season_id });
  const field = metricField(metricKey, "position_competition");
  const value = avg(profiles.map((profile) => profile[field]));
  return value != null ? {
    value,
    type: "position_competition",
    sourceLabel: `${playerPositionKey(player) || "Posición"} · competencia`,
    sampleCount: profiles.length,
    sampleUnit: "jugadores",
    sufficient: profiles.length >= Number(config.min_position_players || 0),
  } : null;
}

function candidateSquadMd({ metricKey, session, config, teamMicrocycleProfiles }) {
  const md = session?.microcycle_day || session?.match_day_code || "";
  const profile = teamMicrocycleProfiles.find((item) => item.squad_id === config.squad_id && sameSeason(item, config.season_id) && item.md === md && item.player_type === "campo")
    || teamMicrocycleProfiles.find((item) => item.squad_id === config.squad_id && sameSeason(item, config.season_id) && item.md === md);
  const field = metricField(metricKey, "squad_md");
  const value = num(profile?.[field]);
  return value != null ? {
    value,
    type: "squad_md",
    sourceLabel: `Plantel · ${md || "MD"}`,
    sampleCount: Number(profile?.sessions_count ?? profile?.total_sessions ?? 0),
    sampleUnit: "sesiones",
    sufficient: Number(profile?.sessions_count ?? profile?.total_sessions ?? 0) >= Number(config.min_md_sessions || 0),
  } : null;
}

function candidateSquadHistory({ metricKey, config, teamProfiles }) {
  const profile = teamProfiles.find((item) => item.squad_id === config.squad_id && sameSeason(item, config.season_id) && item.player_type === "campo")
    || teamProfiles.find((item) => item.squad_id === config.squad_id && sameSeason(item, config.season_id));
  const field = metricField(metricKey, "squad_history");
  const value = num(profile?.[field]);
  return value != null ? {
    value,
    type: "squad_history",
    sourceLabel: "Plantel · histórico",
    sampleCount: Number(profile?.total_sessions || 0),
    sampleUnit: "sesiones",
    sufficient: true,
  } : null;
}

function candidateSquadCompetition({ metricKey, config, playerCompetitionProfiles }) {
  const profiles = playerCompetitionProfiles.filter((item) => sameSeason(item, config.season_id) && (!config.squad_id || !item.squad_id || item.squad_id === config.squad_id));
  const field = metricField(metricKey, "position_competition");
  const value = avg(profiles.map((profile) => profile[field]));
  return value != null ? {
    value,
    type: "squad_competition",
    sourceLabel: "Plantel · competencia",
    sampleCount: profiles.length,
    sampleUnit: "jugadores",
    sufficient: profiles.length >= Number(config.min_position_players || 0),
  } : null;
}

function candidateManual({ metricKey, config }) {
  const value = num(config.metric_rules?.[metricKey]?.manual_value);
  return value != null ? { value, type: "manual", sourceLabel: "Valor manual del club", sampleCount: null, sampleUnit: "", sufficient: true } : null;
}

function directCandidate(type, context) {
  if (type === "player_md") return candidatePlayerMd(context);
  if (type === "player_competition") return candidatePlayerCompetition(context);
  if (type === "player_history") return candidatePlayerHistory(context);
  if (type === "player_max") return candidatePlayerMax(context);
  if (type === "position_md") return candidatePositionMd(context);
  if (type === "position_competition") return candidatePositionCompetition(context);
  if (type === "squad_md") return candidateSquadMd(context);
  if (type === "squad_history") return candidateSquadHistory(context);
  if (type === "manual") return candidateManual(context);
  return null;
}

function familyOf(type) {
  if (type.includes("competition")) return "competition";
  if (type.includes("_md")) return "md";
  if (type.includes("history")) return "history";
  if (type.includes("max")) return "max";
  return type;
}

function fallbackType(level, family) {
  if (level === "individual") {
    if (family === "competition") return "player_competition";
    if (family === "md") return "player_md";
    if (family === "history") return "player_history";
    if (family === "max") return "player_max";
  }
  if (level === "position") {
    if (family === "competition") return "position_competition";
    if (family === "md") return "position_md";
    if (family === "history") return "squad_history";
    if (family === "max") return "squad_history";
  }
  if (level === "squad") {
    if (family === "competition") return "squad_competition";
    if (family === "md") return "squad_md";
    if (family === "history" || family === "max") return "squad_history";
  }
  return null;
}

function ruleMatches(rule, { session, player, metricKey, config }) {
  if (rule.active === false || rule.metric_key !== metricKey) return false;
  if (rule.squad_id && config.squad_id && rule.squad_id !== config.squad_id) return false;
  if (rule.season_id && config.season_id && normalizeSeason(rule.season_id) !== normalizeSeason(config.season_id)) return false;
  const md = session?.microcycle_day || session?.match_day_code || "";
  if (rule.md_code && rule.md_code !== md) return false;
  if (rule.physical_objective && rule.physical_objective !== session?.session_objective) return false;
  if (rule.position && rule.position !== player?.position && rule.position !== player?.position_group) return false;
  if (rule.player_id && rule.player_id !== player?.id) return false;
  return true;
}

function ruleSpecificity(rule) {
  return (rule.player_id ? 100 : 0) + (rule.position ? 50 : 0) + (rule.physical_objective ? 20 : 0) + (rule.md_code ? 10 : 0) + (rule.squad_id ? 1 : 0);
}

export function resolveGpsObjectiveRule(rules = [], context) {
  return rules
    .filter((rule) => ruleMatches(rule, context))
    .sort((a, b) => ruleSpecificity(b) - ruleSpecificity(a))[0] || null;
}

export function resolveGpsMetricReference({ metricKey, row, session, config: rawConfig, objectiveRules = [], players = [], playerCompetitionProfiles = [], playerMicrocycleProfiles = [], legacyMicrocycleProfiles = [], playerGpsProfiles = [], teamMicrocycleProfiles = [], teamProfiles = [] }) {
  const config = normalizeGpsReferenceConfig(rawConfig, { squad_id: session?.squad_id, squad_name: session?.squad_name, season_id: session?.season_id });
  const player = matchingPlayer(players, row.player_id) || { id: row.player_id, position: row.position, position_group: row.position_group };
  const rule = resolveGpsObjectiveRule(objectiveRules, { session, player, metricKey, config });
  const configuredType = rule?.reference_type_override || config.metric_rules?.[metricKey]?.reference_type || "none";
  if (configuredType === "none") return { metricKey, referenceType: "none", referenceLabel: "Sin referencia", sufficient: false, status: "no_reference", rule };

  const context = {
    metricKey,
    row,
    session,
    config,
    player,
    players,
    playerCompetitionProfiles,
    playerMicrocycleProfiles: playerMicrocycleProfiles.length ? playerMicrocycleProfiles : legacyMicrocycleProfiles,
    playerGpsProfiles,
    teamMicrocycleProfiles,
    teamProfiles,
  };

  const direct = directCandidate(configuredType, context);
  let chosen = direct?.sufficient ? direct : null;
  let usedFallback = false;
  const attempted = direct ? [direct] : [];

  if (!chosen && configuredType !== "manual") {
    const family = familyOf(configuredType);
    const seen = new Set([configuredType]);
    for (const level of config.fallback_order || []) {
      const type = fallbackType(level, family);
      if (!type || seen.has(type)) continue;
      seen.add(type);
      let candidate = type === "squad_competition" ? candidateSquadCompetition(context) : directCandidate(type, context);
      if (candidate) attempted.push(candidate);
      if (candidate?.sufficient) {
        chosen = candidate;
        usedFallback = true;
        break;
      }
    }
  }

  if (!chosen && direct) chosen = direct;
  if (!chosen) {
    return {
      metricKey,
      referenceType: configuredType,
      referenceLabel: referenceTypeLabel(configuredType),
      sufficient: false,
      status: "insufficient",
      rule,
      attempted,
    };
  }

  const currentValue = num(row?.[metricKey]);
  const pct = currentValue != null && chosen.value ? (currentValue / chosen.value) * 100 : null;
  const minPct = num(rule?.target_min_pct);
  const maxPct = num(rule?.target_max_pct);
  const minValue = num(rule?.target_min_value);
  const maxValue = num(rule?.target_max_value);
  let status = chosen.sufficient ? "reference_only" : "insufficient";
  if (currentValue != null && chosen.sufficient) {
    if (minValue != null || maxValue != null) {
      if (minValue != null && currentValue < minValue) status = "below";
      else if (maxValue != null && currentValue > maxValue) status = "above";
      else status = "in_range";
    } else if (pct != null && (minPct != null || maxPct != null)) {
      if (minPct != null && pct < minPct) status = "below";
      else if (maxPct != null && pct > maxPct) status = "above";
      else status = "in_range";
    }
  }

  return {
    metricKey,
    currentValue,
    referenceValue: chosen.value,
    referenceType: chosen.type,
    referenceLabel: chosen.sourceLabel,
    sampleCount: chosen.sampleCount,
    sampleUnit: chosen.sampleUnit,
    sufficient: chosen.sufficient,
    usedFallback,
    pct,
    targetMinPct: minPct,
    targetMaxPct: maxPct,
    targetMinValue: minValue,
    targetMaxValue: maxValue,
    status,
    rule,
    attempted,
  };
}

export function statusLabel(status) {
  if (status === "in_range") return "En rango";
  if (status === "below") return "Por debajo del objetivo";
  if (status === "above") return "Por encima del objetivo";
  if (status === "insufficient") return "Referencia en construcción";
  if (status === "no_reference") return "Sin referencia";
  return "Referencia disponible";
}

export function statusTone(status) {
  if (status === "in_range") return "emerald";
  if (status === "below") return "blue";
  if (status === "above") return "amber";
  if (status === "insufficient") return "zinc";
  return "zinc";
}

export function shortStatusLabel(status) {
  if (status === "in_range") return "En rango";
  if (status === "below") return "Por debajo";
  if (status === "above") return "Por encima";
  return "";
}

export function shortReferenceLabel(ref, session) {
  if (!ref) return "";
  const type = ref.referenceType;
  const md = session?.microcycle_day || session?.match_day_code || "";
  const fb = ref.usedFallback ? " (f)" : "";
  if (type === "manual") return `Manual${fb}`;
  if (type === "player_max") return `Máximo individual${fb}`;
  const scope = type.startsWith("player") ? "Individual"
    : type.startsWith("position") ? "Por posición"
    : type.startsWith("squad") ? "Plantel"
    : "";
  const family = type.includes("_md") ? (md || "MD")
    : type.includes("competition") ? "Competencia"
    : type.includes("history") ? "Histórico"
    : "";
  return `${family} · ${scope}${fb}`;
}