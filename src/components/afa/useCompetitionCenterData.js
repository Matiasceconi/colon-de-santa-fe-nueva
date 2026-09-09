import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { CLUB_SHIELDS, isReserveTeamName, normalizeShieldKey } from "@/lib/clubShields";

export const YOUTH_CATEGORIES = [
  { key: "4ta", legacy: "Cuarta", label: "4.ª", group: "grandes" },
  { key: "5ta", legacy: "Quinta", label: "5.ª", group: "grandes" },
  { key: "6ta", legacy: "Sexta", label: "6.ª", group: "grandes" },
  { key: "7ma", legacy: "Séptima", label: "7.ª", group: "chicas" },
  { key: "8va", legacy: "Octava", label: "8.ª", group: "chicas" },
  { key: "9na", legacy: "Novena", label: "9.ª", group: "chicas" },
];

export function normalizeCompetitionText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'´.]/g, "")
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const TEAM_CANONICAL_ALIASES = new Map([
  ["colon de santa fe", "colon"],
  ["colon santa fe", "colon"],
  ["union de santa fe", "union"],
  ["union santa fe", "union"],
]);

function normalizeTeam(value = "") {
  const normalized = normalizeCompetitionText(value)
    .replace(/\bclub\b|\batletico\b|\batletica\b|\basociacion\b|\bca\b/g, " ")
    .replace(/\breserva\b|\bproyeccion\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_CANONICAL_ALIASES.get(normalized) || normalized;
}

function buildAliases(profile, brand) {
  const aliases = [
    profile?.official_name,
    profile?.short_name,
    profile?.abbreviation,
    brand?.name,
    brand?.shortName,
  ].map(normalizeTeam).filter((value) => value && value.length >= 3 && value !== "club");
  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

function sameClub(team, aliases) {
  const normalized = normalizeTeam(team);
  if (!normalized) return false;
  return aliases.some((alias) => normalized === alias || (alias.length >= 5 && (normalized.includes(alias) || alias.includes(normalized))));
}

function competitionIsYouth(name) {
  const normalized = normalizeCompetitionText(name);
  return YOUTH_CATEGORIES.some((category) => normalizeCompetitionText(category.legacy) === normalized);
}

function competitionIsReserve(name) {
  const normalized = normalizeCompetitionText(name);
  return normalized.includes("proyeccion") || normalized.includes("reserva");
}

function competitionIsSenior(name) {
  const normalized = normalizeCompetitionText(name);
  return normalized.includes("nacional") || normalized.includes("liga profesional") || normalized === "primera" || normalized.includes("primera division");
}

function matchDateValue(match) {
  return match?.matchDate || match?.date || "";
}

function sortMatches(rows, direction = 1) {
  return [...rows].sort((a, b) => direction * String(matchDateValue(a)).localeCompare(String(matchDateValue(b))));
}

function matchCompleteness(match) {
  return [
    match.matchTime,
    match.venue,
    match.homeLogo,
    match.awayLogo,
    match.round,
    match.homeScore != null && match.awayScore != null,
  ].filter(Boolean).length;
}

function dedupeMatches(rows) {
  const map = new Map();
  const sourceScore = (row) => row?.source === "manual" ? 3 : row?.source === "lpf_programacion_oficial" ? 2 : 1;
  rows.forEach((match) => {
    const key = [
      normalizeCompetitionText(match.competition),
      matchDateValue(match),
      normalizeTeam(match.homeTeam),
      normalizeTeam(match.awayTeam),
    ].join("::");
    const current = map.get(key);
    if (!current) {
      map.set(key, match);
      return;
    }
    const pair = [current, match];
    const scheduleAuthority = [...pair].sort((a, b) => sourceScore(b) - sourceScore(a) || matchCompleteness(b) - matchCompleteness(a))[0];
    const resultAuthority = pair.find((row) => row.status === "played" && row.homeScore != null && row.awayScore != null)
      || pair.find((row) => row.status === "played")
      || null;
    const richer = [...pair].sort((a, b) => matchCompleteness(b) - matchCompleteness(a))[0];
    map.set(key, {
      ...richer,
      matchDate: scheduleAuthority.matchDate || scheduleAuthority.date || richer.matchDate || richer.date || "",
      matchTime: scheduleAuthority.matchTime || richer.matchTime || "",
      venue: scheduleAuthority.venue || richer.venue || "",
      round: scheduleAuthority.round || richer.round || "",
      source: scheduleAuthority.source || richer.source,
      external_key: current.external_key || match.external_key || richer.external_key,
      status: resultAuthority?.status || richer.status,
      homeScore: resultAuthority?.homeScore ?? richer.homeScore,
      awayScore: resultAuthority?.awayScore ?? richer.awayScore,
      homeLogo: richer.homeLogo || current.homeLogo || match.homeLogo,
      awayLogo: richer.awayLogo || current.awayLogo || match.awayLogo,
    });
  });
  return [...map.values()];
}

function dedupeStandings(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = [
      row.season || "",
      normalizeCompetitionText(row.competition),
      normalizeCompetitionText(row.group),
      normalizeTeam(row.team || row.teamName),
    ].join("::");
    const current = map.get(key);
    if (!current || String(row.updated_date || row.lastUpdated || "") > String(current.updated_date || current.lastUpdated || "")) map.set(key, row);
  });
  return [...map.values()];
}

