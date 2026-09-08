import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import {
  getPlayerName,
  getPlayerNumber,
  getPlayerSquadLabel,
  loadMatchCallupState,
  saveMatchCallups,
  normalizeText,
  isUnavailableStatus,
  getPositionGroup,
} from "@/lib/matchCallupUtils";
import { buildFormationSlots, compatibilityScore } from "@/components/matches/tabs/formationSlots";
import {
  Search,
  X,
  Plus,
  UserPlus,
  ChevronDown,
  Save,
  RefreshCw,
  ArrowRight,
  Download,
  Crown,
  Hash,
  Move,
  FileUp,
  AlertTriangle,
} from "lucide-react";
import MatchFormationExport from "@/components/matches/tabs/MatchFormationExport";
import ProfessionalFormationPitch from "@/components/matches/tabs/ProfessionalFormationPitch";
import PdfFormationImporter from "@/components/matches/tabs/PdfFormationImporter";

const SYSTEMS = [
  "4-3-3", "4-2-3-1", "4-4-2", "4-1-4-1", "4-3-2-1", "4-2-2-2",
  "3-5-2", "3-4-3", "3-4-1-2", "3-4-2-1", "3-3-4", "3-2-4-1",
  "5-3-2", "5-4-1", "5-2-3", "5-2-2-1", "4-5-1", "4-4-1-1",
  "4-1-2-3", "4-1-3-2", "3-5-1-1", "3-6-1", "2-3-4-1",
];

const NUM_PLAYERS = 11;

function arrangeByPlayerProfile(playerIds, slots, playerMap) {
  const remaining = new Set(playerIds.filter(Boolean));
  const next = {};
  slots.slice(0, NUM_PLAYERS).forEach((slot, slotIndex) => {
    const ranked = Array.from(remaining)
      .map((playerId) => ({ playerId, score: compatibilityScore(playerMap.get(playerId), slot) }))
      .sort((a, b) => a.score - b.score || getPlayerName(playerMap.get(a.playerId)).localeCompare(getPlayerName(playerMap.get(b.playerId))));
    const selected = ranked[0];
    if (!selected) return;
    remaining.delete(selected.playerId);
    next[selected.playerId] = { ...slot, slotIndex, x: slot.x, y: slot.y };
  });
  return next;
}

