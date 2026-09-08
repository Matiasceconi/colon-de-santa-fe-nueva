import React, { useMemo, useState } from "react";
import moment from "moment";
import { FilePenLine, Pencil, Plus, Search, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import NutritionAssessmentEditModal from "@/components/nutrition/NutritionAssessmentEditModal";
import NutritionManualEntryModal from "@/components/nutrition/NutritionManualEntryModal";
import NutritionManualReadingModal from "@/components/nutrition/NutritionManualReadingModal";
import ReadingStatusBadge from "@/components/nutrition/ReadingStatusBadge";

function playerName(player) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador";
}

function fmt(value, decimals = 1) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(decimals) : value;
}

function originMeta(row) {
  if (row.source === "app" && row.source_file_id) return { label: "Integrado + ajuste manual", cls: "border-amber-500/25 bg-amber-500/10 text-amber-300" };
  if (row.source === "app") return { label: "Manual", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" };
  return { label: "Integrado", cls: "border-blue-500/25 bg-blue-500/10 text-blue-300" };
}

export default function NutritionManualSheet({ players = [], assessments = [], interpretations = [], readingStatuses = [], activeSquad, onReload }) {
  const { can } = useWorkspace();
  const canCreate = can("create", "/performance/nutrition");
  const canEdit = can("edit", "/performance/nutrition");
  const canManageReading = canEdit || canCreate;
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [readingAssessment, setReadingAssessment] = useState(null);

  const playerMap = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player])), [players]);
  const statusMap = useMemo(() => Object.fromEntries(readingStatuses.map((status) => [status.id, status])), [readingStatuses]);
  const interpretationByAssessment = useMemo(() => {
    const map = {};
    interpretations.forEach((reading) => {
      if (reading.nutrition_assessment_id) map[reading.nutrition_assessment_id] = reading;
      if (reading.nutrition_assessment_key) map[reading.nutrition_assessment_key] = reading;
    });
    return map;
  }, [interpretations]);

  const rows = useMemo(() => assessments
    .filter((row) => row.player_id && row.linked !== false)
    .filter((row) => {
      const player = playerMap[row.player_id];
      const name = playerName(player) || row.player_name_original || "";
      if (query && !name.toLowerCase().includes(query.toLowerCase())) return false;
      if (dateFilter && row.fecha !== dateFilter) return false;
      if (sourceFilter === "manual" && row.source !== "app") return false;
      if (sourceFilter === "integrated" && row.source === "app") return false;
      return true;
    })
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")) || String(a.player_name_original || "").localeCompare(String(b.player_name_original || ""))), [assessments, playerMap, query, dateFilter, sourceFilter]);

  const readingFor = (assessment) => interpretationByAssessment[assessment.id] || interpretationByAssessment[assessment.nutrition_assessment_key] || null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300"><FilePenLine size={16} /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Planilla dentro del sistema</span></div>
            <h2 className="mt-2 text-xl font-bold text-white">Carga y edición manual de Nutrición</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">La integración existente se mantiene, pero el nutricionista puede crear y corregir controles directamente en PerformancePitch. Los registros manuales alimentan los mismos gráficos, evoluciones e informes.</p>
          </div>
          {canCreate && <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-zinc-900 hover:bg-zinc-200"><Plus size={15} /> Nuevo control</button>}
        </div>
      </section>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador..." className="h-10 border-zinc-700 bg-zinc-950 pl-9 text-white" /></div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 w-full border-zinc-700 bg-zinc-950 text-white md:w-44" />
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-300 outline-none md:w-52"><option value="all">Todos los orígenes</option><option value="manual">Manual / ajustado</option><option value="integrated">Solo integración</option></select>
          {(query || dateFilter || sourceFilter !== "all") && <button onClick={() => { setQuery(""); setDateFilter(""); setSourceFilter("all"); }} className="h-10 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-400 hover:text-white">Limpiar</button>}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-3"><p className="text-sm font-bold text-white">Planilla nutricional</p><p className="mt-0.5 text-xs text-zinc-600">{rows.length} controles visibles · {activeSquad?.name || "Plantel"}</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1750px] w-full text-xs">
            <thead className="bg-zinc-950/60 text-left text-[10px] uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="p-3">Jugador</th><th className="p-3">Fecha</th><th className="p-3">Talla</th><th className="p-3">Peso</th>
                <th className="p-3">Tríceps</th><th className="p-3">Subesc.</th><th className="p-3">Supraesp.</th><th className="p-3">Abdominal</th><th className="p-3">Muslo</th><th className="p-3">Pantorrilla</th><th className="p-3">6P</th>
                <th className="p-3">IMO</th><th className="p-3">% MM</th><th className="p-3">Kg MM</th><th className="p-3">% Grasa</th><th className="p-3">Kg grasa</th><th className="p-3">Lectura</th><th className="p-3">Origen</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const player = playerMap[row.player_id];
                const reading = readingFor(row);
                const origin = originMeta(row);
                return <tr key={row.id} className="border-t border-zinc-800/70 hover:bg-zinc-800/25">
                  <td className="p-3"><div className="flex items-center gap-2"><PlayerPhoto player={player || { full_name: row.player_name_original }} className="h-8 w-8 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" /><div><p className="font-semibold text-zinc-200">{playerName(player) || row.player_name_original}</p><p className="text-[10px] text-zinc-600">{player?.position || row.categoria_division || ""}</p></div></div></td>
                  <td className="p-3 text-zinc-400">{row.fecha ? moment(row.fecha).format("DD/MM/YYYY") : "—"}</td>
                  <td className="p-3 text-zinc-300">{fmt(row.talla)}</td><td className="p-3 font-semibold text-white">{fmt(row.peso)}</td>
                  <td className="p-3 text-zinc-400">{fmt(row.triceps)}</td><td className="p-3 text-zinc-400">{fmt(row.subescapular)}</td><td className="p-3 text-zinc-400">{fmt(row.supraespinal)}</td><td className="p-3 text-zinc-400">{fmt(row.abdominal)}</td><td className="p-3 text-zinc-400">{fmt(row.muslo)}</td><td className="p-3 text-zinc-400">{fmt(row.pantorrilla)}</td><td className="p-3 font-semibold text-orange-300">{fmt(row.sumatoria_6p)}</td>
                  <td className="p-3 text-emerald-300">{fmt(row.imo, 2)}</td><td className="p-3 text-zinc-300">{fmt(row.porcentaje_masa_muscular)}</td><td className="p-3 text-zinc-300">{fmt(row.kg_masa_muscular)}</td><td className="p-3 text-pink-300">{fmt(row.porcentaje_grasa)}</td><td className="p-3 text-zinc-300">{fmt(row.kg_grasa)}</td>
                  <td className="p-3">{reading?.reading_status_id ? <ReadingStatusBadge statusId={reading.reading_status_id} statusMap={statusMap} /> : <span className="text-zinc-700">Sin lectura</span>}</td>
                  <td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${origin.cls}`}>{origin.label}</span>{row.edited_at && <p className="mt-1 text-[9px] text-zinc-700">{moment(row.edited_at).format("DD/MM HH:mm")}</p>}</td>
                  <td className="p-3"><div className="flex items-center gap-1.5">{canEdit && <button onClick={() => setEditing(row)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white" title="Editar medición"><Pencil size={13} /></button>}{canManageReading && <button onClick={() => setReadingAssessment(row)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-emerald-300" title="Lectura nutricional"><Stethoscope size={13} /></button>}</div></td>
                </tr>;
              })}
              {!rows.length && <tr><td colSpan={19} className="p-12 text-center text-sm text-zinc-600">No hay controles con los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {creating && <NutritionManualEntryModal players={players} activeSquad={activeSquad} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); onReload(); }} />}
      {editing && <NutritionAssessmentEditModal assessment={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onReload(); }} />}
      {readingAssessment && <NutritionManualReadingModal assessment={readingAssessment} interpretation={readingFor(readingAssessment)} readingStatuses={readingStatuses} onClose={() => setReadingAssessment(null)} onSaved={() => { setReadingAssessment(null); onReload(); }} />}
    </div>
  );
}
