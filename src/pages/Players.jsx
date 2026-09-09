import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Plus, X, Camera, Upload, BookOpen } from "lucide-react";
import * as XLSX from "xlsx";
import {
  PLAYER_COLUMNS,
  playerColumnLabels,
  playerColumnWidths,
  playerExportRowArray,
  writeControlAutoFormulas,
  extendSheetRange,
} from "@/lib/playerSpreadsheet";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlayerCard360 } from "@/components/player/PlayerCard360Context";
import { resolvePlayerType, resolvePositionGroup } from "@/components/squad/squadConstants";
import { useToast } from "@/components/ui/use-toast";
import PlayerImportDialog from "@/components/staff/PlayerImportDialog";
import PlayerPortalShareDialog from "@/components/staff/PlayerPortalShareDialog";
import PageTour, { startPageTour } from "@/components/tour/PageTour";
import { PLAYERS_TOUR } from "@/lib/pageTours";
import { playerAge, resolvePlayerCategory } from "@/components/players/playerRosterUtils";
import useInstitutionStructureOptions from "@/hooks/useInstitutionStructureOptions";
import { DEFAULT_POSITION_OPTIONS, positionGroupFromOption } from "@/lib/sportsStructure";
import RosterQuickStats from "@/components/players/RosterQuickStats";
import RosterDataQuality from "@/components/players/RosterDataQuality";
import RosterCategoryBreakdown from "@/components/players/RosterCategoryBreakdown";
import RosterDistributions from "@/components/players/RosterDistributions";
import RosterFilters from "@/components/players/RosterFilters";
import RosterViewToggle from "@/components/players/RosterViewToggle";
import PlayerRosterTable from "@/components/players/PlayerRosterTable";
import PlayerRosterGrid from "@/components/players/PlayerRosterGrid";

const STATUSES = ["Disponible", "Lesionado", "En recuperación", "Suspendido", "Permiso", "Selección", "Subio a primera", "Bajo a juveniles", "Subieron de juveniles", "Bajo de primera", "Sparring"];
const DOC_TYPES = ["DNI", "Pasaporte", "Cédula", "LC", "LE", "Otro"];
const LEGS = ["Derecha", "Izquierda", "Ambidiestro"];
const HOUSING_TYPES = ["Sin pensión", "Interna", "Externa"];
const RESIDENCE_ZONES = ["AMBA", "INTERIOR", "EXTERIOR"];
const CONTRACT_STATUSES = ["Sin información", "Con contrato", "Sin contrato"];
const EMPTY_PLAYER = { first_name: "", last_name: "", dni: "", document_type: "DNI", birth_date: "", position: "Defensor Central", dominant_leg: "", status: "Disponible", nationality: "", residence_zone: "", current_residence: "", housing_type: "", contract_status: "Sin información", full_address: "", province: "", city: "", phone_number: "", photo_url: "" };

function playerResidenceZone(player) {
  const zone = player?.residence_zone || player?.current_residence || "";
  return RESIDENCE_ZONES.includes(zone) ? zone : "";
}

function playerHousingStatus(player) {
  return player?.housing_type || "Sin información";
}

function playerContractStatus(player) {
  return player?.contract_status || (player?.has_contract === true ? "Con contrato" : "Sin información");
}