function defaultShirtNumber(player) {
  const value = Number(getPlayerNumber(player));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export default function ConvocatoriaFormacionTab({
  match,
  players = [],
  onMatchUpdated,
  onRegisterSave,
  onCallupsUpdated,
  refreshKey = 0,
}) {
  const { toast } = useToast();
  const { clubBrand } = useWorkspace();
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [savedCallups, setSavedCallups] = useState([]);
  const [allCallups, setAllCallups] = useState([]);
  const [playerMap, setPlayerMap] = useState(new Map());
  const [system, setSystem] = useState(match.tactical_system || "4-3-3");
  const [positions, setPositions] = useState({});
  const [captainPlayerId, setCaptainPlayerId] = useState(match.captain_player_id || "");
  const [exportOpen, setExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [pdfImporterOpen, setPdfImporterOpen] = useState(false);

  const formationSlots = useMemo(() => buildFormationSlots(system), [system]);

  async function reload() {
    setLoading(true);
    try {
      const state = await loadMatchCallupState(match, players);
      const normalizedCallups = state.savedCallups.map((callup) => ({
        ...callup,
        shirt_number: callup.shirt_number ?? defaultShirtNumber(state.playerMap.get(callup.player_id)),
      }));
      setAvailablePlayers(state.availablePlayers);
      setSavedCallups(normalizedCallups);
      setAllCallups(state.allCallups);
      setPlayerMap(state.playerMap);
      setSystem(match.tactical_system || "4-3-3");

      const slots = buildFormationSlots(match.tactical_system || "4-3-3");
      const next = {};
      const usedIndices = new Set();
      const matchPositions = new Map((match.formation_positions || []).map((item) => [item.player_id, item]));

      normalizedCallups
        .filter((callup) => callup.lineup_role === "titular" && state.playerMap.has(callup.player_id))
        .slice(0, NUM_PLAYERS)
        .forEach((callup) => {
          const saved = matchPositions.get(callup.player_id);
          const x = Number(callup.formation_x ?? saved?.x);
          const y = Number(callup.formation_y ?? saved?.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          let bestIndex = -1;
          let bestDistance = Infinity;
          slots.forEach((slot, index) => {
            if (usedIndices.has(index)) return;
            const distance = Math.hypot(x - slot.x, y - slot.y);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestIndex = index;
            }
          });
          if (bestIndex >= 0) {
            usedIndices.add(bestIndex);
            next[callup.player_id] = { ...slots[bestIndex], slotIndex: bestIndex, x, y };
          }
        });

      normalizedCallups
        .filter((callup) => callup.lineup_role === "titular" && !next[callup.player_id] && state.playerMap.has(callup.player_id))
        .slice(0, NUM_PLAYERS)
        .forEach((callup) => {
          const freeIndex = Array.from({ length: NUM_PLAYERS }, (_, index) => index).find((index) => !usedIndices.has(index));
          if (freeIndex == null || !slots[freeIndex]) return;
          usedIndices.add(freeIndex);
          next[callup.player_id] = { ...slots[freeIndex], slotIndex: freeIndex };
        });

      setPositions(next);
      setCaptainPlayerId(next[match.captain_player_id] ? match.captain_player_id : "");
      setDirty(false);
    } catch (error) {
      toast({ title: error.message || "Error al cargar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [match.id, refreshKey]);

  const titularIds = Object.keys(positions);
  const calledSet = useMemo(() => new Set(savedCallups.map((callup) => callup.player_id)), [savedCallups]);
  const callupByPlayer = useMemo(
    () => Object.fromEntries(savedCallups.map((callup) => [callup.player_id, callup])),
    [savedCallups],
  );
  const convocadoIds = savedCallups
    .filter((callup) => !positions[callup.player_id] && callup.lineup_role !== "suplente")
    .map((callup) => callup.player_id);
  const suplenteIds = savedCallups
    .filter((callup) => callup.lineup_role === "suplente")
    .map((callup) => callup.player_id);
  const titulares = titularIds.map((id) => playerMap.get(id)).filter(Boolean);
  const convocados = convocadoIds.map((id) => playerMap.get(id)).filter(Boolean);
  const suplentes = suplenteIds.map((id) => playerMap.get(id)).filter(Boolean);

  function ensureCallup(playerId, role) {
    setSavedCallups((current) => {
      if (current.some((callup) => callup.player_id === playerId)) {
        return current.map((callup) => callup.player_id === playerId ? { ...callup, lineup_role: role } : callup);
      }
      const player = playerMap.get(playerId) || availablePlayers.find((item) => item.id === playerId);
      return [...current, {
        match_id: match.id,
        player_id: playerId,
        lineup_role: role,
        player_name: getPlayerName(player),
        player_number: defaultShirtNumber(player),
        shirt_number: defaultShirtNumber(player),
        status: "convocado",
        callup_status: "convocado",
      }];
    });
  }

  function clearCaptainIfNeeded(playerId) {
    if (captainPlayerId === playerId) setCaptainPlayerId("");
  }

  function moveToTitular(playerId) {
    if (positions[playerId]) return;
    const usedIndices = new Set(Object.values(positions).map((position) => position.slotIndex));
    const freeIndex = Array.from({ length: NUM_PLAYERS }, (_, index) => index).find((index) => !usedIndices.has(index));
    if (freeIndex == null || !formationSlots[freeIndex]) {
      toast({ title: `Ya hay ${NUM_PLAYERS} titulares`, variant: "destructive" });
      return;
    }
    const slot = formationSlots[freeIndex];
    setPositions((current) => ({ ...current, [playerId]: { ...slot, slotIndex: freeIndex, x: slot.x, y: slot.y } }));
    ensureCallup(playerId, "titular");
    setDirty(true);
  }

  function moveToSuplente(playerId) {
    setPositions((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    clearCaptainIfNeeded(playerId);
    ensureCallup(playerId, "suplente");
    setDirty(true);
  }

  function moveToConvocado(playerId) {
    setPositions((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    clearCaptainIfNeeded(playerId);
    ensureCallup(playerId, "pendiente");
    setDirty(true);
  }

  function removeFromConvocatoria(playerId) {
    setSavedCallups((current) => current.filter((callup) => callup.player_id !== playerId));
    setPositions((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    clearCaptainIfNeeded(playerId);
    setDirty(true);
  }

  function updatePlayerPosition(playerId, nextPosition) {
    setPositions((current) => ({
      ...current,
      [playerId]: { ...current[playerId], ...nextPosition },
    }));
    setDirty(true);
  }

  function toggleCaptain(playerId) {
    if (!positions[playerId]) {
      toast({ title: "El capitán debe estar entre los titulares", variant: "destructive" });
      return;
    }
    setCaptainPlayerId((current) => current === playerId ? "" : playerId);
    setDirty(true);
  }

  function updateShirtNumber(playerId, rawValue) {
    const cleanValue = String(rawValue).replace(/\D/g, "").slice(0, 2);
    const numericValue = Number(cleanValue);
    const shirtNumber = cleanValue && numericValue > 0 ? numericValue : null;
    setSavedCallups((current) => current.map((callup) => (
      callup.player_id === playerId ? { ...callup, shirt_number: shirtNumber } : callup
    )));
    setDirty(true);
  }

  function changeSystem(value) {
    setSystem(value);
    const slots = buildFormationSlots(value);
    if (!value || slots.length < titularIds.length) {
      setDirty(true);
      return;
    }
    setPositions(arrangeByPlayerProfile(titularIds.slice(0, NUM_PLAYERS), slots, playerMap));
    setDirty(true);
  }

  function applyPdfImport({ system: importedSystem, titulares, suplentes }) {
    // Cambiar sistema
    const newSystem = importedSystem || system;
    setSystem(newSystem);
    const slots = buildFormationSlots(newSystem);

    // Aplicar titulares con posiciones
    const nextPositions = {};
    const nextCallups = [];

    titulares.forEach(({ playerId, shirtNumber, slot }, idx) => {
      const assignedSlot = slot || slots[idx] || slots[0];
      nextPositions[playerId] = { ...assignedSlot, slotIndex: slot?.slotIndex ?? idx };
      nextCallups.push({ playerId, shirtNumber, role: "titular" });
    });

    suplentes.forEach(({ playerId, shirtNumber }) => {
      nextCallups.push({ playerId, shirtNumber, role: "suplente" });
    });

    // Rebuil savedCallups merging existing + imported
    setSavedCallups(current => {
      const existing = new Map(current.map(c => [c.player_id, c]));
      const allPlayerIds = new Set([...nextCallups.map(c => c.playerId)]);
      // Desconvocar los que no están en el PDF
      const base = current.map(c => allPlayerIds.has(c.player_id) ? c : { ...c, _remove: true }).filter(c => !c._remove);
      const baseMap = new Map(base.map(c => [c.player_id, c]));

      nextCallups.forEach(({ playerId, shirtNumber, role }) => {
        const player = playerMap.get(playerId) || availablePlayers.find(p => p.id === playerId);
        if (baseMap.has(playerId)) {
          baseMap.set(playerId, {
            ...baseMap.get(playerId),
            lineup_role: role,
            shirt_number: shirtNumber || baseMap.get(playerId).shirt_number,
          });
        } else {
          baseMap.set(playerId, {
            match_id: match.id,
            player_id: playerId,
            lineup_role: role,
            player_name: getPlayerName(player || {}),
            player_number: shirtNumber,
            shirt_number: shirtNumber,
            status: "convocado",
            callup_status: "convocado",
          });
        }
      });
      return Array.from(baseMap.values());
    });

    setPositions(nextPositions);
    setDirty(true);
    setPdfImporterOpen(false);
  }

  function autoArrange() {
    const slots = buildFormationSlots(system);
    if (slots.length < titularIds.length) {
      toast({ title: "El sistema escrito no alcanza para ubicar a todos los titulares", variant: "destructive" });
      return;
    }
    const next = arrangeByPlayerProfile(titularIds.slice(0, NUM_PLAYERS), slots, playerMap);
    setPositions(next);
    setDirty(true);
    toast({ title: "Formación ordenada por puestos", description: "Arquero, defensores, mediocampistas y atacantes fueron priorizados según su posición. Podés ajustar libremente." });
  }

  function validateNumbers() {
    const used = new Map();
    for (const callup of savedCallups) {
      const number = Number(callup.shirt_number);
      if (!Number.isFinite(number) || number < 1 || number > 99) continue;
      if (used.has(number)) return number;
      used.set(number, callup.player_id);
    }
    return null;
  }

  async function save() {
    const duplicatedNumber = validateNumbers();
    if (duplicatedNumber != null) {
      toast({ title: `El dorsal ${duplicatedNumber} está repetido`, description: "Cada convocado debe tener un número distinto.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const selectedPlayerIds = savedCallups.map((callup) => callup.player_id);
      const metaByPlayer = {};
      savedCallups.forEach((callup) => {
        metaByPlayer[callup.player_id] = {
          lineup_role: positions[callup.player_id] ? "titular" : (callup.lineup_role || "pendiente"),
          shirt_number: callup.shirt_number,
        };
      });

      const state = await saveMatchCallups({
        match,
        selectedPlayerIds,
        availablePlayers,
        allCallups,
        metaByPlayer,
        replaceMissing: true,
      });

      const updates = state.savedCallups.map((callup) => {
        const position = positions[callup.player_id];
        return {
          id: callup.id,
          lineup_role: position ? "titular" : (callup.lineup_role === "titular" ? "suplente" : (callup.lineup_role || "pendiente")),
          shirt_number: metaByPlayer[callup.player_id]?.shirt_number ?? null,
          formation_x: position ? Number(position.x) : null,
          formation_y: position ? Number(position.y) : null,
          updated_at: now,
        };
      });
      if (updates.length) await base44.entities.MatchCallup.bulkUpdate(updates);

      const formationPositions = titularIds.map((playerId) => ({
        player_id: playerId,
        x: Number(positions[playerId].x),
        y: Number(positions[playerId].y),
        slot_key: positions[playerId].slot_key || "",
        position_group: positions[playerId].position_group || "",
        preferred_positions: positions[playerId].preferred_positions || [],
      }));
      const savedCaptain = positions[captainPlayerId] ? captainPlayerId : "";
      const patch = {
        tactical_system: system,
        formation_positions: formationPositions,
        formation_updated_at: now,
        captain_player_id: savedCaptain,
      };
      await base44.entities.MatchReport.update(match.id, patch);
      onMatchUpdated?.({
        ...patch,
        squad_called: selectedPlayerIds,
        squad_names: selectedPlayerIds.map((id) => getPlayerName(state.playerMap.get(id))).filter(Boolean),
      });
      onCallupsUpdated?.();

      const refreshedCallups = state.savedCallups.map((callup) => ({
        ...callup,
        shirt_number: metaByPlayer[callup.player_id]?.shirt_number ?? callup.shirt_number ?? null,
      }));
      setAvailablePlayers(state.availablePlayers);
      setSavedCallups(refreshedCallups);
      setAllCallups(state.allCallups);
      setPlayerMap(state.playerMap);
      setCaptainPlayerId(savedCaptain);
      setDirty(false);
      toast({ title: "Convocatoria y formación guardadas" });
    } catch (error) {
      toast({ title: error.message || "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    onRegisterSave?.({
      action: save,
      disabled: !dirty || saving,
      pending: dirty,
      label: "convocatoria y formación",
    });
  }, [dirty, saving, system, positions, savedCallups, captainPlayerId]);

  const pickerOptions = useMemo(() => {
    if (!pickerTarget) return [];
    if (pickerTarget === "convocado") return availablePlayers.filter((player) => !calledSet.has(player.id));
    if (pickerTarget === "titular") return availablePlayers.filter((player) => !positions[player.id]).slice(0, 200);
    if (pickerTarget === "suplente") {
      return availablePlayers.filter((player) => !positions[player.id] && callupByPlayer[player.id]?.lineup_role !== "suplente");
    }
    return [];
  }, [pickerTarget, availablePlayers, calledSet, positions, callupByPlayer]);

  function handlePickerSelect(playerId) {
    if (pickerTarget === "titular") moveToTitular(playerId);
    else if (pickerTarget === "suplente") moveToSuplente(playerId);
    else if (pickerTarget === "convocado") moveToConvocado(playerId);
  }

  const titularGoalkeepers = titulares.filter((player) => getPositionGroup(player.position) === "Arquero");
  const missingShirtPlayers = savedCallups.filter((callup) => !Number(callup.shirt_number));
  const unavailableCalledPlayers = savedCallups.map((callup) => playerMap.get(callup.player_id)).filter((player) => player && isUnavailableStatus(player.status));
  const preparationWarnings = [
    titulares.length !== NUM_PLAYERS ? `La formación tiene ${titulares.length}/${NUM_PLAYERS} titulares.` : null,
    titulares.length === NUM_PLAYERS && titularGoalkeepers.length === 0 ? "No hay un arquero entre los 11 titulares." : null,
    titulares.length === NUM_PLAYERS && !captainPlayerId ? "Falta elegir capitán." : null,
    missingShirtPlayers.length ? `${missingShirtPlayers.length} convocado${missingShirtPlayers.length === 1 ? "" : "s"} sin dorsal.` : null,
    unavailableCalledPlayers.length ? `${unavailableCalledPlayers.length} convocado${unavailableCalledPlayers.length === 1 ? "" : "s"} figura${unavailableCalledPlayers.length === 1 ? "" : "n"} como no disponible.` : null,
  ].filter(Boolean);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">Sistema de juego</p>
              <div className="relative">
                <input
                  list="formation-systems-list"
                  value={system}
                  onChange={(event) => changeSystem(event.target.value)}
                  placeholder="Ej: 4-3-3"
                  className="h-10 w-40 rounded-xl border border-zinc-700 bg-zinc-950 px-3 pr-8 text-sm font-semibold text-white outline-none transition focus:border-emerald-500"
                />
                <datalist id="formation-systems-list">
                  {SYSTEMS.map((item) => <option key={item} value={item} />)}
                </datalist>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
            <div className="hidden h-10 w-px bg-zinc-800 sm:block" />
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Move size={15} className="text-emerald-400" />
              Sistema inicial + ubicación manual libre
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-xl border px-3 py-2 text-sm font-black ${titulares.length === NUM_PLAYERS ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>
              {titulares.length}/{NUM_PLAYERS} titulares
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${captainPlayerId ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-zinc-700 bg-zinc-950 text-zinc-500"}`}>
              <Crown size={13} className="mr-1 inline" /> {captainPlayerId ? "Capitán elegido" : "Sin capitán"}
            </div>
            <button type="button" onClick={autoArrange} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800">
              <RefreshCw size={13} className="mr-1 inline" /> Ordenar
            </button>
            <button type="button" onClick={() => setPdfImporterOpen(true)} className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20">
              <FileUp size={13} className="mr-1 inline" /> Importar PDF
            </button>
            <button type="button" onClick={() => setExportOpen(true)} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/20">
              <Download size={13} className="mr-1 inline" /> Exportar PDF
            </button>
            <button type="button" onClick={save} disabled={!dirty || saving} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-50">
              <Save size={14} className="mr-1 inline" /> {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {preparationWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <div><p className="text-sm font-semibold text-amber-100">Revisiones antes de confirmar la formación</p><div className="mt-2 flex flex-wrap gap-2">{preparationWarnings.map((warning) => <span key={warning} className="rounded-full border border-amber-500/20 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-amber-200">{warning}</span>)}</div></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <ProfessionalFormationPitch
          system={system}
          positions={positions}
          playerMap={playerMap}
          callupByPlayer={callupByPlayer}
          captainPlayerId={captainPlayerId}
          clubBrand={clubBrand}
          squadName={match.squad_name}
          numPlayers={NUM_PLAYERS}
          onPositionChange={updatePlayerPosition}
          onCaptainChange={toggleCaptain}
          onSlotClick={() => setPickerTarget("titular")}
        />

        <div className="space-y-5">
          <PlayerSection
            title="Equipo titular"
            subtitle="Editá dorsal, capitán y rol"
            count={titulares.length}
            players={titulares}
            variant="titular"
            callupByPlayer={callupByPlayer}
            captainPlayerId={captainPlayerId}
            onCaptain={toggleCaptain}
            onNumberChange={updateShirtNumber}
            onAdd={() => setPickerTarget("titular")}
            onRemove={removeFromConvocatoria}
            onMoveSuplente={moveToSuplente}
          />
          <PlayerSection
            title="Convocados"
            subtitle="Todavía sin rol definitivo"
            count={convocados.length}
            players={convocados}
            variant="convocado"
            callupByPlayer={callupByPlayer}
            onNumberChange={updateShirtNumber}
            onAdd={() => setPickerTarget("convocado")}
            onRemove={removeFromConvocatoria}
            onMoveTitular={moveToTitular}
            onMoveSuplente={moveToSuplente}
          />
        </div>
      </div>

      <PlayerSection
        title="Suplentes"
        subtitle="Banco de relevos"
        count={suplentes.length}
        players={suplentes}
        variant="suplente"
        fullWidth
        callupByPlayer={callupByPlayer}
        onNumberChange={updateShirtNumber}
        onAdd={() => setPickerTarget("suplente")}
        onRemove={removeFromConvocatoria}
        onMoveTitular={moveToTitular}
        onMoveConvocado={moveToConvocado}
      />

      {pickerTarget && (
        <PlayerPicker
          target={pickerTarget}
          options={pickerOptions}
          search={search}
          setSearch={setSearch}
          onSelect={handlePickerSelect}
          onClose={() => {
            setPickerTarget(null);
            setSearch("");
          }}
        />
      )}

      {pdfImporterOpen && (
        <PdfFormationImporter
          availablePlayers={availablePlayers}
          onImport={applyPdfImport}
          onClose={() => setPdfImporterOpen(false)}
        />
      )}

      {exportOpen && (
        <MatchFormationExport
          match={match}
          system={system}
          positions={positions}
          playerMap={playerMap}
          savedCallups={savedCallups}
          captainPlayerId={captainPlayerId}
          clubBrand={clubBrand}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function PlayerSection({
  title,
  subtitle,
  count,
  players,
  variant,
  fullWidth = false,
  callupByPlayer,
  captainPlayerId = "",
  onCaptain = null,
  onNumberChange,
  onAdd,
  onRemove,
  onMoveTitular = null,
  onMoveSuplente = null,
  onMoveConvocado = null,
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 shadow-lg">
      <div className="mb-3 flex items-start justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
        <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-bold text-zinc-400">{count}</span>
      </div>
      <div className={`rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-2 ${fullWidth ? "min-h-[90px]" : "min-h-[140px]"}`}>
        {players.length === 0 ? (
          <button type="button" onClick={onAdd} className="flex w-full items-center justify-center gap-2 py-8 text-sm text-zinc-500 transition hover:text-zinc-300">
            <UserPlus size={16} /> Añadir jugadores
          </button>
        ) : (
          <>
            <div className={`grid gap-2 ${fullWidth ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
              {players.map((player) => (
                <PlayerChip
                  key={player.id}
                  player={player}
                  variant={variant}
                  shirtNumber={callupByPlayer[player.id]?.shirt_number}
                  isCaptain={captainPlayerId === player.id}
                  onCaptain={onCaptain ? () => onCaptain(player.id) : null}
                  onNumberChange={(value) => onNumberChange(player.id, value)}
                  onRemove={() => onRemove(player.id)}
                  onMoveTitular={onMoveTitular ? () => onMoveTitular(player.id) : null}
                  onMoveSuplente={onMoveSuplente ? () => onMoveSuplente(player.id) : null}
                  onMoveConvocado={onMoveConvocado ? () => onMoveConvocado(player.id) : null}
                />
              ))}
            </div>
            <button type="button" onClick={onAdd} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300">
              <Plus size={13} /> Añadir jugadores
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function PlayerChip({
  player,
  variant,
  shirtNumber,
  isCaptain,
  onCaptain,
  onNumberChange,
  onRemove,
  onMoveTitular,
  onMoveSuplente,
  onMoveConvocado,
}) {
  return (
    <div className={`rounded-xl border p-2.5 transition ${isCaptain ? "border-amber-400/50 bg-amber-400/5" : "border-zinc-800 bg-zinc-950"}`}>
      <div className="flex items-center gap-2">
        <PlayerPhoto
          player={player}
          src={player?.photo_url || player?.avatar_url || ""}
          alt={getPlayerName(player)}
          className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
          fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"
          textClassName="text-xs text-zinc-400"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{getPlayerName(player)}</p>
          <p className="truncate text-[10px] text-zinc-500">{player.position || "Sin posición"}</p>
        </div>
        {variant === "titular" && (
          <button
            type="button"
            onClick={onCaptain}
            title={isCaptain ? "Quitar capitán" : "Elegir capitán"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${isCaptain ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-700 text-zinc-500 hover:border-amber-400/60 hover:text-amber-300"}`}
          >
            <Crown size={14} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-800 pt-2">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Hash size={11} />
          Dorsal
          <input
            value={shirtNumber ?? ""}
            onChange={(event) => onNumberChange(event.target.value)}
            inputMode="numeric"
            placeholder="—"
            aria-label={`Dorsal de ${getPlayerName(player)}`}
            className="h-7 w-11 rounded-md border border-zinc-700 bg-zinc-900 px-1 text-center text-xs font-black text-white outline-none focus:border-yellow-500"
          />
        </label>
        <div className="flex items-center gap-0.5">
          {variant === "titular" && onMoveSuplente && <button type="button" onClick={onMoveSuplente} title="Mover a suplente" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"><ArrowRight size={13} /></button>}
          {variant === "convocado" && onMoveTitular && <button type="button" onClick={onMoveTitular} title="Mover a titular" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"><ArrowRight size={13} /></button>}
          {variant === "convocado" && onMoveSuplente && <button type="button" onClick={onMoveSuplente} title="Mover a suplente" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-blue-400"><ArrowRight size={13} /></button>}
          {variant === "suplente" && onMoveTitular && <button type="button" onClick={onMoveTitular} title="Mover a titular" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"><ArrowRight size={13} /></button>}
          {variant === "suplente" && onMoveConvocado && <button type="button" onClick={onMoveConvocado} title="Mover a convocado" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-amber-400"><ArrowRight size={13} /></button>}
          <button type="button" onClick={onRemove} title="Quitar de la convocatoria" className="rounded p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><X size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function PlayerPicker({ target, options, search, setSearch, onSelect, onClose }) {
  const filtered = options.filter((player) => !search || normalizeText(getPlayerName(player)).includes(normalizeText(search)));
  const label = target === "titular" ? "titulares" : target === "suplente" ? "suplentes" : "convocados";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-sm font-bold text-white">Añadir a {label}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:bg-zinc-900"><X size={16} /></button>
        </div>
        <div className="border-b border-zinc-800 p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-yellow-500" />
          </div>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No hay jugadores disponibles</p>
          ) : filtered.map((player) => (
            <button key={player.id} type="button" onClick={() => onSelect(player.id)} className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-left transition hover:border-yellow-500/40 hover:bg-yellow-500/5">
              <PlayerPhoto
                player={player}
                src={player?.photo_url || player?.avatar_url || ""}
                alt={getPlayerName(player)}
                className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
                fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"
                textClassName="text-xs text-zinc-400"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{getPlayerName(player)}</p>
                <p className="text-xs text-zinc-500">#{getPlayerNumber(player)} · {player.position?.split(" ")[0] || "Sin posición"} · {getPlayerSquadLabel(player)}</p>
              </div>
              {isUnavailableStatus(player.status) && <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300">{player.status}</span>}
              <Plus size={16} className="text-zinc-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}