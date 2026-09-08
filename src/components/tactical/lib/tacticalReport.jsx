import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import TacticalStage from "../editor/TacticalStage";
import { createBrandedPdf, buildExportFileName } from "@/lib/exports/pdfExportKit";

const sizes = { "16:9":[1920,1080], square:[1080,1080], story:[1080,1920], a4_horizontal:[1754,1240], a4_vertical:[1240,1754] };

function captureDocument(stage, board, pixelRatio) {
  const clone=stage.clone();
  try {
    clone.position({x:0,y:0});clone.scale({x:1,y:1});
    clone.size({width:board?.document_width || 1600,height:board?.document_height || 900});
    clone.find("Transformer").forEach(node=>node.destroy());
    clone.draw();
    return clone.toDataURL({pixelRatio,mimeType:"image/png"});
  } finally { clone.destroy(); }
}

export async function buildTacticalExport({stage,boards,currentBoardId,scope,format,size,quality,brand,project}) {
  const all=scope==="all" && format==="pdf";
  const selected=all ? boards : boards.filter(b=>b.id===currentBoardId);
  if(!selected.length)throw new Error("No hay pizarras para exportar.");
  const images=[];
  for(const board of selected) {
    if(board.id===currentBoardId) {
      images.push({board,image:captureDocument(stage,board,quality==="high"?2:1)});
    } else {
      const container=document.createElement("div");
      Object.assign(container.style,{position:"fixed",left:"-20000px",top:"0",width:`${board.document_width||1600}px`,height:`${board.document_height||900}px`});
      document.body.appendChild(container);
      const root=createRoot(container),ref=React.createRef();
      try {
        flushSync(()=>root.render(<TacticalStage ref={ref} board={board} elements={board.elements||[]} selectedIds={[]} readOnly zoom={1} pan={{x:0,y:0}} />));
        const hidden=ref.current?.getStage();
        if(!hidden)throw new Error("No se pudo preparar la pizarra "+board.name);
        images.push({board,image:captureDocument(hidden,board,quality==="high"?2:1)});
      } finally { root.unmount();container.remove(); }
    }
  }
  const filename=buildExportFileName("Tactica",[brand?.name,project?.name,all?"Todas":selected[0].name],format==="clipboard"?"png":format);
  if(format==="pdf") {
    const pdf=await createBrandedPdf({brand,title:project?.name||"Informe táctico",orientation:size==="a4_vertical"?"portrait":"landscape",format:"a4"});
    images.forEach(({board,image},index)=>{
      if(index)pdf.pageBreak();
      pdf.sectionTitle(board.name||`Pizarra ${index+1}`);
      const w=pdf.pageW-2*pdf.margin,h=(board.document_height||900)/(board.document_width||1600)*w;
      pdf.image(image,{width:w,height:h});
    });
    return {blob:pdf.finalize().output("blob"),filename};
  }
  const [w,h]=sizes[size]||sizes["16:9"],factor=quality==="high"?2:1;
  const canvas=document.createElement("canvas");canvas.width=w*factor;canvas.height=h*factor;
  const context=canvas.getContext("2d");context.fillStyle="#0F172A";context.fillRect(0,0,canvas.width,canvas.height);
  const image=new Image();image.src=images[0].image;await image.decode();
  const scale=Math.min(canvas.width/image.width,canvas.height/image.height);
  context.drawImage(image,(canvas.width-image.width*scale)/2,(canvas.height-image.height*scale)/2,image.width*scale,image.height*scale);
  const mime=format==="jpg"?"image/jpeg":"image/png";
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,.95));
  if(!blob)throw new Error("No se pudo generar la imagen.");
  return {blob,filename};
}
