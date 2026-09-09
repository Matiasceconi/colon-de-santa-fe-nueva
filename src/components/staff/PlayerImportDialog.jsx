import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, AlertCircle, CheckCircle, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";
import {
  PLAYER_COLUMNS,
  playerColumnLabels,
  playerColumnWidths,
  playerExampleRowArray,
  detectPlayerColumns,
  normalizeSpreadsheetText,
  writeControlAutoFormulas,
  extendSheetRange,
} from "@/lib/playerSpreadsheet";

const TEMPLATE_DATA_ROWS = 300; // filas con fórmula de "Control automático" precargada

function buildHeaderRows(clubName = "Club") {
  return [
    [`${String(clubName || "Club").toUpperCase()} · IMPORTACIÓN DE JUGADORES`],
    ["Plantilla oficial para cargar jugadores en el software del club"],
    ["Una fila por jugador. No cambiar los nombres de las columnas. Los campos con * son obligatorios. El DNI puede quedar vacío, pero el portal del jugador no se habilitará hasta completarlo."],
    ["Formato recomendado: DNI sin puntos ni espacios · Fecha: dd/mm/aaaa · Número de camiseta solo dígitos"],
    ["Completá desde la fila 7. Si necesitás ayuda, abrí la hoja “Instrucciones”."],
  ];
}

function buildInstructionsSheet(clubName = "Club") {
  return [
    ["CÓMO COMPLETAR E IMPORTAR LA PLANILLA"],
    [`${clubName || "Club"} · Base de jugadores`],
    ["Paso", "Acción", "Qué hacer"],
    ["1", "Descargá la plantilla", "Usá siempre el archivo generado desde la página para conservar las columnas y validaciones correctas."],
    ["2", "Completá una fila por jugador", "No combines celdas, no cambies encabezados y no agregues títulos dentro de la tabla."],
    ["3", "Revisá el control automático", "OK - Listo: se importa completo. Alerta - Sin DNI: se importa pero sin acceso al portal. Falta - Datos obligatorios: corregí esa fila antes de importar."],
    ["4", "Guardá como .xlsx", "No conviertas el archivo a PDF. El sistema leerá únicamente la hoja “Carga de jugadores”."],
    ["5", "Importá desde la página", "La página mostrará cuántos jugadores se crearon, actualizaron o quedaron con observaciones."],
    ["CAMPOS DE LA PLANILLA"],
    ["Campo", "Obligatorio", "Formato", "Uso"],
    ["Plantel / Categoría", "Sí", "Elegir del desplegable", "Define en qué plantel queda vinculado el jugador."],
    ["Tipo de documento", "Sí", "DNI, pasaporte, cédula u otro", "Permite identificar correctamente el documento cargado."],
    ["Nro. documento", "No", "Solo números, sin puntos ni espacios", "Si falta, se importa con alerta y el portal queda bloqueado. Identifica al jugador en reimportaciones."],
    ["Apellido y Nombre", "Sí", "Texto", "Se guardan en campos separados para buscar y ordenar mejor."],
    ["Fecha de nacimiento", "Sí", "dd/mm/aaaa", "Debe ser una fecha válida de Excel."],
    ["Lugar de nacimiento", "No", "Texto libre", "Ciudad/localidad de nacimiento."],
    ["Nacionalidad", "No", "Elegir del desplegable", "Puede completarse más adelante."],
    ["Zona de residencia", "No", "AMBA, INTERIOR o EXTERIOR", "Clasificación administrativa para logística, pensión y seguimiento."],
    ["Provincia / Ciudad", "No", "Texto libre", "Solo aplica a jugadores del interior. Útil para logística de viajes."],
    ["Domicilio completo", "No", "Texto libre", "Se usa cuando el jugador no vive en pensión del club."],
    ["Tipo de pensión", "No", "Sin pensión, interna o externa", "No modifica el acceso del jugador."],
    ["Celular", "No", "Texto libre", "Contacto directo del jugador."],
    ["Perfil / pierna hábil", "Sí", "Diestro, zurdo o ambidiestro", "Dato deportivo básico para la ficha."],
    ["Posición", "Sí", "Elegir del desplegable", "Usar la posición principal del jugador."],
    ["Posición secundaria", "No", "Texto libre", "Posición alternativa, si la tiene."],
    ["Número de camiseta", "No", "Solo números", "Se usa en convocatorias, planillas y reportes."],
    ["Situación contractual", "No", "Con contrato, sin contrato o sin información", "Estado contractual confirmado del jugador."],
    ["Estado", "No", "Disponible, Lesionado, Suspendido, etc.", "Si se deja vacío, un jugador nuevo se crea como Disponible; uno existente conserva el estado que ya tenía en el sistema (no se pisa)."],
    ["Notas", "No", "Texto libre", "Observaciones internas sobre el jugador."],
    ["Control automático", "No editar", "Calculado", "La página no importa esta columna — es solo una guía visual mientras completás."],
    ["IMPORTANTE: el player_id se genera automáticamente en la página. Reimportar una planilla actualiza a los jugadores existentes (por DNI o nombre) sin resetear su estado ni darlos de baja."],
  ];
}

