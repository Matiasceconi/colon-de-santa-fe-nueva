import { createBrandedPdf, drawMatchHeader, buildExportFileName, loadExportImage, addImageSafe, hexToRgb } from "@/lib/exports/pdfExportKit";
import { contrastText } from "@/lib/clubBrandResolver";
import { getPlayerName, getPlayerNumber } from "@/lib/matchCallupUtils";

export async function createFormationPdf({match,system,positions,playerMap,savedCallups=[],captainPlayerId,clubBrand,type="completo"}) {
  const pdf=await createBrandedPdf({brand:clubBrand,title:type==="convocados"?"Lista de convocados":type==="formacion"?"Formación del equipo":"Convocatoria y formación",subtitle:match.rival,meta:[match.date,match.squad_name]});
  const callups=new Map(savedCallups.map(c=>[c.player_id,c]));
  const row=id=>({player:playerMap.get(id),callup:callups.get(id)});
  const starters=Object.keys(positions).map(row).filter(r=>r.player);
  const bench=[...callups.keys()].filter(id=>!positions[id]).map(row).filter(r=>r.player);
  const name=r=>getPlayerName(r.player)||"Jugador";
  const number=r=>r.callup?.shirt_number ?? getPlayerNumber(r.player) ?? "—";
  const columns=[{key:"number",label:"N°",width:.5,value:number},{key:"name",label:"Jugador",width:2,bold:true,value:name},{key:"position",label:"Posición",value:r=>r.player.position},{key:"squad",label:"Plantel de origen",value:r=>r.player.origin_squad_name||r.player.squad_name},{key:"captain",label:"Capitán",width:.6,value:r=>r.player.id===captainPlayerId?"C":""}];
  drawMatchHeader(pdf,{match,system});
  if(type!=="formacion") {
    for(const [title,rows] of [["Equipo titular",starters],["Suplentes",bench.filter(r=>r.callup.lineup_role==="suplente")],["Convocados sin rol",bench.filter(r=>r.callup.lineup_role!=="suplente")]]) {
      pdf.sectionTitle(title+" · "+rows.length);pdf.table({columns,rows});
    }
  }
  if(type!=="convocados") {
    if(type==="completo")pdf.pageBreak();
    pdf.sectionTitle("Ubicación táctica · "+(system||"Libre"));
    pdf.paragraph("Ataque hacia arriba · C: capitán · Las posiciones corresponden a la formación seleccionada.",{fontSize:7});
    const {doc}=pdf,w=160,h=180;
    pdf.ensureSpace(h+5);
    const x=(pdf.pageW-w)/2,y=pdf.getY();
    doc.setFillColor(16,100,63);doc.rect(x,y,w,h,"F");
    doc.setDrawColor(230,245,236);doc.setLineWidth(.4);
    doc.rect(x+3,y+3,w-6,h-6);doc.line(x+3,y+h/2,x+w-3,y+h/2);doc.circle(x+w/2,y+h/2,15);
    doc.rect(x+w*.25,y+3,w*.5,28);doc.rect(x+w*.25,y+h-31,w*.5,28);
    doc.rect(x+w*.37,y+3,w*.26,12);doc.rect(x+w*.37,y+h-15,w*.26,12);
    const photos=await Promise.all(starters.map(r=>loadExportImage(r.player.photo_url||r.player.avatar_url)));
    starters.forEach((r,i)=>{
      const pos=positions[r.player.id],px=x+Math.max(8,Math.min(92,(Number.isFinite(Number(pos.x))?Number(pos.x):50)))*w/100,py=y+(100-Math.max(9,Math.min(91,(Number.isFinite(Number(pos.y))?Number(pos.y):50))))*h/100;
      doc.setFillColor(...hexToRgb(pdf.brand.colors.primary));doc.circle(px,py,6.5,"F");
      if(!addImageSafe(doc,photos[i],px-5.5,py-5.5,11,11)){
        doc.setFontSize(7);doc.setTextColor(...hexToRgb(contrastText(pdf.brand.colors.primary)));doc.text(String(number(r)),px,py+2,{align:"center"});
      }
      doc.setFillColor(15,23,42);doc.roundedRect(px-16,py+7,32,11,1,1,"F");
      doc.setFontSize(6);doc.setTextColor(255,255,255);
      const label=(r.player.id===captainPlayerId?"C · ":"")+number(r)+" · "+name(r);
      doc.text(doc.splitTextToSize(label,30).slice(0,2),px,py+11,{align:"center"});
    });
    pdf.setY(y+h+5);
    pdf.sectionTitle("Jugadores y dorsales");
    pdf.table({columns,rows:starters});
    pdf.sectionTitle("Suplentes y otros convocados");
    pdf.table({columns,rows:bench});
  }
  return {doc:pdf.finalize(),filename:buildExportFileName(type,[clubBrand?.name,match.squad_name,match.rival,match.date])};
}
