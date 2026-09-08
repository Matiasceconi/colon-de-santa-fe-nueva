import { normalize } from "@/components/sessions/gps/gpsCsvUtils";

export const GPS_TASK_TAG = "gps-csv-task";

export const ADDITIVE_FIELDS = [
  "total_distance", "distance_14_19_8", "distance_19_8", "distance_25",
  "sprints", "acc_2_3_distance", "acc_2_3_eff", "acc_3_distance", "acc_3",
  "dec_2_3_distance", "dec_2_3_eff", "dec_3_distance", "dec_3",
  "hmld", "player_load", "rhie_bouts",
];

export const MAX_FIELDS = ["smax", "max_vel_percent"];

export function splitTaskRowName(rawName) {
  const value = String(rawName || "").trim();
  const separator = value.indexOf(" - ");
  if (separator <= 0) return null;
  const playerName = value.slice(0, separator).trim();
  const taskName = value.slice(separator + 3).trim();
  return playerName && taskName ? { playerName, taskName } : null;
}

export function taskMarker(taskName) {
  return "gps-task:" + normalize(taskName);
}

export function analyzeTaskRows(rows) {
  const parsed = rows.map((row) => ({ row, split: splitTaskRowName(row.Name) }));
  const taskMode = parsed.length > 0 && parsed.every((item) => item.split);
  if (!taskMode) return { taskMode: false, taskRows: [], tasks: [] };

  const pairCount = new Map();
  const tasks = new Map();
  const taskRows = parsed.map(({ row, split }) => {
    const playerKey = normalize(split.playerName);
    const normalizedTask = normalize(split.taskName);
    const pairKey = playerKey + "::" + normalizedTask;
    const period = (pairCount.get(pairKey) || 0) + 1;
    pairCount.set(pairKey, period);

    if (!tasks.has(normalizedTask)) {
      tasks.set(normalizedTask, {
        normalizedTask,
        name: split.taskName,
        periods: 0,
        rowCount: 0,
        players: new Set(),
        firstIndex: tasks.size,
      });
    }
    const task = tasks.get(normalizedTask);
    task.periods = Math.max(task.periods, period);
    task.rowCount += 1;
    task.players.add(playerKey);

    return {
      row,
      playerName: split.playerName,
      taskName: split.taskName,
      normalizedTask,
      period,
      marker: taskMarker(split.taskName),
    };
  });

  const taskList = [...tasks.values()].map((task) => ({
    ...task,
    players: task.players.size,
  }));

  return { taskMode: true, taskRows, tasks: taskList };
}

export function taskDefinitions(analysis) {
  if (!analysis?.taskMode) return [];
  return analysis.tasks.map((task, order) => ({
    taskName: task.name,
    normalizedTask: task.normalizedTask,
    blocks: task.periods,
    marker: taskMarker(task.name),
    label: task.name,
    order,
  }));
}

export function durationToSeconds(value) {
  if (!value) return 0;
  const parts = String(value).trim().split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function secondsToDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

export function aggregateSessionGps(records) {
  const byPlayer = new Map();
  records.forEach((record) => {
    if (!record.player_id) return;
    if (!byPlayer.has(record.player_id)) {
      byPlayer.set(record.player_id, {
        session_id: record.session_id,
        player_id: record.player_id,
        player_name: record.player_name,
        player_name_original: record.player_name_original,
        source_file: record.source_file,
        include_in_session_average: record.include_in_session_average,
        gps_group: record.gps_group,
        exclusion_reason: record.exclusion_reason,
        _seconds: 0,
        _present: new Set(),
      });
    }
    const total = byPlayer.get(record.player_id);
    total._seconds += durationToSeconds(record.duration);
    ADDITIVE_FIELDS.forEach((field) => {
      if (record[field] == null || !Number.isFinite(Number(record[field]))) return;
      total[field] = (total[field] || 0) + Number(record[field]);
      total._present.add(field);
    });
    MAX_FIELDS.forEach((field) => {
      if (record[field] == null || !Number.isFinite(Number(record[field]))) return;
      total[field] = Math.max(total[field] || 0, Number(record[field]));
      total._present.add(field);
    });
  });

  return [...byPlayer.values()].map((total) => {
    const seconds = total._seconds;
    delete total._seconds;
    delete total._present;
    if (seconds > 0) total.duration = secondsToDuration(seconds);
    const minutes = seconds / 60;
    if (minutes > 0 && total.total_distance != null) total.m_min = total.total_distance / minutes;
    if (minutes > 0 && total.player_load != null) total.player_load_per_min = total.player_load / minutes;
    return total;
  });
}

export function buildExerciseSummary(records, sourceFile) {
  const averageFields = ["total_distance", "m_min", "distance_14_19_8", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load"];
  const summary = {
    source_file: sourceFile,
    players_count: new Set(records.map((r) => r.player_id).filter(Boolean)).size,
    imported_rows: records.length,
  };
  averageFields.forEach((field) => {
    const values = records.map((r) => Number(r[field])).filter(Number.isFinite);
    if (values.length) summary[field] = values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  const speeds = records.map((r) => Number(r.smax)).filter(Number.isFinite);
  if (speeds.length) summary.smax = Math.max(...speeds);
  return summary;
}