export default function PlayerImportDialog({ open, onOpenChange, onSuccess, squads = [], defaultSquadId = "", clubName = "Club" }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedRows, setParsedRows] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [selectedSquadId, setSelectedSquadId] = useState(defaultSquadId || "");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setResult(null);
      setParsedRows(null);
      setParseError(null);
      setSelectedSquadId(defaultSquadId || "");
    }
  }, [open, defaultSquadId]);

  const selectedSquad = useMemo(
    () => squads.find((squad) => squad.id === selectedSquadId),
    [squads, selectedSquadId]
  );

  function downloadTemplate() {
    const labels = playerColumnLabels();
    // Hoja "Carga de jugadores": filas de encabezado + fila de columnas + ejemplo
    const exampleRowArray = playerExampleRowArray();
    const aoa = [
      ...buildHeaderRows(clubName),
      labels,
      exampleRowArray,
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet["!cols"] = playerColumnWidths();
    const lastCol = PLAYER_COLUMNS.length - 1;
    // Fusionar el título principal (fila 0) y los textos explicativos (filas 1-4) en una sola celda visible
    sheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } },
    ];
    // Fila 7 (la primera de datos, con el ejemplo) en adelante: fórmula de
    // control automático precargada para que se calcule sola al completar.
    writeControlAutoFormulas(sheet, 7, 6 + TEMPLATE_DATA_ROWS, (r) => (r === 7 ? exampleRowArray : null));
    extendSheetRange(sheet, 6 + TEMPLATE_DATA_ROWS, lastCol);

    const instructionsSheet = buildInstructionsSheet(clubName);
    const instrSheet = XLSX.utils.aoa_to_sheet(instructionsSheet);
    instrSheet["!cols"] = [{ wch: 26 }, { wch: 30 }, { wch: 70 }, { wch: 30 }];
    instrSheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } },
      { s: { r: instructionsSheet.length - 1, c: 0 }, e: { r: instructionsSheet.length - 1, c: 3 } },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Carga de jugadores");
    XLSX.utils.book_append_sheet(workbook, instrSheet, "Instrucciones");
    XLSX.writeFile(workbook, "plantilla_importacion_jugadores.xlsx");
  }

  function parseRows(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target.result, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames.includes("Carga de jugadores") ? "Carga de jugadores" : workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          // El !ref de la hoja puede no cubrir todas las filas con datos si el
          // archivo fue editado y el rango no se actualizó. Escaneamos las celdas
          // reales para extender el rango antes de leer.
          const refRange = XLSX.utils.decode_range(sheet["!ref"] || "A1");
          let maxRow = refRange.e.r;
          for (const key of Object.keys(sheet)) {
            if (key[0] === "!") continue;
            const cellRef = XLSX.utils.decode_cell(key);
            if (cellRef.r > maxRow) maxRow = cellRef.r;
          }
          if (maxRow > refRange.e.r) {
            refRange.e.r = maxRow;
            sheet["!ref"] = XLSX.utils.encode_range(refRange);
          }
          const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
          // Encontrar la fila de encabezados: la que contiene "Apellido" y "Posición"
          let headerIndex = -1;
          for (let i = 0; i < Math.min(aoa.length, 15); i += 1) {
            const cells = aoa[i].map((c) => normalizeSpreadsheetText(c));
            if (cells.some((c) => c.includes("apellido")) && cells.some((c) => c.includes("posicion") && !c.includes("secundaria"))) {
              headerIndex = i;
              break;
            }
          }
          if (headerIndex === -1) {
            reject(new Error("No se encontró la fila de encabezados (Apellido / Posición)."));
            return;
          }
          const headers = aoa[headerIndex];
          const normalizedHeaders = headers.map((h) => normalizeSpreadsheetText(h));
          const idx = detectPlayerColumns(headers);
          // Detectar columna combinada "Apellido y Nombres" (planillas de otros clubes)
          const cCombined = normalizedHeaders.findIndex((h) => h.includes("apellido") && h.includes("nombre"));
          const useCombined = cCombined !== -1 && (idx.last_name === -1 || idx.first_name === -1 || idx.last_name === idx.first_name);

          const rows = [];
          for (let r = headerIndex + 1; r < aoa.length; r += 1) {
            const cells = aoa[r];
            if (!cells || cells.every((c) => c === "" || c === null)) continue;
            const get = (colIdx) => (colIdx === undefined || colIdx === -1 ? "" : cells[colIdx] ?? "");

            let firstName = "";
            let lastName = "";
            if (useCombined) {
              // Combined "Apellido y Nombres" — split: first token = apellido, rest = nombre
              const full = String(get(cCombined)).trim();
              if (full) {
                const parts = full.split(/\s+/);
                lastName = parts[0] || "";
                firstName = parts.slice(1).join(" ") || "";
              }
            } else {
              firstName = String(get(idx.first_name)).trim();
              lastName = String(get(idx.last_name)).trim();
            }
            if (!firstName && !lastName) continue;

            rows.push({
              squad: String(get(idx.squad)).trim(),
              document_type: String(get(idx.document_type)).trim(),
              dni: get(idx.dni),
              last_name: lastName,
              first_name: firstName,
              birth_date: get(idx.birth_date),
              birth_place: String(get(idx.birth_place)).trim(),
              nationality: String(get(idx.nationality)).trim(),
              residence_zone: String(get(idx.residence_zone)).trim(),
              province: String(get(idx.province)).trim(),
              city: String(get(idx.city)).trim(),
              full_address: String(get(idx.full_address)).trim(),
              housing_type: String(get(idx.housing_type)).trim(),
              phone_number: String(get(idx.phone_number)).trim(),
              leg: String(get(idx.leg)).trim(),
              position: String(get(idx.position)).trim(),
              secondary_position: String(get(idx.secondary_position)).trim(),
              jersey_number: get(idx.jersey_number) === "" ? undefined : get(idx.jersey_number),
              contract_status: String(get(idx.contract_status)).trim(),
              status: String(get(idx.status)).trim(),
              notes: String(get(idx.notes)).trim(),
            });
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setResult(null);
    setParseError(null);
    try {
      const rows = await parseRows(file);
      if (rows.length === 0) {
        throw new Error("El archivo no tiene filas de jugadores para importar.");
      }
      setParsedRows(rows);
    } catch (error) {
      const msg = error?.message || "No se pudo leer el archivo";
      setParseError(msg);
      toast({ title: "Error al leer el archivo", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function confirmImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    setUploading(true);
    setResult(null);
    try {
      // Si ninguna fila tiene plantel y no se seleccionó uno de respaldo, usar el primer plantel disponible
      const hasSquadInRows = parsedRows.some((r) => r.squad && r.squad.trim());
      const fallbackSquadId = selectedSquadId || (!hasSquadInRows && squads.length > 0 ? squads[0].id : "");
      const response = await base44.functions.invoke("importPlayersFromExcel", {
        rows: parsedRows,
        squad_id: fallbackSquadId || undefined,
        squad_name: selectedSquad?.name || (!hasSquadInRows && squads.length > 0 ? squads[0].name : undefined),
      });
      const data = response.data || response;
      if (!data || data.success === false) {
        const errorMsg = data?.error || response?.error || "No se pudo importar la planilla";
        throw new Error(errorMsg);
      }
      setResult(data);
      setParsedRows(null);
      toast({ title: "Importación completada" });
      if (onSuccess) await onSuccess();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "Error desconocido al importar";
      toast({ title: "Error en la importación", description: msg, variant: "destructive" });
      setResult({ success: false, error: msg });
    } finally {
      setUploading(false);
    }
  }

  function closeDialog() {
    setResult(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><FileSpreadsheet size={20} className="text-cyan-400" /> Importar jugadores desde Excel</DialogTitle>
        </DialogHeader>

        {!result?.success ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Plantel de destino (opcional)</label>
              <select
                value={selectedSquadId}
                onChange={(event) => setSelectedSquadId(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Usar la columna “Plantel / Categoría”</option>
                {squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-zinc-500">Si la fila tiene plantel, se vincula ahí automáticamente. Este plantel se usa solo de respaldo para filas sin plantel.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-sm font-semibold text-zinc-200">Formato de la planilla</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Una fila por jugador, con los mismos {PLAYER_COLUMNS.length - 1} campos que podés cargar y exportar desde la ficha del jugador (documento, residencia, contacto, contrato, número de camiseta, notas, etc.). Son obligatorios Apellido, Nombre, Posición, Tipo de documento y Perfil/pierna hábil. Reimportar actualiza a los jugadores existentes sin resetear su estado.</p>
              <button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><Download size={14} /> Descargar plantilla Excel</button>
            </div>

            {result?.error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{result.error}</p>
              </div>
            )}

            {parseError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{parseError}</p>
              </div>
            )}

            {parsedRows && parsedRows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle size={15} /> {parsedRows.length} jugadores detectados — revisá la vista previa:
                </div>
                <div className="max-h-52 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Plantel</th>
                        <th className="px-2 py-1.5 font-semibold">Apellido</th>
                        <th className="px-2 py-1.5 font-semibold">Nombre</th>
                        <th className="px-2 py-1.5 font-semibold">DNI</th>
                        <th className="px-2 py-1.5 font-semibold">Posición</th>
                        <th className="px-2 py-1.5 font-semibold">Pierna</th>
                        <th className="px-2 py-1.5 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-t border-zinc-800">
                          <td className="px-2 py-1.5 text-zinc-300">{row.squad || "—"}</td>
                          <td className="px-2 py-1.5 text-white">{row.last_name || "—"}</td>
                          <td className="px-2 py-1.5 text-white">{row.first_name || "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-300">{row.dni ? String(row.dni) : "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-300">{row.position || "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-300">{row.leg || "—"}</td>
                          <td className="px-2 py-1.5 text-zinc-300">{row.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && <p className="text-[11px] text-zinc-500">…y {parsedRows.length - 50} filas más</p>}
                {parsedRows.some((row) => !row.dni) && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                    <p className="text-[11px] text-amber-200">{parsedRows.filter((row) => !row.dni).length} fila(s) sin DNI — esos jugadores se importan igual, pero sin acceso al portal hasta cargarlo.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={confirmImport} disabled={uploading} className="flex-1 bg-cyan-600 text-white hover:bg-cyan-500">
                    {uploading ? "Importando..." : `Confirmar importación de ${parsedRows.length} jugadores`}
                  </Button>
                  <Button variant="outline" onClick={() => setParsedRows(null)} disabled={uploading} className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 transition-colors ${!uploading ? "border-zinc-700 hover:border-cyan-500/60" : "cursor-not-allowed border-zinc-800 opacity-50"}`}>
                <Upload size={18} className="text-zinc-500" />
                <span className="text-sm text-zinc-400">{uploading ? "Leyendo archivo..." : "Seleccionar archivo .xlsx, .xls o .csv"}</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} disabled={uploading} className="hidden" />
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle size={19} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">Importación completada</p>
                <p className="mt-1 text-xs text-emerald-300/70">{result.created} creados · {result.updated} actualizados · {result.memberships_created || 0} vinculados a planteles{result.squads_resolved ? ` · ${result.squads_resolved} por columna “Plantel”` : ""}</p>
              </div>
            </div>

            {(result.duplicates > 0 || result.invalid_rows > 0) && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                {result.duplicates > 0 && <p>{result.duplicates} filas repetidas por documento fueron ignoradas.</p>}
                {result.invalid_rows > 0 && <p>{result.invalid_rows} filas tenían datos incompletos o inválidos.</p>}
              </div>
            )}

            {result.details?.errors?.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="mb-2 text-xs font-bold text-zinc-300">Filas para revisar</p>
                {result.details.errors.map((error, index) => <p key={index} className="text-xs leading-5 text-zinc-500">• {error}</p>)}
              </div>
            )}

            <Button onClick={closeDialog} className="w-full bg-white text-zinc-900 hover:bg-zinc-200">Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
