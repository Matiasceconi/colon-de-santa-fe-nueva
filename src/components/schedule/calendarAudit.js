export function normalizeCalendarText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function effectiveEventType(event = {}) {
  const text = normalizeCalendarText(`${event.event_type || ""} ${event.type || ""} ${event.title || ""} ${event.location || ""}`);
  if (text.includes("partido") || text.includes(" vs ")) return "Partido";
  if (text.includes("descanso") || text.includes("libre")) return "Descanso";
  if (text.includes("viaje") || text.includes("traslado") || text.includes("llegada") || text.includes("logistica")) return "Viaje";
  if (text.includes("desayuno") || text.includes("almuerzo") || text.includes("cena") || text.includes("comida")) return "Comida";
  if (text.includes("video")) return "Video";
  if (text.includes("gimnasio") || text.includes("fuerza") || text.includes("gym")) return "Gimnasio";
  if (text.includes("reunion") || text.includes("charla") || text.includes("auditorio")) return "Reunión";
  if (text.includes("evaluacion") || text.includes("control") || text.includes("test")) return "Evaluación";
  if (text.includes("cancha") || text.includes("entrenamiento") || text.includes("fisico")) return "Entrenamiento";
  return "Otro";
}

export function eventStartTime(event = {}) {
  return String(event.start_time || event.time || "").trim();
}

export function eventOrigin(event = {}) {
  if (event.source_kind === "training_session") return "session";
  if (event.source_kind === "match_report") return "matches";
  if (event.source_kind === "competition_integration" || event.sync_source === "competition_integration") return "integration";
  if (event.source_kind === "legacy_import") return "legacy";
  if (event.created_by_ai || event.source_kind === "ai_import") return "ai";
  if (event.sync_source === "matches") return "matches";
  return "manual";
}

export function originLabel(origin) {
  if (origin === "integration") return "Integración";
  if (origin === "ai") return "Importado con IA";
  if (origin === "matches") return "Partidos";
  return "Manual";
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.values()];
}

function isMatchLike(event) {
  return normalizeCalendarText(effectiveEventType(event)).includes("partido");
}

export function buildCalendarAudit(events = [], matches = [], sessions = []) {
  const eventById = new Map(events.filter(Boolean).map((event) => [event.id, event]));
  const matchById = new Map(matches.filter(Boolean).map((match) => [match.id, match]));
  const sessionById = new Map(sessions.filter(Boolean).map((session) => [session.id, session]));

  const duplicateMatchGroups = groupBy(events.filter(isMatchLike), (event) => [
    event.squad_id || "",
    event.date || "",
    normalizeCalendarText(event.rival || event.title || ""),
  ].join("|")).filter((group) => group.length > 1);

  const duplicateExactGroups = groupBy(events, (event) => [
    event.squad_id || "",
    event.date || "",
    eventStartTime(event),
    normalizeCalendarText(effectiveEventType(event)),
    normalizeCalendarText(event.title || ""),
    normalizeCalendarText(event.location || ""),
  ].join("|")).filter((group) => group.length > 1);

  const suspiciousTrainingPairs = groupBy(events.filter((event) => {
    const type = normalizeCalendarText(effectiveEventType(event));
    return type.includes("cancha") || type.includes("entrenamiento");
  }), (event) => [
    event.squad_id || "",
    event.date || "",
    eventStartTime(event),
    normalizeCalendarText(event.location || ""),
  ].join("|")).filter((group) => {
    if (group.length < 2) return false;
    const titles = group.map((event) => normalizeCalendarText(event.title || ""));
    return titles.some((title) => title === "entrenamiento") && titles.some((title) => title.startsWith("cancha"));
  });

  const brokenEventMatchLinks = events.filter((event) => event.match_id && !matchById.has(event.match_id));
  const brokenMatchEventLinks = matches.filter((match) => match.calendar_event_id && !eventById.has(match.calendar_event_id));
  const brokenEventSessionLinks = events.filter((event) => event.training_session_id && !sessionById.has(event.training_session_id));

  const mismatchedLinks = [];
  events.forEach((event) => {
    if (!event.match_id) return;
    const match = matchById.get(event.match_id);
    if (!match) return;
    if (match.calendar_event_id && match.calendar_event_id !== event.id) mismatchedLinks.push({ event, match, side: "event" });
  });
  matches.forEach((match) => {
    if (!match.calendar_event_id) return;
    const event = eventById.get(match.calendar_event_id);
    if (!event) return;
    if (event.match_id && event.match_id !== match.id) mismatchedLinks.push({ event, match, side: "match" });
  });

  const missingTypeEvents = events.filter((event) => !String(event.event_type || event.type || "").trim());
  const seasonlessEvents = events.filter((event) => !event.season_id);
  const timeMismatchEvents = events.filter((event) => event.time && event.start_time && event.time !== event.start_time);
  const legacySourceEvents = events.filter((event) => event.source_kind === "legacy_import");
  const reviewEvents = events.filter((event) => event.data_quality_status === "review");

  const issueEventIds = new Set();
  [duplicateMatchGroups, duplicateExactGroups, suspiciousTrainingPairs].flat().flat().forEach((event) => event?.id && issueEventIds.add(event.id));
  brokenEventMatchLinks.forEach((event) => event.id && issueEventIds.add(event.id));
  brokenEventSessionLinks.forEach((event) => event.id && issueEventIds.add(event.id));
  brokenMatchEventLinks.forEach((match) => {
    const candidate = events.find((event) => event.match_id === match.id);
    if (candidate?.id) issueEventIds.add(candidate.id);
  });
  mismatchedLinks.forEach(({ event }) => event?.id && issueEventIds.add(event.id));
  missingTypeEvents.forEach((event) => event.id && issueEventIds.add(event.id));
  timeMismatchEvents.forEach((event) => event.id && issueEventIds.add(event.id));

  const criticalCount = brokenEventMatchLinks.length + brokenMatchEventLinks.length + brokenEventSessionLinks.length + mismatchedLinks.length + duplicateMatchGroups.length;
  const warningCount = duplicateExactGroups.length + suspiciousTrainingPairs.length + missingTypeEvents.length + timeMismatchEvents.length;

  return {
    criticalCount,
    warningCount,
    duplicateMatchGroups,
    duplicateExactGroups,
    suspiciousTrainingPairs,
    brokenEventMatchLinks,
    brokenMatchEventLinks,
    brokenEventSessionLinks,
    mismatchedLinks,
    missingTypeEvents,
    seasonlessEvents,
    timeMismatchEvents,
    legacySourceEvents,
    reviewEvents,
    issueEventIds,
  };
}
