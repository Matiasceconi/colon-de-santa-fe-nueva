import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, ArrowDown, ArrowUp, BookOpen, CheckCircle2, Plus, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PageTour, { startPageTour } from "@/components/tour/PageTour";
import { GPS_REFERENCES_TOUR } from "@/lib/pageTours";
import {
  DEFAULT_GPS_REFERENCE_CONFIG,
  GPS_REFERENCE_TYPES,
  normalizeGpsReferenceConfig,
  referenceTypeLabel,
} from "@/components/sessions/gps/gpsReferenceEngine";
import { REPORT_METRICS } from "@/components/sessions/gpsReport/sessionGpsReportData";

const TABS = [
  { id: "model", label: "Modelo" },
  { id: "references", label: "Referencias" },
  { id: "criteria", label: "Criterios" },
  { id: "objectives", label: "Objetivos" },
  { id: "definitions", label: "Definición de métricas" },
];

const MODELS = [
  { id: "hybrid", title: "Perfil híbrido PerformancePitch", text: "Usa la referencia más útil para cada métrica: MD individual para volumen/intensidad, competencia para alta velocidad y máximo individual para Smax." },
  { id: "competition", title: "Demanda de partido", text: "Prioriza el perfil competitivo individual como referencia de las métricas seleccionadas." },
  { id: "microcycle", title: "Histórico por MD", text: "Prioriza sesiones equivalentes del mismo día del microciclo." },
  { id: "custom", title: "Personalizado", text: "El club define métrica por métrica qué fuente quiere usar." },
];

const FALLBACK_LEVELS = [
  { id: "individual", label: "Individual" },
  { id: "position", label: "Posición" },
  { id: "squad", label: "Plantel" },
];

