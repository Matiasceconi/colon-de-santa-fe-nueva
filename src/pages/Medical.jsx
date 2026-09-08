import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserCheck, LayoutDashboard } from "lucide-react";
import MedicalDashboard from "@/components/medical/MedicalDashboard";
import MedicalSheetTable from "@/components/medical/MedicalSheetTable";
import MedicalLinkRepairModal from "@/components/medical/MedicalLinkRepairModal";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";

export default function Medical() {
  const { activeSquadId } = useWorkspace();
  const [squadPlayerIds, setSquadPlayerIds] = useState(null); // null = sin filtro aún
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRepair, setShowRepair] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataSquadName, setDataSquadName] = useState("");

  // Mostrar el plantel activo si tiene historia médica; si no, usar el plantel migrado con datos.
  useEffect(() => {
    let cancelled = false;
    async function loadMedicalScope() {
      try {
        // Secuencial para evitar ráfagas que disparan el rate limit de la plataforma.
        const memberships = await base44.entities.SquadMembership.list("-created_date", 5000);
        if (cancelled) return;
        const episodes = await base44.entities.MedicalEpisode.list("-fecha_inicio_tto", 2000);
        if (cancelled) return;
        const squads = await base44.entities.Squad.list("-season", 200);
        if (cancelled) return;
        const activeMemberships = memberships.filter((member) => member.status === "activo" && !member.effective_to);
        const playersBySquad = new Map();
        activeMemberships.forEach((member) => {
          if (!playersBySquad.has(member.squad_id)) playersBySquad.set(member.squad_id, new Set());
          playersBySquad.get(member.squad_id).add(member.player_id);
        });
        const episodePlayerIds = new Set(episodes.map((episode) => episode.player_id).filter(Boolean));
        const dataCount = (squadId) => [...(playersBySquad.get(squadId) || [])].filter((playerId) => episodePlayerIds.has(playerId)).length;
        let targetSquadId = activeSquadId;
        if (!targetSquadId || dataCount(targetSquadId) === 0) {
          targetSquadId = [...playersBySquad.keys()].sort((a, b) => dataCount(b) - dataCount(a))[0] || activeSquadId;
        }
        setSquadPlayerIds(targetSquadId ? playersBySquad.get(targetSquadId) || new Set() : null);
        setDataSquadName(targetSquadId && targetSquadId !== activeSquadId ? squads.find((squad) => squad.id === targetSquadId)?.name || "" : "");
      } catch (error) {
        console.error("loadMedicalScope error:", error);
        setSquadPlayerIds(null);
      }
    }
    loadMedicalScope();
    return () => { cancelled = true; };
  }, [activeSquadId]);

  const renderTabs = () => (
    <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
      <button
        onClick={() => setActiveTab("dashboard")}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}
      >
        <LayoutDashboard size={13} /> Dashboard
      </button>
      <button
        onClick={() => setActiveTab("planilla")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "planilla" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}
      >
        Planilla Médica
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
        <strong className="text-white">Área médica híbrida:</strong> la planilla puede gestionarse manualmente dentro de PerformancePitch y, al mismo tiempo, conservar la sincronización existente con Google Sheets. Las correcciones manuales sobre registros integrados quedan protegidas frente a futuras sincronizaciones.
      </div>
      {dataSquadName && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Se muestra el historial médico disponible para <strong>{dataSquadName}</strong>.
        </div>
      )}
      <div className="flex items-center justify-between">
        {renderTabs()}
        <Button onClick={() => setShowRepair(true)} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
          <UserCheck size={15} className="mr-1.5" /> Reparar vínculos médicos
        </Button>
      </div>

      {activeTab === "dashboard" ? (
        <MedicalDashboard key={refreshKey} squadPlayerIds={squadPlayerIds} />
      ) : (
        <MedicalSheetTable key={refreshKey} squadPlayerIds={squadPlayerIds} />
      )}

      {showRepair && (
        <MedicalLinkRepairModal
          onClose={() => setShowRepair(false)}
          onRepaired={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}