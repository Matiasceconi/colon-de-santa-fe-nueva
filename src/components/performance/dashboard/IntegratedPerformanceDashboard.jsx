import PerformanceWidgetBoard from "./PerformanceWidgetBoard";
import { normalizeMatchGpsRows } from "./matchGpsAdapter";
import React, { useEffect, useMemo, useState } from "react";

import moment from "moment";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { evaluationsGateway } from "@/lib/evaluationsApi";

const GPS_METRICS = [
  { key: "total_distance", label: "Distancia", unit: "m" },
  { key: "player_load", label: "Player Load", unit: "" },
  { key: "distance_25", label: "D >25", unit: "m" },
  { key: "sprints", label: "Sprints", unit: "" },
  { key: "acc_3", label: "ACC +3", unit: "" },
  { key: "dec_3", label: "DEC +3", unit: "" },
];

const MEDICAL_LABELS = {
  disponible: "Disponible", alta: "Alta", lesionado: "Lesionado",
  en_recuperacion: "En recuperación", kinesiologia: "Kinesiología", seguimiento: "Seguimiento"
};

const n = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const fmt = (value, digits = 0) => n(value) == null ? "—" : Number(value).toLocaleString("es-AR", { maximumFractionDigits: digits });
const playerName = (p) => p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Jugador";

async function rows(entity, filter, sort = "-created_date") {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const batch = await base44.entities[entity].filter(filter, sort, 500, offset);
    result.push(...batch);
    if (batch.length < 500) return result;
  }
}

function latestByPlayer(list, field) {
  const map = new Map();
  list.forEach((item) => {
    if (!item.player_id) return;
    const current = map.get(item.player_id);
    if (!current || String(item[field] || "") > String(current[field] || "")) map.set(item.player_id, item);
  });
  return map;
}

