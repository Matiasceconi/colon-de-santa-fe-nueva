import React, { useRef, useState } from "react";
import { FileUp, Loader2, X, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { matchDetectedPlayers, getPlayerName } from "@/lib/matchCallupUtils";
import { buildFormationSlots } from "@/components/matches/tabs/formationSlots";

/**
 * PdfFormationImporter
 * Recibe un PDF de convocatoria, extrae titulares/suplentes con IA y
 * llama a onImport({ system, titulares: [{playerId, slotIndex, shirtNumber}], suplentes: [{playerId, shirtNumber}] })
 */
export default function PdfFormationImporter({ availablePlayers, onImport, onClose }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | analyzing | preview | done | error
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // { system, titulares, suplentes, unmatched }

  async function handleFile(file) {
    if (!file || file.type !== "application/pdf") {
      setError("Solo se aceptan archivos PDF.");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setError("");
    try {
      // 1. Subir el PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Extraer datos con IA
      setStatus("analyzing");
      const schema = {
        type: "object",
        properties: {
          system: { type: "string", description: "Sistema táctico, ej: 4-2-3-1" },
          titulares: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "number" },
                name: { type: "string" },
                position_label: { type: "string", description: "Posición en el campo: GK/DEF/MID/FWD o descripción textual" },
                field_row: { type: "number", description: "Fila en el campo de arriba abajo (1=atacante, N=arquero)" },
                field_col: { type: "number", description: "Columna de izquierda a derecha dentro de su fila (1-indexed)" },
              },
              required: ["number", "name"],
            },
          },
          suplentes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "number" },
                name: { type: "string" },
              },
              required: ["number", "name"],
            },
          },
        },
        required: ["system", "titulares", "suplentes"],
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizá esta planilla de convocatoria de fútbol en PDF. 
Extraé:
1. El sistema táctico (ej: "4-2-3-1"). Si dice "1-4-2-3-1" usá "4-2-3-1" (el 1 inicial es el arquero).
2. Los 11 titulares con su número de dorsal, nombre completo y posición en el campo. 
   Para field_row: 1 = fila más atacante, la última fila = arquero.
   Para field_col: orden de izquierda a derecha dentro de la fila (1, 2, 3...).
