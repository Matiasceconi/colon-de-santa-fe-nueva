import React, { useState } from "react";
import { Trophy, Target, Activity, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import NextMatchCard from "@/components/club/NextMatchCard";
import TodayMatchAlert from "@/components/club/TodayMatchAlert";
import LastResults from "@/components/club/LastResults";
import CalendarDates from "@/components/club/CalendarDates";
import ClubStandingsTable from "@/components/club/ClubStandingsTable";
import ScorersTable from "@/components/club/ScorersTable";
import StandingsFilters from "@/components/club/StandingsFilters";
import FixturesSection from "@/components/club/FixturesSection";
import NextYouthMatch from "@/components/club/NextYouthMatch";
import YouthCategorySelector from "@/components/club/YouthCategorySelector";
import YouthStandingsTable from "@/components/club/YouthStandingsTable";

function StatTile({ icon: Icon, label, value, accent, tone }) {
  const borderCls = tone === "pos" ? "border-emerald-500/30" : tone === "neg" ? "border-red-500/30" : "border-zinc-800";
  return (
    <div className={`bg-zinc-900 border ${borderCls} rounded-xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function StatTilesWidget() {
  const { dyhRow } = useDashboardData();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile icon={Trophy} label="Posición" value={dyhRow ? `${dyhRow.position}°` : "—"} accent="bg-emerald-500/15 text-emerald-400" tone={dyhRow?.position <= 4 ? "pos" : dyhRow?.position > 16 ? "neg" : undefined} />
      <StatTile icon={Target} label="Puntos" value={dyhRow?.points ?? "—"} accent="bg-yellow-500/15 text-yellow-400" />
      <StatTile icon={Activity} label="Partidos Jugados" value={dyhRow?.played ?? "—"} accent="bg-blue-500/15 text-blue-400" />
      <StatTile icon={TrendingUp} label="Gol Diferencia" value={dyhRow ? (dyhRow.goalDifference > 0 ? `+${dyhRow.goalDifference}` : dyhRow.goalDifference) : "—"} accent="bg-purple-500/15 text-purple-400" tone={dyhRow?.goalDifference > 0 ? "pos" : dyhRow?.goalDifference < 0 ? "neg" : undefined} />
    </div>
  );
}

export function NextMatchWidget({ widget }) {
  const { nextMatchReserva, nextMatchPrimera } = useDashboardData();
  const division = widget.config?.division || "reserva";
  if (division === "primera") {
    return <NextMatchCard fixture={nextMatchPrimera} title="Próximo Partido — Primera" badgeText="Liga Profesional" badgeClass="bg-blue-500/15 text-blue-300 border-blue-500/30" iconClass="text-blue-400" />;
  }
  return <NextMatchCard fixture={nextMatchReserva} title="Próximo Partido — Reserva" badgeText="Proyección" badgeClass="bg-emerald-500/15 text-emerald-300 border-emerald-500/30" iconClass="text-emerald-400" />;
}

export function StandingsWidget() {
  const { filteredStandings, teamName, activeDivision, setActiveDivision, tournaments, zones, activeTournament, setActiveTournament, activeZone, setActiveZone, activeYouthCategory, setActiveYouthCategory } = useDashboardData();
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Trophy size={18} className="text-emerald-400" /> Tabla de Clasificación</h2>
        <StandingsFilters
          activeDivision={activeDivision}
          onDivision={setActiveDivision}
          tournaments={tournaments}
          zones={zones}
          activeTournament={activeTournament}
          activeZone={activeZone}
          onTournament={setActiveTournament}
          onZone={setActiveZone}
        />
      </div>
      {activeDivision === "juveniles" ? (
        <div className="space-y-3">
          <YouthCategorySelector activeCategory={activeYouthCategory} onCategory={setActiveYouthCategory} />
          <YouthStandingsTable category={activeYouthCategory} highlightTeam={teamName} />
        </div>
      ) : !filteredStandings.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <Trophy size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm font-medium">Tabla no disponible para esta categoría</p>
        </div>
      ) : (
        <ClubStandingsTable standings={filteredStandings} highlightTeam={teamName} />
      )}
    </div>
  );
}

export function ScorersWidget({ widget }) {
  const { scorersProyeccion, scorersLiga, teamName } = useDashboardData();
  const scorerType = widget.config?.scorerType || "proyeccion";
  if (scorerType === "liga") {
    return <ScorersTable scorers={scorersLiga} title="Goleadores — Liga Profesional" accent="blue" type="liga" highlightTeam={teamName} showPhoto />;
  }
  return <ScorersTable scorers={scorersProyeccion} title="Goleadores — Proyección Clausura" accent="green" type="proyeccion" highlightTeam={teamName} />;
}

export function LastResultsWidget({ widget }) {
  const { reservaClausuraFixtures, primeraFixtures, teamName } = useDashboardData();
  const division = widget.config?.division || "reserva";
  if (division === "primera") {
    return <LastResults fixtures={primeraFixtures} teamName={teamName} title="Últimos Resultados — Primera División" accent="text-blue-400" />;
  }
  return <LastResults fixtures={reservaClausuraFixtures} teamName={teamName} title="Últimos Resultados — Reserva" accent="text-emerald-400" />;
}

export function CalendarWidget() {
  const { allFixtures, reservaCompId, teamName } = useDashboardData();
  return <CalendarDates fixtures={allFixtures.filter((f) => f.competitionId === reservaCompId)} teamName={teamName} />;
}

export function FixturesWidget() {
  return <FixturesSection />;
}

export function TodayAlertsWidget() {
  const { nextMatchReserva, nextMatchPrimera } = useDashboardData();
  return (
    <div className="space-y-3">
      <TodayMatchAlert fixture={nextMatchReserva} title="Reserva — Proyección" />
      <TodayMatchAlert fixture={nextMatchPrimera} title="Primera División — Liga Profesional" />
    </div>
  );
}

export function NextYouthWidget() {
  return <NextYouthMatch />;
}

export function YouthStandingsWidget({ widget, onConfigChange }) {
  const { teamName, internalCompetitions } = useDashboardData();
  const [category, setCategory] = useState(widget.config?.category || "4ta");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const youthComp = (internalCompetitions || []).find((c) => c.division === "juveniles" && c.provider_competition_id);
  const leagueId = youthComp?.provider_competition_id || null;

  function handleCategory(cat) {
    setCategory(cat);
    if (onConfigChange) onConfigChange({ ...widget.config, category: cat });
  }

  async function handleSync() {
    if (!leagueId) {
      setSyncMsg({ type: "error", text: "Vinculá la competencia juvenil a una liga de API-Football desde Admin → API de Fútbol." });
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await base44.functions.invoke("footballApi", { action: "syncYouthStandings", league_id: leagueId });
      const data = res.data || res;
      if (data?.error) throw new Error(data.error);
      setSyncMsg({ type: "ok", text: `Sincronizado: ${data.saved || 0} registros en ${data.categories?.length || 0} categorías.` });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setSyncMsg({ type: "error", text: e?.message || "Error al sincronizar" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Trophy size={18} className="text-emerald-400" /> Tabla de Juveniles</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>
      <div className="space-y-3">
        <YouthCategorySelector activeCategory={category} onCategory={handleCategory} />
        {syncMsg && (
          <div className={`rounded-lg p-2.5 text-xs ${syncMsg.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
            {syncMsg.text}
          </div>
        )}
        <YouthStandingsTable key={refreshKey} category={category} highlightTeam={teamName} />
      </div>
    </div>
  );
}