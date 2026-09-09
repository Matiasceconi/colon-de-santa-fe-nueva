import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Activity, Apple, ClipboardList, Droplets, LayoutDashboard, RefreshCw, Scale, Table2, Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NutritionOverviewDashboard from "@/components/nutrition/NutritionOverviewDashboard";
import NutritionControlSheet from "@/components/nutrition/NutritionControlSheet";
import NutritionWeightMonitoring from "@/components/nutrition/NutritionWeightMonitoring";
import NutritionManualSheet from "@/components/nutrition/NutritionManualSheet";
import NutritionHydrationView from "@/components/nutrition/NutritionHydrationView";
import NutritionFoodDiaryView from "@/components/nutrition/NutritionFoodDiaryView";
import NutritionPlanManager from "@/components/nutrition/NutritionPlanManager";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";

const SOURCE_FILE_ID = "1tiZoeF9KjPyvntjBreRSsUhRsh1huMjm";
const VIEWS = [
  ["dashboard", "Resumen", LayoutDashboard],
  ["controls", "Controles", ClipboardList],
  ["weight", "Peso", Scale],
  ["anthropometry", "Antropometría", Table2],
  ["hydration", "Hidratación", Droplets],
  ["food", "Alimentación", Utensils],
  ["plans", "Planes", Apple],
];

