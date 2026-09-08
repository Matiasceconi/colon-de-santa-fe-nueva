import {createBrandedPdf,buildExportFileName,drawSessionHeader} from "@/lib/exports/pdfExportKit";
import {migrateSeries,summarizeLoads,summarizeSeries} from "@/components/sessions/strength/strengthSeries";
export async function createStrengthPdf({session,stations=[],blocks=[],mode="complete",brand}){
  const pdf=await createBrandedPdf({brand,title:"Planilla de fuerza",subtitle:session.title,meta:[session.date,session.squad_name].filter(Boolean)});
  drawSessionHeader(pdf,{session});
  pdf.paragraph([session.strength_purpose,session.strength_session_type].filter(Boolean).join(" · "));
  blocks.forEach((block,index)=>{
    if(mode==="separate"&&index)pdf.pageBreak();
    const rows=stations.filter(r=>r.work_block_id===block.id).sort((a,b)=>(a.order||0)-(b.order||0));
    pdf.sectionTitle((index+1)+". "+(block.name||"Cuadro de trabajo"));
    pdf.keyValueGrid([{label:"Ejercicios",value:rows.length},{label:"Tiempo estimado",value:block.estimated_time},{label:"Series",value:rows.reduce((n,r)=>n+migrateSeries(r).length,0)},{label:"Con carga",value:rows.filter(r=>migrateSeries(r).some(s=>s.load_type&&s.load_type!=="none"&&String(s.load_value??"").trim())).length}]);
    if(block.description)pdf.paragraph(block.description);
    pdf.table({columns:[{key:"number",label:"N°"},{key:"exercise_name",label:"Ejercicio",width:2},{key:"series",label:"Series"},{key:"prescription",label:"Prescripción",width:3},{key:"rest",label:"Pausa"},{key:"method",label:"Método / Tipo",width:2},{key:"notes",label:"Objetivo / Obs.",width:2}],rows:rows.map((r,i)=>{const series=migrateSeries(r),load=summarizeLoads(series);return {...r,number:i+1,series:series.length,prescription:series.length?summarizeSeries(series)+(load&&load!=="Sin carga"?" · "+load:""):r.volume||"Sin prescripción",rest:r.rest_time!=null&&r.rest_time!==""?r.rest_time+" s":"—",method:[r.method,r.exercise_type].filter(Boolean).join(" / "),notes:[r.objective,r.notes].filter(Boolean).join("\n")};})});
  });
  return {doc:pdf.finalize(),filename:buildExportFileName("Fuerza",[brand?.name,session.squad_name,session.date,session.title])};
}
