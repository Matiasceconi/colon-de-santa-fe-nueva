import React, { useState } from "react";
import { Plus, Upload } from "lucide-react";
import useMinutesDashboard from "@/components/performance/minutes/useMinutesDashboard";
import MinutesFiltersRow from "@/components/performance/minutes/MinutesFiltersRow";
import MinutesSummaryCards from "@/components/performance/minutes/MinutesSummaryCards";
import MinutesPlayersTab from "@/components/performance/minutes/MinutesPlayersTab";
import MinutesMatchesTab from "@/components/performance/minutes/MinutesMatchesTab";
import ExcelMinutesImportModal from "@/components/performance/minutes/ExcelMinutesImportModal";
import YouthMinutesTab from "@/components/performance/minutes/YouthMinutesTab";
import ManualMatchMinutesModal from "@/components/performance/minutes/ManualMatchMinutesModal";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { useToast } from "@/components/ui/use-toast";
import { generateMinutesPdf } from "@/lib/reports/minutesPdf";

const SUB_TABS = [
  { id: "summary", label: "Resumen por jugador" },
  { id: "matches", label: "Detalle por partido" },
  { id: "juveniles", label: "Reserva en Juveniles" },
];

export default function MinutesSubPanel() {
  const dashboard = useMinutesDashboard();
  const {toast}=useToast();
  const { isAdmin, can, clubBrand, institutionProfile, activeSquad } = useWorkspace();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const canImport = isAdmin || can?.("edit", "/performance/minutes") || can?.("admin", "/performance/minutes");
  const canEditYouth = isAdmin || can?.("create", "/performance/minutes") || can?.("edit", "/performance/minutes") || can?.("admin", "/performance/minutes");
  const canDeleteYouth = isAdmin || can?.("delete", "/performance/minutes") || can?.("admin", "/performance/minutes");

  async function handleExport() {
    try {
    assertExportAllowed(can,"/performance/minutes");
    await generateMinutesPdf({
      ...dashboard.exportData,
      brand: clubBrand,
      institutionProfile,
      squad: activeSquad,
    });
    } catch(error) {toast({title:error.message||"No se pudo exportar el informe",variant:"destructive"});}
  }

  if (dashboard.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {canImport && dashboard.tab !== "juveniles" && (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setManualOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-yellow-400">
            <Plus size={16} /> Agregar minutos manualmente
          </button>
          <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500/20">
            <Upload size={16} /> Importar minutos desde Excel
          </button>
        </div>
      )}

      <MinutesFiltersRow
        filters={dashboard.filters}
        filtersPinned={dashboard.filtersPinned}
        updateFilter={dashboard.updateFilter}
        toggleFiltersPinned={dashboard.toggleFiltersPinned}
        resetFilters={dashboard.resetFilters}
        squadOptions={dashboard.squadOptions}
        seasonOptions={dashboard.seasonOptions}
        competitionOptions={dashboard.competitionOptions}
      />

      {dashboard.tab !== "juveniles" && (
        <MinutesSummaryCards
          availableMinutes={dashboard.availableMinutes}
          includedMatches={dashboard.filteredFinishedMatches.length}
          playersWithMinutesCount={dashboard.playersWithMinutesCount}
          pendingMatches={dashboard.pendingMatches}
          pendingOpen={pendingOpen}
          onTogglePending={() => setPendingOpen((current) => !current)}
          onExport={handleExport}
        />
      )}

      <div className="flex gap-0 border-b border-zinc-800">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => dashboard.setTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-all ${
              dashboard.tab === tab.id
                ? "border-yellow-400 text-yellow-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {dashboard.tab === "summary" && <MinutesPlayersTab rows={dashboard.playerRows} filters={dashboard.filters} updateFilter={dashboard.updateFilter} />}
      {dashboard.tab === "matches" && <MinutesMatchesTab matches={dashboard.filteredMatches} />}
      {dashboard.tab === "juveniles" && (
        <YouthMinutesTab
          rows={dashboard.youthPlayerRows}
          canEdit={canEditYouth}
          canDelete={canDeleteYouth}
          isReserveSquad={dashboard.isReserveSquad}
          squadName={dashboard.selectedSquadName}
          entrySeasonId={dashboard.youthEntrySeasonId}
          onSaved={dashboard.reload}
        />
      )}

      <ManualMatchMinutesModal open={manualOpen} onClose={() => setManualOpen(false)} matches={dashboard.filteredFinishedMatches} players={dashboard.manualPlayers} onSaved={dashboard.reload} />
      <ExcelMinutesImportModal open={importOpen} onClose={() => setImportOpen(false)} filters={dashboard.filters} onImported={dashboard.reload} />
    </div>
  );
}