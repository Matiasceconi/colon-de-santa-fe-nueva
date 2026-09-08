import { createBrandedPdf, drawSessionHeader, buildExportFileName } from "@/lib/exports/pdfExportKit";
import { drawVectorChart } from "@/lib/exports/vectorChart";
import { REPORT_METRICS, fmtMetricVal } from "@/components/sessions/gpsReport/sessionGpsReportData";
import { shortReferenceLabel, shortStatusLabel } from "@/components/sessions/gps/gpsReferenceEngine";

export async function createSessionGpsPdf({ session, reportData: data, clubBrand, institutionProfile, studioConfig, observations, orientation = "portrait" }) {
  if (!data) throw new Error("No hay datos preparados para exportar.");
  const pdf = await createBrandedPdf({
    brand: { ...clubBrand, footerText: institutionProfile?.export_footer_text, showPerformancePitchBrand: institutionProfile?.show_performancepitch_brand !== false },
    title: "Informe de sesión GPS", subtitle: session.title,
    format: institutionProfile?.default_paper_size?.toLowerCase() === "letter" ? "letter" : "a4",
    orientation,
    meta: [session.date, session.squad_name, session.match_day_code].filter(Boolean),
  });
  drawSessionHeader(pdf,{session});
  pdf.sectionTitle("Resumen de la selección");
  pdf.keyValueGrid([{label:"Con GPS válido",value:data.summary.conGps},{label:"Excluidos del promedio",value:data.summary.excluidos},{label:"Diferenciados",value:data.summary.diferenciados},{label:"Kinesiología",value:data.summary.kinesiologia}]);
  pdf.paragraph("Promedios de jugadores de campo incluidos. Los registros excluidos no participan en promedios ni referencias.");
  pdf.table({columns:[{key:"label",label:"Métrica"},{key:"unit",label:"Unidad"},{key:"value",label:"Promedio",align:"right"}],rows:REPORT_METRICS.map(m=>({...m,value:fmtMetricVal(m.key,data.teamAverages[m.key])}))});
  pdf.sectionTitle("Destacados");
  pdf.table({columns:[{key:"label",label:"Métrica"},{key:"player_name",label:"Jugador"},{key:"value",label:"Valor",align:"right"}],rows:data.highlights});
  pdf.sectionTitle("Lectura de la sesión");
  data.insights.forEach(text=>pdf.paragraph(text));
  const playerColumns = [{key:"player_name",label:"Jugador",width:2,bold:true,value:r=>r.player_name || r._player?.full_name || r.player_name_original || "Jugador"}];
  for (let i=0;i<REPORT_METRICS.length;i+=4) {
    const metrics = REPORT_METRICS.slice(i,i+4);
    pdf.pageBreak(); pdf.sectionTitle("Valores individuales · jugadores incluidos");
    pdf.paragraph(studioConfig.showReferences !== false ? "Valor · porcentaje · fuente y estado de referencia. Sin muestra suficiente: sin referencia." : "Valores absolutos de la sesión.",{fontSize:7});
    pdf.table({columns:[...playerColumns,...metrics.map(m=>({key:m.key,label:`${m.label}${m.unit ? " ("+m.unit+")" : ""}`,width:1.2,align:"right",value:r=>{
      const value=fmtMetricVal(m.key,r[m.key]), ref=data.referenceByPlayer?.[r.player_id]?.[m.key];
      return studioConfig.showReferences !== false && ref?.sufficient && ref.pct != null && Number.isFinite(Number(ref.pct)) ? `${value}\n${Math.round(ref.pct)}% · ${shortStatusLabel(ref.status)}\n${shortReferenceLabel(ref,session)}` : value;
    }}))],rows:data.principal});
  }
  if(data.excluded.length) {
    pdf.sectionTitle("Registros excluidos del promedio");
    pdf.table({columns:playerColumns,rows:data.excluded});
  }
  for(const chart of (studioConfig.charts || []).filter(c=>c.includeInReport !== false)) {
    const metric=REPORT_METRICS.find(m=>m.key===chart.metric);
    if(!metric) throw new Error("El gráfico contiene una métrica no válida.");
    const points=chart.dimension==="exercise" ? data.exerciseLoads.map(r=>({label:r.name,value:r[metric.key]})) : data.principal.map(r=>({
      label:r.display_name || r.player_name, value:r[metric.key],
      reference:chart.showReference !== false && data.referenceByPlayer?.[r.player_id]?.[metric.key]?.sufficient ? data.referenceByPlayer[r.player_id][metric.key].referenceValue : null,
    }));
    pdf.pageBreak();
    drawVectorChart(pdf,{title:chart.title || metric.label,points,color:metric.color,type:chart.type,unit:metric.unit,decimals:metric.decimals||0,showAverage:chart.showAverage !== false});
  }
  pdf.pageBreak(); pdf.sectionTitle("Carga por ejercicio");
  pdf.paragraph("Promedio por jugador de los bloques de cada ejercicio; velocidad máxima e intensidades mantienen la agregación del módulo GPS.");
  for(let i=0;i<REPORT_METRICS.length;i+=4) {
    const metrics=REPORT_METRICS.slice(i,i+4);
    pdf.table({columns:[{key:"name",label:"Ejercicio",width:2},{key:"blocks",label:"Bloques"},{key:"players",label:"Jug."},...metrics.map(m=>({key:m.key,label:m.label+(m.unit?" ("+m.unit+")":""),align:"right",value:r=>fmtMetricVal(m.key,r[m.key])}))],rows:data.exerciseLoads});
  }
  if(data.comparisonSession) {
    pdf.sectionTitle("Comparación con otra sesión");
    pdf.paragraph([data.comparisonSession.date,data.comparisonSession.title].filter(Boolean).join(" · "));
    pdf.table({columns:[{key:"label",label:"Métrica"},{key:"unit",label:"Unidad"},{key:"current",label:"Sesión actual"},{key:"comparison",label:"Sesión comparada"}],rows:REPORT_METRICS.map(m=>({...m,current:fmtMetricVal(m.key,data.teamAverages[m.key]),comparison:fmtMetricVal(m.key,data.comparisonAverages[m.key])}))});
  }
  pdf.sectionTitle("Observaciones del cuerpo técnico");pdf.paragraph(observations || "Sin observaciones.");
  pdf.sectionTitle("Control de calidad");
  if(!data.alerts.length) pdf.paragraph("Sin incidencias detectadas.");
  data.alerts.forEach(a=>pdf.paragraph(a.text,{fontSize:8}));
  pdf.paragraph("Fuente GPS: "+(session.csv_label || "Datos cargados en la sesión"),{fontSize:7});
  return {doc:pdf.finalize(),filename:buildExportFileName("GPS_Sesion",[clubBrand?.name,session.squad_name,session.date,session.title])};
}
