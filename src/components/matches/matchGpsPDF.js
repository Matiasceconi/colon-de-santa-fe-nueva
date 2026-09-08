import { MATCH_METRICS, PERIODS, fmt, metricValue, metricUnit, pairedRows, periodRow, radarRows } from "./matchGpsAnalysis";
import { createBrandedPdf, buildExportFileName, hexToRgb } from "@/lib/exports/pdfExportKit";
import { drawVectorChart } from "@/lib/exports/vectorChart";

function drawRadar(pdf, rows, mode) {
  const players=rows.slice(0,4),axes=radarRows(players,mode),colors=["#0284C7","#059669","#B45309","#7C3AED"];
  pdf.ensureSpace(145);
  const {doc}=pdf,cx=pdf.pageW/2,cy=pdf.getY()+57,r=38;
  const point=(i,v)=>({x:cx+Math.sin(i*Math.PI*2/axes.length)*r*v/100,y:cy-Math.cos(i*Math.PI*2/axes.length)*r*v/100});
  for(let level=25;level<=100;level+=25)for(let i=0;i<axes.length;i++){const a=point(i,level),b=point((i+1)%axes.length,level);doc.setDrawColor(203,213,225);doc.line(a.x,a.y,b.x,b.y);}
  axes.forEach((a,i)=>{const p=point(i,125);doc.setTextColor(51,65,85);doc.setFontSize(7);doc.text(doc.splitTextToSize(a.metric,34),p.x,p.y,{align:"center"});});
  players.forEach((p,j)=>{
    doc.setDrawColor(...hexToRgb(colors[j]));doc.setLineWidth(.6);
    axes.forEach((a,i)=>{const value=a["p"+j],next=axes[(i+1)%axes.length]["p"+j];if(value==null||next==null)return;const p1=point(i,value),p2=point((i+1)%axes.length,next);doc.line(p1.x,p1.y,p2.x,p2.y);});
  });
  pdf.setY(cy+58);
  players.forEach((p,i)=>pdf.paragraph(p.player_name,{fontSize:7,color:colors[i]}));
  pdf.paragraph("Radar: hasta cuatro jugadores, según la selección visible. Cada eje usa como 100 el máximo de estos jugadores; faltantes no se convierten en cero.",{fontSize:7});
  pdf.table({columns:[{key:"metric",label:"Métrica"},{key:"reference",label:"100 equivale a",value:r=>fmt(r.reference)},{key:"unit",label:"Unidad"}],rows:axes});
}

