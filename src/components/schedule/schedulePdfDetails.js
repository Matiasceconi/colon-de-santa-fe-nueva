import { resolvePdfBrand, hexToRgb, registerPdfFonts, safeExportText } from "@/lib/exports/pdfExportKit";
import { contrastText } from "@/lib/clubBrandResolver";

// Calendar grids are an overview. The appendix preserves every event and its full text.
export async function appendScheduleDetails(doc, { brand: rawBrand, days, eventsForDate }) {
  const brand=resolvePdfBrand(rawBrand),margin=12;
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  await registerPdfFonts(doc);
  const family=doc.getFontList().PP?"PP":"helvetica";
  let y=0;
  function page() {
    doc.addPage();
    doc.setFillColor(...hexToRgb(brand.colors.primary));doc.rect(0,0,width,24,"F");
    doc.setFont(family,"bold");doc.setFontSize(12);doc.setTextColor(...hexToRgb(contrastText(brand.colors.primary)));
    doc.text("Cronograma · detalle de actividades",margin,10);
    doc.setFontSize(8);doc.text(doc.splitTextToSize(brand.name,width-margin*2).slice(0,1),margin,17);
    doc.setFontSize(7);doc.setTextColor(71,85,105);
    doc.text(doc.splitTextToSize(brand.footerText || [brand.name,brand.showPerformancePitchBrand?"PerformancePitch":""].filter(Boolean).join(" · "),width-2*margin).slice(0,1),margin,height-6);
    y=34;
  }
  function text(value,bold=false,size=8) {
    doc.setFont(family,bold?"bold":"normal");doc.setFontSize(size);
    const lines=doc.splitTextToSize(safeExportText(value),width-margin*2);
    for(const line of lines){
      if(y>height-18)page();
      doc.setFont(family,bold?"bold":"normal");doc.setFontSize(size);doc.setTextColor(15,23,42);
      doc.text(line,margin,y);y+=size*.45;
    }
    y+=3;
  }
  if(!days.some(d=>(eventsForDate(d.format("YYYY-MM-DD"))||[]).length))return doc;
  page();
  for(const day of days){
    const events=eventsForDate(day.format("YYYY-MM-DD"))||[];
    if(!events.length)continue;
    if(y>height-40)page();
    text(day.format("DD/MM/YYYY")+" · "+events.length+" actividades",true,10);
    for(const event of events){
      text([event.time||event.start_time,event.end_time?"a "+event.end_time:"",event.rival?"vs "+event.rival:event.title||event.event_type||"Actividad"].filter(Boolean).join(" · "),true);
      if(event.location)text("Lugar: "+event.location);
      if(event.description)text(event.description);
      if(event.notes)text(event.notes);
    }
  }
  return doc;
}