function sumMetric(list, key) {
  const values = list.map(row => n(row[key])).filter(value => value != null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function sevenDayLoad(records, currentFrom, baselineFrom, baselineTo) {
  const current = records.filter((r) => r.date >= currentFrom);
  const baseline = records.filter((r) => r.date >= baselineFrom && r.date <= baselineTo);
  const metrics = GPS_METRICS.map((metric) => {
    const value = sumMetric(current, metric.key);
    const baselineSum = sumMetric(baseline, metric.key);
    const reference = baselineSum == null ? null : baselineSum / 3;
    return {
      ...metric,
      value,
      reference,
      ratio: reference > 0 ? value / reference : null,
    };
  });
  const comparable = metrics.filter((m) => m.ratio != null && m.value > 0);
  const peak = comparable.sort((a, b) => b.ratio - a.ratio)[0] || null;
  const sessions = new Set(current.map((r) => r.session_id).filter(Boolean)).size;
  return { metrics, peak, sessions, hasData: metrics.some(metric => metric.value != null) };
}

function internalLoad(records, currentFrom, baselineFrom, baselineTo) {
  const valid = records.filter((r) => n(r.internal_load) != null);
  const current = valid.filter((r) => r.date >= currentFrom);
  const baseline = valid.filter((r) => r.date >= baselineFrom && r.date <= baselineTo);
  const value = sumMetric(current, "internal_load");
  const baselineSum = sumMetric(baseline, "internal_load");
  const reference = baselineSum == null ? null : baselineSum / 3;
  const latest = [...records].filter((r) => n(r.rpe) != null).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return {
    value,
    reference,
    ratio: reference > 0 ? value / reference : null,
    latestRpe: latest ? n(latest.rpe) : null,
    latestDate: latest?.date,
    sessions: current.length,
    hasData: current.length > 0,
  };
}

export default function IntegratedPerformanceDashboard() {
  const { activeSquadId, activeSquadName, activeSeasonId, canSeePath, isAdmin } = useWorkspace();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ loading: true, players: [], data: {}, errors: {} });

  const [today, setToday] = useState(moment().format("YYYY-MM-DD"));
  const currentFrom = moment(today).subtract(6, "days").format("YYYY-MM-DD");
  const baselineFrom = moment(today).subtract(27, "days").format("YYYY-MM-DD");
  const baselineTo = moment(today).subtract(7, "days").format("YYYY-MM-DD");

  useEffect(() => {
    let cancelled = false;
    if (!activeSquadId) {
      setState({ loading: false, players: [], data: {}, errors: {} });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const scope = { squad_id: activeSquadId };
    const inSeason = (r) => !activeSeasonId || !r.season_id || r.season_id === activeSeasonId;

    async function load() {
      try {
        const [direct, memberships] = await Promise.all([
          rows("Player", scope, "full_name"),
          rows("SquadMembership", scope, "-effective_from"),
        ]);
        const memberIds = [...new Set(memberships
          .filter((m) => m.status === "activo" && !m.effective_to && (!m.effective_from || m.effective_from <= today))
          .map((m) => m.player_id).filter(Boolean))];
        const linked = [];
        for (let i = 0; i < memberIds.length; i += 50) {
          linked.push(...await rows("Player", { id: { $in: memberIds.slice(i, i + 50) } }, "full_name"));
        }
        const players = [...new Map([...direct, ...linked].map((p) => [p.id, p])).values()]
          .filter((p) => p.active !== false)
          .sort((a, b) => playerName(a).localeCompare(playerName(b)));

        const training = (await rows("TrainingSession", { ...scope, date: { $gte: baselineFrom, $lte: today } }, "-date"))
          .filter(inSeason).filter((s) => s.status !== "cancelled");
        const matches = (await rows("MatchReport", { ...scope, date: { $gte: baselineFrom, $lte: today } }, "-date")).filter(inSeason);
        const eventDate = new Map([...training, ...matches].map((event) => [event.id, event.date]));
        const trainingIds = training.map((s) => s.id);
        const data = { training, matches };
        const errors = {};

        const loaders = {
          gps: async () => {
            if (!(isAdmin || canSeePath("/performance/external-load"))) throw new Error("Sin acceso a carga externa");
            const out = [];
            for (let i = 0; i < trainingIds.length; i += 50) out.push(...await rows("SessionGPSData", { session_id: { $in: trainingIds.slice(i, i + 50) } }, "-updated_date"));
            const trainingRows = dedupeEvent(out, "session_id").filter(r => r.exclusion_reason !== "error_gps").map(r => ({ ...r, date: eventDate.get(r.session_id), source_type: "training" }));
            const matchRows = [];
            for (let i = 0; i < matches.length; i += 50) matchRows.push(...await rows("CatapultReport", { session_id: { $in: matches.slice(i, i + 50).map(m => m.id) } }, "-created_date"));
            return [...trainingRows, ...matches.flatMap(match => normalizeMatchGpsRows(match, dedupeEvent(matchRows.filter(r => r.session_id === match.id), "session_id")).map(r => ({ ...r, date: match.date, source_type: "match" })))];
          },
          internal: async () => {
            if (!(isAdmin || canSeePath("/performance/internal-load"))) throw new Error("Sin acceso a carga interna");
            const [wellness, sessionPlayers] = await Promise.all([
              rows("WellnessResponse", { ...scope, response_date: today }, "-submitted_at"),
              (async () => {
                const out = [];
                for (let i = 0; i < trainingIds.length; i += 50) out.push(...await rows("SessionPlayer", { session_id: { $in: trainingIds.slice(i, i + 50) } }, "-updated_date"));
                return dedupeEvent(out, "session_id").map((r) => ({ ...r, date: eventDate.get(r.session_id), internal_load: n(r.rpe) != null && n(r.minutes) > 0 ? Number(r.rpe) * Number(r.minutes) : null }));
              })(),
            ]);
            return { wellness, sessionPlayers };
          },
          medical: async () => {
            if (!(isAdmin || canSeePath("/performance/medical"))) throw new Error("Sin acceso a área médica");
            return rows("MedicalCurrentStatus", scope, "-updated_at");
          },
          minutes: async () => {
            if (!(isAdmin || canSeePath("/performance/minutes"))) throw new Error("Sin acceso a minutos");
            const out = [];
            for (let i = 0; i < matches.length; i += 50) out.push(...await rows("MatchPlayerMinutes", { match_id: { $in: matches.slice(i, i + 50).map((m) => m.id) } }, "-updated_date"));
            return dedupeEvent(out, "match_id").map((r) => ({ ...r, date: eventDate.get(r.match_id) }));
          },
          nutrition: async () => {
            if (!(isAdmin || canSeePath("/performance/nutrition"))) throw new Error("Sin acceso a nutrición");
            return (await rows("NutritionAssessment", scope, "-fecha")).filter((r) => r.fecha <= today && inSeason(r));
          },
          strength: async () => {
            if (!(isAdmin || canSeePath("/evaluations"))) throw new Error("Sin acceso a evaluaciones");
            return evaluationsGateway("overview", scope);
          },
        };

        const keys = Object.keys(loaders);
        const settled = await Promise.allSettled(keys.map((key) => loaders[key]()));
        settled.forEach((result, index) => {
          const key = keys[index];
          if (result.status === "fulfilled") data[key] = result.value;
          else errors[key] = result.reason?.message || "No se pudo cargar";
        });
        if (!cancelled) setState({ loading: false, players, data, errors });
      } catch (error) {
        if (!cancelled) setState({ loading: false, players: [], data: {}, errors: {}, rosterError: error?.message || "No se pudo cargar el plantel" });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeSquadId, activeSeasonId, refresh, today, baselineFrom, isAdmin, canSeePath]);

  const rowsByPlayer = useMemo(() => {
    const wellnessMap = latestByPlayer(state.data.internal?.wellness || [], "submitted_at");
    const medicalMap = latestByPlayer(state.data.medical || [], "updated_at");
    const nutritionMap = latestByPlayer(state.data.nutrition || [], "fecha");
    const strengthMap = new Map((state.data.strength?.evaluated_players || [])
      .filter((p) => p.linked && p.linkValid).map((p) => [p.realId, p]));

    return state.players.map((player) => {
      const gpsRecords = (state.data.gps || []).filter((r) => r.player_id === player.id && r.date);
      const sessionRecords = (state.data.internal?.sessionPlayers || []).filter((r) => r.player_id === player.id && r.date);
      const minuteRecords = (state.data.minutes || []).filter((r) => r.player_id === player.id && r.date >= currentFrom);
      const gps = sevenDayLoad(gpsRecords, currentFrom, baselineFrom, baselineTo);
      const internal = internalLoad(sessionRecords, currentFrom, baselineFrom, baselineTo);
      const wellness = wellnessMap.get(player.id);
      const medical = medicalMap.get(player.id);
      const reasons = [];
      let severity = 0;

      if (medical && !["disponible", "alta"].includes(medical.current_status)) {
        severity = 3;
        reasons.push("Estado médico: " + (MEDICAL_LABELS[medical.current_status] || medical.current_status));
      }
      if (wellness) {
        const alert = wellness.alert_level;
        if (alert === "rojo" || alert === "naranja") severity = Math.max(severity, 3);
        else if (alert === "amarillo") severity = Math.max(severity, 2);
        if (alert && alert !== "verde") reasons.push("Wellness " + alert);
        (wellness.alert_reasons || []).slice(0, 2).forEach((reason) => reasons.push(reason));
        if (wellness.has_pain) {
          severity = Math.max(severity, n(wellness.pain_intensity) >= 7 ? 3 : 2);
          reasons.push("Dolor " + (wellness.pain_zone || "reportado") + " " + fmt(wellness.pain_intensity) + "/10");
        }

      }
      const level = severity >= 3 ? "high" : severity === 2 ? "medium" : "controlled";
      return {
        player, wellness, medical, gps, internal, level, reasons: [...new Set(reasons)],
        minutes: minuteRecords.length ? sumMetric(minuteRecords, "minutes_played") : null,
        nutrition: nutritionMap.get(player.id),
        strength: strengthMap.get(player.id),
      };
    }).sort((a, b) => {
      const order = { high: 3, medium: 2, controlled: 1 };
      return order[b.level] - order[a.level] || playerName(a.player).localeCompare(playerName(b.player));
    });
  }, [state, currentFrom, baselineFrom, baselineTo]);

  if (!activeSquadId) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-400">Seleccioná un plantel para abrir el centro de alertas.</div>;

  return <PerformanceWidgetBoard key={activeSquadId + ":" + activeSeasonId} state={state} rows={rowsByPlayer} squadName={activeSquadName} squadId={activeSquadId} seasonId={activeSeasonId} date={today} onDateChange={setToday} onRefresh={() => setRefresh(v => v + 1)} canSee={path => isAdmin || canSeePath(path)} />;
}

function dedupeEvent(records, field) {
 const map = new Map();
 [...records].sort((a,b) => String(b.updated_at || b.updated_date || b.created_date || "").localeCompare(String(a.updated_at || a.updated_date || a.created_date || ""))).forEach(row => {
  const key = row[field] + ":" + row.player_id;
  if (row.player_id && !map.has(key)) map.set(key,row);
 });
 return [...map.values()];
}
