import { hexToRgb, formatExportNumber } from "./pdfExportKit";

export function drawVectorChart(pdf, { title, points = [], color, type = "bar", unit = "", decimals = 0, showAverage = true, referenceLabel = "Color: sesión · Gris: referencia", showLabels = true }) {
  const valid = value => value != null && value !== "" && Number.isFinite(Number(value));
  const { doc, margin, pageW } = pdf;
  const width = pageW - 2 * margin;
  if (!points.length) { pdf.sectionTitle(title); pdf.paragraph("Sin datos para este gráfico."); return; }
  const values = points.flatMap(p => [p.value, p.reference]).filter(valid).map(Number);
  const maximum = Math.max(1, ...values);
  const minimum = Math.min(0, ...values);
  const averageValues = points.map(p => p.value).filter(valid).map(Number);
  const mean = averageValues.length ? averageValues.reduce((a,b) => a+b, 0) / averageValues.length : null;
  const hasReference = points.some(p => valid(p.reference));
  // Keep the same axis across continuation panels; never discard players.
  for (let offset = 0; offset < points.length; offset += 10) {
    const chunk = points.slice(offset, offset + 10);
    pdf.ensureSpace(99);
    pdf.sectionTitle(title + (points.length > 10 ? ` · ${offset + 1}–${offset + chunk.length} / ${points.length}` : ""));
    const top = pdf.getY() + 5, bottom = top + 48, left = margin + 14, plotW = width - 20;
    const py = v => bottom - (Number(v) - minimum) / (maximum - minimum) * 48;
    doc.setFontSize(6);
    for (let i=0;i<=4;i++) {
      const v = minimum + (maximum-minimum)*i/4;
      doc.setDrawColor(226,232,240); doc.line(left,py(v),left+plotW,py(v));
      doc.setTextColor(71,85,105); doc.text(formatExportNumber(v,{decimals}),left-2,py(v)+1,{align:"right"});
    }
    const slot = plotW / chunk.length;
    let prev = null, prevRef = null;
    chunk.forEach((p,i) => {
      const x=left+slot*(i+.5), y=valid(p.value)?py(p.value):null;
      doc.setFillColor(...hexToRgb(color || pdf.brand.colors.accent));
      doc.setDrawColor(...hexToRgb(color || pdf.brand.colors.accent));
      if(y!==null) {
        if(type==="line" || type==="area") {
          if(type==="area" && prev) {
            const rgb=hexToRgb(color || pdf.brand.colors.accent).map(v=>Math.round(v*.3+255*.7));
            doc.setFillColor(...rgb);
            doc.lines([[x-prev.x,y-prev.y],[0,py(0)-y],[prev.x-x,0],[0,prev.y-py(0)]],prev.x,prev.y,[1,1],"F",true);
            doc.setFillColor(...hexToRgb(color || pdf.brand.colors.accent));
          }
          if(prev) doc.line(prev.x,prev.y,x,y); doc.circle(x,y,.9,"F");
        }
        else doc.rect(x-slot*.3,Math.min(y,py(0)),slot*(hasReference ? .28 : .6),Math.max(.1,Math.abs(py(0)-y)),"F");
        doc.setTextColor(15,23,42); if(showLabels) doc.text(formatExportNumber(p.value,{decimals}),x,y-2,{align:"center"});
      }
      if(y===null) { doc.setTextColor(71,85,105); doc.text("—",x,bottom-2,{align:"center"}); }
      prev=y===null?null:{x,y};
      if(valid(p.reference)) {
        const ry=py(p.reference);
        doc.setDrawColor(100,116,139);doc.setFillColor(100,116,139);
        if(type==="line"){if(prevRef)doc.line(prevRef.x,prevRef.y,x,ry);doc.circle(x,ry,.7,"F");}
        else doc.rect(x+slot*.02,Math.min(ry,py(0)),slot*.28,Math.max(.1,Math.abs(py(0)-ry)),"F");
        prevRef={x,y:ry};
      } else prevRef=null;
      doc.setTextColor(51,65,85);
      const label=doc.splitTextToSize(String(p.label||"Sin nombre"),Math.max(10,slot-2)).slice(0,3);
      doc.text(label,x,bottom+4,{align:"center"});
    });
    if(showAverage && !hasReference && mean!==null) {
      doc.setDrawColor(...hexToRgb(pdf.brand.colors.primary));doc.setLineDashPattern([1,1],0);
      doc.line(left,py(mean),left+plotW,py(mean));doc.setLineDashPattern([],0);
    }
    pdf.setY(bottom+18);
    pdf.paragraph([unit, hasReference ? referenceLabel : showAverage && mean!==null ? `Promedio: ${formatExportNumber(mean,{decimals})}` : ""].filter(Boolean).join(" · "),{fontSize:7});
  }
}