export async function exportMatchGpsPDF({match,brand,rows=[],sourceRows,pairs=[],metric,mode="absolute",context,minimum=0,notes,warnings=[],charts=[],download=true}) {
  const pdf=await createBrandedPdf({brand,title:"Informe GPS del partido",subtitle:match.opponent||match.rival||match.title,meta:[match.date,match.squad_name,match.competition].filter(Boolean)});
  pdf.paragraph(context || "");
  pdf.paragraph(rows.length+" jugadores en la selección. La duración GPS no equivale a minutos oficiales ni tiempo efectivo. Intensidad = valor / duración GPS; velocidad máxima sin dividir por minutos.");
  pdf.sectionTitle("Lectura y criterios");
  pdf.paragraph("Los faltantes se muestran como Sin dato. El Total conserva el total exportado o suma los tiempos disponibles; nunca suma Total + tiempos. Una diferencia entre tiempos no demuestra fatiga. Considerar posición, marcador, sustituciones y exposición.");
  if(notes?.trim()){pdf.sectionTitle("Observaciones del profesional");pdf.paragraph(notes);}
  for(let i=0;i<MATCH_METRICS.length;i+=4){
    const metrics=MATCH_METRICS.slice(i,i+4);
    pdf.sectionTitle("Carga individual · "+(mode==="relative"?"por minuto GPS":"valores absolutos"));
    pdf.table({columns:[{key:"player_name",label:"Jugador",width:2,bold:true},{key:"lineup_role",label:"Rol",value:r=>r.lineup_role||"—"},{key:"official_minutes",label:"Min oficial",value:r=>r.official_minutes==null?"—":fmt(r.official_minutes)},{key:"total_duration",label:"Min GPS",value:r=>fmt(r.total_duration)},...metrics.map(m=>({key:m.key,label:m.label+" ("+metricUnit(m,mode)+")",value:r=>fmt(metricValue(r,m.key,mode)),align:"right"}))],rows});
  }
  pdf.sectionTitle("Primer vs segundo tiempo · "+(metric?.label||""));
  pdf.paragraph("Mismos jugadores · mínimo "+minimum+" min GPS por tiempo. No comparable: falta un tiempo, una métrica o exposición suficiente.");
  pdf.table({columns:[{key:"player_name",label:"Jugador",width:2},{key:"firstMinutes",label:"Min 1T",value:r=>fmt(r.firstMinutes)},{key:"secondMinutes",label:"Min 2T",value:r=>fmt(r.secondMinutes)},{key:"first",label:"Valor 1T",value:r=>fmt(r.first)},{key:"second",label:"Valor 2T",value:r=>fmt(r.second)},{key:"percent",label:"Cambio %",value:r=>!r.eligible?"No comparable":r.percent==null?"Base cero":fmt(r.percent)+" %"}],rows:pairs});
  for(const chart of charts){
    const m=MATCH_METRICS.find(m=>m.key===chart.metric);
    if(!m)throw new Error("Un gráfico tiene una métrica inválida.");
    const scoped=sourceRows||rows;
    const selected=chart.period?scoped.map(r=>{const p=periodRow(r,chart.period);return p?{...r,...p,player_name:r.player_name}:null;}).filter(Boolean):rows;
    pdf.pageBreak();
    pdf.paragraph((PERIODS[chart.period]||context||"")+" · "+metricUnit(m,mode),{fontSize:8});
    if(chart.type==="radar"){pdf.sectionTitle("Radar relativo");drawRadar(pdf,selected,mode);continue;}
    let points;
    if(chart.type==="halves"){
      points=pairedRows(scoped,m.key,mode,minimum).filter(r=>r.eligible).map(r=>({label:r.player_name,value:r.first,reference:r.second}));
      pdf.paragraph("Color: primer tiempo · Gris: segundo tiempo.",{fontSize:7});
    }else{
      points=selected.map(r=>({label:r.player_name,value:metricValue(r,m.key,mode)})).filter(p=>p.value!=null);
      if(chart.type==="ranking")points.sort((a,b)=>b.value-a.value);
    }
    drawVectorChart(pdf,{title:chart.title||m.label,points,color:chart.color,type:chart.type,unit:metricUnit(m,mode),decimals:1,showAverage:false,referenceLabel:chart.type==="halves"?"Color: primer tiempo · Gris: segundo tiempo":undefined,showLabels:chart.labels!==false});
  }
  pdf.sectionTitle("Calidad de datos y metodología");
  pdf.paragraph("CSV: "+(match.csv_label||"Archivo GPS del partido"));
  pdf.paragraph("Los suplentes con un solo tiempo no reciben una comparación artificial contra cero. Los valores por minuto de exposiciones cortas requieren interpretación contextual. Con un CSV agregado por tiempos no se pueden reconstruir picos móviles de 1, 3 o 5 minutos.");
  warnings.forEach(w=>pdf.paragraph(w,{fontSize:8}));
  pdf.sectionTitle("Fuentes");
  pdf.paragraph("Morgans et al. (2025). Can different scores in first and second halves influence running and explosive-based measures? Biology of Sport. DOI: 10.5114/biolsport.2025.144296",{fontSize:7});
  pdf.paragraph("Oliva-Lozano et al. (2020). Worst case scenario match analysis and contextual variables in professional soccer players. Biology of Sport. DOI: 10.5114/biolsport.2020.97067",{fontSize:7});
  const doc=pdf.finalize(),filename=buildExportFileName("GPS_Partido",[brand?.name,match.squad_name,match.date,match.rival]);
  if(download)doc.save(filename);
  return {doc,filename};
}
