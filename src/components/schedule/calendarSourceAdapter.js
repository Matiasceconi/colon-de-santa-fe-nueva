import { effectiveEventType, eventStartTime, normalizeCalendarText } from "./calendarAudit";

function sourceKindFromDayEvent(event = {}) {
  if (event.source_kind) return event.source_kind;
  if (event.training_session_id) return "training_session";
  if (event.match_id || event.sync_source === "matches") return "match_report";
  if (event.sync_source === "competition_integration") return "competition_integration";
  if (event.created_by_ai) return String(event.source_file || "").includes("6a3bc03033558cd65ec27f53") ? "legacy_import" : "ai_import";
  return "manual";
}

function matchGroupKey(event = {}) {
  return [
    event.squad_id || "",
    event.date || "",
    normalizeCalendarText(event.rival || event.title || ""),
  ].join("|");
}

function pickCanonicalMatchEvent(group = [], matchById = new Map()) {
  const ranked = [...group].sort((a, b) => {
    const aMatch = a.match_id ? matchById.get(a.match_id) : null;
    const bMatch = b.match_id ? matchById.get(b.match_id) : null;
    const aReciprocal = Boolean(aMatch && aMatch.calendar_event_id === a.id);
    const bReciprocal = Boolean(bMatch && bMatch.calendar_event_id === b.id);
    if (aReciprocal !== bReciprocal) return aReciprocal ? -1 : 1;
    const aValid = Boolean(aMatch);
    const bValid = Boolean(bMatch);
    if (aValid !== bValid) return aValid ? -1 : 1;
    const aIntegrated = a.sync_source === "competition_integration";
    const bIntegrated = b.sync_source === "competition_integration";
    if (aIntegrated !== bIntegrated) return aIntegrated ? -1 : 1;
    return String(b.updated_date || b.sync_updated_at || "").localeCompare(String(a.updated_date || a.sync_updated_at || ""));
  });
  return ranked[0] || null;
}

function sessionDisplayEvent(session = {}) {
  return {
    id: `session:${session.id}`,
    source_entity_id: session.id,
    source_kind: "training_session",
    is_virtual: true,
    squad_id: session.squad_id || "",
    squad_name: session.squad_name || "",
    season_id: session.season_id || "",
    date: session.date,
    time: session.start_time || "",
    start_time: session.start_time || "",
    end_time: session.end_time || "",
    title: session.title || "Entrenamiento",
    type: "Entrenamiento",
    event_type: "Entrenamiento",
    duration_minutes: session.duration_minutes,
    location: session.location || "",
    notes: session.session_objective || "",
    match_day_code: session.match_day_code || session.md || "",
    physical_objective: session.physical_objective || session.session_objective || "",
    session_type: session.session_type || "",
    color: "green",
    training_session_id: session.id,
    data_quality_status: "ok",
  };
}

function matchDisplayEvent(match = {}) {
  return {
    id: `match:${match.id}`,
    source_entity_id: match.id,
    source_kind: "match_report",
    is_virtual: true,
    squad_id: match.squad_id || "",
    squad_name: match.squad_name || "",
    season_id: match.season_id || "",
    date: match.date,
    time: match.match_time || "",
    start_time: match.match_time || "",
    title: match.rival ? `Partido vs ${match.rival}` : "Partido",
    type: "Partido",
    event_type: "Partido",
    duration_minutes: match.total_duration_minutes || 105,
    location: match.match_venue || "",
    notes: match.notes || "",
    color: "red",
    match_id: match.id,
    rival: match.rival || "",
    rival_logo_url: match.rival_logo_url || "",
    home_away: match.location || "",
    competition: match.competition || "",
    competition_id: match.competition_id || "",
    competition_stage: match.competition_stage || "",
    competition_round: match.competition_round || "",
    matchday_number: match.matchday_number || null,
    phase_label: match.phase_label || "",
    data_quality_status: "ok",
  };
}

