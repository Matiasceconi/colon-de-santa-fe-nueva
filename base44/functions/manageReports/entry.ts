import { createClientFromRequest } from "npm:@base44/sdk@0.8.48";

const REPORT_TYPE = "session.professional";
const TEMPLATE_VERSION = "1.0.0";
const SNAPSHOT_SCHEMA_VERSION = 1;
const RENDERER = "react-pdf";
const RENDERER_VERSION = "4.9.0";
const MODULE_ID = "sesiones";
const ALLOWED_SECTIONS = ["summary", "players", "field", "strength", "gps", "charts", "videos", "observations", "ai"];
const DEFAULT_SECTIONS = ["summary", "players", "field", "strength", "gps", "charts", "videos", "observations"];

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(values: unknown) {
  return [...new Set((Array.isArray(values) ? values : []).map(cleanText).filter(Boolean))];
}

function cleanSections(value: unknown) {
  const requested = uniqueStrings(value).filter((section) => ALLOWED_SECTIONS.includes(section));
  return requested.length ? requested : [...DEFAULT_SECTIONS];
}

function cleanOrientation(value: unknown) {
  const orientation = cleanText(value);
  return ["portrait", "landscape", "auto"].includes(orientation) ? orientation : "auto";
}

function normalizeBrand(institution: any, squad: any) {
  return {
    name: institution?.official_name || squad?.club_name || "Club",
    shortName: institution?.short_name || institution?.abbreviation || squad?.club_short_name || "CLUB",
    logoUrl: institution?.shield_url || institution?.horizontal_logo_url || squad?.club_logo_url || "",
    sponsorLogoUrl: institution?.sponsor_logo_url || "",
    watermarkUrl: institution?.watermark_url || "",
    season: institution?.default_season || squad?.season || "",
    squadName: squad?.name || "Plantel",
    timezone: institution?.timezone || "America/Argentina/Buenos_Aires",
    dateFormat: institution?.date_format || "DD/MM/YYYY",
    paperSize: institution?.default_paper_size || "A4",
    footerText: institution?.export_footer_text || "",
    showPerformancePitchBrand: institution?.show_performancepitch_brand !== false,
    showSquadName: institution?.show_squad_name !== false,
    showSeason: institution?.show_season !== false,
    showExportDate: institution?.show_export_date !== false,
    colors: {
      primary: institution?.brand_primary || squad?.brand_primary || "#1E293B",
      secondary: institution?.brand_secondary || squad?.brand_secondary || "#475569",
      accent: institution?.brand_accent || squad?.brand_accent || "#0EA5E9",
    },
  };
}

async function requireModuleExport(base44: any, user: any, squadId: string) {
  if (!user) throw httpError("No autenticado", 401);
  if (!squadId) throw httpError("La sesión no tiene un plantel válido", 400);
  if (user.role === "admin") return;

  const email = normalizeEmail(user.email);
  const accessRows = await base44.asServiceRole.entities.UserAccess.list("-created_date", 500);
  const access = accessRows.find((row: any) => row.active !== false && normalizeEmail(row.user_email) === email);
  if (!access) throw httpError("No tenés acceso autorizado a PerformancePitch", 403);
  if (!access.all_squads && !(access.squad_ids || []).includes(squadId)) throw httpError("No tenés acceso a este plantel", 403);

  const roleIds = Array.isArray(access.role_ids) ? access.role_ids : [];
  const roles = (await base44.asServiceRole.entities.AppRole.list("name", 300))
    .filter((role: any) => roleIds.includes(role.id) && role.active !== false);
  const allowed = roles.some((role: any) => {
    const module = role.module_permissions?.[MODULE_ID] || {};
    return role.can_admin === true || module.can_admin === true || module.can_export === true;
  });
  if (!allowed) throw httpError("No tenés permiso para exportar Sesiones", 403);

  const moduleRows = await base44.asServiceRole.entities.InstitutionModule.filter({ module_id: MODULE_ID }, "-updated_date", 5).catch(() => []);
  if (moduleRows[0]?.enabled === false) throw httpError("El módulo Sesiones está deshabilitado para esta institución", 403);
}

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function attendanceLabel(value: string) {
  return ({
    presente: "Con el equipo",
    diferenciado: "Diferenciado",
    kinesiologia: "Kinesiología",
    ausente: "Ausente",
    no_entrena: "No entrena",
  } as Record<string, string>)[value] || value || "—";
}

