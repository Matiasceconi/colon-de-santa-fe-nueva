import React, { useEffect, useState } from "react";
import ReportSurface from "@/reports/builder/ReportSurface";
import { createFormationPdf } from "@/lib/reports/formationPdf";
import { downloadBlob } from "@/lib/exports/fileExport";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function MatchFormationExport(props) {
  const {onClose,...data}=props;
  const {can}=useWorkspace();
  const [type,setType]=useState("completo");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[artifact,setArtifact]=useState(null);
  const signature=JSON.stringify({...data,playerMap:[...data.playerMap.entries()],type});
  const fresh=artifact?.signature===signature;
  useEffect(()=>()=>{if(artifact?.url)URL.revokeObjectURL(artifact.url);},[artifact]);
  async function generate(){
    setBusy(true);setError("");
    try{
      assertExportAllowed(can,"/matches");
      const result=await createFormationPdf({...data,type});
      const blob=result.doc.output("blob");
      setArtifact({blob,url:URL.createObjectURL(blob),filename:result.filename,signature});
    }catch(e){setError(e.message||"No se pudo generar el informe.");}
    finally{setBusy(false);}
  }
  function download(){
    try{
      assertExportAllowed(can,"/matches");
      if(!fresh)throw new Error("Regenerá el informe para incluir los cambios.");
      downloadBlob(artifact.blob,artifact.filename);
    }catch(e){setError(e.message);}
  }
  return <ReportSurface onClose={onClose} title="Convocatoria y formación" className="fixed inset-0 bg-zinc-950 p-3 sm:p-6 flex flex-col gap-4">
    <header className="flex flex-wrap items-center justify-between gap-3 text-white">
      <div><h2 className="text-lg font-bold">Convocatoria y formación</h2><p className="text-xs text-zinc-400">Informe A4 con identidad del club, dorsales y capitán</p></div>
      <button onClick={onClose} className="rounded bg-zinc-800 px-4 py-2">Cerrar</button>
    </header>
    <div className="flex flex-wrap gap-3">
      <select aria-label="Contenido del informe" value={type} onChange={e=>setType(e.target.value)} className="bg-zinc-800 text-white rounded p-2">
        <option value="completo">Convocatoria y formación</option><option value="convocados">Lista de convocados</option><option value="formacion">Formación táctica</option>
      </select>
      <button onClick={generate} disabled={busy||!can("export","/matches")} className="rounded bg-white text-zinc-950 px-4 py-2 disabled:opacity-40">{busy?"Generando…":"Generar vista previa"}</button>
      <button onClick={download} disabled={busy||!fresh} className="rounded bg-zinc-800 text-white px-4 py-2 disabled:opacity-40">Descargar PDF</button>
    </div>
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    {artifact&&!fresh&&<p className="text-amber-200 text-sm">La selección cambió. Generá una nueva vista previa.</p>}
    {artifact?<iframe title="Vista previa del informe de partido" src={artifact.url} className="w-full flex-1 min-h-0 rounded bg-white"/>:<div className="flex-1 flex items-center justify-center border border-zinc-700 rounded text-zinc-400 p-6 text-center">Elegí el contenido y generá el informe. Las listas continúan en nuevas páginas cuando sea necesario.</div>}
  </ReportSurface>;
}
