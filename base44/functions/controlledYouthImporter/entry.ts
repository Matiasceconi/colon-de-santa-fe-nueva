import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import * as cheerio from "npm:cheerio@1.0.0";

const OFFICIAL_SOURCE = "https://www.ligaprofesional.ar";
const CATEGORIES = [
  { key: "4ta", label: "Cuarta", slug: "cuarta" },
  { key: "5ta", label: "Quinta", slug: "quinta" },
  { key: "6ta", label: "Sexta", slug: "sexta" },
  { key: "7ma", label: "Séptima", slug: "septima" },
  { key: "8va", label: "Octava", slug: "octava" },
  { key: "9na", label: "Novena", slug: "novena" },
];

const MONTHS = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
  dic: 12, diciembre: 12,
};

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'´.]/g, "")
    .replace(/&/g, " y ")
    .replace(/\bclub\b|\batletico\b|\batletica\b|\basociacion\b|\bdeportivo\b|\bca\b/g, " ")
    .replace(/\bjrs?\b/g, "juniors")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function clubAliases(profile) {
  const aliases = [profile?.official_name, profile?.short_name, profile?.abbreviation]
    .map(normalizeText)
    .filter((value) => value && value.length >= 3 && value !== "club");
  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

function teamMatches(teamName, aliases) {
  const team = normalizeText(teamName);
  if (!team) return false;
  return aliases.some((alias) => team === alias || (alias.length >= 5 && (team.includes(alias) || alias.includes(team))));
}

function parseSpanishDate(raw, fallbackYear) {
  const value = normalizeText(String(raw || "").replace(/([a-záéíóúñ])(\d{4})/gi, "$1 $2"));
  const match = value.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[2]];
  const year = Number(match[3] || fallbackYear);
  const day = Number(match[1]);
  if (!month || day < 1 || day > 31 || year < 2000) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function intOrNull(value) {
  const cleaned = String(value ?? "").replace(/[^0-9-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function compact(record, fields) {
  const out = {};
  fields.forEach((field) => {
    if (record?.[field] !== undefined && record?.[field] !== null) out[field] = record[field];
  });
  return out;
}

function equalFields(a, b, fields) {
  return fields.every((field) => {
    const av = a?.[field] ?? null;
    const bv = b?.[field] ?? null;
    return JSON.stringify(av) === JSON.stringify(bv);
  });
}

function resolveSeason(profile, requested) {
  const match = String(requested || profile?.default_season || new Date().getFullYear()).match(/20\d{2}/);
  return match?.[0] || String(new Date().getFullYear());
}

async function listMany(entity, sort = "-updated_date", limit = 2000) {
  try {
    return await entity.list(sort, limit);
  } catch {
    return await entity.list();
  }
}

async function getContext(base44, requestedSeason) {
  const service = base44.asServiceRole;
  const [profiles, squads] = await Promise.all([
    listMany(service.entities.InstitutionProfile, "-updated_date", 20),
    listMany(service.entities.Squad, "name", 200),
  ]);
  const profile = profiles.find((item) => item.active !== false) || profiles[0];
  if (!profile?.official_name || normalizeText(profile.official_name) === "club") {
    throw new Error("Primero configurá el nombre oficial del club en Configuración del club.");
  }
  const aliases = clubAliases(profile);
  if (!aliases.length) throw new Error("No se pudo construir una identidad válida para buscar el club.");
  const season = resolveSeason(profile, requestedSeason);
  const youthSquads = {};
  for (const category of CATEGORIES) {
    youthSquads[category.key] = squads.find((squad) => {
      const name = normalizeText(`${squad.name || ""} ${squad.category || ""}`);
      return squad.active !== false && (
        name.includes(normalizeText(category.label)) ||
        name.includes(category.key.replace(/[^0-9]/g, ""))
      );
    }) || null;
  }
  return {
    profile,
    aliases,
    season,
    squads,
    youthSquads,
    clubName: profile.official_name,
    clubKey: aliases[0],
  };
}

async function getOrCreateConfiguration(base44) {
  const entity = base44.asServiceRole.entities.YouthImportConfiguration;
  const rows = await listMany(entity, "-updated_date", 20);
  if (rows[0]) return rows[0];
  return await entity.create({
    active: true,
    auto_check: true,
    auto_apply_safe: true,
    check_interval_hours: 24,
    source_base_url: OFFICIAL_SOURCE,
  });
}

function parseCategoryPage(html, category, season, aliases, clubName, sourceUrl) {
  const $ = cheerio.load(html);
  const fixtures = [];
  const standings = [];
  const issues = [];
  const seenRounds = new Set();

  $("table.tablepress-fixture").each((tableIndex, table) => {
    const round = tableIndex + 1;
    $(table).find("tr").each((_rowIndex, row) => {
      const cells = $(row).find("td").map((_i, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
      if (cells.length < 8) return;
      const homeTeam = cells[1];
      const awayTeam = cells[7];
      const isHome = teamMatches(homeTeam, aliases);
      const isAway = teamMatches(awayTeam, aliases);
      if (!isHome && !isAway) return;

      const date = parseSpanishDate(cells[0], season);
      if (!date) {
        issues.push({
          severity: "critical",
          category: category.key,
          code: "invalid_date",
          message: `No se pudo interpretar la fecha "${cells[0]}" de la fecha ${round}.`,
        });
        return;
      }

      const homeScore = intOrNull(cells[3]);
      const awayScore = intOrNull(cells[5]);
      const played = homeScore !== null && awayScore !== null;
      const payload = {
        homeTeam,
        awayTeam,
        isHome,
        category: category.key,
        date,
        matchDate: date,
        fixtureRound: round,
        competitionName: `Juveniles LPF ${season}`,
        status: played ? "played" : "scheduled",
        source: "Liga Profesional de Fútbol",
        sourceUrl,
        external_key: `lpf:${season}:${category.key}:round:${round}:${normalizeText(clubName)}`,
        provider: "lpf_official",
        club_key: normalizeText(clubName),
        last_synced_at: new Date().toISOString(),
        validation_status: "validated",
      };
      if (played) {
        payload.homeScore = homeScore;
        payload.awayScore = awayScore;
      }
      fixtures.push(payload);
      seenRounds.add(round);
    });
  });

  const standingTable = $("table.tablepress-posiciones").first();
  standingTable.find("tr").each((_rowIndex, row) => {
    const cells = $(row).find("td").map((_i, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length < 10) return;
    const position = intOrNull(cells[0]);
    const teamName = cells[1];
    if (!position || !teamName) return;
    const payload = {
      category: category.key,
      competitionName: `Juveniles LPF ${season}`,
      season,
      tournament: "Juveniles LPF",
      position,
      teamName,
      points: intOrNull(cells[2]) ?? 0,
      played: intOrNull(cells[3]) ?? 0,
      won: intOrNull(cells[4]) ?? 0,
      drawn: intOrNull(cells[5]) ?? 0,
      lost: intOrNull(cells[6]) ?? 0,
      goalsFor: intOrNull(cells[7]) ?? 0,
      goalsAgainst: intOrNull(cells[8]) ?? 0,
      goalDifference: intOrNull(cells[9]) ?? 0,
      source: "Liga Profesional de Fútbol",
      sourceUrl,
      updatedAt: new Date().toISOString(),
      external_key: `lpf:${season}:${category.key}:standing:${normalizeText(teamName)}`,
      provider: "lpf_official",
      club_key: normalizeText(clubName),
      last_synced_at: new Date().toISOString(),
      validation_status: "validated",
    };
    standings.push(payload);
  });

  if (!fixtures.length) {
    issues.push({
      severity: "critical",
      category: category.key,
      code: "club_not_found",
      message: `No se encontró a ${clubName} en el fixture de ${category.label}.`,
    });
  }
  if (standings.length < 20) {
    issues.push({
      severity: "critical",
      category: category.key,
      code: "incomplete_standings",
      message: `La tabla de ${category.label} parece incompleta (${standings.length} equipos).`,
    });
  }
  if (seenRounds.size < 10) {
    issues.push({
      severity: "warning",
      category: category.key,
      code: "few_rounds",
      message: `Solo se detectaron ${seenRounds.size} fechas de ${category.label} para el club.`,
    });
  }
  return { fixtures, standings, issues };
}

async function fetchCategory(category, season, aliases, clubName) {
  const sourceUrl = `${OFFICIAL_SOURCE}/${category.slug}-${season}/`;
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "PerformancePitch-ControlledImporter/1.0" },
  });
  if (!response.ok) throw new Error(`La fuente oficial respondió ${response.status} para ${category.label}`);
  const html = await response.text();
  if (!html.includes("tablepress")) throw new Error(`La página de ${category.label} no contiene tablas reconocibles`);
  return { ...parseCategoryPage(html, category, season, aliases, clubName, sourceUrl), sourceUrl };
}

async function createInChunks(entity, rows, size = 50) {
  const created = [];
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const result = await entity.bulkCreate(chunk);
    if (Array.isArray(result)) created.push(...result);
  }
  return created;
}

async function updateInChunks(entity, rows, size = 20) {
  for (let index = 0; index < rows.length; index += size) {
    await Promise.all(rows.slice(index, index + size).map(({ id, data }) => entity.update(id, data)));
  }
}

async function buildPreview(base44, user, body = {}) {
  const service = base44.asServiceRole;
  const context = await getContext(base44, body.season);
  const config = await getOrCreateConfiguration(base44);
  const startedAt = new Date().toISOString();
  const batch = await service.entities.YouthImportBatch.create({
    club_name: context.clubName,
    club_key: context.clubKey,
    season: context.season,
    source: "Liga Profesional de Fútbol",
    categories: CATEGORIES.map((category) => category.key),
    status: "checking",
    summary: {},
    issues: [],
    source_urls: [],
    started_at: startedAt,
  });

  try {
    const results = await Promise.all(CATEGORIES.map(async (category) => {
      try {
        return { category, ok: true, data: await fetchCategory(category, context.season, context.aliases, context.clubName) };
      } catch (error) {
        return { category, ok: false, error: error.message };
      }
    }));

    const sourceUrls = [];
    const sourceFixtures = [];
    const sourceStandings = [];
    const issues = [];
    const categorySummary = {};

    for (const result of results) {
      if (!result.ok) {
        issues.push({
          severity: "critical",
          category: result.category.key,
          code: "source_error",
          message: result.error,
        });
        categorySummary[result.category.key] = { fixtures: 0, standings: 0, status: "error" };
        continue;
      }
      sourceUrls.push(result.data.sourceUrl);
      sourceFixtures.push(...result.data.fixtures);
      sourceStandings.push(...result.data.standings);
      issues.push(...result.data.issues);
      categorySummary[result.category.key] = {
        fixtures: result.data.fixtures.length,
        standings: result.data.standings.length,
        status: result.data.issues.some((issue) => issue.severity === "critical") ? "review" : "ok",
      };
    }

    Object.entries(context.youthSquads).forEach(([category, squad]) => {
      if (!squad) {
        issues.push({
          severity: "warning",
          category,
          code: "missing_squad",
          message: `No existe un plantel activo para ${CATEGORIES.find((item) => item.key === category)?.label}.`,
        });
      }
    });

    const [existingFixtures, existingStandings] = await Promise.all([
      listMany(service.entities.FootballYouthFixture, "-updated_date", 2000),
      listMany(service.entities.FootballYouthStanding, "-updated_date", 2000),
    ]);
    const fixtureByKey = new Map(existingFixtures.filter((row) => row.external_key).map((row) => [row.external_key, row]));
    const fixtureByRound = new Map(existingFixtures.map((row) => [
      `${row.category}:${row.fixtureRound}:${row.club_key || context.clubKey}`, row,
    ]));
    const standingByKey = new Map(existingStandings.filter((row) => row.external_key).map((row) => [row.external_key, row]));
    const standingFallback = new Map(existingStandings.map((row) => [
      `${row.category}:${normalizeText(row.teamName)}:${row.season || context.season}`, row,
    ]));

    const fixtureFields = ["homeTeam", "awayTeam", "homeScore", "awayScore", "isHome", "category", "date", "matchDate", "fixtureRound", "competitionName", "status", "source", "sourceUrl", "external_key", "provider", "club_key"];
    const standingFields = ["category", "competitionName", "season", "tournament", "position", "teamName", "points", "played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "goalDifference", "source", "sourceUrl", "external_key", "provider", "club_key"];
    const candidates = [];
    const counts = { create: 0, update: 0, conflict: 0, unchanged: 0, fixtures: sourceFixtures.length, standings: sourceStandings.length };

    for (const payload of sourceFixtures) {
      const existing = fixtureByKey.get(payload.external_key) || fixtureByRound.get(`${payload.category}:${payload.fixtureRound}:${context.clubKey}`);
      if (!existing) {
        counts.create += 1;
        candidates.push({ batch_id: batch.id, record_type: "fixture", category: payload.category, external_key: payload.external_key, action: "create", validation_status: "safe", payload, selected: true, applied: false });
        continue;
      }
      if (equalFields(existing, payload, fixtureFields)) {
        counts.unchanged += 1;
        continue;
      }
      const scoreChanged = existing.status === "played" && (
        Number(existing.homeScore) !== Number(payload.homeScore) ||
        Number(existing.awayScore) !== Number(payload.awayScore)
      );
      const review = existing.manual_override === true || scoreChanged;
      counts[review ? "conflict" : "update"] += 1;
      candidates.push({
        batch_id: batch.id,
        record_type: "fixture",
        category: payload.category,
        external_key: payload.external_key,
        action: review ? "conflict" : "update",
        validation_status: review ? "review" : "safe",
        issue: existing.manual_override ? "El registro tiene una corrección manual protegida." : (scoreChanged ? "Cambió el resultado de un partido ya jugado." : ""),
        target_id: existing.id,
        before: compact(existing, fixtureFields),
        payload,
        selected: !review,
        applied: false,
      });
    }

    for (const payload of sourceStandings) {
      const existing = standingByKey.get(payload.external_key) || standingFallback.get(`${payload.category}:${normalizeText(payload.teamName)}:${context.season}`);
      if (!existing) {
        counts.create += 1;
        candidates.push({ batch_id: batch.id, record_type: "standing", category: payload.category, external_key: payload.external_key, action: "create", validation_status: "safe", payload, selected: true, applied: false });
        continue;
      }
      if (equalFields(existing, payload, standingFields)) {
        counts.unchanged += 1;
        continue;
      }
      const review = existing.manual_override === true;
      counts[review ? "conflict" : "update"] += 1;
      candidates.push({
        batch_id: batch.id,
        record_type: "standing",
        category: payload.category,
        external_key: payload.external_key,
        action: review ? "conflict" : "update",
        validation_status: review ? "review" : "safe",
        issue: review ? "La posición tiene una corrección manual protegida." : "",
        target_id: existing.id,
        before: compact(existing, standingFields),
        payload,
        selected: !review,
        applied: false,
      });
    }

    if (candidates.length) await createInChunks(service.entities.YouthImportCandidate, candidates);
    const hasCritical = issues.some((issue) => issue.severity === "critical");
    const hasReview = candidates.some((candidate) => candidate.validation_status === "review");
    const status = hasCritical || hasReview ? "needs_review" : "ready";
    const summary = {
      ...counts,
      safe: candidates.filter((candidate) => candidate.validation_status === "safe").length,
      review: candidates.filter((candidate) => candidate.validation_status === "review").length,
      category_summary: categorySummary,
      missing_squads: Object.entries(context.youthSquads).filter(([, squad]) => !squad).map(([category]) => category),
    };
    await service.entities.YouthImportBatch.update(batch.id, {
      status,
      summary,
      issues,
      source_urls: sourceUrls,
      completed_at: new Date().toISOString(),
    });
    await service.entities.YouthImportConfiguration.update(config.id, {
      last_check_at: new Date().toISOString(),
      last_club_key: context.clubKey,
    });

    let applied = null;
    const shouldAutoApply = body.auto_apply === true || (body.auto_apply !== false && config.auto_apply_safe !== false);
    if (shouldAutoApply && !hasCritical && counts.create + counts.update > 0) {
      applied = await applyBatch(base44, user, batch.id, false);
    }
    return {
      success: true,
      detection: serializeDetection(context),
      batch: { ...batch, status: applied?.status || status, summary, issues, source_urls: sourceUrls, completed_at: new Date().toISOString() },
      applied,
    };
  } catch (error) {
    await service.entities.YouthImportBatch.update(batch.id, {
      status: "error",
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

function serializeDetection(context) {
  return {
    club_name: context.clubName,
    club_key: context.clubKey,
    season: context.season,
    shield_url: context.profile?.shield_url || null,
    aliases: context.aliases,
    categories: CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      squad_id: context.youthSquads[category.key]?.id || null,
      squad_name: context.youthSquads[category.key]?.name || null,
    })),
  };
}

async function applyBatch(base44, user, batchId, force = false) {
  const service = base44.asServiceRole;
  const batches = await service.entities.YouthImportBatch.filter({ id: batchId }, "-created_date", 1);
  const batch = batches[0];
  if (!batch) throw new Error("No se encontró el lote solicitado.");
  if (batch.status === "error" || batch.status === "rejected") throw new Error("Este lote no se puede aplicar.");
  const critical = (batch.issues || []).some((issue) => issue.severity === "critical");
  if (critical && !force) throw new Error("El lote contiene incidencias críticas. Corregilas y generá una nueva revisión.");

  const allCandidates = await service.entities.YouthImportCandidate.filter({ batch_id: batchId }, "category", 1000);
  const safe = allCandidates.filter((candidate) => candidate.validation_status === "safe" && candidate.selected !== false && !candidate.applied);
  const fixtureCreates = safe.filter((candidate) => candidate.record_type === "fixture" && candidate.action === "create");
  const standingCreates = safe.filter((candidate) => candidate.record_type === "standing" && candidate.action === "create");
  const updates = safe.filter((candidate) => candidate.action === "update");

  if (fixtureCreates.length) await createInChunks(service.entities.FootballYouthFixture, fixtureCreates.map((candidate) => ({ ...candidate.payload, sync_batch_id: batchId })));
  if (standingCreates.length) await createInChunks(service.entities.FootballYouthStanding, standingCreates.map((candidate) => ({ ...candidate.payload, sync_batch_id: batchId })));
  for (let index = 0; index < updates.length; index += 20) {
    await Promise.all(updates.slice(index, index + 20).map(async (candidate) => {
      const entity = candidate.record_type === "fixture" ? service.entities.FootballYouthFixture : service.entities.FootballYouthStanding;
      await entity.update(candidate.target_id, { ...candidate.payload, sync_batch_id: batchId });
    }));
  }

  const appliedAt = new Date().toISOString();
  await updateInChunks(service.entities.YouthImportCandidate, safe.map((candidate) => ({
    id: candidate.id,
    data: { applied: true, applied_at: appliedAt },
  })));
  const pendingReview = allCandidates.filter((candidate) => candidate.validation_status === "review" && !candidate.applied).length;
  const status = pendingReview ? "needs_review" : "applied";
  await service.entities.YouthImportBatch.update(batchId, {
    status,
    approved_at: appliedAt,
    approved_by: user.email || user.id,
    summary: { ...(batch.summary || {}), applied_now: safe.length, pending_review: pendingReview },
  });
  const configs = await listMany(service.entities.YouthImportConfiguration, "-updated_date", 10);
  if (configs[0]) await service.entities.YouthImportConfiguration.update(configs[0].id, { last_success_at: appliedAt });
  return { success: true, status, applied: safe.length, pending_review: pendingReview };
}

async function prepareSquads(base44, body = {}) {
  const service = base44.asServiceRole;
  const context = await getContext(base44, body.season);
  const missing = CATEGORIES.filter((category) => !context.youthSquads[category.key]);
  if (!missing.length) return { success: true, created: [], detection: serializeDetection(context) };
  const rows = missing.map((category) => ({
    name: category.label,
    category: category.key,
    season: context.season,
    active: true,
    club_name: context.profile.official_name,
    club_short_name: context.profile.short_name || context.profile.abbreviation || context.profile.official_name,
    club_logo_url: context.profile.shield_url || "",
    brand_primary: context.profile.brand_primary || "",
    brand_secondary: context.profile.brand_secondary || "",
    brand_accent: context.profile.brand_accent || "",
    notes: "Creado por el importador juvenil controlado.",
  }));
  const created = await createInChunks(service.entities.Squad, rows);
  const refreshed = await getContext(base44, body.season);
  return { success: true, created: created.map((row) => ({ id: row.id, name: row.name, category: row.category })), detection: serializeDetection(refreshed) };
}

async function latestStatus(base44) {
  const service = base44.asServiceRole;
  const config = await getOrCreateConfiguration(base44);
  const batches = await listMany(service.entities.YouthImportBatch, "-created_date", 20);
  const batch = batches[0] || null;
  const candidates = batch ? await service.entities.YouthImportCandidate.filter({ batch_id: batch.id }, "category", 500) : [];
  return { success: true, config, batch, candidates };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Solo un administrador puede operar el importador." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || "detect";

    if (action === "detect") {
      const context = await getContext(base44, body.season);
      const config = await getOrCreateConfiguration(base44);
      return Response.json({ success: true, detection: serializeDetection(context), config });
    }
    if (action === "status") return Response.json(await latestStatus(base44));
    if (action === "preview") return Response.json(await buildPreview(base44, user, body));
    if (action === "autoCheck") {
      const config = await getOrCreateConfiguration(base44);
      const context = await getContext(base44, body.season);
      const last = config.last_check_at ? new Date(config.last_check_at).getTime() : 0;
      const interval = Math.max(1, Number(config.check_interval_hours || 24)) * 60 * 60 * 1000;
      const due = config.active !== false && config.auto_check !== false && (
        !last || Date.now() - last >= interval || config.last_club_key !== context.clubKey
      );
      if (!due) return Response.json({ ...(await latestStatus(base44)), due: false, detection: serializeDetection(context) });
      return Response.json({ ...(await buildPreview(base44, user, { ...body, auto_apply: config.auto_apply_safe !== false })), due: true });
    }
    if (action === "apply") return Response.json(await applyBatch(base44, user, body.batch_id, body.force === true));
    if (action === "prepareSquads") return Response.json(await prepareSquads(base44, body));
    if (action === "reject") {
      if (!body.batch_id) throw new Error("Falta batch_id.");
      await base44.asServiceRole.entities.YouthImportBatch.update(body.batch_id, { status: "rejected" });
      return Response.json({ success: true, status: "rejected" });
    }
    if (action === "updateConfiguration") {
      const config = await getOrCreateConfiguration(base44);
      const next = {
        active: body.active !== false,
        auto_check: body.auto_check !== false,
        auto_apply_safe: body.auto_apply_safe !== false,
        check_interval_hours: Math.min(168, Math.max(1, Number(body.check_interval_hours || 24))),
        source_base_url: OFFICIAL_SOURCE,
      };
      await base44.asServiceRole.entities.YouthImportConfiguration.update(config.id, next);
      return Response.json({ success: true, config: { ...config, ...next } });
    }
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("controlledYouthImporter", error);
    return Response.json({ error: error.message || "Error inesperado" }, { status: 500 });
  }
});