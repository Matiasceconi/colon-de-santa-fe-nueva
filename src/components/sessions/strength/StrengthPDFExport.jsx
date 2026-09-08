import ReportSurface from "@/reports/builder/ReportSurface";
import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { createStrengthPdf } from "@/lib/reports/strengthPdf";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { downloadBlob } from "@/lib/exports/fileExport";

export default function StrengthPDFExport({ session, stations, blocks = [] }) {
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("complete");
  const [selected, setSelected] = useState([]);
  const { toast } = useToast();
  const { clubBrand: CLUB_BRAND, can } = useWorkspace();

  const exportBlocks = useMemo(() => blocks.filter(block => !block.hidden), [blocks]);

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function selectedBlocks() {
    if (mode === "complete" || mode === "separate") return exportBlocks;
    return exportBlocks.filter(block => selected.includes(block.id));
  }

  const [artifact,setArtifact]=useState(null);
  const signature=JSON.stringify({session,stations,blocks:selectedBlocks(),mode,CLUB_BRAND});
  const fresh=artifact?.signature===signature;
  useEffect(()=>()=>{if(artifact?.url)URL.revokeObjectURL(artifact.url);},[artifact]);
  async function generate() {
    setGenerating(true);
    try {
      assertExportAllowed(can,"/sessions");
      const result=await createStrengthPdf({session,stations,blocks:selectedBlocks(),mode,brand:CLUB_BRAND});
      const blob=result.doc.output("blob");
      setArtifact({blob,url:URL.createObjectURL(blob),filename:result.filename,signature});
    } catch(error) {toast({title:error.message||"No se pudo generar el PDF",variant:"destructive"});}
    finally {setGenerating(false);}
  }
  function download(){
    try{assertExportAllowed(can,"/sessions");if(!fresh)throw new Error("Actualizá la vista previa.");downloadBlob(artifact.blob,artifact.filename);}
    catch(error){toast({title:error.message,variant:"destructive"});}
  }

  return <>
    <button onClick={() => setOpen(true)} disabled={generating || exportBlocks.length === 0} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs hover:bg-yellow-500/25 transition-colors disabled:opacity-50">{generating ? <Loader size={13} className="animate-spin" /> : <FileText size={13} />}{generating ? "Generando..." : "Exportar"}</button>
    {open && <ReportSurface onClose={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-6xl max-h-[95vh] overflow-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-zinc-800"><p className="text-sm font-semibold text-white">Exportar fuerza</p><button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button></div><div className="p-4 space-y-4"><div className="grid gap-2">{[{ id: "complete", label: "Exportar sesión completa" }, { id: "selected", label: "Exportar cuadros seleccionados" }, { id: "separate", label: "Todos los cuadros en hojas separadas" }].map(option => <button key={option.id} onClick={() => setMode(option.id)} className={`text-left rounded-lg border px-3 py-2 text-xs ${mode === option.id ? "bg-white text-zinc-900 border-white" : "bg-zinc-800 text-zinc-300 border-zinc-700"}`}>{option.label}</button>)}</div>{mode === "selected" && <div className="space-y-2"><p className="text-[10px] text-zinc-500 uppercase font-bold">Elegir cuadros</p>{exportBlocks.map(block => <label key={block.id} className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={selected.includes(block.id)} onChange={() => toggle(block.id)} />{block.name}</label>)}</div>}<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs">Cancelar</button><button onClick={generate} disabled={generating || !selectedBlocks().length} className="px-4 py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold disabled:opacity-40" >{generating ? "Generando…" : "Generar vista previa"}</button><button onClick={download} disabled={generating||!fresh} className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-xs disabled:opacity-40">Descargar PDF</button></div>{artifact&&!fresh&&<p className="text-amber-200 text-xs">Cambió la selección. Generá una nueva vista previa.</p>}{artifact&&<iframe title="Vista previa de fuerza" src={artifact.url} className="w-full h-[55vh] bg-white rounded"/>}</div></div></ReportSurface>}
  </>;
}