3. Los suplentes con su número y nombre.
Devolvé los nombres exactamente como aparecen en el PDF.`,
        file_urls: [file_url],
        response_json_schema: schema,
      });

      // 3. Hacer matching con jugadores disponibles
      const allDetectedNames = [
        ...result.titulares.map(p => ({ name: p.name, number: p.number, role: "titular", field_row: p.field_row, field_col: p.field_col })),
        ...result.suplentes.map(p => ({ name: p.name, number: p.number, role: "suplente" })),
      ];

      const matched = matchDetectedPlayers(allDetectedNames, availablePlayers);

      // Refinar match usando número de dorsal
      const refined = matched.map(row => {
        if (row.confidence >= 0.86) return row;
        // Intentar por dorsal
        const byNumber = availablePlayers.find(p =>
          (p.jersey_number && Number(p.jersey_number) === Number(row.number)) ||
          (p.number && Number(p.number) === Number(row.number))
        );
        if (byNumber) return { ...row, matchedPlayerId: byNumber.id, matchedPlayer: byNumber, confidence: 0.9, group: "matched" };
        return row;
      });

      // 4. Calcular slots de formación para titulares
      const systemStr = result.system || "4-2-3-1";
      const slots = buildFormationSlots(systemStr);

      // Mapear titulares a slots: usar posición en el campo (field_row, field_col)
      // Construir grilla de slots agrupada por Y para asignar por filas
      const titularesDetected = refined.filter(r => r.role === "titular" && r.matchedPlayer);
      const suplenteDetected = refined.filter(r => r.role === "suplente" && r.matchedPlayer);
      const unmatched = refined.filter(r => !r.matchedPlayer);

      // Agrupar slots por fila (y redondeado)
      const slotsByRow = [];
      const yValues = [...new Set(slots.map(s => s.y))].sort((a, b) => b - a); // de mayor a menor Y (arquero arriba en coords)
      yValues.forEach(y => {
        slotsByRow.push(slots.filter(s => Math.abs(s.y - y) < 5).sort((a, b) => a.x - b.x));
      });

      // Asignar titulares a slots intentando respetar field_row / field_col
      const slotAssignments = {}; // playerId -> slotIndex
      const usedSlots = new Set();

      // Ordenar titulares por field_row desc (arquero tiene row más alta = última fila en el campo)
      const sortedTitulares = [...titularesDetected].sort((a, b) => (b.field_row || 0) - (a.field_row || 0));

      sortedTitulares.forEach(row => {
        const playerId = row.matchedPlayer.id;
        const fRow = row.field_row; // 1=atacante top, last=arquero
        const fCol = row.field_col;

        // Mapear field_row al slotRow index (invertido: arquero = última fila del PDF = primer slotsByRow)
        let targetRowIndex = slotsByRow.length - 1; // default arquero
        if (fRow && slotsByRow.length > 0) {
          // PDF: fila 1 = atacante, última fila = arquero
          // slotsByRow: index 0 = fila con Y más alto = arquero
          const numRows = slotsByRow.length;
          targetRowIndex = numRows - fRow; // invertir
          if (targetRowIndex < 0) targetRowIndex = 0;
          if (targetRowIndex >= numRows) targetRowIndex = numRows - 1;
        }

        const rowSlots = slotsByRow[targetRowIndex] || slots;
        // Intentar asignar por columna
        let targetSlot = null;
        if (fCol && rowSlots.length > 0) {
          const colIdx = Math.min(fCol - 1, rowSlots.length - 1);
          const candidate = rowSlots[colIdx];
          const globalIdx = slots.indexOf(candidate);
          if (candidate && !usedSlots.has(globalIdx)) {
            targetSlot = { slot: candidate, globalIdx };
          }
        }

        // Si no se pudo asignar, buscar el primer slot libre en la fila
        if (!targetSlot) {
          for (const s of rowSlots) {
            const globalIdx = slots.indexOf(s);
            if (!usedSlots.has(globalIdx)) {
              targetSlot = { slot: s, globalIdx };
              break;
            }
          }
        }

        // Si tampoco, primer slot libre global
        if (!targetSlot) {
          for (let i = 0; i < slots.length; i++) {
            if (!usedSlots.has(i)) {
              targetSlot = { slot: slots[i], globalIdx: i };
              break;
            }
          }
        }

        if (targetSlot) {
          usedSlots.add(targetSlot.globalIdx);
          slotAssignments[playerId] = { ...targetSlot.slot, slotIndex: targetSlot.globalIdx };
        }
      });

      setPreview({
        system: systemStr,
        titulares: titularesDetected.map(r => ({
          playerId: r.matchedPlayer.id,
          playerName: getPlayerName(r.matchedPlayer),
          shirtNumber: r.number,
          slot: slotAssignments[r.matchedPlayer.id] || null,
        })),
        suplentes: suplenteDetected.map(r => ({
          playerId: r.matchedPlayer.id,
          playerName: getPlayerName(r.matchedPlayer),
          shirtNumber: r.number,
        })),
        unmatched,
      });
      setStatus("preview");
    } catch (err) {
      setError(err.message || "Error al procesar el PDF");
      setStatus("error");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function confirmImport() {
    if (!preview) return;
    onImport(preview);
    setStatus("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-sm font-bold text-white">Importar formación desde PDF</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Subí la planilla de convocatoria y la IA detectará los jugadores automáticamente.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:bg-zinc-900"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Drop zone */}
          {(status === "idle" || status === "error") && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-8 cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 transition"
            >
              <FileUp size={32} className="text-zinc-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300">Arrastrá o hacé clic para subir el PDF</p>
                <p className="text-xs text-zinc-500 mt-1">Planilla de convocatoria con formación</p>
              </div>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </div>
          )}

          {/* Loading */}
          {(status === "uploading" || status === "analyzing") && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 size={32} className="animate-spin text-yellow-400" />
              <p className="text-sm text-zinc-300">{status === "uploading" ? "Subiendo PDF…" : "Analizando con IA…"}</p>
              <p className="text-xs text-zinc-500">Esto puede tardar unos segundos</p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Preview */}
          {status === "preview" && preview && (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <CheckCircle size={15} className="text-emerald-400" />
                <span className="text-sm text-emerald-300 font-semibold">Sistema detectado: {preview.system}</span>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Titulares ({preview.titulares.length})</p>
                <div className="space-y-1">
                  {preview.titulares.map(p => (
                    <div key={p.playerId} className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
                      <span className="w-6 text-center text-xs font-black text-yellow-300">{p.shirtNumber}</span>
                      <span className="flex-1 text-sm text-white truncate">{p.playerName}</span>
                      {p.slot && <span className="text-[10px] text-zinc-500">{p.slot.slot_key}</span>}
                      <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {preview.suplentes.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Suplentes ({preview.suplentes.length})</p>
                  <div className="space-y-1">
                    {preview.suplentes.map(p => (
                      <div key={p.playerId} className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
                        <span className="w-6 text-center text-xs font-black text-blue-300">{p.shirtNumber}</span>
                        <span className="flex-1 text-sm text-white truncate">{p.playerName}</span>
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.unmatched.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">No identificados ({preview.unmatched.length})</p>
                  <div className="space-y-1">
                    {preview.unmatched.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-amber-700/30 px-3 py-2">
                        <span className="w-6 text-center text-xs font-black text-zinc-500">{r.number}</span>
                        <span className="flex-1 text-sm text-zinc-400 truncate">{r.name}</span>
                        <AlertCircle size={12} className="text-amber-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {status === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-sm font-semibold text-white">¡Formación importada!</p>
              <p className="text-xs text-zinc-500">Revisá la convocatoria y guardá los cambios.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "preview" && (
          <div className="flex gap-2 border-t border-zinc-800 p-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition">
              Cancelar
            </button>
            <button type="button" onClick={confirmImport} className="flex-1 rounded-xl bg-yellow-500 py-2.5 text-sm font-black text-zinc-950 hover:bg-yellow-400 transition">
              <Upload size={14} className="mr-1.5 inline" /> Aplicar formación
            </button>
          </div>
        )}
        {status === "done" && (
          <div className="border-t border-zinc-800 p-4">
            <button type="button" onClick={onClose} className="w-full rounded-xl bg-zinc-800 py-2.5 text-sm text-white hover:bg-zinc-700 transition">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}