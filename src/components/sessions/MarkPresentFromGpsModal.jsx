import React, { useMemo } from "react";
import { X, Check, UserX, ShieldCheck, Loader2, LocateFixed } from "lucide-react";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { STATUS_LABELS } from "./sessionPlayerUtils";

// Estados que indican una situación especial ya cargada por el staff: se respetan y no se sobreescriben.
const SPECIAL_STATUS = new Set([
  "lesionado", "molestia", "suspendido", "reintegro",
  "diferenciado", "convocado", "sube_a_reserva", "bajó", "subió",
]);
const SPECIAL_ATTENDANCE = new Set(["diferenciado", "kinesiologia"]);

export function isProtectedPlayer(sp) {
  return SPECIAL_STATUS.has(sp.status_at_session) || SPECIAL_ATTENDANCE.has(sp.attendance);
}

export function buildAttendancePlan(sessionPlayers, csvPlayerIds) {
  const csvSet = new Set(csvPlayerIds);
  const present = [];
  const absent = [];
  const protectedPlayers = [];
  (sessionPlayers || []).forEach((sp) => {
    if (!sp.player_id) return;
    if (isProtectedPlayer(sp)) { protectedPlayers.push(sp); return; }
    if (csvSet.has(sp.player_id)) present.push(sp);
    else absent.push(sp);
  });
  return { present, absent, protectedPlayers };
}

export default function MarkPresentFromGpsModal({
  sessionPlayers, csvPlayerIds, photos = {}, applying, onConfirm, onCancel,
}) {
  const { present, absent, protectedPlayers } = useMemo(
    () => buildAttendancePlan(sessionPlayers, csvPlayerIds),
    [sessionPlayers, csvPlayerIds],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              <LocateFixed size={15} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Marcar presentes desde GPS</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Se actualiza la asistencia según los jugadores detectados en el CSV.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-center">
              <p className="text-2xl font-black text-emerald-300">{present.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-400/80">Presentes</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-3 text-center">
              <p className="text-2xl font-black text-zinc-300">{absent.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">Ausentes</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-center">
              <p className="text-2xl font-black text-amber-300">{protectedPlayers.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-amber-400/80">Respetados</p>
            </div>
          </div>

          <Section
            icon={Check}
            tone="emerald"
            title="Quedarán presentes (con GPS)"
            list={present}
            photos={photos}
            emptyText="Ningún jugador del plantel fue detectado en el CSV."
          />
          <Section
            icon={UserX}
            tone="zinc"
            title="Quedarán ausentes (sin GPS)"
            list={absent}
            photos={photos}
            emptyText="Todos los jugadores del plantel aparecen en el CSV."
          />
          {protectedPlayers.length > 0 && (
            <Section
              icon={ShieldCheck}
              tone="amber"
              title="Respetados (estado especial, sin cambios)"
              list={protectedPlayers}
              photos={photos}
              emptyText=""
              showStatus
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={applying || (present.length === 0 && absent.length === 0)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            {applying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {applying ? "Aplicando..." : "Confirmar y marcar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TONE = {
  emerald: { icon: "text-emerald-300", chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  zinc: { icon: "text-zinc-300", chip: "border-zinc-700 bg-zinc-800/60 text-zinc-300" },
  amber: { icon: "text-amber-300", chip: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
};

function Section({ icon: Icon, tone, title, list, photos, emptyText, showStatus }) {
  const t = TONE[tone] || TONE.zinc;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${t.icon}`}>
        <Icon size={12} /> {title} ({list.length})
      </p>
      {list.length === 0 ? (
        <p className="text-[11px] text-zinc-600 px-1">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {list.map((sp) => (
            <div
              key={sp.id}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${t.chip}`}
            >
              <PlayerAvatar
                player={{ id: sp.player_id, full_name: sp.player_name, photo_url: photos[sp.player_id] }}
                size="sm"
                className="min-w-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-white">{sp.player_name}</p>
                <p className="truncate text-[9px] text-zinc-500">
                  {showStatus && sp.status_at_session ? STATUS_LABELS[sp.status_at_session] : sp.position || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}