function normalizeName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function ageFromBirth(date) {
  if (!date) return "—";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function PlayerEditor({ player, onClose, onSave, positionOptions = [] }) {
  const [form, setForm] = useState(player ? {
    ...EMPTY_PLAYER,
    ...player,
    dni: player.dni || player.document_number || "",
    residence_zone: playerResidenceZone(player),
    contract_status: playerContractStatus(player),
  } : EMPTY_PLAYER);
  const [uploading, setUploading] = useState(false);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const inputCls = "mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500";

  async function uploadPhoto(file) {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setField("photo_url", file_url);
    setUploading(false);
  }

  function submit(event) {
    event.preventDefault();
    const fullName = `${form.first_name || ""} ${form.last_name || ""}`.trim();
    const payload = {
      ...form,
      // Compatibilidad temporal: residence_zone es la fuente nueva y
      // current_residence conserva la misma clasificación para pantallas legacy.
      current_residence: form.residence_zone || form.current_residence || "",
      has_contract: form.contract_status === "Con contrato",
      full_name: fullName,
      normalized_name: normalizeName(fullName),
      player_type: resolvePlayerType(form.position),
      position_group: positionGroupFromOption(form.position, positionOptions) || resolvePositionGroup(form.position),
      document_number: form.dni || "",
    };
    Object.keys(payload).forEach((key) => { if (payload[key] === "") delete payload[key]; });
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">{player ? "Editar jugador" : "Nuevo jugador"}</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
            {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-zinc-600" />}
          </div>
          <label className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs cursor-pointer hover:bg-zinc-700">
            {uploading ? "Subiendo..." : "Subir foto"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">Nombre *<input required value={form.first_name || ""} onChange={(e) => setField("first_name", e.target.value)} className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Apellido *<input required value={form.last_name || ""} onChange={(e) => setField("last_name", e.target.value)} className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Tipo de documento *<select value={form.document_type || "DNI"} onChange={(e) => setField("document_type", e.target.value)} className={inputCls}>{DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Nro. documento <span className="text-zinc-600">(acceso al portal)</span><input inputMode="numeric" placeholder="Solo números" value={form.dni || ""} onChange={(e) => setField("dni", e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Fecha de nacimiento<input type="date" value={form.birth_date || ""} onChange={(e) => setField("birth_date", e.target.value)} className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Nacionalidad<input value={form.nationality || ""} onChange={(e) => setField("nationality", e.target.value)} placeholder="Ej: Argentina" className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Zona de residencia<select value={form.residence_zone || ""} onChange={(e) => setField("residence_zone", e.target.value)} className={inputCls}><option value="">Sin información</option>{RESIDENCE_ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Tipo de pensión<select value={form.housing_type || ""} onChange={(e) => setField("housing_type", e.target.value)} className={inputCls}><option value="">Sin información</option>{HOUSING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Situación contractual<select value={form.contract_status || "Sin información"} onChange={(e) => setField("contract_status", e.target.value)} className={inputCls}>{CONTRACT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          {form.housing_type === "Sin pensión" && <label className="text-xs text-zinc-400 sm:col-span-2">Domicilio completo<input value={form.full_address || ""} onChange={(e) => setField("full_address", e.target.value)} placeholder="Calle, número, localidad y referencia" className={inputCls} /></label>}
          {form.residence_zone === "INTERIOR" && <><label className="text-xs text-zinc-400">Provincia<input value={form.province || ""} onChange={(e) => setField("province", e.target.value)} placeholder="Ej: Santa Fe" className={inputCls} /></label><label className="text-xs text-zinc-400">Ciudad<input value={form.city || ""} onChange={(e) => setField("city", e.target.value)} placeholder="Ej: Rosario" className={inputCls} /></label></>}
          <label className="text-xs text-zinc-400 sm:col-span-2">Celular del jugador<input type="tel" value={form.phone_number || ""} onChange={(e) => setField("phone_number", e.target.value)} placeholder="Ej: +54 9 11 1234-5678" className={inputCls} /></label>
          <label className="text-xs text-zinc-400">Perfil / pierna hábil<select value={form.dominant_leg || ""} onChange={(e) => setField("dominant_leg", e.target.value)} className={inputCls}><option value="">Sin especificar</option>{LEGS.map((leg) => <option key={leg} value={leg}>{leg}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Posición *<select value={form.position || "Defensor Central"} onChange={(e) => setField("position", e.target.value)} className={inputCls}>{[...new Set([...(positionOptions.length ? positionOptions.map((item) => item.label) : DEFAULT_POSITION_OPTIONS), form.position].filter(Boolean))].map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Estado<select value={form.status || "Disponible"} onChange={(e) => setField("status", e.target.value)} className={inputCls}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Cancelar</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-white text-zinc-900 font-semibold text-sm">Guardar</button>
        </div>
      </form>
    </div>
  );
}

export default function Players() {
  const { mySquads, activeSquadId, activeSquadName, can, canSeePath, isAdmin, clubBrand } = useWorkspace();
  const { openCard } = usePlayerCard360();
  const { positionOptions } = useInstitutionStructureOptions();
  const { toast } = useToast();
  const [players, setPlayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [legFilter, setLegFilter] = useState("all");
  const [housingFilter, setHousingFilter] = useState("all");
  const [residenceFilter, setResidenceFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [birthYearFilter, setBirthYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageMode, setAgeMode] = useState("exact");
  const [ageValue, setAgeValue] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [sharePlayer, setSharePlayer] = useState(null);

  const canCreate = can("create", "/players");
  const canEdit = can("edit", "/players");
  const canDelete = can("delete", "/players");
  const canExport = can("export", "/players");
  const allowedSquadIds = useMemo(() => new Set(mySquads.map((squad) => squad.id)), [mySquads]);
  const squadNameById = useMemo(() => Object.fromEntries(mySquads.map((squad) => [squad.id, squad.name])), [mySquads]);

  const [nutritionLatest, setNutritionLatest] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [playerRows, membershipRows, assessmentRows] = await Promise.all([
      base44.entities.Player.list("last_name", 1000),
      base44.entities.SquadMembership.list("-effective_from", 1000),
      base44.entities.NutritionAssessment.list("-fecha", 1000),
    ]);
    setPlayers(playerRows);
    setMemberships(membershipRows.filter((membership) => !membership.effective_to && membership.status !== "fuera_del_plantel" && membership.status !== "inactivo"));
    // Última evaluación nutricional por jugador (peso y talla automáticos)
    const latest = {};
    assessmentRows.filter((a) => a.linked && a.player_id).forEach((a) => {
      const current = latest[a.player_id];
      if (!current || (a.fecha || "") > (current.fecha || "" || "")) latest[a.player_id] = a;
    });
    setNutritionLatest(latest);
    setLoading(false);
  }

  function currentMembership(player) {
    return memberships.find((membership) => membership.player_id === player.id) || null;
  }

  const rosterRows = useMemo(() => players.map((player) => {
    const membership = currentMembership(player);
    const category = resolvePlayerCategory(player, membership, mySquads);
    const nutrition = nutritionLatest[player.id];
    const height = nutrition?.talla ?? player.height;
    const weight = nutrition?.peso ?? player.weight;
    return { player, membership, categoryId: category.id, categoryName: category.name, age: playerAge(player.birth_date), birthYear: player.birth_date?.slice(0, 4) || "", height, weight, nutritionDate: nutrition?.fecha };
  }).filter(({ membership, categoryId }) => {
    const fallbackAllowed = !membership && allowedSquadIds.has(categoryId);
    return isAdmin || allowedSquadIds.has(membership?.squad_id) || fallbackAllowed;
  }), [players, memberships, mySquads, allowedSquadIds, isAdmin, nutritionLatest]);

  const categoryRows = useMemo(() => rosterRows.filter((row) => squadFilter === "all" || row.categoryId === squadFilter), [rosterRows, squadFilter]);
  const visibleRows = useMemo(() => categoryRows.filter(({ player, age, birthYear }) => {
    if (positionFilter !== "all" && player.position !== positionFilter) return false;
    if (legFilter !== "all" && (player.dominant_leg || "Sin información") !== legFilter) return false;
    if (housingFilter === "Con pensión" && !["Interna", "Externa"].includes(playerHousingStatus(player))) return false;
    if (housingFilter !== "all" && housingFilter !== "Con pensión" && playerHousingStatus(player) !== housingFilter) return false;
    if (residenceFilter !== "all" && (playerResidenceZone(player) || "Sin información") !== residenceFilter) return false;
    if (contractFilter !== "all" && playerContractStatus(player) !== contractFilter) return false;
    if (birthYearFilter !== "all" && birthYear !== birthYearFilter) return false;
    if (statusFilter !== "all" && player.status !== statusFilter) return false;
    if (ageValue && (age === null || (ageMode === "exact" && age !== Number(ageValue)) || (ageMode === "under" && age >= Number(ageValue)) || (ageMode === "over" && age <= Number(ageValue)))) return false;
    if (search && !normalizeName(`${player.first_name || ""} ${player.last_name || ""} ${player.full_name || ""}`).includes(normalizeName(search))) return false;
    return true;
  }), [categoryRows, positionFilter, legFilter, housingFilter, residenceFilter, contractFilter, birthYearFilter, statusFilter, ageValue, ageMode, search]);
  const visiblePlayers = visibleRows.map((row) => row.player);

  const filterOptions = useMemo(() => ({
    categories: Array.from(new Map(rosterRows.map((row) => [row.categoryId, { id: row.categoryId, name: row.categoryName }])).values()).sort((a, b) => a.name.localeCompare(b.name)),
    positions: [...new Set(rosterRows.map((row) => row.player.position).filter(Boolean))].sort(),
    legs: [...new Set([...rosterRows.map((row) => row.player.dominant_leg || "Sin información"), "Sin información"])].sort(),
    housingTypes: ["Con pensión", ...new Set([...rosterRows.map((row) => playerHousingStatus(row.player)), "Sin información"])].filter((value, index, array) => array.indexOf(value) === index),
    residenceZones: [...new Set([...rosterRows.map((row) => playerResidenceZone(row.player) || "Sin información"), "Sin información"])].sort(),
    contractStatuses: CONTRACT_STATUSES,
    years: [...new Set(rosterRows.map((row) => row.birthYear).filter(Boolean))].sort((a, b) => b - a),
    statuses: [...new Set(rosterRows.map((row) => row.player.status).filter(Boolean))].sort(),
  }), [rosterRows]);

  function clearDetailFilters() {
    setSearch(""); setPositionFilter("all"); setLegFilter("all"); setHousingFilter("all"); setResidenceFilter("all"); setContractFilter("all"); setBirthYearFilter("all"); setStatusFilter("all"); setAgeValue(""); setAgeMode("exact");
  }

  function changeFilter(key, value) {
    const setters = { search: setSearch, category: setSquadFilter, position: setPositionFilter, leg: setLegFilter, housing: setHousingFilter, residence: setResidenceFilter, contract: setContractFilter, birthYear: setBirthYearFilter, status: setStatusFilter, ageMode: setAgeMode, ageValue: setAgeValue };
    setters[key]?.(value);
  }

  async function savePlayer(data) {
    const dni = String(data.dni || data.document_number || "").replace(/\D/g, "");
    const duplicate = players.find((player) => {
      const existingDni = String(player.dni || player.document_number || "").replace(/\D/g, "");
      return dni && existingDni === dni && player.id !== editing?.id;
    });
    if (duplicate) {
      toast({ title: "Ya existe un jugador con ese DNI", variant: "destructive" });
      return;
    }
    const normalizedData = { ...data, dni, document_number: dni };
    if (!dni) {
      delete normalizedData.dni;
      delete normalizedData.document_number;
    }
    let savedPlayer;
    const isNewPlayer = !editing?.id;
    const targetSquadId = squadFilter !== "all" ? squadFilter : activeSquadId;
    const targetSquadName = squadNameById[targetSquadId] || activeSquadName || data.division || "";
    if (isNewPlayer && !targetSquadId) {
      toast({ title: "Seleccioná un plantel antes de crear al jugador", variant: "destructive" });
      return;
    }
    if (editing?.id) savedPlayer = await base44.entities.Player.update(editing.id, normalizedData);
    else {
      savedPlayer = await base44.entities.Player.create({ ...normalizedData, division: targetSquadName, squad_id: targetSquadId, squad_name: targetSquadName });
      await base44.entities.SquadMembership.create({ player_id: savedPlayer.id, player_name: savedPlayer.full_name || `${savedPlayer.first_name || ""} ${savedPlayer.last_name || ""}`.trim(), squad_id: targetSquadId, squad_name: targetSquadName, status: "activo", effective_from: new Date().toISOString().slice(0, 10) });
    }
    setEditing(null);
    await load();
    toast({ title: isNewPlayer ? "Jugador creado" : "Jugador actualizado" });
    if (isNewPlayer) setSharePlayer(savedPlayer);
  }

  async function deletePlayer(player) {
    if (!window.confirm(`¿Eliminar a ${player.full_name || player.first_name}? Esta acción no se puede deshacer.`)) return;
    await base44.entities.SquadMembership.deleteMany({ player_id: player.id });
    await base44.entities.Player.delete(player.id);
    await load();
    toast({ title: "Jugador eliminado" });
  }

  function exportXlsx() {
    // Mismo layout de columnas que la plantilla de importación: el archivo
    // exportado se puede editar y reimportar directamente para actualizar
    // a estos mismos jugadores (por DNI o nombre), sin perder su estado real.
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = visibleRows.map(({ player, membership }) => playerExportRowArray(player, membership?.squad_name || player.division || ""));
    const lastCol = PLAYER_COLUMNS.length - 1;
    const aoa = [
      [`${clubBrand?.name || "Club"} · Exportación de jugadores · ${todayStr} · ${rows.length} jugadores`],
      playerColumnLabels(),
      ...rows,
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet["!cols"] = playerColumnWidths();
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    if (rows.length > 0) {
      writeControlAutoFormulas(sheet, 3, 2 + rows.length);
      extendSheetRange(sheet, 2 + rows.length, lastCol);
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Carga de jugadores");
    XLSX.writeFile(workbook, `jugadores_${todayStr}.xlsx`);
  }

  if (!canSeePath("/players")) return <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">No tenés permiso para ver Jugadores.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Base de Jugadores</h1>
          <p className="text-zinc-500 text-sm mt-1">Módulo operativo independiente · {visiblePlayers.length} jugadores visibles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <button onClick={startPageTour} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800"><BookOpen size={15} /> Guía interactiva</button>}
          {canExport && <button onClick={exportXlsx} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800"><Download size={15} /> Exportar Excel</button>}
          {canCreate && <button data-tour="players-import" onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-500"><Upload size={15} /> Importar Excel</button>}
          {canCreate && <button data-tour="players-new" onClick={() => setEditing({})} className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200"><Plus size={15} /> Nuevo jugador</button>}
        </div>
      </div>

      <RosterQuickStats
        rows={categoryRows}
        legFilter={legFilter}
        housingFilter={housingFilter}
        residenceFilter={residenceFilter}
        contractFilter={contractFilter}
        onLeg={setLegFilter}
        onHousing={setHousingFilter}
        onResidence={setResidenceFilter}
        onContract={setContractFilter}
        onReset={clearDetailFilters}
      />
      <RosterDataQuality rows={categoryRows} onLeg={setLegFilter} onResidence={setResidenceFilter} onHousing={setHousingFilter} onContract={setContractFilter} />
      <RosterCategoryBreakdown rows={squadFilter === "all" ? rosterRows : categoryRows} selected={squadFilter} onSelect={setSquadFilter} />
      <RosterDistributions rows={categoryRows} positionFilter={positionFilter} birthYearFilter={birthYearFilter} onPosition={setPositionFilter} onBirthYear={setBirthYearFilter} />
      <RosterFilters
        filters={{ search, category: squadFilter, position: positionFilter, leg: legFilter, housing: housingFilter, residence: residenceFilter, contract: contractFilter, birthYear: birthYearFilter, status: statusFilter, ageMode, ageValue }}
        options={filterOptions}
        onChange={changeFilter}
        onClear={() => { setSquadFilter("all"); clearDetailFilters(); }}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-300"><span className="text-white">{visibleRows.length}</span> {visibleRows.length === 1 ? "jugador encontrado" : "jugadores encontrados"}</p>
        <RosterViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "table" ? (
        <PlayerRosterTable rows={visibleRows} onOpen={openCard} onShare={setSharePlayer} onEdit={setEditing} onDelete={deletePlayer} canEdit={canEdit} canDelete={canDelete} />
      ) : (
        <PlayerRosterGrid rows={visibleRows} onOpen={openCard} onEdit={setEditing} canEdit={canEdit} />
      )}

      {editing && <PlayerEditor player={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={savePlayer} positionOptions={positionOptions} />}
      <PlayerImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={load}
        squads={mySquads}
        defaultSquadId={squadFilter !== "all" ? squadFilter : (activeSquadId || "")}
        clubName={clubBrand?.name || "Club"}
      />
      {sharePlayer && <PlayerPortalShareDialog player={sharePlayer} onClose={() => setSharePlayer(null)} />}
      <PageTour pageKey="players-creation-v2" steps={PLAYERS_TOUR} autoStart={isAdmin && players.length === 0} />
    </div>
  );
}