function groupRowsByCompetition(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row?.competition) return;
    if (!map.has(row.competition)) map.set(row.competition, []);
    map.get(row.competition).push(row);
  });
  return map;
}

function pickSeniorCompetition(standings, configuredCompetitions, aliases) {
  const grouped = groupRowsByCompetition(standings);
  const configured = configuredCompetitions.filter((competition) => competition.division === "primera" && competition.active !== false);
  const candidates = [...grouped.entries()]
    .filter(([name, rows]) => competitionIsSenior(name) && rows.some((row) => sameClub(row.team, aliases)))
    .map(([name, rows]) => {
      const normalized = normalizeCompetitionText(name);
      let score = 10;
      configured.forEach((competition) => {
        const names = [competition.name, competition.short_name, competition.normalized_name].map(normalizeCompetitionText);
        if (names.some((value) => value && (normalized.includes(value) || value.includes(normalized)))) score += 10;
      });
      const newest = rows.map((row) => row.lastUpdated || row.updated_date || "").sort().at(-1) || "";
      return { name, score, newest };
    })
    .sort((a, b) => b.score - a.score || b.newest.localeCompare(a.newest));
  return candidates[0]?.name || null;
}

function splitByPhase(rows, aliases) {
  const groups = [...new Set(rows.map((row) => row.group).filter(Boolean))];
  const clubGroups = groups.filter((group) => rows.some((row) => row.group === group && sameClub(row.team, aliases)));
  const current =
    clubGroups.find((group) => normalizeCompetitionText(group).includes("clausura")) ||
    clubGroups.find((group) => normalizeCompetitionText(group).includes("apertura")) ||
    clubGroups.find((group) => !normalizeCompetitionText(group).includes("anual")) ||
    clubGroups[0] ||
    "";
  const annual = clubGroups.find((group) => normalizeCompetitionText(group).includes("anual")) || "";
  return {
    currentGroup: current,
    currentRows: current ? rows.filter((row) => row.group === current) : rows,
    annualGroup: annual,
    annualRows: annual ? rows.filter((row) => row.group === annual) : [],
  };
}

function fixtureRival(match, aliases) {
  if (!match) return "";
  if (sameClub(match.homeTeam, aliases)) return match.awayTeam;
  if (sameClub(match.awayTeam, aliases)) return match.homeTeam;
  return "";
}

function fixtureIsHome(match, aliases) {
  if (!match) return false;
  if (typeof match.isHome === "boolean") return match.isHome;
  return sameClub(match.homeTeam, aliases);
}

function resultForClub(match, aliases) {
  if (!match || match.homeScore == null || match.awayScore == null) return null;
  const clubScore = fixtureIsHome(match, aliases) ? Number(match.homeScore) : Number(match.awayScore);
  const rivalScore = fixtureIsHome(match, aliases) ? Number(match.awayScore) : Number(match.homeScore);
  if (clubScore > rivalScore) return "W";
  if (clubScore < rivalScore) return "L";
  return "D";
}

function toYouthCategory(value) {
  const normalized = normalizeCompetitionText(value);
  return YOUTH_CATEGORIES.find((category) => (
    normalized === normalizeCompetitionText(category.key) ||
    normalized === normalizeCompetitionText(category.legacy) ||
    normalized.startsWith(normalizeCompetitionText(category.legacy))
  )) || null;
}

