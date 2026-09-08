import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, AlertCircle, Filter, RefreshCw, FileBarChart, UserCheck } from "lucide-react";
import SessionGPSReportModal from "@/components/sessions/gpsReport/SessionGPSReportModal";
import MarkPresentFromGpsModal, { buildAttendancePlan } from "@/components/sessions/MarkPresentFromGpsModal";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { fmtMetric, fmtSmax } from "@/utils";
import { classifyGpsInclusion, EXCLUSION_REASON_LABELS } from "@/components/performance/externalGpsLoadUtils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { parseCSV, parseNum, normalize, detectColumns } from "@/components/sessions/gps/gpsCsvUtils";
import { MAIN_FIELDS, loadTemplates } from "@/components/sessions/gps/gpsColumnsConfig";
import { withPlayerDisplayNames } from "@/components/sessions/gpsReport/sessionGpsReportData";
import GpsImportPreview from "@/components/sessions/gps/GpsImportPreview";
import GpsDataTable from "@/components/sessions/gps/GpsDataTable";
import SessionGpsAnalysisStudio from "@/components/sessions/gps/SessionGpsAnalysisStudio";
import SessionGpsMainReport from "@/components/sessions/gps/SessionGpsMainReport";
import { findSessionGpsDuplicates, validSessionGpsRows, findExerciseGpsDuplicates, validExerciseGpsRows } from "@/components/sessions/gps/sessionGpsQuality";
import {
  GPS_TASK_TAG,
  aggregateSessionGps,
  analyzeTaskRows,
  buildExerciseSummary,
  durationToSeconds,
  taskDefinitions,
} from "@/components/sessions/gps/gpsTaskImportUtils";

// Métricas usadas en las tarjetas resumen y el gráfico (subconjunto principal, fijo por simplicidad)
const METRICS = [
  { key: "total_distance", label: "Distancia (m)",        color: "#3b82f6" },
  { key: "distance_19_8",  label: "19,8-25 km/h (m)",     color: "#10b981" },
  { key: "distance_25",    label: "+25 km/h (m)",          color: "#f97316" },
  { key: "player_load",    label: "Carga del jugador",     color: "#a855f7" },
  { key: "smax",           label: "Vel. Máx (km/h)",       color: "#ef4444" },
  { key: "acc_3",          label: "Aceleraciones",         color: "#f59e0b" },
  { key: "dec_3",          label: "Desaceleraciones",      color: "#ec4899" },
  { key: "sprints",        label: "Esfuerzos de sprint",   color: "#06b6d4" },
];

// Filas resumen del CSV que NO son jugadores reales
const SUMMARY_ROW_NAMES = new Set([
  "total", "promedio", "average", "avg", "summary", "team total", "totals"
]);

function buildSafeAliasMap(aliases = []) {
  const map = {};
  const conflicts = new Set();
  aliases.forEach(alias => {
    const key = alias.normalized_alias;
    if (!key || !alias.player_id) return;
    if (map[key] && map[key] !== alias.player_id) {
      conflicts.add(key);
      delete map[key];
      return;
    }
    if (!conflicts.has(key)) map[key] = alias.player_id;
  });
  return { map, conflicts };
}