export default function Nutrition() {
  const [assessments, setAssessments] = useState([]);
  const [interpretations, setInterpretations] = useState([]);
  const [controls, setControls] = useState([]);
  const [monitorings, setMonitorings] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [players, setPlayers] = useState([]);
  const [syncState, setSyncState] = useState(null);
  const [readingStatuses, setReadingStatuses] = useState([]);
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dataSquad, setDataSquad] = useState(null);
  const { activeSquad, activeSeasonId, can } = useWorkspace();
  const canSync = can("edit", "/performance/nutrition");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [playerRows, membershipRows, squadRows, syncRows, readingStatusRows] = await Promise.all([
        base44.entities.Player.list("full_name", 5000),
        base44.entities.SquadMembership.list("-effective_from", 5000),
        base44.entities.Squad.list("-season", 200),
        base44.entities.NutritionSyncState.filter({ source_file_id: SOURCE_FILE_ID }, "-updated_date", 5).catch(() => []),
        base44.entities.NutritionReadingStatus.list("order", 100).catch(() => []),
      ]);

      const sync = syncRows[0] || null;
      const targetSquadId = activeSquad?.id || sync?.target_squad_id;
      const visibleSquad = squadRows.find((squad) => squad.id === targetSquadId) || activeSquad || null;
      const rosterIds = new Set(membershipRows.filter((membership) => membership.squad_id === targetSquadId && membership.status === "activo" && !membership.effective_to).map((membership) => membership.player_id));
      playerRows.forEach((player) => {
        if (player.squad_id === targetSquadId && player.active !== false) rosterIds.add(player.id);
      });
      const rosterPlayers = playerRows.filter((player) => rosterIds.has(player.id) && player.active !== false);
      setDataSquad(visibleSquad);
      setPlayers(rosterPlayers);
      setSyncState(sync);
      setReadingStatuses(readingStatusRows);

      const squadFilter = targetSquadId ? { squad_id: targetSquadId } : {};
      const [assessmentRows, interpretationRows, controlRows, monitoringRows, entryRows, planRows, diaryRows] = await Promise.all([
        base44.entities.NutritionAssessment.list("-fecha", 5000),
        base44.entities.NutritionInterpretation.list("-fecha", 5000),
        base44.entities.NutritionControl.filter(squadFilter, "-control_date", 1000).catch(() => []),
        base44.entities.NutritionWeightMonitoring.filter(squadFilter, "-start_date", 500).catch(() => []),
        base44.entities.NutritionWeightEntry.filter(squadFilter, "-entry_date", 3000).catch(() => []),
        base44.entities.NutritionPlan.filter(squadFilter, "-start_date", 1000).catch(() => []),
        base44.entities.NutritionFoodDiary.filter(squadFilter, "-log_date", 1000).catch(() => []),
      ]);
      setAssessments(assessmentRows.filter((row) => rosterIds.has(row.player_id) && (!row.squad_id || row.squad_id === targetSquadId)));
      setInterpretations(interpretationRows.filter((row) => rosterIds.has(row.player_id) && (!row.squad_id || row.squad_id === targetSquadId)));
      setControls(controlRows.filter((row) => rosterIds.has(row.player_id)));
      setMonitorings(monitoringRows.filter((row) => rosterIds.has(row.player_id)));
      setWeightEntries(entryRows.filter((row) => rosterIds.has(row.player_id)));
      setPlans(planRows.filter((row) => rosterIds.has(row.player_id)));
      setDiaries(diaryRows.filter((row) => rosterIds.has(row.player_id)));
    } catch (error) {
      toast({ title: "No se pudo cargar Nutrición", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeSquad?.id, activeSeasonId, toast]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke("syncNutritionFromSheet", { force: true });
      const result = response.data || response;
      if (result?.success === false) throw new Error(result.error || "La sincronización no pudo completarse");
      await load();
      const unresolved = (result?.unresolved_assessments || 0) + (result?.unresolved_interpretations || 0);
      toast({ title: "Antropometría actualizada", description: unresolved ? `${result.rows_read || 0} mediciones procesadas · ${unresolved} sin vincular` : `${result.rows_read || 0} mediciones procesadas desde la integración externa` });
    } catch (error) {
      toast({ title: "Error de sincronización", description: error.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  const unresolvedCount = useMemo(() => {
    const result = syncState?.last_sync_result || {};
    return (result.unresolved_assessments || 0) + (result.unresolved_interpretations || 0);
  }, [syncState]);
  const squad = dataSquad || activeSquad;

  if (loading) return <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-zinc-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" /></div>;

  return <div className="min-h-[calc(100vh-64px)] space-y-5 bg-zinc-950 p-4 text-white md:p-6">
    <header className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="flex items-center gap-2 text-emerald-300"><Activity size={18}/><span className="text-xs font-semibold uppercase tracking-[0.18em]">Nutrición deportiva</span></div><h1 className="mt-2 text-3xl font-bold tracking-tight">Nutrición · {squad?.name || "Plantel"}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">Control nutricional, alimentación, peso, antropometría, hidratación y planes individuales conectados al mismo jugador {activeSeasonId ? `· Temporada ${activeSeasonId}` : ""}</p></div>
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-300">Planilla propia activa</span><span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-400">{controls.length} controles nativos</span><span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-400">{plans.filter((p)=>p.status==="active").length} planes activos</span></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4 text-xs text-zinc-500"><span>La integración externa queda como fuente opcional de antropometría histórica.</span>{syncState?.last_synced_at && <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5">Última sync: {moment(syncState.last_synced_at).format("DD/MM HH:mm")}</span>}{unresolvedCount>0&&<span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300">{unresolvedCount} sin vincular</span>}{canSync&&<button onClick={handleSync} disabled={syncing} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:text-white disabled:opacity-50"><RefreshCw size={13} className={syncing?"animate-spin":""}/>{syncing?"Actualizando...":"Actualizar antropometría"}</button>}</div>
    </header>

    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">{VIEWS.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveView(id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView===id?"bg-white text-zinc-900":"text-zinc-400 hover:text-white"}`}><Icon size={14}/>{label}</button>)}</nav>

    {activeView === "dashboard" && <NutritionOverviewDashboard players={players} controls={controls} assessments={assessments} monitorings={monitorings} weightEntries={weightEntries} plans={plans} diaries={diaries}/>} 
    {activeView === "controls" && <NutritionControlSheet players={players} controls={controls} activeSquad={squad} onReload={load}/>} 
    {activeView === "weight" && <NutritionWeightMonitoring players={players} monitorings={monitorings} weightEntries={weightEntries} activeSquad={squad} onReload={load}/>} 
    {activeView === "anthropometry" && <NutritionManualSheet players={players} assessments={assessments} interpretations={interpretations} readingStatuses={readingStatuses} activeSquad={squad} onReload={load}/>} 
    {activeView === "hydration" && <NutritionHydrationView players={players} controls={controls}/>} 
    {activeView === "food" && <NutritionFoodDiaryView players={players} diaries={diaries} activeSquad={squad} onReload={load}/>} 
    {activeView === "plans" && <NutritionPlanManager players={players} plans={plans} activeSquad={squad} onReload={load}/>} 
  </div>;
}