function buildYouthRounds(fixtures, aliases) {
  const relevant = fixtures.filter((fixture) => sameClub(fixture.homeTeam, aliases) || sameClub(fixture.awayTeam, aliases));
  const map = new Map();
  relevant.forEach((fixture) => {
    const category = toYouthCategory(fixture.category || fixture.competition);
    const date = fixture.date || fixture.matchDate;
    if (!category || !date) return;
    const round = fixture.fixtureRound || fixture.round || "";
    const rival = fixtureRival(fixture, aliases);
    const key = `${date}::${round}::${normalizeTeam(rival)}`;
    if (!map.has(key)) map.set(key, { key, date, round, rival, fixtures: [] });
    map.get(key).fixtures.push({ ...fixture, categoryKey: category.key, categoryLabel: category.label, group: category.group });
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildLogoMap(clubs, profile, standings, matches, youthFixtures) {
  const map = {};
  const assign = (name, url, force = false) => {
    const key = normalizeShieldKey(name);
    if (!key || !url) return;
    if (!force && isReserveTeamName(name) && map[key]) return;
    map[key] = url;
  };

  Object.entries(CLUB_SHIELDS).forEach(([name, url]) => assign(name, url));
  clubs.forEach((club) => {
    assign(club.name, club.logo_url, true);
    assign(club.short_name, club.logo_url, true);
  });
  standings.forEach((row) => assign(row.team, row.logo_url));
  matches.forEach((match) => {
    assign(match.homeTeam, match.homeLogo);
    assign(match.awayTeam, match.awayLogo);
  });
  youthFixtures.forEach((fixture) => {
    const rival = fixture.isHome ? fixture.awayTeam : fixture.homeTeam;
    assign(rival, fixture.teamLogo);
  });
  if (profile?.shield_url) {
    [profile.official_name, profile.short_name, profile.abbreviation]
      .filter(Boolean)
      .forEach((name) => assign(name, profile.shield_url, true));
  }
  return map;
}

export function useCompetitionCenterData() {
  const { institutionProfile, clubBrand } = useWorkspace();
  const [raw, setRaw] = useState({
    standings: [],
    matches: [],
    competitions: [],
    clubs: [],
    youthStandings: [],
    youthFixtures: [],
    syncState: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);
  const timezone = institutionProfile?.timezone || "America/Argentina/Buenos_Aires";
  const season = institutionProfile?.default_season || String(new Date().getFullYear());

  const todayKey = useCallback(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [timezone]);

  const readEntities = useCallback(async () => {
    const [standings, matches, competitions, clubs, youthStandings, youthFixtures, syncStates] = await Promise.all([
      base44.entities.Standings.list("-updated_date", 2000).catch(() => []),
      base44.entities.UpcomingMatch.list("matchDate", 2000).catch(() => []),
      base44.entities.Competitions.list("name", 200).catch(() => []),
      base44.entities.Club.list("name", 500).catch(() => []),
      base44.entities.FootballYouthStanding.list("-updatedAt", 1000).catch(() => []),
      base44.entities.FootballYouthFixture.list("date", 1000).catch(() => []),
      base44.entities.CompetitionSyncState.filter({ key: "afa_competitions" }, "-updated_date", 1).catch(() => []),
    ]);
    const nextRaw = {
      standings: standings || [],
      matches: matches || [],
      competitions: competitions || [],
      clubs: clubs || [],
      youthStandings: youthStandings || [],
      youthFixtures: youthFixtures || [],
      syncState: syncStates?.[0] || null,
    };
    setRaw(nextRaw);
    setRefreshedAt(new Date());
    return nextRaw;
  }, []);

  const refresh = useCallback(async ({ synchronize = true, force = false } = {}) => {
    setLoading(true);
    setError("");
    let synchronizationWarning = "";
    try {
      const local = await readEntities();
      if (synchronize) {
        const aliases = buildAliases(institutionProfile, clubBrand);
        const today = todayKey();
        const matchDay = local.matches.some((match) => (
          match.status === "scheduled" && matchDateValue(match) === today &&
          (sameClub(match.homeTeam, aliases) || sameClub(match.awayTeam, aliases))
        ));
        try {
          await base44.functions.invoke("syncAFAData", { season, match_day: matchDay, force });
          await readEntities();
        } catch (syncError) {
          synchronizationWarning = syncError?.response?.data?.error || syncError?.message || "No se pudo sincronizar la fuente.";
        }
      }
      if (synchronizationWarning) setError(`Datos disponibles · ${synchronizationWarning}`);
    } catch (requestError) {
      setError(requestError?.message || "No se pudieron cargar las competencias.");
    } finally {
      setLoading(false);
    }
  }, [clubBrand, institutionProfile, readEntities, season, todayKey]);

  useEffect(() => { refresh({ synchronize: true }); }, [refresh]);

  useEffect(() => {
    const today = todayKey();
    const aliases = buildAliases(institutionProfile, clubBrand);
    const isMatchDay = raw.matches.some((match) => (
      match.status === "scheduled" && matchDateValue(match) === today &&
      (sameClub(match.homeTeam, aliases) || sameClub(match.awayTeam, aliases))
    ));
    const intervalMs = isMatchDay ? 5 * 60 * 1000 : 60 * 60 * 1000;
    const timer = window.setInterval(() => refresh({ synchronize: true }), intervalMs);
    return () => window.clearInterval(timer);
  }, [clubBrand, institutionProfile, raw.matches, refresh, todayKey]);

  const model = useMemo(() => {
    const aliases = buildAliases(institutionProfile, clubBrand);
    const clubName = institutionProfile?.official_name || clubBrand?.name || "Club";
    const shortName = institutionProfile?.short_name?.trim() || clubBrand?.shortName || clubName;
    const shield = institutionProfile?.shield_url || clubBrand?.logoUrl || "";
    const accent = institutionProfile?.brand_primary || clubBrand?.primary || "#3b82f6";
    const standings = dedupeStandings(raw.standings);
    const resolvedSeason = season || standings.find((row) => row.season)?.season || String(new Date().getFullYear());
    const matches = dedupeMatches(raw.matches);
    const logoMap = buildLogoMap(raw.clubs, institutionProfile, standings, matches, raw.youthFixtures);

    const seniorCompetition = pickSeniorCompetition(standings, raw.competitions, aliases);
    const seniorAllRows = seniorCompetition ? standings.filter((row) => row.competition === seniorCompetition) : [];
    const seniorSplit = splitByPhase(seniorAllRows, aliases);
    const seniorCurrentRows = [...seniorSplit.currentRows].sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
    const seniorAnnualRows = [...seniorSplit.annualRows].sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
    const seniorMatches = sortMatches(matches.filter((match) => (
      match.competition === seniorCompetition &&
      (sameClub(match.homeTeam, aliases) || sameClub(match.awayTeam, aliases))
    )));
    const seniorUpcoming = seniorMatches.filter((match) => match.status === "scheduled" && matchDateValue(match) >= todayKey());
    const seniorResults = sortMatches(seniorMatches.filter((match) => match.status === "played"), -1);

    const reserveCompetition = [...new Set(standings.map((row) => row.competition).filter(competitionIsReserve))]
      .find((name) => standings.some((row) => row.competition === name && sameClub(row.team, aliases))) || null;
    const reserveAllRows = reserveCompetition ? standings.filter((row) => row.competition === reserveCompetition) : [];
    const reserve = splitByPhase(reserveAllRows, aliases);
    reserve.currentRows.sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
    reserve.annualRows.sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
    const reserveMatches = sortMatches(matches.filter((match) => (
      competitionIsReserve(match.competition) &&
      (sameClub(match.homeTeam, aliases) || sameClub(match.awayTeam, aliases))
    )));
    const reserveUpcoming = reserveMatches.filter((match) => match.status === "scheduled" && matchDateValue(match) >= todayKey());
    const reserveResults = sortMatches(reserveMatches.filter((match) => match.status === "played"), -1);

    const controlledYouthStandings = raw.youthStandings.map((row) => ({ ...row, team: row.teamName, competition: YOUTH_CATEGORIES.find((category) => category.key === row.category)?.legacy || row.category, goalDiff: row.goalDifference }));
    const controlledYouthFixtures = raw.youthFixtures.map((fixture) => ({ ...fixture, competition: YOUTH_CATEGORIES.find((category) => category.key === fixture.category)?.legacy || fixture.category, round: fixture.fixtureRound ? `Fecha ${fixture.fixtureRound}` : "" }));
    const legacyYouthStandings = standings.filter((row) => competitionIsYouth(row.competition));
    const legacyYouthFixtures = matches.filter((match) => competitionIsYouth(match.competition || match.category));
    const controlledYouthCats = new Set(controlledYouthStandings.map((row) => toYouthCategory(row.category || row.competition)?.key).filter(Boolean));
    const youthStandings = [...controlledYouthStandings, ...legacyYouthStandings.filter((row) => {
      const category = toYouthCategory(row.competition);
      return category && !controlledYouthCats.has(category.key);
    })];
    const youthFixtureSeen = new Set();
    const youthFixtures = [...controlledYouthFixtures, ...legacyYouthFixtures].filter((fixture) => {
      const key = [normalizeCompetitionText(fixture.category || fixture.competition), fixture.date || fixture.matchDate, normalizeTeam(fixture.homeTeam), normalizeTeam(fixture.awayTeam)].join("::");
      if (youthFixtureSeen.has(key)) return false;
      youthFixtureSeen.add(key);
      return true;
    });
    const youthPositions = Object.fromEntries(YOUTH_CATEGORIES.map((category) => {
      const row = youthStandings.find((standing) => (
        toYouthCategory(standing.category || standing.competition)?.key === category.key &&
        sameClub(standing.team || standing.teamName, aliases)
      ));
      return [category.key, row || null];
    }));
    const youthRounds = buildYouthRounds(youthFixtures, aliases);
    const today = todayKey();
    const nextYouthRounds = youthRounds.filter((round) => round.date >= today && round.fixtures.some((fixture) => fixture.status === "scheduled")).slice(0, 4);
    const youthResults = youthRounds.filter((round) => round.date < today || round.fixtures.every((fixture) => fixture.status !== "scheduled")).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

    return {
      aliases,
      clubName,
      shortName,
      shield,
      accent,
      season: resolvedSeason,
      logoMap,
      senior: {
        competition: seniorCompetition,
        label: normalizeCompetitionText(seniorCompetition).includes("nacional") ? "Primera Nacional" : (seniorCompetition || "Plantel superior"),
        currentGroup: seniorSplit.currentGroup,
        currentRows: seniorCurrentRows,
        currentClubRow: seniorCurrentRows.find((row) => sameClub(row.team, aliases)) || null,
        annualGroup: seniorSplit.annualGroup,
        annualRows: seniorAnnualRows,
        annualClubRow: seniorAnnualRows.find((row) => sameClub(row.team, aliases)) || null,
        upcoming: seniorUpcoming,
        results: seniorResults,
      },
      reserve: {
        competition: reserveCompetition || "Torneo Proyección",
        ...reserve,
        currentClubRow: reserve.currentRows.find((row) => sameClub(row.team, aliases)) || null,
        annualClubRow: reserve.annualRows.find((row) => sameClub(row.team, aliases)) || null,
        upcoming: reserveUpcoming,
        results: reserveResults,
      },
      youth: {
        source: raw.youthStandings.length > 0 || raw.youthFixtures.length > 0 ? "Importador controlado + AFA" : "Datos AFA",
        positions: youthPositions,
        nextRounds: nextYouthRounds,
        results: youthResults,
      },
    };
  }, [raw, institutionProfile, clubBrand, season, todayKey]);

  const syncState = raw.syncState;
  const lastSuccessAt = syncState?.last_success_at ? new Date(syncState.last_success_at) : null;
  const ageMinutes = lastSuccessAt && !Number.isNaN(lastSuccessAt.getTime()) ? Math.max(0, (Date.now() - lastSuccessAt.getTime()) / 60000) : null;
  const matchDay = [...(model.senior?.upcoming || []), ...(model.reserve?.upcoming || [])].some((match) => matchDateValue(match) === todayKey());
  const staleAfterMinutes = matchDay ? 15 : 60;
  const freshness = {
    status: syncState?.status || (ageMinutes == null ? "unknown" : "success"),
    lastSuccessAt,
    ageMinutes,
    stale: ageMinutes == null || ageMinutes > staleAfterMinutes,
    staleAfterMinutes,
    matchDay,
    lastError: syncState?.last_error || "",
  };

  return { loading, error, refreshedAt, freshness, refresh: (force = false) => refresh({ synchronize: true, force }), ...model };
}

export function isClubTeam(team, aliases) {
  return sameClub(team, aliases);
}

export function getFixtureRival(match, aliases) {
  return fixtureRival(match, aliases);
}

export function getFixtureIsHome(match, aliases) {
  return fixtureIsHome(match, aliases);
}

export function getResultForClub(match, aliases) {
  return resultForClub(match, aliases);
}