const MD_CODES = ["", "MD-7", "MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "MD+3", "Otro"];

const EMPTY_RULE = {
  md_code: "",
  physical_objective: "",
  position: "",
  player_id: "",
  metric_key: "total_distance",
  reference_type_override: "",
  target_min_pct: "",
  target_max_pct: "",
  target_min_value: "",
  target_max_value: "",
  notes: "",
  active: true,
};

function numericOrUndefined(value) {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function modelMetricRules(model, currentRules) {
  if (model === "hybrid") return { ...DEFAULT_GPS_REFERENCE_CONFIG.metric_rules };
  if (model === "competition") {
    return Object.fromEntries(REPORT_METRICS.map((metric) => [metric.key, { reference_type: metric.key === "smax" ? "player_max" : "player_competition" }]));
  }
  if (model === "microcycle") {
    return Object.fromEntries(REPORT_METRICS.map((metric) => [metric.key, { reference_type: metric.key === "smax" ? "player_max" : "player_md" }]));
  }
  return { ...currentRules };
}

function SectionIntro({ title, text }) {
  return <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4"><p className="text-sm font-bold text-blue-200">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{text}</p></div>;
}

function Field({ label, children, hint }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>{children}{hint && <span className="mt-1 block text-[10px] leading-4 text-zinc-600">{hint}</span>}</label>;
}

const INPUT = "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/60";

export default function GPSReferenceSettingsPanel({ isAdmin = false }) {
  const { toast } = useToast();
  const { activeSquadId, activeSeasonId, activeSquad, squads } = useWorkspace();
  const [tab, setTab] = useState("model");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configRowId, setConfigRowId] = useState("");
  const [config, setConfig] = useState(() => normalizeGpsReferenceConfig(null));
  const [rules, setRules] = useState([]);
  const [players, setPlayers] = useState([]);
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState("");
  const [ruleDraft, setRuleDraft] = useState(EMPTY_RULE);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);

  const squadId = activeSquadId || activeSquad?.id || "";
  const seasonId = activeSeasonId || activeSquad?.season || "";
  const squadName = activeSquad?.name || squads?.find((item) => item.id === squadId)?.name || "";

  async function load() {
    if (!squadId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [configRows, objectiveRows, playerRows, objectiveOptions] = await Promise.all([
        base44.entities.GPSReferenceConfiguration.filter({ squad_id: squadId }, "-updated_at", 50).catch(() => []),
        base44.entities.GPSObjectiveRule.filter({ squad_id: squadId }, "-updated_at", 500).catch(() => []),
        base44.entities.Player.list("full_name", 1000).catch(() => []),
        base44.entities.PhysicalObjective.list("order", 100).catch(() => []),
      ]);
      const stored = configRows.find((row) => !seasonId || !row.season_id || String(row.season_id) === String(seasonId)) || null;
      setConfigRowId(stored?.id || "");
      setHasStoredConfig(!!stored);
      setConfig(normalizeGpsReferenceConfig(stored, { squad_id: squadId, squad_name: squadName, season_id: seasonId }));
      setRules(objectiveRows.filter((row) => !seasonId || !row.season_id || String(row.season_id) === String(seasonId)));
      setPlayers(playerRows.filter((player) => player.active !== false && (!squadId || player.squad_id === squadId || player.division === squadName)));
      setPhysicalObjectives(objectiveOptions.filter((item) => item.active !== false && item.hidden !== true));
    } catch (error) {
      toast({ title: "No se pudo cargar la configuración GPS", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [squadId, seasonId]);

  const positions = useMemo(() => [...new Set(players.flatMap((player) => [player.position_group, player.position]).filter(Boolean))].sort(), [players]);
  const metricMap = useMemo(() => Object.fromEntries(REPORT_METRICS.map((metric) => [metric.key, metric])), []);

  function selectModel(model) {
    setConfig((current) => ({ ...current, model, metric_rules: modelMetricRules(model, current.metric_rules) }));
  }

  function patchMetricRule(metricKey, patch) {
    setConfig((current) => ({
      ...current,
      model: current.model === "custom" ? "custom" : current.model,
      metric_rules: {
        ...(current.metric_rules || {}),
        [metricKey]: { ...(current.metric_rules?.[metricKey] || {}), ...patch },
      },
    }));
  }

  function moveFallback(index, delta) {
    setConfig((current) => {
      const next = [...(current.fallback_order || FALLBACK_LEVELS.map((item) => item.id))];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, fallback_order: next };
    });
  }

  async function saveConfig() {
    if (!isAdmin || !squadId) return;
    setSaving(true);
    try {
      const payload = {
        squad_id: squadId,
        squad_name: squadName,
        season_id: seasonId || "",
        model: config.model,
        metric_rules: config.metric_rules,
        fallback_order: config.fallback_order,
        min_competition_matches: Number(config.min_competition_matches || 0),
        min_match_minutes: Number(config.min_match_minutes || 0),
        competition_window: Number(config.competition_window || 0),
        min_md_sessions: Number(config.min_md_sessions || 0),
        md_window: Number(config.md_window || 0),
        min_position_players: Number(config.min_position_players || 0),
        threshold_definitions: config.threshold_definitions,
        active: true,
        updated_at: new Date().toISOString(),
      };
      let saved;
      if (configRowId) saved = await base44.entities.GPSReferenceConfiguration.update(configRowId, payload);
      else saved = await base44.entities.GPSReferenceConfiguration.create(payload);
      setConfigRowId(saved?.id || configRowId);
      setHasStoredConfig(true);
      await Promise.allSettled([
        base44.functions.invoke("recalculateGpsProfiles", { squad_id: squadId, season_id: seasonId || "" }),
        base44.functions.invoke("recalculateTeamGPSProfile", { squad_id: squadId, season_id: seasonId || "" }),
      ]);
      toast({ title: "✓ Referencias GPS guardadas", description: "Los perfiles del plantel se recalcularon con los criterios configurados." });
      await load();
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function editRule(rule) {
    setEditingRuleId(rule.id);
    setRuleDraft({
      md_code: rule.md_code || "",
      physical_objective: rule.physical_objective || "",
      position: rule.position || "",
      player_id: rule.player_id || "",
      metric_key: rule.metric_key || "total_distance",
      reference_type_override: rule.reference_type_override || "",
      target_min_pct: rule.target_min_pct ?? "",
      target_max_pct: rule.target_max_pct ?? "",
      target_min_value: rule.target_min_value ?? "",
      target_max_value: rule.target_max_value ?? "",
      notes: rule.notes || "",
      active: rule.active !== false,
    });
    setTab("objectives");
  }

  function resetRuleDraft() {
    setEditingRuleId("");
    setRuleDraft(EMPTY_RULE);
  }

  async function saveRule() {
    if (!isAdmin || !squadId) return;
    const player = players.find((item) => item.id === ruleDraft.player_id);
    const payload = {
      squad_id: squadId,
      season_id: seasonId || "",
      md_code: ruleDraft.md_code || "",
      physical_objective: ruleDraft.physical_objective || "",
      position: ruleDraft.position || "",
      player_id: ruleDraft.player_id || "",
      player_name: player?.full_name || "",
      metric_key: ruleDraft.metric_key,
      reference_type_override: ruleDraft.reference_type_override || "",
      target_min_pct: numericOrUndefined(ruleDraft.target_min_pct),
      target_max_pct: numericOrUndefined(ruleDraft.target_max_pct),
      target_min_value: numericOrUndefined(ruleDraft.target_min_value),
      target_max_value: numericOrUndefined(ruleDraft.target_max_value),
      notes: ruleDraft.notes || "",
      active: ruleDraft.active !== false,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingRuleId) await base44.entities.GPSObjectiveRule.update(editingRuleId, payload);
      else await base44.entities.GPSObjectiveRule.create(payload);
      toast({ title: editingRuleId ? "Objetivo actualizado" : "Objetivo agregado" });
      resetRuleDraft();
      await load();
    } catch (error) {
      toast({ title: "No se pudo guardar el objetivo", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    }
  }

  async function removeRule(id) {
    if (!isAdmin) return;
    try {
      await base44.entities.GPSObjectiveRule.delete(id);
      setRules((current) => current.filter((item) => item.id !== id));
      if (editingRuleId === id) resetRuleDraft();
      toast({ title: "Objetivo eliminado" });
    } catch (error) {
      toast({ title: "No se pudo eliminar", description: error?.message || "Intentá nuevamente.", variant: "destructive" });
    }
  }

  function patchThreshold(key, patch) {
    setConfig((current) => ({
      ...current,
      threshold_definitions: {
        ...(current.threshold_definitions || {}),
        [key]: { ...(current.threshold_definitions?.[key] || {}), ...patch },
      },
    }));
  }

  function handleTourStep(step) {
    if (step?.tab) setTab(step.tab);
  }

  if (!squadId) return <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">Seleccioná un plantel activo para configurar sus referencias GPS.</div>;
  if (loading) return <div className="py-10 text-center text-sm text-zinc-500">Cargando configuración GPS…</div>;

  return (
    <div className="space-y-4" data-tour="gps-ref-root">
      <PageTour pageKey={`gps-references-${squadId}-v1`} steps={GPS_REFERENCES_TOUR} autoStart={isAdmin && !hasStoredConfig} onStepChange={handleTourStep} />

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div>
          <div className="flex items-center gap-2"><Activity size={17} className="text-cyan-400" /><p className="font-black text-white">Referencias y objetivos GPS</p></div>
          <p className="mt-1 text-xs text-zinc-500">{squadName || "Plantel"}{seasonId ? ` · ${seasonId}` : ""} · metodología configurable por el club</p>
          {!hasStoredConfig && <p className="mt-2 inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">Usando perfil híbrido recomendado hasta que guardes</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={startPageTour} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"><BookOpen size={14} />Guía interactiva</button>
          {isAdmin && <button data-tour="gps-ref-save" type="button" onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500 disabled:opacity-50"><Save size={14} />{saving ? "Guardando…" : "Guardar y recalcular"}</button>}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        {TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${tab === item.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{item.label}</button>)}
      </div>

      {tab === "model" && <div className="space-y-4" data-tour="gps-ref-model">
        <SectionIntro title="Referencia ≠ objetivo" text="La referencia responde '¿contra qué comparo este dato?'. El objetivo responde '¿qué rango quiero alcanzar hoy?'. PerformancePitch conserva ambos conceptos separados para no convertir un promedio en una prescripción." />
        <div className="grid gap-3 md:grid-cols-2">{MODELS.map((model) => <button key={model.id} onClick={() => isAdmin && selectModel(model.id)} className={`rounded-2xl border p-4 text-left transition ${config.model === model.id ? "border-cyan-500/50 bg-cyan-500/[0.08]" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-white">{model.title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{model.text}</p></div>{config.model === model.id && <CheckCircle2 size={17} className="shrink-0 text-cyan-400" />}</div></button>)}</div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Perfil híbrido predeterminado</p><div className="mt-3 grid gap-2 md:grid-cols-2">{REPORT_METRICS.slice(0, 9).map((metric) => <div key={metric.key} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2"><span className="text-xs font-semibold text-zinc-300">{metric.label}</span><span className="text-[10px] text-zinc-500">{referenceTypeLabel(config.metric_rules?.[metric.key]?.reference_type)}</span></div>)}</div></div>
      </div>}

      {tab === "references" && <div className="space-y-4" data-tour="gps-ref-metrics">
        <SectionIntro title="Una métrica puede tener una referencia distinta" text="No obligamos a que Distancia, Sprint, ACC/DEC y Smax se interpreten contra el mismo patrón. Elegí qué fuente tiene sentido para cada variable en la metodología del club." />
        <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="min-w-full text-xs"><thead className="bg-zinc-950 text-zinc-500"><tr><th className="p-3 text-left">Métrica</th><th className="p-3 text-left">Referencia principal</th><th className="p-3 text-left">Valor manual</th></tr></thead><tbody>{REPORT_METRICS.map((metric) => { const rule = config.metric_rules?.[metric.key] || {}; return <tr key={metric.key} className="border-t border-zinc-800"><td className="p-3"><p className="font-bold text-white">{metric.label}</p><p className="text-[10px] text-zinc-600">{metric.unit || "sin unidad"}</p></td><td className="p-3"><select disabled={!isAdmin} value={rule.reference_type || "none"} onChange={(event) => { patchMetricRule(metric.key, { reference_type: event.target.value }); setConfig((current) => ({ ...current, model: "custom" })); }} className={`${INPUT} min-w-64`}>{GPS_REFERENCE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></td><td className="p-3">{rule.reference_type === "manual" ? <input disabled={!isAdmin} type="number" step="any" value={rule.manual_value ?? ""} onChange={(event) => patchMetricRule(metric.key, { manual_value: event.target.value })} className={`${INPUT} w-36`} placeholder={metric.unit || "valor"} /> : <span className="text-zinc-700">—</span>}</td></tr>; })}</tbody></table></div>
      </div>}

      {tab === "criteria" && <div className="space-y-4" data-tour="gps-ref-criteria">
        <SectionIntro title="Calidad mínima de la referencia" text="Una referencia con una sola observación no se presenta como patrón consolidado. Definí mínimos y ventanas recientes; cuando no alcanza la muestra, PerformancePitch lo informa y utiliza el fallback configurado." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Partidos mínimos" hint="Para referencia competitiva individual"><input disabled={!isAdmin} type="number" min="1" value={config.min_competition_matches} onChange={(e) => setConfig((c) => ({ ...c, min_competition_matches: Number(e.target.value) }))} className={INPUT} /></Field>
          <Field label="Minutos mínimos por partido" hint="Solo partidos con al menos estos minutos"><input disabled={!isAdmin} type="number" min="1" value={config.min_match_minutes} onChange={(e) => setConfig((c) => ({ ...c, min_match_minutes: Number(e.target.value) }))} className={INPUT} /></Field>
          <Field label="Ventana competitiva" hint="Últimos N partidos válidos"><input disabled={!isAdmin} type="number" min="1" value={config.competition_window} onChange={(e) => setConfig((c) => ({ ...c, competition_window: Number(e.target.value) }))} className={INPUT} /></Field>
          <Field label="Sesiones MD mínimas" hint="Para consolidar el mismo MD"><input disabled={!isAdmin} type="number" min="1" value={config.min_md_sessions} onChange={(e) => setConfig((c) => ({ ...c, min_md_sessions: Number(e.target.value) }))} className={INPUT} /></Field>
          <Field label="Ventana MD" hint="Últimas N sesiones equivalentes"><input disabled={!isAdmin} type="number" min="1" value={config.md_window} onChange={(e) => setConfig((c) => ({ ...c, md_window: Number(e.target.value) }))} className={INPUT} /></Field>
          <Field label="Jugadores mínimos por posición" hint="Para usar un fallback posicional"><input disabled={!isAdmin} type="number" min="1" value={config.min_position_players} onChange={(e) => setConfig((c) => ({ ...c, min_position_players: Number(e.target.value) }))} className={INPUT} /></Field>
        </div>
        <div data-tour="gps-ref-fallback" className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-sm font-black text-white">Orden de fallback</p><p className="mt-1 text-xs text-zinc-500">Si la fuente principal no tiene muestra suficiente, se intenta el siguiente nivel. El informe siempre muestra qué referencia terminó usando.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row">{(config.fallback_order || []).map((level, index) => <div key={level} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-black text-zinc-300">{index + 1}</span><span className="min-w-20 text-xs font-bold text-white">{FALLBACK_LEVELS.find((item) => item.id === level)?.label || level}</span>{isAdmin && <div className="flex"><button disabled={index === 0} onClick={() => moveFallback(index, -1)} className="p-1 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowUp size={13} /></button><button disabled={index === config.fallback_order.length - 1} onClick={() => moveFallback(index, 1)} className="p-1 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowDown size={13} /></button></div>}</div>)}</div></div>
      </div>}

      {tab === "objectives" && <div className="space-y-4" data-tour="gps-ref-objectives">
        <SectionIntro title="Objetivos contextuales" text="Los objetivos no modifican la referencia: definen el rango deseado para un contexto. Podés crear una regla general por MD y luego excepciones por objetivo físico, posición o jugador." />
        {isAdmin && <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-white">{editingRuleId ? "Editar objetivo" : "Agregar objetivo"}</p><p className="text-[10px] text-zinc-600">Dejá un campo vacío para que la regla sea más general.</p></div>{editingRuleId && <button onClick={resetRuleDraft} className="text-xs font-bold text-zinc-500 hover:text-white">Cancelar edición</button>}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="MD"><select value={ruleDraft.md_code} onChange={(e) => setRuleDraft((r) => ({ ...r, md_code: e.target.value }))} className={INPUT}>{MD_CODES.map((md) => <option key={md || "all"} value={md}>{md || "Cualquier MD"}</option>)}</select></Field>
          <Field label="Objetivo físico"><select value={ruleDraft.physical_objective} onChange={(e) => setRuleDraft((r) => ({ ...r, physical_objective: e.target.value }))} className={INPUT}><option value="">Cualquier objetivo</option>{physicalObjectives.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Posición"><select value={ruleDraft.position} onChange={(e) => setRuleDraft((r) => ({ ...r, position: e.target.value }))} className={INPUT}><option value="">Cualquier posición</option>{positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></Field>
          <Field label="Jugador"><select value={ruleDraft.player_id} onChange={(e) => setRuleDraft((r) => ({ ...r, player_id: e.target.value }))} className={INPUT}><option value="">Todo el grupo</option>{players.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}</select></Field>
          <Field label="Métrica"><select value={ruleDraft.metric_key} onChange={(e) => setRuleDraft((r) => ({ ...r, metric_key: e.target.value }))} className={INPUT}>{REPORT_METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></Field>
          <Field label="Referencia para esta regla"><select value={ruleDraft.reference_type_override} onChange={(e) => setRuleDraft((r) => ({ ...r, reference_type_override: e.target.value }))} className={INPUT}><option value="">Heredar configuración</option>{GPS_REFERENCE_TYPES.filter((item) => item.id !== "none").map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></Field>
          <Field label="Objetivo mínimo %"><input type="number" step="any" value={ruleDraft.target_min_pct} onChange={(e) => setRuleDraft((r) => ({ ...r, target_min_pct: e.target.value }))} className={INPUT} placeholder="ej: 60" /></Field>
          <Field label="Objetivo máximo %"><input type="number" step="any" value={ruleDraft.target_max_pct} onChange={(e) => setRuleDraft((r) => ({ ...r, target_max_pct: e.target.value }))} className={INPUT} placeholder="ej: 75" /></Field>
          <Field label="Mínimo absoluto"><input type="number" step="any" value={ruleDraft.target_min_value} onChange={(e) => setRuleDraft((r) => ({ ...r, target_min_value: e.target.value }))} className={INPUT} placeholder={metricMap[ruleDraft.metric_key]?.unit || "opcional"} /></Field>
          <Field label="Máximo absoluto"><input type="number" step="any" value={ruleDraft.target_max_value} onChange={(e) => setRuleDraft((r) => ({ ...r, target_max_value: e.target.value }))} className={INPUT} placeholder={metricMap[ruleDraft.metric_key]?.unit || "opcional"} /></Field>
        </div><Field label="Notas / criterio metodológico"><textarea rows={2} value={ruleDraft.notes} onChange={(e) => setRuleDraft((r) => ({ ...r, notes: e.target.value }))} className={`${INPUT} mt-3 resize-none`} placeholder="Por qué este objetivo se usa en este contexto…" /></Field><div className="mt-3 flex justify-end"><button onClick={saveRule} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500"><Plus size={14} />{editingRuleId ? "Guardar cambios" : "Agregar objetivo"}</button></div></div>}
        <div className="space-y-2">{rules.length ? rules.map((rule) => <div key={rule.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-bold text-white">{metricMap[rule.metric_key]?.label || rule.metric_key}</span>{rule.md_code && <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">{rule.md_code}</span>}{rule.physical_objective && <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300">{rule.physical_objective}</span>}{rule.position && <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">{rule.position}</span>}{rule.player_name && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">{rule.player_name}</span>}</div><p className="mt-2 text-xs text-zinc-400">{rule.target_min_pct != null || rule.target_max_pct != null ? `Objetivo ${rule.target_min_pct ?? "—"}–${rule.target_max_pct ?? "—"}% de referencia` : rule.target_min_value != null || rule.target_max_value != null ? `Objetivo absoluto ${rule.target_min_value ?? "—"}–${rule.target_max_value ?? "—"}` : "Sin rango: referencia/contexto solamente"}{rule.reference_type_override ? ` · ${referenceTypeLabel(rule.reference_type_override)}` : " · hereda referencia"}</p>{rule.notes && <p className="mt-1 text-[10px] text-zinc-600">{rule.notes}</p>}</div>{isAdmin && <div className="flex shrink-0 gap-2"><button onClick={() => editRule(rule)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white">Editar</button><button onClick={() => removeRule(rule.id)} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button></div>}</div>) : <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center"><p className="text-sm font-semibold text-zinc-400">Todavía no hay objetivos definidos.</p><p className="mt-1 text-xs text-zinc-600">Esto es válido: las referencias pueden usarse de forma informativa sin imponer porcentajes universales.</p></div>}</div>
      </div>}

      {tab === "definitions" && <div className="space-y-4" data-tour="gps-ref-thresholds">
        <SectionIntro title="Cómo se define cada zona" text="Estos valores documentan la metodología del club. Si el proveedor exporta zonas fijas, PerformancePitch interpreta esas columnas según esta definición; una zona relativa a Smax requiere que el adaptador/proveedor entregue o permita recalcular esa información." />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-sm font-black text-white">HSR / alta velocidad</p><div className="mt-3 grid grid-cols-2 gap-2"><Field label="Desde km/h"><input disabled={!isAdmin} type="number" step="0.1" value={config.threshold_definitions?.hsr?.min_kmh ?? 19.8} onChange={(e) => patchThreshold("hsr", { min_kmh: Number(e.target.value), mode: "absolute" })} className={INPUT} /></Field><Field label="Hasta km/h"><input disabled={!isAdmin} type="number" step="0.1" value={config.threshold_definitions?.hsr?.max_kmh ?? 25} onChange={(e) => patchThreshold("hsr", { max_kmh: Number(e.target.value), mode: "absolute" })} className={INPUT} /></Field></div></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-sm font-black text-white">Sprint</p><Field label="Desde km/h"><input disabled={!isAdmin} type="number" step="0.1" value={config.threshold_definitions?.sprint?.min_kmh ?? 25} onChange={(e) => patchThreshold("sprint", { min_kmh: Number(e.target.value), mode: "absolute" })} className={`${INPUT} mt-3`} /></Field></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-sm font-black text-white">Aceleraciones</p><Field label="Umbral m/s²"><input disabled={!isAdmin} type="number" step="0.1" value={config.threshold_definitions?.acceleration?.threshold_ms2 ?? 3} onChange={(e) => patchThreshold("acceleration", { threshold_ms2: Number(e.target.value), mode: "absolute" })} className={`${INPUT} mt-3`} /></Field></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-sm font-black text-white">Desaceleraciones</p><Field label="Umbral m/s²"><input disabled={!isAdmin} type="number" step="0.1" value={config.threshold_definitions?.deceleration?.threshold_ms2 ?? -3} onChange={(e) => patchThreshold("deceleration", { threshold_ms2: Number(e.target.value), mode: "absolute" })} className={`${INPUT} mt-3`} /></Field></div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-xs leading-5 text-zinc-400"><strong className="text-amber-200">Importante:</strong> cambiar esta definición no transforma retroactivamente una columna del CSV. La definición debe coincidir con el proveedor o con el método de normalización. Más adelante los adaptadores GPS podrán recalcular zonas relativas cuando la fuente tenga datos crudos suficientes.</div>
      </div>}

      {isAdmin && <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-800 pt-4"><button onClick={() => setConfig(normalizeGpsReferenceConfig(null, { squad_id: squadId, squad_name: squadName, season_id: seasonId }))} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white"><RotateCcw size={13} />Restaurar perfil híbrido</button><button onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500 disabled:opacity-50"><Settings2 size={14} />{saving ? "Guardando…" : "Guardar configuración"}</button></div>}
    </div>
  );
}
