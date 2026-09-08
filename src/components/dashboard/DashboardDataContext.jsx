import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useCompetitionCenterData, getFixtureIsHome, getFixtureRival } from "@/components/afa/useCompetitionCenterData";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { buildCalendarView } from "@/components/schedule/calendarSourceAdapter";

const DashboardDataContext = createContext({});
export const useDashboardData = () => useContext(DashboardDataContext);

function normalizeMatchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchDateValue(match) {
  return match?.matchDate || match?.date || "";
}

function previousDateKey(dateKey) {
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function nextDateKey(dateKey) {
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function squadCompetitionKey(squad) {
  const name = normalizeMatchText(squad?.name || squad?.squad_name || "");
  if (name.includes("reserva") || name.includes("proye")) return "reserve";
  if (/\b4ta\b|\b5ta\b|\b6ta\b|\b7ma\b|\b8va\b|\b9na\b|cuarta|quinta|sexta|septima|octava|novena|juvenil/.test(name)) return "youth";
  return "senior";
}

function sameRival(a, b) {
  const left = normalizeMatchText(a);
  const right = normalizeMatchText(b);
  if (!left || !right) return false;
  return left === right || (left.length >= 5 && (left.includes(right) || right.includes(left)));
}

export function DashboardDataProvider({ children }) {
  const competitionCenter = useCompetitionCenterData();
  const { loading, error } = competitionCenter;
  const { clubBrand, institutionProfile, activeSquad, squads, mySquads, isAdmin } = useWorkspace();
  const teamName = competitionCenter.clubName || clubBrand?.name || "Club";

  const [internalCompetitions, setInternalCompetitions] = useState([]);
  const [activeDivision, setActiveDivision] = useState("primera");
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const [activeYouthCategory, setActiveYouthCategory] = useState("4ta");
  const [scorersProyeccion, setScorersProyeccion] = useState([]);
  const [scorersLiga, setScorersLiga] = useState([]);

  // Staff data
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [medicalStatuses, setMedicalStatuses] = useState([]);
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [matchCallups, setMatchCallups] = useState([]);
  const [dayEvents, setDayEvents] = useState([]);
  const [wellnessResponses, setWellnessResponses] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const timezone = institutionProfile?.timezone || "America/Argentina/Buenos_Aires";
  const todayKey = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [timezone]);

  useEffect(() => {
    async function fetchComps() {
      try {
        const comps = await base44.entities.Competitions.list("name", 200);
        setInternalCompetitions(comps || []);
      } catch (e) { console.error("competitions", e); }
    }
    fetchComps();
  }, []);

  useEffect(() => {
    const name = String(activeSquad?.name || "").toLowerCase();
    if (name.includes("reserva") || name.includes("proye")) setActiveDivision("reserva");
    else if (/4ta|5ta|6ta|7ma|8va|9na|cuarta|quinta|sexta|septima|séptima|octava|novena|juvenil/.test(name)) {
      setActiveDivision("juveniles");
      const map = [
        [/4ta|cuarta/, "4ta"], [/5ta|quinta/, "5ta"], [/6ta|sexta/, "6ta"],
        [/7ma|septima|séptima/, "7ma"], [/8va|octava/, "8va"], [/9na|novena/, "9na"],
      ];
      setActiveYouthCategory(map.find(([pattern]) => pattern.test(name))?.[1] || "4ta");
    } else setActiveDivision("primera");
  }, [activeSquad?.id, activeSquad?.name]);

  useEffect(() => {
    if (!internalCompetitions.length) return;
    async function fetchScorers() {
      try {
        const proyComp = internalCompetitions.find((c) => c.division === "reserva" && c.provider_competition_id);
        const ligaComp = internalCompetitions.find((c) => c.division === "primera" && c.provider_competition_id);
        const [proy, liga] = await Promise.all([
          proyComp ? base44.entities.FootballScorer.filter({ competitionId: proyComp.provider_competition_id, tournament: "Clausura" }, "-goals", 50) : Promise.resolve([]),
          ligaComp ? base44.entities.FootballScorer.filter({ competitionId: ligaComp.provider_competition_id }, "-goals", 50) : Promise.resolve([]),
        ]);
        setScorersProyeccion(proy || []);
        setScorersLiga(liga || []);
      } catch (e) { console.error("scorers", e); }
    }
    fetchScorers();
  }, [internalCompetitions]);

  // Load staff data
  useEffect(() => {
    async function fetchStaffData() {
      setStaffLoading(true);
      try {
        const today = todayKey;
        const tomorrow = nextDateKey(today);
        const [sessions, allPlayers, medStatus, allSessionPlayers, squadMemberships, recentMatches, callups, calendarEvents, wellness] = await Promise.all([
          base44.entities.TrainingSession.filter({ date: { $gte: today } }, "date", 40).catch(() => []),
          base44.entities.Player.list("first_name", 500).catch(() => []),
          base44.entities.MedicalCurrentStatus.list("-updated_at", 200).catch(() => []),
          base44.entities.SessionPlayer.list("-created_date", 1000).catch(() => []),
          base44.entities.SquadMembership.list("-effective_from", 1000).catch(() => []),
          base44.entities.MatchReport.list("-date", 250).catch(() => []),
          base44.entities.MatchCallup.list("-updated_date", 2500).catch(() => []),
          base44.entities.DayEvent.filter({ date: { $gte: today, $lte: tomorrow } }, "date", 300).catch(() => []),
          base44.entities.WellnessResponse.filter({ response_date: today }, "-created_date", 500).catch(() => []),
        ]);
        setTrainingSessions(sessions || []);
        setPlayers(allPlayers || []);
        setMedicalStatuses(medStatus || []);
        setSessionPlayers(allSessionPlayers || []);
        setMemberships(squadMemberships || []);
        setMatchReports(recentMatches || []);
        setMatchCallups(callups || []);
        setDayEvents(calendarEvents || []);
        setWellnessResponses(wellness || []);
      } catch (e) {
        console.error("staff data", e);
      } finally {
        setStaffLoading(false);
      }
    }
    fetchStaffData();
  }, [todayKey]);

  const primeraCompId = useMemo(() => internalCompetitions.find((c) => c.division === "primera" && c.provider_competition_id)?.provider_competition_id || null, [internalCompetitions]);
  const reservaCompId = useMemo(() => internalCompetitions.find((c) => c.division === "reserva" && c.provider_competition_id)?.provider_competition_id || null, [internalCompetitions]);

  const primeraFixtures = useMemo(() => [
    ...(competitionCenter.senior?.results || []),
    ...(competitionCenter.senior?.upcoming || []),
  ], [competitionCenter.senior?.results, competitionCenter.senior?.upcoming]);
  const reservaClausuraFixtures = useMemo(() => [
    ...(competitionCenter.reserve?.results || []),
    ...(competitionCenter.reserve?.upcoming || []),
  ], [competitionCenter.reserve?.results, competitionCenter.reserve?.upcoming]);
  const allFixtures = useMemo(() => [...primeraFixtures, ...reservaClausuraFixtures], [primeraFixtures, reservaClausuraFixtures]);

  const nextMatchPrimera = competitionCenter.senior?.upcoming?.[0] || null;
  const nextMatchReserva = competitionCenter.reserve?.upcoming?.[0] || null;
  const next5Reserva = (competitionCenter.reserve?.upcoming || []).slice(0, 5);

  const divisionStandings = activeDivision === "reserva"
    ? (competitionCenter.reserve?.currentRows || [])
    : (competitionCenter.senior?.currentRows || []);
  const currentGroup = activeDivision === "reserva"
    ? competitionCenter.reserve?.currentGroup
    : competitionCenter.senior?.currentGroup;
  const tournaments = currentGroup ? [currentGroup] : [];
  const zones = currentGroup ? [currentGroup] : [];

  useEffect(() => {
    setActiveTournament(currentGroup || null);
    setActiveZone(currentGroup || null);
  }, [activeDivision, currentGroup]);

  const filteredStandings = useMemo(() => [...divisionStandings].sort((a, b) => Number(a.position || 999) - Number(b.position || 999)), [divisionStandings]);
  const dyhRow = activeDivision === "reserva"
    ? competitionCenter.reserve?.currentClubRow || null
    : competitionCenter.senior?.currentClubRow || null;

  // Staff derived data
  const playerMap = useMemo(() => {
    const map = {};
    (players || []).forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  const playersForActiveSquad = useMemo(
    () => (players || []).filter((player) => !activeSquad?.id || !player.squad_id || player.squad_id === activeSquad.id),
    [players, activeSquad?.id]
  );

  const calendarViewEvents = useMemo(() => {
    const inActiveSquad = (row) => !activeSquad?.id || !row?.squad_id || row.squad_id === activeSquad.id;
    return buildCalendarView({
      dayEvents: (dayEvents || []).filter(inActiveSquad),
      sessions: (trainingSessions || []).filter(inActiveSquad),
      matches: (matchReports || []).filter(inActiveSquad),
    }).events;
  }, [dayEvents, trainingSessions, matchReports, activeSquad?.id]);

  const tomorrowKey = useMemo(() => nextDateKey(todayKey), [todayKey]);
  const todayCalendarEvents = useMemo(() => calendarViewEvents.filter((event) => event.date === todayKey), [calendarViewEvents, todayKey]);
  const tomorrowCalendarEvents = useMemo(() => calendarViewEvents.filter((event) => event.date === tomorrowKey), [calendarViewEvents, tomorrowKey]);

  const wellnessSummary = useMemo(() => {
    const severity = { red: 4, orange: 3, yellow: 2, green: 1 };
    const latest = new Map();
    (wellnessResponses || []).forEach((response) => {
      const player = playerMap[response.player_id];
      if (!player || (activeSquad?.id && response.squad_id && response.squad_id !== activeSquad.id)) return;
      if (activeSquad?.id && !response.squad_id && player.squad_id && player.squad_id !== activeSquad.id) return;
      const current = latest.get(response.player_id);
      const stamp = String(response.created_date || response.updated_date || "");
      const currentStamp = String(current?.created_date || current?.updated_date || "");
      if (!current || stamp >= currentStamp) latest.set(response.player_id, response);
    });
    const responses = [...latest.values()].map((response) => {
      const player = playerMap[response.player_id] || {};
      return {
        ...response,
        player,
        player_name: player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ") || response.player_name || "Jugador",
        photo_url: player.photo_url || "",
      };
    }).sort((a, b) => (severity[b.alert_level] || 0) - (severity[a.alert_level] || 0));
    const alerts = responses.filter((response) => ["red", "orange", "yellow"].includes(response.alert_level));
    const answeredIds = new Set(responses.map((response) => response.player_id));
    const missing = playersForActiveSquad.filter((player) => !answeredIds.has(player.id));
    return { responses, alerts, missing, answered: responses.length, total: playersForActiveSquad.length };
  }, [wellnessResponses, playerMap, playersForActiveSquad, activeSquad?.id]);

  const todaySessionPlayers = useMemo(() => {
    const today = todayKey;
    const todaySessionIds = new Set(
      (trainingSessions || [])
        .filter((session) => session.date === today && (!activeSquad?.id || !session.squad_id || session.squad_id === activeSquad.id))
        .map((session) => session.id)
    );
    return (sessionPlayers || []).filter((sessionPlayer) => todaySessionIds.has(sessionPlayer.session_id));
  }, [trainingSessions, sessionPlayers, activeSquad?.id, todayKey]);

  const playersByStatus = useMemo(() => {
    const counts = { disponible: 0, lesionado: 0, en_recuperacion: 0, suspendido: 0, otro: 0 };
    // Si hay sesión hoy, el estado del plantel viene de los SessionPlayer
    if (todaySessionPlayers.length > 0) {
      todaySessionPlayers.forEach((sp) => {
        const st = sp.status_at_session || "disponible";
        if (st === "disponible") counts.disponible++;
        else if (st === "lesionado") counts.lesionado++;
        else if (st === "reintegro") counts.en_recuperacion++;
        else if (st === "suspendido") counts.suspendido++;
        else counts.otro++;
      });
      return counts;
    }
    // Sin sesión hoy: fallback al estado de la ficha del jugador
    playersForActiveSquad.forEach((p) => {
      const st = (p.status || "Disponible").toLowerCase().trim();
      if (st === "disponible") counts.disponible++;
      else if (st === "lesionado") counts.lesionado++;
      else if (st.includes("recuper")) counts.en_recuperacion++;
      else if (st === "suspendido") counts.suspendido++;
      else counts.otro++;
    });
    return counts;
  }, [todaySessionPlayers, playersForActiveSquad]);

  const squadStatusTotal = todaySessionPlayers.length > 0 ? todaySessionPlayers.length : playersForActiveSquad.length;

  const birthdayPlayers = useMemo(() => {
    const accessibleSquads = isAdmin ? (squads || []) : (mySquads || []);
    const allowedIds = new Set(accessibleSquads.map((squad) => squad.id));
    const squadNames = Object.fromEntries(accessibleSquads.map((squad) => [squad.id, squad.name]));
    const membershipByPlayer = new Map();
    (memberships || []).filter((membership) => !membership.effective_to && membership.status !== "fuera_del_plantel" && membership.status !== "inactivo").forEach((membership) => {
      if (!membershipByPlayer.has(membership.player_id)) membershipByPlayer.set(membership.player_id, membership);
    });
    return (players || []).filter((player) => player.birth_date).map((player) => {
      const membership = membershipByPlayer.get(player.id);
      const squadId = membership?.squad_id || player.squad_id;
      return { ...player, categoryName: membership?.squad_name || squadNames[squadId] || player.division || player.category || "" , birthdaySquadId: squadId };
    }).filter((player) => allowedIds.has(player.birthdaySquadId));
  }, [players, memberships, squads, mySquads, isAdmin]);

  const INJURY_STATUSES = ["lesionado", "en_recuperacion", "kinesiologia", "seguimiento"];
  const activeInjuries = useMemo(
    () =>
      (medicalStatuses || [])
        .filter((m) => {
          if (!INJURY_STATUSES.includes(m.current_status)) return false;
          const player = playerMap[m.player_id];
          return !activeSquad?.id || !player?.squad_id || player.squad_id === activeSquad.id;
        })
        .map((m) => {
          const p = playerMap[m.player_id];
          return {
            ...m,
            player_name: p?.full_name || p?.first_name || "Jugador",
            status: m.current_status,
          };
        }),
    [medicalStatuses, playerMap, activeSquad?.id]
  );

  const matchDayContext = useMemo(() => {
    const aliases = competitionCenter.aliases || [];
    const buildEntry = (match, division, label, clubRow) => {
      if (!match) return null;
      const rival = getFixtureRival(match, aliases);
      const report = (matchReports || []).find((item) => (
        item.upcoming_match_id === match.id ||
        (match.external_key && item.external_match_key === match.external_key) ||
        (
          item.date === matchDateValue(match) &&
          sameRival(item.rival, rival) &&
          (!item.squad_id || division !== squadCompetitionKey(activeSquad) || item.squad_id === activeSquad?.id)
        )
      )) || null;
      const callups = report
        ? (matchCallups || []).filter((row) => row.match_id === report.id && row.status !== "desconvocado" && row.callup_status !== "desconvocado")
        : [];
      const uniqueCallups = new Map();
      callups.forEach((row) => {
        if (!row.player_id) return;
        const current = uniqueCallups.get(row.player_id);
        const priority = { titular: 3, suplente: 2, pendiente: 1 };
        if (!current || (priority[row.lineup_role] || 0) > (priority[current.lineup_role] || 0)) uniqueCallups.set(row.player_id, row);
      });
      const normalizedCallups = [...uniqueCallups.values()];
      return {
        match,
        division,
        label,
        rival,
        isHome: getFixtureIsHome(match, aliases),
        report,
        callups: normalizedCallups,
        calledCount: normalizedCallups.length,
        startersCount: normalizedCallups.filter((row) => row.lineup_role === "titular").length,
        substitutesCount: normalizedCallups.filter((row) => row.lineup_role === "suplente").length,
        clubRow: clubRow || null,
      };
    };

    const seniorToday = (competitionCenter.senior?.upcoming || []).find((match) => matchDateValue(match) === todayKey)
      || (competitionCenter.senior?.results || []).find((match) => matchDateValue(match) === todayKey);
    const reserveToday = (competitionCenter.reserve?.upcoming || []).find((match) => matchDateValue(match) === todayKey)
      || (competitionCenter.reserve?.results || []).find((match) => matchDateValue(match) === todayKey);
    const yesterday = previousDateKey(todayKey);
    const seniorYesterday = (competitionCenter.senior?.results || []).find((match) => matchDateValue(match) === yesterday);
    const reserveYesterday = (competitionCenter.reserve?.results || []).find((match) => matchDateValue(match) === yesterday);

    const todayEntries = [
      buildEntry(seniorToday, "senior", competitionCenter.senior?.label || "Primera", competitionCenter.senior?.currentClubRow),
      buildEntry(reserveToday, "reserve", "Reserva", competitionCenter.reserve?.currentClubRow),
    ].filter(Boolean);
    const yesterdayEntries = [
      buildEntry(seniorYesterday, "senior", competitionCenter.senior?.label || "Primera", competitionCenter.senior?.currentClubRow),
      buildEntry(reserveYesterday, "reserve", "Reserva", competitionCenter.reserve?.currentClubRow),
    ].filter(Boolean);
    const activeKey = squadCompetitionKey(activeSquad);
    return {
      today: todayEntries,
      yesterday: yesterdayEntries,
      activeToday: todayEntries.find((entry) => entry.division === activeKey) || null,
      activeYesterday: yesterdayEntries.find((entry) => entry.division === activeKey) || null,
      activeKey,
      todayKey,
    };
  }, [competitionCenter, matchReports, matchCallups, activeSquad, todayKey]);

  const value = {
    loading,
    staffLoading,
    competitionCenter,
    error,
    teamName,
    clubBrand,
    activeSquad,
    allFixtures,
    // Standings
    activeDivision, setActiveDivision,
    activeTournament, setActiveTournament,
    activeZone, setActiveZone,
    activeYouthCategory, setActiveYouthCategory,
    tournaments, zones,
    filteredStandings, dyhRow,
    // Matches
    nextMatchReserva, nextMatchPrimera, next5Reserva,
    reservaClausuraFixtures, primeraFixtures,
    reservaCompId, primeraCompId,
    // Scorers
    scorersProyeccion, scorersLiga,
    // Competitions
    internalCompetitions,
    // Staff
    trainingSessions, players, playersByStatus, squadStatusTotal, todaySessionPlayers, activeInjuries, birthdayPlayers,
    dayEvents, todayCalendarEvents, tomorrowCalendarEvents, tomorrowKey, wellnessSummary,
    matchReports, matchCallups, matchDayContext, todayKey, timezone,
  };

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}