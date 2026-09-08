import React, { useMemo, useRef, useState } from "react";
import { Grip, Move, UserPlus } from "lucide-react";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import { getPlayerName, getPlayerNumber } from "@/lib/matchCallupUtils";
import { buildFormationSlots } from "@/components/matches/tabs/formationSlots";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function PitchLines() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 680 900" preserveAspectRatio="none" fill="none">
      <g stroke="rgba(255,255,255,.82)" strokeWidth="3">
        <rect x="26" y="24" width="628" height="852" rx="5" />
        <line x1="26" y1="450" x2="654" y2="450" />
        <circle cx="340" cy="450" r="76" />
        <circle cx="340" cy="450" r="4" fill="rgba(255,255,255,.88)" stroke="none" />
        <rect x="178" y="24" width="324" height="140" />
        <rect x="248" y="24" width="184" height="62" />
        <circle cx="340" cy="120" r="4" fill="rgba(255,255,255,.88)" stroke="none" />
        <path d="M258 164 A96 96 0 0 0 422 164" />
        <rect x="178" y="736" width="324" height="140" />
        <rect x="248" y="814" width="184" height="62" />
        <circle cx="340" cy="780" r="4" fill="rgba(255,255,255,.88)" stroke="none" />
        <path d="M258 736 A96 96 0 0 1 422 736" />
        <path d="M26 48 A24 24 0 0 0 50 24" />
        <path d="M630 24 A24 24 0 0 0 654 48" />
        <path d="M26 852 A24 24 0 0 1 50 876" />
        <path d="M630 876 A24 24 0 0 1 654 852" />
      </g>
      <g stroke="rgba(255,255,255,.65)" strokeWidth="3">
        <rect x="286" y="10" width="108" height="14" rx="2" />
        <rect x="286" y="876" width="108" height="14" rx="2" />
      </g>
    </svg>
  );
}

function PlayerMarker({ playerId, player, position, number, isCaptain, isDragging, pitchRef, onPositionChange, onDragStateChange, onCaptainChange }) {
  const dragState = useRef(null);
  const shortName = String(getPlayerName(player) || "Jugador").split(" ").slice(-1)[0];

  function coordinatesFromPointer(event) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 6, 94);
    const y = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 5, 95);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  }

  function handlePointerDown(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragState.current = { pointerId: event.pointerId };
    onDragStateChange?.(playerId);
  }

  function handlePointerMove(event) {
    if (dragState.current?.pointerId !== event.pointerId) return;
    const next = coordinatesFromPointer(event);
    if (next) onPositionChange?.(playerId, next);
  }

  function stopDrag(event) {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    onDragStateChange?.("");
  }

  return (
    <div
      className={"absolute z-20 -translate-x-1/2 -translate-y-1/2 select-none " + (isDragging ? "cursor-grabbing" : "cursor-grab")}
      style={{ left: `${position.x}%`, top: `${100 - position.y}%`, touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onDoubleClick={() => onCaptainChange?.(playerId)}
      role="button"
      tabIndex={0}
      title="Arrastrar para mover. Doble clic para elegir capitán."
    >
      <div className="group flex min-w-[72px] flex-col items-center">
        <div className={"relative h-12 w-12 overflow-hidden rounded-full border-[3px] bg-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition sm:h-14 sm:w-14 " + (isCaptain ? "border-amber-300 ring-4 ring-amber-300/20" : "border-white/90 ring-2 ring-black/25")}>
          <PlayerPhoto
            player={player}
            src={player?.photo_url || player?.avatar_url || ""}
            alt={getPlayerName(player)}
            className="h-full w-full object-cover"
            fallbackClassName="flex h-full w-full items-center justify-center bg-zinc-800"
            textClassName="text-sm font-black text-white"
          />
          <span className="absolute bottom-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-zinc-950 px-1 text-[10px] font-black text-white">
            {number || getPlayerNumber(player)}
          </span>
        </div>
        <div className={"mt-1 flex max-w-[110px] items-center gap-1 rounded-md border px-2 py-1 shadow-lg backdrop-blur " + (isCaptain ? "border-amber-300/70 bg-amber-300 text-zinc-950" : "border-white/20 bg-zinc-950/90 text-white")}>
          {isCaptain && <span className="rounded bg-zinc-950 px-1 text-[8px] font-black text-amber-300">C</span>}
          <span className="truncate text-[10px] font-extrabold uppercase tracking-wide">{shortName}</span>
          <Grip size={10} className="shrink-0 opacity-60" />
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalFormationPitch({
  system,
  positions,
  playerMap,
  callupByPlayer = {},
  captainPlayerId,
  clubBrand,
  squadName,
  numPlayers = 11,
  onPositionChange,
  onCaptainChange,
  onSlotClick,
}) {
  const pitchRef = useRef(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState("");
  const slots = useMemo(() => buildFormationSlots(system), [system]);
  const usedIndices = new Set(Object.values(positions).map((position) => position.slotIndex).filter(Number.isFinite));
  const emptySlots = slots.slice(0, numPlayers)
    .map((slot, index) => ({ slot, index }))
    .filter(({ index }) => !usedIndices.has(index));
  const filledPlayers = Object.entries(positions)
    .map(([playerId, position]) => ({ playerId, position, player: playerMap.get(playerId) }))
    .filter(({ player }) => player);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-emerald-400">Pizarra táctica</p>
          <h3 className="mt-0.5 text-sm font-bold text-white">{squadName || clubBrand?.shortName || "Equipo"} · {system || "Sistema libre"}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
          <Move size={14} className="text-emerald-400" />
          Arrastrá cada jugador libremente
        </div>
      </header>

      <div
        ref={pitchRef}
        className="relative mx-auto w-full overflow-hidden bg-[#087a3c]"
        style={{
          minHeight: "560px",
          aspectRatio: "680 / 900",
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0, rgba(255,255,255,.035) 90px, rgba(0,0,0,.035) 90px, rgba(0,0,0,.035) 180px), radial-gradient(circle at 50% 50%, #15934c 0%, #087a3c 70%, #075f31 100%)",
          touchAction: draggingPlayerId ? "none" : "pan-y",
        }}
      >
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_75px_rgba(0,0,0,.38)]" />
        <PitchLines />

        {emptySlots.map(({ slot, index }) => (
          <button
            key={`empty-${index}`}
            type="button"
            onClick={() => onSlotClick?.(slot, index)}
            className="absolute z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-white/55 bg-black/10 text-white/70 backdrop-blur-sm transition hover:scale-105 hover:border-white hover:bg-white/15 hover:text-white"
            style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
            title="Agregar titular"
          >
            <UserPlus size={18} />
          </button>
        ))}

        {filledPlayers.map(({ playerId, position, player }) => (
          <PlayerMarker
            key={playerId}
            playerId={playerId}
            player={player}
            position={position}
            number={callupByPlayer[playerId]?.shirt_number ?? getPlayerNumber(player)}
            isCaptain={captainPlayerId === playerId}
            isDragging={draggingPlayerId === playerId}
            pitchRef={pitchRef}
            onPositionChange={onPositionChange}
            onDragStateChange={setDraggingPlayerId}
            onCaptainChange={onCaptainChange}
          />
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center gap-2">
          {clubBrand?.logoUrl && <img src={clubBrand.logoUrl} alt="" className="h-7 w-7 object-contain" />}
          <span className="text-xs font-semibold text-zinc-300">{filledPlayers.length}/{numPlayers} titulares ubicados</span>
        </div>
        <p className="text-[11px] text-zinc-500">Doble clic sobre un jugador para marcar o quitar el capitán.</p>
      </footer>
    </section>
  );
}