export default function SessionGPS({ session, sessionPlayers, onPlayersUpdate, onGpsImported }) {
  const { activeSquadId, isAdmin } = useWorkspace();
  const [uploading, setUploading] = useState(false);
  const [gpsRows, setGpsRows] = useState([]);
  const [exerciseGpsRows, setExerciseGpsRows] = useState([]);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [aliasTargets, setAliasTargets] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerPhotos, setPlayerPhotos] = useState({});
  const [preview, setPreview] = useState(null); // { matched, missingMainFields, extraHeaders, parsedRows, summaryRows, fileName, file }
  const [selectedFields, setSelectedFields] = useState([]);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [visibleFields, setVisibleFields] = useState(MAIN_FIELDS);
  const [importing, setImporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMarkPresent, setShowMarkPresent] = useState(false);
  const [applyingMarkPresent, setApplyingMarkPresent] = useState(false);
  const [gpsReferenceData, setGpsReferenceData] = useState({
    config: null,
    objectiveRules: [],
    playerCompetitionProfiles: [],
    playerMicrocycleProfiles: [],
    legacyMicrocycleProfiles: [],
    playerGpsProfiles: [],
    teamMicrocycleProfiles: [],
    teamProfiles: [],
  });
  const { toast } = useToast();

  function triggerGpsProfileRecalculation(playerIds = []) {
    const squadId = session.squad_id || activeSquadId || "";
    const seasonId = session.season_id || "";
    if (playerIds.length) {
      base44.functions.invoke("recalculatePlayerGPSProfiles", { player_ids: playerIds }).catch(() => {});
    }
    if (squadId) {
      base44.functions.invoke("recalculateGpsProfiles", { squad_id: squadId, season_id: seasonId }).catch(() => {});
      base44.functions.invoke("recalculateTeamGPSProfile", { squad_id: squadId, season_id: seasonId }).catch(() => {});
    }
  }

  const csvPlayerIds = useMemo(
    () => new Set(gpsRows.map((r) => r.player_id).filter(Boolean)),
    [gpsRows],
  );

  useEffect(() => {
    Promise.all([
      base44.entities.SessionGPSData.filter({ session_id: session.id }, "player_name", 500),
      base44.entities.ExerciseGPSData.filter({ session_id: session.id }, "player_name", 5000),
      base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 500),
    ]).then(([sessionRows, exerciseRows, exercises]) => {
      setGpsRows(sessionRows);
      setExerciseGpsRows(exerciseRows);
      setSessionExercises(exercises);
    }).catch(() => {});
    base44.entities.Player.list("-created_date", 500)
      .then(p => setAllPlayers(p.filter(x => x.active !== false))).catch(() => {});
  }, [session.id]);

  useEffect(() => {
    const squadId = session.squad_id || activeSquadId || "";
    const seasonId = session.season_id || "";
    if (!squadId) return;
    let cancelled = false;
    Promise.all([
      base44.entities.GPSReferenceConfiguration.filter({ squad_id: squadId }, "-updated_at", 50).catch(() => []),
      base44.entities.GPSObjectiveRule.filter({ squad_id: squadId }, "-updated_at", 500).catch(() => []),
      base44.entities.PlayerCompetitionProfile.filter({ squad_id: squadId }, "-updated_at", 1000).catch(() => []),
      base44.entities.PlayerMicrocycleGPSProfile.filter({ squad_id: squadId }, "-updated_at", 2000).catch(() => []),
      base44.entities.PlayerGPSMicrocycleProfile.filter({ squad_id: squadId }, "-updated_at", 2000).catch(() => []),
      base44.entities.PlayerGPSProfile.filter({ squad_id: squadId }, "-updated_at", 1000).catch(() => []),
      base44.entities.TeamGPSMicrocycleProfile.filter({ squad_id: squadId }, "-updated_at", 500).catch(() => []),
      base44.entities.TeamGPSProfile.filter({ squad_id: squadId }, "-updated_at", 100).catch(() => []),
    ]).then(([configs, objectiveRules, playerCompetitionProfiles, playerMicrocycleProfiles, legacyMicrocycleProfiles, playerGpsProfiles, teamMicrocycleProfiles, teamProfiles]) => {
      if (cancelled) return;
      const seasonMatch = (row) => !seasonId || !row?.season_id || String(row.season_id) === String(seasonId);
      setGpsReferenceData({
        config: configs.find(seasonMatch) || null,
        objectiveRules: objectiveRules.filter(seasonMatch),
        playerCompetitionProfiles: playerCompetitionProfiles.filter(seasonMatch),
        playerMicrocycleProfiles: playerMicrocycleProfiles.filter(seasonMatch),
        legacyMicrocycleProfiles: legacyMicrocycleProfiles.filter(seasonMatch),
        playerGpsProfiles: playerGpsProfiles.filter(seasonMatch),
        teamMicrocycleProfiles: teamMicrocycleProfiles.filter(seasonMatch),
        teamProfiles: teamProfiles.filter(seasonMatch),
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [session.id, session.squad_id, session.season_id, activeSquadId, gpsRows.length]);

  useEffect(() => {
    const ids = new Set(sessionPlayers.map((sp) => sp.player_id).filter(Boolean));
    if (ids.size === 0) { setPlayerPhotos({}); return; }
    base44.entities.Player.list("-created_date", 500).then((players) => {
      const map = {};
      players.forEach((p) => { if (ids.has(p.id)) map[p.id] = p.photo_url; });
      setPlayerPhotos(map);
    }).catch(() => {});
  }, [sessionPlayers]);

  // ── Step 1: Parse & preview ───────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      toast({ title: "CSV vacío o inválido", variant: "destructive" });
      setUploading(false);
      return;
    }

    const headers = rows[0];
    const { matched, missingMainFields, extraHeaders } = detectColumns(headers);

    // Build parsed rows for preview (todas las columnas mapeadas, usando el header real del CSV)
    const allDataRows = rows.slice(1).map(cols => {
      const rec = {};
      headers.forEach((h, i) => { rec[h] = cols[i] ?? ""; });
      return rec;
    }).filter(r => r["Name"] && r["Name"] !== "");

    const summaryRows = allDataRows.filter(r => SUMMARY_ROW_NAMES.has(r["Name"].toLowerCase().trim()));
    const parsedRows = allDataRows.filter(r => !SUMMARY_ROW_NAMES.has(r["Name"].toLowerCase().trim()));

    const taskAnalysis = analyzeTaskRows(parsedRows);
    setPreview({ matched, missingMainFields, extraHeaders, parsedRows, summaryRows, fileName: file.name, file, ...taskAnalysis });
    // En archivos por tareas conservamos todas las variables; en el formato tradicional, las principales.
    setSelectedFields(taskAnalysis.taskMode
      ? matched.map(m => m.colDef.field)
      : matched.filter(m => MAIN_FIELDS.includes(m.colDef.field)).map(m => m.colDef.field));
    setUploading(false);
  }

  async function importTaskCsv() {
    const { matched, taskRows, tasks, fileName, file } = preview;
    setImporting(true);
    try {
      const aliases = await base44.entities.PlayerAlias.list("-created_date", 1000);
      const { map: aliasMap } = buildSafeAliasMap(aliases);
      const spMap = {};
      sessionPlayers.forEach(sp => { spMap[normalize(sp.player_name)] = sp.player_id; });
      const allPlayerMap = {};
      allPlayers.forEach(p => { allPlayerMap[normalize(p.full_name || "")] = p.id; });
      const spByPlayerId = {};
      sessionPlayers.forEach(sp => { spByPlayerId[sp.player_id] = sp; });
      const sessionPlayerIds = new Set(sessionPlayers.map(sp => sp.player_id).filter(Boolean));

      const tokenKey = value => normalize(value).split(" ").filter(Boolean).sort().join(" ");
      const resolvePlayerId = rawName => {
        const normName = normalize(rawName);
        const exact = aliasMap[normName] || spMap[normName] || allPlayerMap[normName];
        if (exact) return exact;
        const wanted = tokenKey(rawName);
        const candidates = allPlayers.filter(p => {
          const full = normalize(p.full_name || "");
          const firstLast = normalize([p.first_name, p.last_name].filter(Boolean).join(" "));
          return tokenKey(full) === wanted || tokenKey(firstLast) === wanted;
        });
        const squadCandidates = candidates.filter(p => sessionPlayerIds.has(p.id));
        const pool = squadCandidates.length ? squadCandidates : candidates;
        return pool.length === 1 ? pool[0].id : "";
      };

      const selectedMatched = matched.filter(m => m.colDef.core || selectedFields.includes(m.colDef.field));
      const usedHeaders = new Set(selectedMatched.map(m => m.header));
      const detailRecords = [];
      const unmatchedList = [];

      taskRows.forEach(item => {
        const playerId = resolvePlayerId(item.playerName);
        const playerRecord = allPlayers.find(p => p.id === playerId);
        const cls = classifyGpsInclusion(spByPlayerId[playerId]);
        const record = {
          session_id: session.id,
          player_name_original: item.playerName,
          player_id: playerId || "",
          player_name: playerRecord?.full_name || item.playerName,
          source_file: fileName,
          include_in_session_average: cls.include,
          gps_group: cls.group,
          exclusion_reason: cls.reason,
          block_number: item.period,
          block_label: `Bloque ${item.period}`,
          _taskMarker: item.marker,
        };

        selectedMatched.forEach(({ colDef, header }) => {
          if (colDef.field === "player_name_original") return;
          const raw = item.row[header] ?? "";
          record[colDef.field] = colDef.numeric ? parseNum(raw) : (raw || undefined);
        });

        const extra = {};
        Object.keys(item.row).forEach(header => {
          if (header === "Name" || usedHeaders.has(header)) return;
          if (item.row[header]) extra[header] = item.row[header];
        });
        if (Object.keys(extra).length) record.extra_metrics = extra;

        if (playerId) detailRecords.push(record);
        else unmatchedList.push({ rawName: item.playerName, record });
      });

      if (!detailRecords.length) throw new Error("No se pudo reconocer ningún jugador del archivo.");

      const taskKeys = new Map();
      detailRecords.forEach(record => {
        const key = `${record._taskMarker}::${record.player_id}::${record.block_number || 1}`;
        if (!taskKeys.has(key)) taskKeys.set(key, []);
        taskKeys.get(key).push(record);
      });
      const taskDuplicates = [...taskKeys.values()].filter(records => records.length > 1);
      if (taskDuplicates.length) {
        const names = [...new Set(taskDuplicates.map(records => records[0]?.player_name).filter(Boolean))].slice(0, 4).join(", ");
        throw new Error(`Se detectaron ${taskDuplicates.length} duplicados jugador + tarea + bloque${names ? ` (${names})` : ""}. Revisá la vinculación de nombres antes de importar.`);
      }

      const existingExercises = await base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 500);
      const definitions = taskDefinitions({ taskMode: true, tasks });
      const importedExercises = [];
      const maxOrder = existingExercises.reduce((max, ex) => Math.max(max, Number(ex.order) || 0), -1);

      for (const definition of definitions) {
        const taskRecords = detailRecords.filter(record => record._taskMarker === definition.marker);
        const playerTotals = aggregateSessionGps(taskRecords);
        const avgDurationSeconds = playerTotals.length
          ? playerTotals.reduce((sum, record) => sum + durationToSeconds(record.duration), 0) / playerTotals.length
          : 0;
        const previous = existingExercises.find(ex =>
          Array.isArray(ex.tags) && ex.tags.includes(definition.marker)
        );
        const payload = {
          session_id: session.id,
          name: definition.label,
          type: "GPS / Tarea",
          blocks: definition.blocks,
          duration_min: Math.round((avgDurationSeconds / 60) * 10) / 10,
          players_count: new Set(taskRecords.map(record => record.player_id)).size,
          external_load_summary: buildExerciseSummary(playerTotals, fileName),
          tags: [...new Set([...(previous?.tags || []), GPS_TASK_TAG, definition.marker])],
        };

        let exercise;
        if (previous) {
          await base44.entities.SessionExercise.update(previous.id, payload);
          exercise = { ...previous, ...payload };
        } else {
          exercise = await base44.entities.SessionExercise.create({
            ...payload,
            order: maxOrder + definition.order + 1,
          });
        }
        importedExercises.push({ exercise, taskRecords });
      }

      for (const { exercise, taskRecords } of importedExercises) {
        const existingRows = await base44.entities.ExerciseGPSData.filter({ exercise_id: exercise.id }, "-created_date", 500);
        const existingByKey = new Map(existingRows.map(row => [`${row.player_id}::${row.block_number || 1}`, row]));
        const creates = [];
        const updates = [];
        taskRecords.forEach((taskRecord) => {
          const record = { ...taskRecord };
          delete record._taskMarker;
          delete record.include_in_session_average;
          delete record.gps_group;
          delete record.exclusion_reason;
          const payload = { ...record, exercise_id: exercise.id };
          const previous = existingByKey.get(`${record.player_id}::${record.block_number}`);
          if (previous) updates.push({ id: previous.id, ...payload });
          else creates.push(payload);
        });
        if (updates.length) await base44.entities.ExerciseGPSData.bulkUpdate(updates);
        if (creates.length) await base44.entities.ExerciseGPSData.bulkCreate(creates);
      }

      const sessionTotals = aggregateSessionGps(detailRecords);
      const existingGps = await base44.entities.SessionGPSData.filter({ session_id: session.id }, "-created_date", 500);
      const existingGpsByPlayer = new Map(existingGps.map(row => [row.player_id, row]));
      const gpsCreates = [];
      const gpsUpdates = [];
      sessionTotals.forEach(record => {
        const previous = existingGpsByPlayer.get(record.player_id);
        if (previous) gpsUpdates.push({ id: previous.id, ...record });
        else gpsCreates.push(record);
      });
      if (gpsUpdates.length) await base44.entities.SessionGPSData.bulkUpdate(gpsUpdates);
      const createdGps = gpsCreates.length ? await base44.entities.SessionGPSData.bulkCreate(gpsCreates) : [];
      const savedRows = [
        ...gpsUpdates.map(update => ({ ...existingGpsByPlayer.get(update.player_id), ...update })),
        ...(Array.isArray(createdGps) ? createdGps : gpsCreates),
      ];

      const includedTotals = sessionTotals.filter(row => row.include_in_session_average !== false);
      const avgOf = field => {
        const values = includedTotals.map(row => Number(row[field])).filter(Number.isFinite);
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
      };
      const summaryPayload = {
        session_id: session.id,
        source_file: fileName,
        total_distance: sessionTotals.reduce((sum, row) => sum + (Number(row.total_distance) || 0), 0),
        avg_distance: avgOf("total_distance"),
        avg_m_min: avgOf("m_min"),
        avg_player_load: avgOf("player_load"),
        max_speed: Math.max(0, ...sessionTotals.map(row => Number(row.smax) || 0)),
      };
      const existingSummary = await base44.entities.SessionGPSSummary.filter({ session_id: session.id });
      if (existingSummary[0]) await base44.entities.SessionGPSSummary.update(existingSummary[0].id, summaryPayload);
      else await base44.entities.SessionGPSSummary.create(summaryPayload);

      await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TrainingSession.update(session.id, { csv_label: fileName });

      setGpsRows(savedRows);
      setUnmatched(unmatchedList);
      setPreview(null);
      onGpsImported?.();
      const totalBlocks = definitions.reduce((sum, definition) => sum + definition.blocks, 0);
      toast({
        title: `GPS importado: ${definitions.length} ejercicios · ${totalBlocks} bloques · ${sessionTotals.length} jugadores`,
        description: unmatchedList.length ? `${unmatchedList.length} filas quedaron sin reconocer.` : "La carga global de la sesión se mantuvo consolidada.",
      });

      const affectedPlayerIds = [...new Set(sessionTotals.map(row => row.player_id).filter(Boolean))];
      triggerGpsProfileRecalculation(affectedPlayerIds);
    } catch (error) {
      toast({
        title: "No se pudo importar el GPS por tareas",
        description: error?.message || "Revisá el formato del archivo.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  // ── Step 2: Confirm & import ──────────────────────────────────────────────
  async function confirmImport() {
    if (!preview) return;
    if (preview.taskMode) {
      await importTaskCsv();
      return;
    }
    const { matched, parsedRows, summaryRows, fileName, file } = preview;
    setImporting(true);

    const aliases = await base44.entities.PlayerAlias.list("-created_date", 1000);
    const { map: aliasMap } = buildSafeAliasMap(aliases);
    const spMap = {};
    sessionPlayers.forEach(sp => { spMap[normalize(sp.player_name)] = sp.player_id; });
    const allPlayerMap = {};
    allPlayers.forEach(p => { allPlayerMap[normalize(p.full_name || "")] = p.id; });
    const spByPlayerId = {};
    sessionPlayers.forEach(sp => { spByPlayerId[sp.player_id] = sp; });
    const sessionPlayerIds = new Set(sessionPlayers.map(sp => sp.player_id).filter(Boolean));
    const resolvePlayerId = (rawName) => {
      const normName = normalize(rawName);
      const exact = aliasMap[normName] || spMap[normName] || allPlayerMap[normName];
      if (exact) return exact;
      const candidates = allPlayers.filter((p) => {
        const full = normalize(p.full_name || "");
        const last = normalize(p.last_name || full.split(" ").filter(Boolean).slice(-1)[0] || "");
        return last === normName || full.endsWith(` ${normName}`);
      });
      const squadCandidates = candidates.filter((p) => sessionPlayerIds.has(p.id));
      const pool = squadCandidates.length ? squadCandidates : candidates;
      return pool.length === 1 ? pool[0].id : "";
    };

    const selectedMatched = matched.filter(m => m.colDef.core || selectedFields.includes(m.colDef.field));
    const usedHeaders = new Set(selectedMatched.map(m => m.header));

    const toCreate = [];
    const unmatchedList = [];

    parsedRows.forEach(row => {
      const rawName = row["Name"] || "";
      const playerId = resolvePlayerId(rawName);
      const playerRecord = allPlayers.find(p => p.id === playerId);

      const cls = classifyGpsInclusion(spByPlayerId[playerId]);
      const record = {
        session_id: session.id,
        player_name_original: rawName,
        player_id: playerId || "",
        player_name: playerRecord?.full_name || rawName,
        source_file: fileName,
        include_in_session_average: cls.include,
        gps_group: cls.group,
        exclusion_reason: cls.reason,
      };

      // Solo las columnas seleccionadas por el usuario
      selectedMatched.forEach(({ colDef, header }) => {
        if (colDef.field === "player_name_original") return;
        const raw = row[header] ?? "";
        record[colDef.field] = colDef.numeric ? parseNum(raw) : (raw || undefined);
      });

      // Columnas sin mapeo conocido → extra_metrics
      const extra = {};
      Object.keys(row).forEach(h => {
        if (h === "Name" || usedHeaders.has(h)) return;
        if (row[h]) extra[h] = row[h];
      });
      if (Object.keys(extra).length > 0) record.extra_metrics = extra;

      if (playerId) toCreate.push(record);
      else unmatchedList.push({ rawName, record });
    });

    const byPlayerId = new Map();
    toCreate.forEach(record => {
      if (!byPlayerId.has(record.player_id)) byPlayerId.set(record.player_id, []);
      byPlayerId.get(record.player_id).push(record);
    });
    const duplicatedPlayers = [...byPlayerId.values()].filter(records => records.length > 1);
    if (duplicatedPlayers.length) {
      const names = duplicatedPlayers.map(records => records[0]?.player_name || records[0]?.player_name_original).filter(Boolean).slice(0, 5).join(", ");
      setImporting(false);
      toast({
        title: "Importación detenida por duplicados",
        description: `${duplicatedPlayers.length} jugador${duplicatedPlayers.length === 1 ? "" : "es"} quedó vinculado más de una vez${names ? `: ${names}` : ""}. No se modificaron los datos existentes.`,
        variant: "destructive",
      });
      return;
    }

    await base44.integrations.Core.UploadFile({ file });
    await base44.entities.TrainingSession.update(session.id, { csv_label: fileName });

    const existing = await base44.entities.SessionGPSData.filter({ session_id: session.id }, "-created_date", 500);
    await Promise.all(existing.map(r => base44.entities.SessionGPSData.delete(r.id)));

    let savedRows = [];
    if (toCreate.length > 0) {
      savedRows = await base44.entities.SessionGPSData.bulkCreate(toCreate);
    }

    if (summaryRows && summaryRows.length > 0) {
      const totalRow = summaryRows.find(r => ["total", "totals", "team total"].includes(r["Name"].toLowerCase().trim()));
      const avgRow = summaryRows.find(r => ["promedio", "average", "avg"].includes(r["Name"].toLowerCase().trim()));

      const summaryPayload = {
        session_id: session.id,
        source_file: fileName,
        total_distance: parseNum(totalRow?.["Total Distance (m)"]),
        avg_distance: parseNum(avgRow?.["Total Distance (m)"]),
        avg_m_min: parseNum(avgRow?.["Metros x Min"]),
        avg_player_load: parseNum(avgRow?.["Total Player Load"]),
        max_speed: parseNum(totalRow?.["Maximum Velocity (km/h)"] || avgRow?.["Maximum Velocity (km/h)"]),
      };

      const existingSummary = await base44.entities.SessionGPSSummary.filter({ session_id: session.id });
      await Promise.all(existingSummary.map(r => base44.entities.SessionGPSSummary.delete(r.id)));
      await base44.entities.SessionGPSSummary.create(summaryPayload);
    }

    setGpsRows(Array.isArray(savedRows) ? savedRows : toCreate);
    setUnmatched(unmatchedList);
    setPreview(null);
    setImporting(false);
    onGpsImported?.();
    toast({ title: `GPS importado: ${toCreate.length} jugadores OK, ${unmatchedList.length} sin reconocer` });

    const affectedPlayerIds = [...new Set(toCreate.map(r => r.player_id).filter(Boolean))];
    triggerGpsProfileRecalculation(affectedPlayerIds);
  }

  // ── Marcar presentes desde el CSV de GPS ──────────────────────────────────
  async function applyMarkPresent() {
    setApplyingMarkPresent(true);
    try {
      const { present, absent, protectedPlayers } = buildAttendancePlan(sessionPlayers, csvPlayerIds);
      if (present.length === 0 && absent.length === 0) {
        toast({ title: "No hay cambios para aplicar", variant: "destructive" });
        setApplyingMarkPresent(false);
        return;
      }
      const updates = [];
      present.forEach((sp) => updates.push({ id: sp.id, attendance: "presente", status_at_session: "disponible" }));
      absent.forEach((sp) => updates.push({ id: sp.id, attendance: "ausente" }));
      if (updates.length) await base44.entities.SessionPlayer.bulkUpdate(updates);

      const presentIds = new Set(present.map((p) => p.id));
      const absentIds = new Set(absent.map((a) => a.id));
      const updated = sessionPlayers.map((sp) => {
        if (presentIds.has(sp.id)) return { ...sp, attendance: "presente", status_at_session: "disponible" };
        if (absentIds.has(sp.id)) return { ...sp, attendance: "ausente" };
        return sp;
      });
      onPlayersUpdate?.(updated);
      setShowMarkPresent(false);
      toast({
        title: `✓ Asistencia actualizada desde GPS`,
        description: `${present.length} presentes · ${absent.length} ausentes · ${protectedPlayers.length} respetados`,
      });
    } catch (error) {
      toast({ title: "No se pudo marcar la asistencia", description: error?.message, variant: "destructive" });
    } finally {
      setApplyingMarkPresent(false);
    }
  }

  // ── Recalcular inclusión/exclusión de promedios según estado actual ───────
  async function recalculateAverages() {
    setRecalculating(true);
    const spByPlayerId = {};
    sessionPlayers.forEach(sp => { spByPlayerId[sp.player_id] = sp; });

    const updates = gpsRows.map(row => {
      const cls = classifyGpsInclusion(spByPlayerId[row.player_id]);
      return { id: row.id, include_in_session_average: cls.include, gps_group: cls.group, exclusion_reason: cls.reason };
    }).filter(u =>
      gpsRows.find(r => r.id === u.id)?.include_in_session_average !== u.include_in_session_average ||
      gpsRows.find(r => r.id === u.id)?.gps_group !== u.gps_group
    );

    if (updates.length > 0) {
      await base44.entities.SessionGPSData.bulkUpdate(updates);
    }
    const refreshed = await base44.entities.SessionGPSData.filter({ session_id: session.id }, "player_name", 200);
    setGpsRows(refreshed);
    setRecalculating(false);
    toast({ title: `✓ Clasificación GPS actualizada (${updates.length} registros)` });

    const affectedPlayerIds = [...new Set(refreshed.map(r => r.player_id).filter(Boolean))];
    triggerGpsProfileRecalculation(affectedPlayerIds);
  }

  // ── Manual alias ──────────────────────────────────────────────────────────
  async function saveManualAlias(rawName, playerId) {
    if (!playerId) return;
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;
    const normalizedAlias = normalize(rawName);
    const existingAliases = await base44.entities.PlayerAlias.filter({ normalized_alias: normalizedAlias }, "-created_date", 100);
    if (existingAliases.length) {
      const corrections = existingAliases
        .filter(alias => alias.player_id !== playerId || alias.player_name !== (player.full_name || ""))
        .map(alias => ({ id: alias.id, player_id: playerId, player_name: player.full_name || "", source: "Manual", confidence_score: 1 }));
      if (corrections.length) await base44.entities.PlayerAlias.bulkUpdate(corrections);
    } else {
      await base44.entities.PlayerAlias.create({
        player_id: playerId,
        player_name: player.full_name || "",
        alias_name: rawName,
        normalized_alias: normalizedAlias,
        source: "Manual",
        confidence_score: 1,
      });
    }
    const unmRow = unmatched.find(u => u.rawName === rawName);
    if (unmRow) {
      const record = { ...unmRow.record, player_id: playerId, player_name: player.full_name || "" };
      const created = await base44.entities.SessionGPSData.create(record);
      setGpsRows(prev => [...prev, created]);
      setUnmatched(prev => prev.filter(u => u.rawName !== rawName));
      onGpsImported?.();
    }
    toast({ title: `✓ Alias guardado para ${player.full_name}` });
  }

  const [activeMetric, setActiveMetric] = useState("total_distance");

  const gkRows = gpsRows.filter(r => {
    const p = allPlayers.find(x => x.id === r.player_id);
    return isGoalkeeper(p || { position: r.player_name });
  });
  const rawFieldRows = gpsRows.filter(r => {
    const p = allPlayers.find(x => x.id === r.player_id);
    return !isGoalkeeper(p || { position: r.player_name });
  });
  const duplicateGroups = findSessionGpsDuplicates(rawFieldRows);
  const fieldRows = validSessionGpsRows(rawFieldRows);
  const exerciseDuplicateGroups = findExerciseGpsDuplicates(exerciseGpsRows);
  const validExerciseRows = validExerciseGpsRows(exerciseGpsRows);
  const exerciseSourceFiles = [...new Set(exerciseGpsRows.map(row => row.source_file).filter(Boolean))];
  const displayFieldRows = withPlayerDisplayNames(fieldRows);
  const filteredRows = displayFieldRows;

  const principalRows = filteredRows.filter(r => r.include_in_session_average !== false);
  const excludedRows = filteredRows.filter(r => r.include_in_session_average === false);

  function avg(key, rows = principalRows) {
    const vals = rows.map(r => r[key] || 0).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const activeMeta = METRICS.find(m => m.key === activeMetric) || METRICS[0];
  const chartData = [...principalRows]
    .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
    .map(r => ({
      name: r.display_name || r.player_name,
      value: r[activeMetric] || 0,
    }));

  function metricLabel(key, value) {
    if (key === "smax") return fmtSmax(value);
    const formatted = fmtMetric(value);
    if (key === "total_distance" || key === "distance_19_8" || key === "distance_25") return `${formatted} m`;
    if (key === "sprints") return `${formatted} sprints`;
    if (key === "acc_3") return `${formatted} ACC`;
    if (key === "dec_3") return `${formatted} DEC`;
    return formatted;
  }

  return (
    <div className="space-y-6">
      {gpsRows.length > 0 && (
        <div className="flex justify-end gap-2 flex-wrap">
          <button onClick={() => setShowMarkPresent(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-500/25 transition-colors">
            <UserCheck size={12} />
            Marcar presentes desde GPS
          </button>
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs hover:bg-yellow-500/25 transition-colors">
            <FileBarChart size={12} />
            Editar / exportar informe
          </button>
          <button onClick={recalculateAverages} disabled={recalculating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={recalculating ? "animate-spin" : ""} />
            Reclasificar grupos GPS
          </button>
        </div>
      )}

      {gpsRows.length > 0 && (
        <SessionGpsMainReport
          session={session}
          rows={principalRows}
          rawRows={gpsRows}
          exercises={sessionExercises}
          exerciseRows={validExerciseRows}
          duplicateGroups={duplicateGroups}
          exerciseDuplicateGroups={exerciseDuplicateGroups}
          exerciseSourceFiles={exerciseSourceFiles}
          excludedCount={excludedRows.length}
          sourceFile={session.csv_label || gpsRows[0]?.source_file || ""}
          referenceContext={{ ...gpsReferenceData, players: allPlayers }}
          isAdmin={isAdmin}
        />
      )}

      {gpsRows.length === 0 ? (
        <div data-tour="session-gps-upload" className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <Upload size={20} className="text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-400 mb-1">Cargar datos GPS / Tracking</p>
          <p className="text-[10px] text-zinc-600 mb-3">CSV compatible · las métricas reconocidas se normalizan al modelo de PerformancePitch</p>
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <Upload size={14} /> {uploading ? "Leyendo archivo..." : "Seleccionar archivo CSV"}
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      ) : (
        <details className="rounded-xl border border-zinc-800 bg-zinc-950/50">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white">Importación y calidad del dato · {session.csv_label || "archivo GPS"}</summary>
          <div data-tour="session-gps-upload" className="border-t border-zinc-800 p-5 text-center">
            <Upload size={18} className="text-zinc-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-400 mb-1">Reemplazar / reimportar datos GPS</p>
            <p className="text-[10px] text-zinc-600 mb-3">El archivo se previsualiza antes de confirmar. Los datos existentes no se modifican hasta la confirmación.</p>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <Upload size={14} /> {uploading ? "Leyendo archivo..." : "Seleccionar nuevo CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          </div>
        </details>
      )}

      {showMarkPresent && (
        <MarkPresentFromGpsModal
          sessionPlayers={sessionPlayers}
          csvPlayerIds={csvPlayerIds}
          photos={playerPhotos}
          applying={applyingMarkPresent}
          onConfirm={applyMarkPresent}
          onCancel={() => setShowMarkPresent(false)}
        />
      )}

      {showReport && (
        <SessionGPSReportModal session={session} sessionPlayers={sessionPlayers} onClose={() => setShowReport(false)} />
      )}

      {preview && (
        <div data-tour="session-gps-preview"><GpsImportPreview
          preview={preview}
          selectedFields={selectedFields}
          setSelectedFields={setSelectedFields}
          templates={templates}
          onTemplatesChange={setTemplates}
          importing={importing}
          onCancel={() => setPreview(null)}
          onConfirm={confirmImport}
        /></div>
      )}

      {gpsRows.length === 0 && unmatched.length === 0 && !preview && (
        <p className="text-zinc-600 text-sm text-center py-2">Sin datos GPS cargados</p>
      )}

      {gpsRows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
          <Filter size={12} className="text-zinc-500" />
          <span className="px-3 py-1 rounded-full border border-zinc-700 text-zinc-300">Jugadores de campo ({fieldRows.length})</span>
          {gkRows.length > 0 && <span className="px-3 py-1 rounded-full border border-zinc-800 text-zinc-500">Arqueros excluidos automáticamente ({gkRows.length})</span>}
        </div>
      )}

      {gpsRows.length > 0 && (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <summary className="cursor-pointer list-none px-5 py-4"><div><p className="text-sm font-black text-white">Análisis avanzado</p><p className="mt-1 text-[11px] text-zinc-500">Ejercicios y bloques, comparación de jugadores, comparación entre sesiones y gráficos en barras o línea.</p></div></summary>
          <div className="border-t border-zinc-800 p-3 sm:p-4"><SessionGpsAnalysisStudio session={session} gpsRows={fieldRows} players={allPlayers} /></div>
        </details>
      )}

      {false && gpsRows.length > 0 && (
        <div data-tour="session-gps-results" className="space-y-3">
          <p className="text-[10px] text-zinc-500">
            Promedios calculados solo con el <strong className="text-zinc-300">Grupo principal</strong> ({principalRows.length} jugadores)
            {excludedRows.length > 0 && <span> · {excludedRows.length} excluidos</span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METRICS.map(m => {
              const a = avg(m.key, principalRows);
              const display = m.key === "smax" ? (a != null ? fmtSmax(a) : "—") : (a != null ? fmtMetric(a) : "—");
              return (
                <div key={m.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-zinc-500 mb-1">{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{display}</p>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {gpsRows.length > 0 && <details className="rounded-xl border border-zinc-800 bg-zinc-950/50"><summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white">Datos detallados y columnas del CSV</summary><div className="border-t border-zinc-800 p-3"><GpsDataTable title="Grupo principal" rows={principalRows} visibleFields={visibleFields} setVisibleFields={setVisibleFields} /></div></details>}

      {excludedRows.length > 0 && (
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-amber-500/20">
            <p className="text-xs font-semibold text-amber-300">Excluidos del promedio ({excludedRows.length})</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Quedan registrados con su GPS, pero no afectan el promedio grupal.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium whitespace-nowrap">Jugador</th>
                  <th className="text-left py-3 px-3 text-zinc-400 font-medium whitespace-nowrap">Motivo</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap" style={{ color: "#3b82f6" }}>Distancia</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap" style={{ color: "#a855f7" }}>P.Load</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap" style={{ color: "#ef4444" }}>Smax</th>
                </tr>
              </thead>
              <tbody>
                {excludedRows.map((r, i) => (
                  <tr key={r.player_id || i} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-4 text-white font-semibold whitespace-nowrap">{r.display_name || r.player_name}</td>
                    <td className="py-2.5 px-3 text-amber-300 whitespace-nowrap">{EXCLUSION_REASON_LABELS[r.exclusion_reason] || r.exclusion_reason || "—"}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: "#3b82f6" }}>{fmtMetric(r.total_distance)}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: "#a855f7" }}>{fmtMetric(r.player_load)}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: "#ef4444" }}>{fmtSmax(r.smax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {false && gpsRows.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeMetric === m.key
                    ? "border-transparent text-zinc-900"
                    : "bg-transparent border-zinc-700 text-zinc-400 hover:text-white"
                }`}
                style={activeMetric === m.key ? { backgroundColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs text-zinc-400 mb-3 font-medium">{activeMeta.label} — por jugador</p>
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 32 + 30)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 70, right: 90, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: activeMeta.color }}
                  formatter={v => [metricLabel(activeMetric, v), activeMeta.label]}
                />
                {avg(activeMetric, principalRows) != null && <ReferenceLine x={avg(activeMetric, principalRows)} stroke="#facc15" strokeDasharray="4 4" label={{ value: "Prom.", fill: "#facc15", fontSize: 10 }} />}
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" fill="#e4e4e7" fontSize={10} formatter={(v) => metricLabel(activeMetric, v)} />
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={activeMeta.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div data-tour="session-gps-unmatched">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertCircle size={12} /> Sin reconocer ({unmatched.length}) — vincular manualmente
          </p>
          <div className="space-y-2">
            {unmatched.map(({ rawName }) => (
              <div key={rawName} className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg flex-wrap">
                <AlertCircle size={11} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300 flex-1 min-w-[120px]">{rawName || "(sin nombre)"}</span>
                <select
                  value={aliasTargets[rawName] || ""}
                  onChange={e => setAliasTargets(p => ({ ...p, [rawName]: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none flex-1 min-w-[160px]">
                  <option value="">Seleccionar jugador...</option>
                  {allPlayers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <button
                  onClick={() => saveManualAlias(rawName, aliasTargets[rawName])}
                  disabled={!aliasTargets[rawName]}
                  className="px-3 py-1 bg-white text-zinc-900 rounded text-xs font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-40">
                  Vincular y guardar alias
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}