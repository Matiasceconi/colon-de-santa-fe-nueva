import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import ReportSurface from "@/reports/builder/ReportSurface";
import { downloadBlob } from "@/lib/exports/fileExport";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { MICRO_METRICS, buildHighlights } from "./gpsMicrocycleReportUtils";
import { generateMicrocyclePdf } from "./gpsMicrocyclePdfRenderer";

const SECTIONS=[["includeCover","Portada"],["includeCycleDays","Días y cargas"],["includePlayerTable","Acumulado de jugadores"],["includeCharts","Gráficos"],["includeRankings","Rankings"],["includeHighlightedPlayers","Jugadores destacados"],["includeWeeklyComparison","Comparación con la semana anterior"]];
export default function GpsMicrocyclePdfButton({squadName,season,dailySummaries=[],highlights=[],comparison=[],cycleDays=[],selectedDates=[],visibleMetrics=MICRO_METRICS,chartMetrics=[],chartConfig,rankingConfig,cycleRows=[],playerMap={}}) {
  const {clubBrand,can}=useWorkspace();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[artifact,setArtifact]=useState(null);
  const [options,setOptions]=useState(Object.fromEntries(SECTIONS.map(([key])=>[key,true]))),[metricKeys,setMetricKeys]=useState(null),[period,setPeriod]=useState("selected"),[notes,setNotes]=useState("");
  const keys=metricKeys??(chartMetrics.length?chartMetrics:visibleMetrics).map(m=>m.key);
  const metrics=keys.map(key=>MICRO_METRICS.find(m=>m.key===key)).filter(Boolean);
  const days=dailySummaries.filter(d=>period!=="selected"||!selectedDates.length||selectedDates.includes(d.date));
  const dates=new Set(days.map(d=>d.date));
  const rows=days.every(d=>Array.isArray(d.mainRows))?days.flatMap(d=>d.mainRows):cycleRows.filter(r=>dates.has(r.session_date));
  const narrowed=days.length!==dailySummaries.length;
  const rankings=buildHighlights(rows,playerMap,highlights.map(h=>MICRO_METRICS.find(m=>m.key===h.metric.key)||h.metric),{...rankingConfig,scope:"Período exportado"});
  const effectiveOptions={...options,includeWeeklyComparison:options.includeWeeklyComparison&&!narrowed,includeConclusions:!!notes.trim()};
  const signature=JSON.stringify({days,rows,rankings,comparison,options:effectiveOptions,keys,clubBrand,squadName,season,chartConfig,cycleDays,playerMap,notes});
  const fresh=artifact?.signature===signature;
  useEffect(()=>()=>{if(artifact?.url)URL.revokeObjectURL(artifact.url);},[artifact]);
  async function generate(){
    setBusy(true);setError("");
    try{
      assertExportAllowed(can,"/performance/external-load");
      if(!days.length)throw new Error("No hay cargas en el período seleccionado.");
      if(!metrics.length&&(options.includeCharts||options.includePlayerTable))throw new Error("Seleccioná al menos una métrica.");
      const doc=await generateMicrocyclePdf({squadName,season,brand:clubBrand,dailySummaries:days,highlights:rankings,comparison:narrowed?[]:comparison,metrics,cycleDays,cycleRows:rows,playerMap,options:effectiveOptions,chartConfig,aiText:notes,download:false});
      const blob=doc.output("blob");
      setArtifact({blob,url:URL.createObjectURL(blob),filename:doc.exportFilename,signature});
    }catch(e){setError(e.message||"No se pudo generar el informe.");}finally{setBusy(false);}
  }
  function download(){
    try{assertExportAllowed(can,"/performance/external-load");if(!fresh)throw new Error("Generá una vista previa actualizada.");downloadBlob(artifact.blob,artifact.filename);}catch(e){setError(e.message);}
  }
  return <>
    <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-500 text-zinc-950 text-sm font-bold"><Download size={16}/>Exportar</button>
    {open&&<ReportSurface title="Informe de microciclo" onClose={()=>setOpen(false)} className="fixed inset-0 bg-zinc-950 p-4 flex flex-col gap-3 text-white">
      <header className="flex justify-between items-center"><h2 className="font-bold text-lg">Informe de microciclo</h2><button onClick={()=>setOpen(false)} className="px-4 py-2 bg-zinc-800 rounded">Cerrar</button></header>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        <details open className="lg:w-80 shrink-0 overflow-auto max-h-[40vh] lg:max-h-full border border-zinc-700 rounded p-3">
          <summary className="cursor-pointer font-semibold">Opciones del informe</summary>
          <label className="block my-3 text-sm">Período<select value={period} onChange={e=>setPeriod(e.target.value)} className="block w-full bg-zinc-800 p-2 rounded mt-1"><option value="selected">Fechas seleccionadas</option><option value="available">Todas las cargas de la vista</option></select></label>
          <p className="text-xs text-zinc-400 mb-3">{days.length} días · tablas y rankings del mismo período.</p>
          {narrowed&&<p className="text-xs text-amber-200 mb-3">La comparación semanal se omite al reducir el período para evitar comparar alcances distintos.</p>}
          {SECTIONS.map(([key,label])=><label key={key} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={effectiveOptions[key]} disabled={key==="includeWeeklyComparison"&&narrowed} onChange={e=>setOptions(p=>({...p,[key]:e.target.checked}))}/>{label}</label>)}
          <p className="font-bold mt-4 mb-2 text-sm">Métricas</p>
          {visibleMetrics.map(m=><label key={m.key} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={keys.includes(m.key)} onChange={()=>setMetricKeys(keys.includes(m.key)?keys.filter(k=>k!==m.key):[...keys,m.key])}/>{m.label}</label>)}
          <label className="block text-sm mt-4">Conclusiones del profesional<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className="w-full bg-zinc-800 rounded mt-1 p-2"/></label>
        </details>
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2"><button onClick={generate} disabled={busy} className="px-4 py-2 rounded bg-white text-zinc-950 disabled:opacity-40">{busy?"Generando…":"Generar vista previa"}</button><button onClick={download} disabled={busy||!fresh} className="px-4 py-2 rounded bg-zinc-800 disabled:opacity-40">Descargar PDF</button></div>
          {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
          {artifact&&!fresh&&<p className="text-amber-200 text-sm">Cambió la selección. Generá una nueva vista previa.</p>}
          {artifact?<iframe title="Vista previa del microciclo" src={artifact.url} className="w-full flex-1 min-h-48 bg-white rounded"/>:<p className="text-zinc-400 p-6">Generá el informe para revisar el mismo PDF que vas a descargar.</p>}
        </div>
      </div>
    </ReportSurface>}
  </>;
}