function chartSpec(rows: any[], key: string, title: string, unit: string, decimals = 0) {
  const points = rows
    .map((row) => ({ label: row.player_name || "Jugador", value: safeNumber(row[key]), player_id: row.player_id || "", photo_url: row.photo_url || "" }))
    .filter((point) => point.value !== null)
    .sort((a, b) => Number(b.value) - Number(a.value));
  return { id: key, type: "bar", title, unit, decimals, points };
}

async function prepareSessionReport(base44: any, user: any, body: any) {
  const db = base44.asServiceRole.entities;
  const sessionId = cleanText(body.session_id);
  if (!sessionId) throw httpError("Falta la sesión a informar");

  const session = await db.TrainingSession.get(sessionId).catch(() => null);
  if (!session) throw httpError("La sesión ya no existe", 404);
  await requireModuleExport(base44, user, session.squad_id);

  const [sessionPlayersRaw, exercisesRaw, strengthRaw, gpsRaw, videosRaw, squads, institutions] = await Promise.all([
    db.SessionPlayer.filter({ session_id: sessionId }, "player_name", 500),
    db.SessionExercise.filter({ session_id: sessionId }, "order", 500),
    db.StrengthStation.filter({ session_id: sessionId }, "order", 500),
    db.SessionGPSData.filter({ session_id: sessionId }, "player_name", 500),
    db.SessionVideoLink.filter({ session_id: sessionId }, "-created_date", 200),
    db.Squad.filter({ id: session.squad_id }, "name", 5).catch(() => []),
    db.InstitutionProfile.filter({ active: true }, "-updated_date", 5).catch(() => []),
  ]);

  const playerIds = uniqueStrings([
    ...sessionPlayersRaw.map((row: any) => row.player_id),
    ...gpsRaw.map((row: any) => row.player_id),
  ]);
  let playerRows: any[] = [];
  if (playerIds.length) {
    playerRows = await db.Player.filter({ id: { $in: playerIds } }, "full_name", Math.min(500, playerIds.length + 10)).catch(async () => {
      const all = await db.Player.list("full_name", 3000);
      const wanted = new Set(playerIds);
      return all.filter((row: any) => wanted.has(row.id));
    });
  }
  const playerMap = new Map(playerRows.map((player: any) => [player.id, player]));

  const sessionPlayers = sessionPlayersRaw.map((row: any) => {
    const player = playerMap.get(row.player_id) || {};
    return {
      id: row.id,
      player_id: row.player_id,
      player_name: row.player_name || player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Jugador",
      position: row.position || player.position || "",
      squad_name: row.squad_name || player.division || session.squad_name || "",
      attendance: row.attendance || "presente",
      attendance_label: attendanceLabel(row.attendance || "presente"),
      status_at_session: row.status_at_session || "",
      minutes: safeNumber(row.minutes),
      rpe: safeNumber(row.rpe),
      internal_load: safeNumber(row.internal_load),
      notes: row.notes || "",
      photo_url: player.photo_url || player.avatar_url || "",
    };
  });

  const eligibleIds = new Set(sessionPlayers.map((row: any) => row.player_id).filter(Boolean));
  if (!eligibleIds.size) gpsRaw.forEach((row: any) => row.player_id && eligibleIds.add(row.player_id));
  const requestedIds = uniqueStrings(body.player_ids);
  const selectedIds = requestedIds.length
    ? new Set(requestedIds.filter((id) => eligibleIds.has(id)))
    : eligibleIds;
  if (requestedIds.length && !selectedIds.size) throw httpError("Ninguno de los jugadores seleccionados pertenece a esta sesión", 400);

  const selectedPlayers = sessionPlayers.filter((row: any) => selectedIds.has(row.player_id));
  const gps = gpsRaw
    .filter((row: any) => row.visible_in_report !== false && selectedIds.has(row.player_id))
    .map((row: any) => {
      const player = playerMap.get(row.player_id) || {};
      return {
        player_id: row.player_id,
        player_name: row.player_name || player.full_name || "Jugador",
        position: player.position || "",
        photo_url: player.photo_url || player.avatar_url || "",
        include_in_session_average: row.include_in_session_average !== false,
        gps_group: row.gps_group || "principal",
        duration: row.duration || "",
        total_distance: safeNumber(row.total_distance),
        m_min: safeNumber(row.m_min),
        distance_14_19_8: safeNumber(row.distance_14_19_8),
        distance_19_8: safeNumber(row.distance_19_8),
        distance_25: safeNumber(row.distance_25),
        sprints: safeNumber(row.sprints),
        acc_3: safeNumber(row.acc_3),
        dec_3: safeNumber(row.dec_3),
        player_load: safeNumber(row.player_load),
        player_load_per_min: safeNumber(row.player_load_per_min),
        rhie_bouts: safeNumber(row.rhie_bouts),
        smax: safeNumber(row.smax),
      };
    });

  const exercises = exercisesRaw.map((row: any, index: number) => ({
    id: row.id,
    order: safeNumber(row.order) ?? index,
    name: row.name || "Ejercicio",
    type: row.type || "",
    format_label: row.format_label || "",
    duration_min: safeNumber(row.duration_min),
    blocks: safeNumber(row.blocks),
    work_time: row.work_time || "",
    rest_time: row.rest_time || "",
    length_m: safeNumber(row.length_m),
    width_m: safeNumber(row.width_m),
    players_count: safeNumber(row.players_count),
    eii_players_count: safeNumber(row.eii_players_count),
    total_area: safeNumber(row.total_area),
    eii: safeNumber(row.eii),
    aspect_ratio: safeNumber(row.aspect_ratio),
    objective: row.objective || "",
    description: row.description || "",
    notes: row.notes || "",
  }));

  const strength = strengthRaw.map((row: any, index: number) => ({
    id: row.id,
    order: safeNumber(row.order) ?? index,
    work_block_id: row.work_block_id || "",
    strength_group: row.strength_group || "",
    exercise_name: row.exercise_name || "Ejercicio",
    method: row.method || "",
    exercise_type: row.exercise_type || "",
    category: row.category || "",
    objective: row.objective || "",
    rest_time: row.rest_time || "",
    rir: row.rir || "",
    sets: row.sets || "",
    reps: row.reps || "",
    time: row.time || "",
    volume: row.volume || "",
    series: Array.isArray(row.series) ? row.series : [],
    notes: row.notes || "",
  }));

  const videos = videosRaw.map((row: any) => ({
    id: row.id,
    title: row.title || "Video",
    video_url: row.video_url || "",
    source: row.source || "",
    video_type: row.video_type || "",
    notes: row.notes || "",
  }));

  const attendanceCounts = selectedPlayers.reduce((acc: any, row: any) => {
    const key = row.attendance || "presente";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const includedGps = gps.filter((row: any) => row.include_in_session_average !== false);
  const avg = (key: string) => {
    const values = includedGps.map((row: any) => safeNumber(row[key])).filter((value: any) => value !== null) as number[];
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };

  const chartKeys = uniqueStrings(body.chart_metrics).length ? uniqueStrings(body.chart_metrics) : ["total_distance", "m_min", "distance_25", "player_load"];
  const chartCatalog: Record<string, any> = {
    total_distance: chartSpec(gps, "total_distance", "Distancia total", "m", 0),
    m_min: chartSpec(gps, "m_min", "Intensidad relativa", "m/min", 1),
    distance_25: chartSpec(gps, "distance_25", "Distancia >25 km/h", "m", 0),
    player_load: chartSpec(gps, "player_load", "Player Load", "AU", 1),
    smax: chartSpec(gps, "smax", "Velocidad máxima", "km/h", 1),
  };
  const charts = chartKeys.map((key) => chartCatalog[key]).filter(Boolean).filter((chart) => chart.points.length);

  const squad = squads[0] || { id: session.squad_id, name: session.squad_name || "Plantel", season: session.season_id || "" };
  const institution = institutions[0] || null;
  const brand = normalizeBrand(institution, squad);
  const sections = cleanSections(body.sections);
  const orientation = cleanOrientation(body.orientation);
  const generatedAt = new Date().toISOString();

  const snapshot = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    report_type: REPORT_TYPE,
    template_version: TEMPLATE_VERSION,
    renderer: RENDERER,
    renderer_version: RENDERER_VERSION,
    generated_at: generatedAt,
    sections,
    orientation,
    brand,
    session: {
      id: session.id,
      session_number: session.session_number ?? null,
      title: session.title || "Sesión",
      date: session.date || "",
      squad_id: session.squad_id || "",
      squad_name: session.squad_name || squad.name || "Plantel",
      season_id: session.season_id || squad.season || "",
      period: session.period || "",
      match_day_code: session.match_day_code || "",
      session_objective: session.session_objective || "",
      duration_minutes: safeNumber(session.duration_minutes),
      location: session.location || "",
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      session_type: session.session_type || "",
      status: session.status || "",
      notes: session.notes || "",
    },
    summary: {
      selected_players: selectedPlayers.length,
      gps_players: gps.length,
      with_team: attendanceCounts.presente || 0,
      differentiated: attendanceCounts.diferenciado || 0,
      kinesiology: attendanceCounts.kinesiologia || 0,
      not_training: (attendanceCounts.ausente || 0) + (attendanceCounts.no_entrena || 0),
      field_exercises: exercises.length,
      strength_exercises: strength.length,
      avg_total_distance: avg("total_distance"),
      avg_m_min: avg("m_min"),
      avg_player_load: avg("player_load"),
    },
    players: selectedPlayers,
    exercises,
    strength,
    gps,
    charts,
    videos,
    observations: {
      session: session.notes || "",
      gps: session.gps_report_observations || "",
    },
    ai_summary: "",
  };

  const snapshotHash = await sha256(snapshot);
  const actorEmail = normalizeEmail(user.email || user.id);
  const actorName = cleanText(user.full_name || user.name || actorEmail);
  const run = await db.ReportRun.create({
    report_type: REPORT_TYPE,
    template_version: TEMPLATE_VERSION,
    snapshot_schema_version: SNAPSHOT_SCHEMA_VERSION,
    renderer: RENDERER,
    renderer_version: RENDERER_VERSION,
    title: `Informe profesional de sesión${session.session_number ? ` #${session.session_number}` : ""}`,
    source_type: "TrainingSession",
    source_id: session.id,
    squad_id: session.squad_id,
    squad_name: session.squad_name || squad.name || "Plantel",
    season_id: session.season_id || squad.season || "",
    organization_name: brand.name,
    status: "prepared",
    sections,
    orientation,
    options: { chart_metrics: chartKeys },
    filters_snapshot: { player_ids: Array.from(selectedIds), selected_players: selectedPlayers.length },
    brand_snapshot: brand,
    data_snapshot: snapshot,
    snapshot_hash: snapshotHash,
    generated_by_email: actorEmail,
    generated_by_name: actorName,
    generated_at: generatedAt,
    ai_summary_status: "none",
  });

  return { run, snapshot: { ...snapshot, report_run_id: run.id, snapshot_hash: snapshotHash } };
}

async function requireRunAccess(base44: any, user: any, run: any) {
  if (!run || run.status === "archived") throw httpError("Informe no encontrado", 404);
  await requireModuleExport(base44, user, run.squad_id);
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));
    const operation = cleanText(body.operation);
    const db = base44.asServiceRole.entities;

    if (operation === "prepare_session") {
      const result = await prepareSessionReport(base44, user, body);
      return Response.json(result);
    }

    if (operation === "list_session") {
      const session = await db.TrainingSession.get(cleanText(body.session_id)).catch(() => null);
      if (!session) throw httpError("Sesión no encontrada", 404);
      await requireModuleExport(base44, user, session.squad_id);
      const rows = await db.ReportRun.filter({ report_type: REPORT_TYPE, source_id: session.id }, "-generated_at", 100);
      return Response.json({ reports: rows.filter((row: any) => row.status !== "archived").map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        template_version: row.template_version,
        snapshot_hash: row.snapshot_hash,
        sections: row.sections || [],
        orientation: row.orientation || "auto",
        generated_by_email: row.generated_by_email || "",
        generated_by_name: row.generated_by_name || "",
        generated_at: row.generated_at || row.created_date,
        artifact_url: row.artifact_url || "",
        artifact_filename: row.artifact_filename || "",
        artifact_size_bytes: row.artifact_size_bytes || null,
        completed_at: row.completed_at || "",
        ai_summary_status: row.ai_summary_status || "none",
      })) });
    }

    if (operation === "get") {
      const run = await db.ReportRun.get(cleanText(body.report_run_id)).catch(() => null);
      await requireRunAccess(base44, user, run);
      return Response.json({ run, snapshot: { ...(run.data_snapshot || {}), report_run_id: run.id, snapshot_hash: run.snapshot_hash, ai_summary: run.ai_summary || run.data_snapshot?.ai_summary || "" } });
    }

    if (operation === "finalize") {
      const run = await db.ReportRun.get(cleanText(body.report_run_id)).catch(() => null);
      await requireRunAccess(base44, user, run);
      const artifact = body.artifact || {};
      const fileUrl = cleanText(artifact.file_url);
      const filename = cleanText(artifact.filename);
      if (!fileUrl || !filename) throw httpError("Falta el archivo generado");
      const now = new Date().toISOString();
      const actorEmail = normalizeEmail(user.email || user.id);
      const createdArtifact = await db.ReportArtifact.create({
        report_run_id: run.id,
        report_type: run.report_type,
        squad_id: run.squad_id,
        file_url: fileUrl,
        filename,
        mime_type: cleanText(artifact.mime_type) || "application/pdf",
        size_bytes: safeNumber(artifact.size_bytes),
        renderer: run.renderer || RENDERER,
        renderer_version: run.renderer_version || RENDERER_VERSION,
        checksum: cleanText(artifact.checksum),
        created_at: now,
        created_by_email: actorEmail,
      });
      const updated = await db.ReportRun.update(run.id, {
        status: "rendered",
        artifact_url: fileUrl,
        artifact_filename: filename,
        artifact_mime_type: cleanText(artifact.mime_type) || "application/pdf",
        artifact_size_bytes: safeNumber(artifact.size_bytes),
        completed_at: now,
      });
      return Response.json({ run: updated, artifact: createdArtifact });
    }

    if (operation === "set_ai_summary") {
      const run = await db.ReportRun.get(cleanText(body.report_run_id)).catch(() => null);
      await requireRunAccess(base44, user, run);
      const summary = cleanText(body.summary);
      const status = ["generated", "edited", "approved"].includes(cleanText(body.status)) ? cleanText(body.status) : "edited";
      const updated = await db.ReportRun.update(run.id, { ai_summary: summary, ai_summary_status: summary ? status : "none" });
      return Response.json({ run: updated });
    }

    if (operation === "archive") {
      const run = await db.ReportRun.get(cleanText(body.report_run_id)).catch(() => null);
      await requireRunAccess(base44, user, run);
      const updated = await db.ReportRun.update(run.id, { status: "archived" });
      return Response.json({ run: updated });
    }

    return Response.json({ error: "Operación inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("manageReports error:", error);
    return Response.json({ error: error?.message || "Error interno", code: error?.code || "REPORT_ERROR" }, { status: error?.status || 500 });
  }
}