export function buildCalendarView({ dayEvents = [], sessions = [], matches = [] } = {}) {
  const matchById = new Map(matches.filter(Boolean).map((match) => [match.id, match]));
  const linkedSessionIds = new Set(dayEvents.map((event) => event.training_session_id).filter(Boolean));
  const linkedMatchIds = new Set(dayEvents.map((event) => event.match_id).filter(Boolean));
  const sessionByDate = new Map();
  sessions.filter(Boolean).forEach((session) => {
    if (!session?.date) return;
    if (!sessionByDate.has(session.date)) sessionByDate.set(session.date, []);
    sessionByDate.get(session.date).push(session);
  });
  const trainingEventsByDate = new Map();
  dayEvents.filter((event) => effectiveEventType(event) === "Entrenamiento").forEach((event) => {
    if (!trainingEventsByDate.has(event.date)) trainingEventsByDate.set(event.date, []);
    trainingEventsByDate.get(event.date).push(event);
  });
  const mergedSessionByEventId = new Map();
  const hiddenTrainingDuplicateIds = new Set();
  for (const [date, daySessions] of sessionByDate.entries()) {
    if (daySessions.length !== 1) continue;
    const candidates = trainingEventsByDate.get(date) || [];
    if (!candidates.length) continue;
    const alreadyLinked = candidates.find((event) => event.training_session_id === daySessions[0].id);
    const preferred = alreadyLinked || [...candidates].sort((a, b) => {
      const aTitle = normalizeCalendarText(a.title || "");
      const bTitle = normalizeCalendarText(b.title || "");
      const aScore = aTitle === "entrenamiento" ? 3 : aTitle.startsWith("cancha") ? 2 : 1;
      const bScore = bTitle === "entrenamiento" ? 3 : bTitle.startsWith("cancha") ? 2 : 1;
      return bScore - aScore;
    })[0];
    if (!preferred) continue;
    mergedSessionByEventId.set(preferred.id, daySessions[0]);
    linkedSessionIds.add(daySessions[0].id);
    const preferredTime = eventStartTime(preferred);
    candidates.forEach((event) => {
      if (event.id !== preferred.id && eventStartTime(event) === preferredTime) hiddenTrainingDuplicateIds.add(event.id);
    });
  }

  const matchGroups = new Map();
  dayEvents.filter((event) => effectiveEventType(event) === "Partido").forEach((event) => {
    const key = matchGroupKey(event);
    if (!matchGroups.has(key)) matchGroups.set(key, []);
    matchGroups.get(key).push(event);
  });

  const hiddenDuplicateIds = new Set();
  for (const group of matchGroups.values()) {
    if (group.length <= 1) continue;
    const canonical = pickCanonicalMatchEvent(group, matchById);
    group.forEach((event) => { if (event.id !== canonical?.id) hiddenDuplicateIds.add(event.id); });
  }

  const base = dayEvents
    .filter((event) => !hiddenDuplicateIds.has(event.id) && !hiddenTrainingDuplicateIds.has(event.id))
    .map((event) => {
      const mergedSession = mergedSessionByEventId.get(event.id);
      if (mergedSession) {
        return {
          ...event,
          title: mergedSession.title || event.title,
          training_session_id: mergedSession.id,
          source_kind: "training_session",
          source_entity_id: mergedSession.id,
          display_time: eventStartTime(event) || mergedSession.start_time || "",
          event_type: "Entrenamiento",
          notes: mergedSession.session_objective || event.notes || "",
          match_day_code: mergedSession.match_day_code || mergedSession.md || "",
          physical_objective: mergedSession.physical_objective || mergedSession.session_objective || "",
          session_type: mergedSession.session_type || "",
        };
      }
      return {
        ...event,
        source_kind: sourceKindFromDayEvent(event),
        display_time: eventStartTime(event),
        event_type: effectiveEventType(event),
        source_entity_id: event.match_id || event.training_session_id || event.id,
      };
    });

  const virtualSessions = sessions
    .filter((session) => session?.date && session.status !== "cancelled" && !linkedSessionIds.has(session.id))
    .map(sessionDisplayEvent);

  const virtualMatches = matches
    .filter((match) => match?.date && match.status !== "cancelado" && match.status !== "archivado" && !linkedMatchIds.has(match.id))
    .map(matchDisplayEvent);

  const all = [...base, ...virtualSessions, ...virtualMatches]
    .sort((a, b) => `${a.date || ""} ${eventStartTime(a)}`.localeCompare(`${b.date || ""} ${eventStartTime(b)}`));

  const hiddenIds = new Set([...hiddenDuplicateIds, ...hiddenTrainingDuplicateIds]);
  return { events: all, hiddenDuplicateIds: hiddenIds, hiddenDuplicateCount: hiddenIds.size };
}

export function eventSourceLabel(event = {}) {
  const kind = event.source_kind || sourceKindFromDayEvent(event);
  if (kind === "training_session") return "Sesión";
  if (kind === "match_report") return "Partido";
  if (kind === "competition_integration") return "Integrado";
  if (kind === "ai_import") return "Importado";
  if (kind === "legacy_import") return "Legado";
  return "Manual";
}
