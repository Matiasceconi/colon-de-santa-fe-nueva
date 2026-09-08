import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Filter,
  MapPin, Plus, Settings2, Sparkles, Trophy, Video, Dumbbell, Utensils,
} from "lucide-react";

const DAYS = [
  { id:"lun", label:"LUN", date:"24" },{ id:"mar", label:"MAR", date:"25" },
  { id:"mie", label:"MIÉ", date:"26", today:true },{ id:"jue", label:"JUE", date:"27" },
  { id:"vie", label:"VIE", date:"28" },{ id:"sab", label:"SÁB", date:"29" },
  { id:"dom", label:"DOM", date:"30" },
];
const EVENTS = [
  {id:1,day:"lun",time:"10:00",title:"Recuperación + gimnasio",place:"Gimnasio",type:"Rendimiento",tone:"violet",icon:Dumbbell},
  {id:2,day:"mar",time:"10:00",title:"Entrenamiento MD-4",place:"Campo 2",type:"Entrenamiento",tone:"emerald",icon:Dumbbell},
  {id:3,day:"mie",time:"08:45",title:"Desayuno",place:"Comedor",type:"Nutrición",tone:"amber",icon:Utensils},
  {id:4,day:"mie",time:"10:00",title:"Sesión MD-3 · Alta intensidad",place:"Campo 2",type:"Entrenamiento",tone:"emerald",icon:Dumbbell},
  {id:5,day:"mie",time:"16:30",title:"Video prepartido",place:"Sala táctica",type:"Cuerpo Técnico",tone:"blue",icon:Video},
  {id:6,day:"jue",time:"10:30",title:"Entrenamiento MD-2",place:"Campo 1",type:"Entrenamiento",tone:"emerald",icon:Dumbbell},
  {id:7,day:"vie",time:"10:00",title:"Activación MD-1",place:"Campo 1",type:"Entrenamiento",tone:"cyan",icon:Dumbbell},
  {id:8,day:"sab",time:"18:00",title:"Concentración",place:"Hotel Performance",type:"Logística",tone:"violet",icon:MapPin},
  {id:9,day:"dom",time:"16:00",title:"Performance FC vs Deportivo Norte",place:"Estadio Performance",type:"Partido",tone:"rose",icon:Trophy,match:true},
];
const TONES = {
  violet:"border-violet-500/30 bg-violet-500/10 text-violet-300",
  emerald:"border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber:"border-amber-500/30 bg-amber-500/10 text-amber-300",
  blue:"border-blue-500/30 bg-blue-500/10 text-blue-300",
  cyan:"border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  rose:"border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function EventCard({event,onCopy}) {
  const Icon=event.icon;
  return <button data-tour={event.match?"schedule-match":event.id===4?"schedule-event":undefined} className={`group w-full rounded-xl border p-2.5 text-left transition hover:brightness-125 ${TONES[event.tone]}`}><div className="flex items-start gap-2"><Icon size={13} className="mt-0.5 shrink-0"/><div className="min-w-0 flex-1"><p className="text-[10px] font-black">{event.time}</p><p className="mt-1 text-[11px] font-bold leading-snug text-white">{event.title}</p><p className="mt-1 truncate text-[9px] text-zinc-500">{event.place}</p></div><span onClick={(e)=>{e.stopPropagation();onCopy(event);}} className="opacity-0 transition group-hover:opacity-100"><Copy size={11}/></span></div></button>;
}

export default function DemoSchedule() {
  const [view,setView]=useState("week");
  const [type,setType]=useState("Todos");
  const [copied,setCopied]=useState(null);
  const [newOpen,setNewOpen]=useState(false);
  const [weekOffset,setWeekOffset]=useState(0);
  const filtered=useMemo(()=>EVENTS.filter(e=>type==="Todos"||e.type===type),[type]);

  useEffect(()=>{const handler=(event)=>{if(event.detail==="calendar-week")setView("week");if(event.detail==="calendar-month")setView("month");};window.addEventListener("pp-demo-tour-view",handler);return()=>window.removeEventListener("pp-demo-tour-view",handler);},[]);

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-24">
    <section data-tour="schedule-header" className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/80 via-zinc-900 to-zinc-950 p-6"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Calendario conectado</p><h1 className="mt-2 text-3xl font-black text-white">Cronograma de Reserva</h1><p className="mt-2 text-sm text-zinc-400">Entrenamientos, comidas, video, logística y partidos en una sola semana.</p></div><button onClick={()=>setNewOpen(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500"><Plus size={15}/> Nuevo evento</button></div></section>

    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div data-tour="schedule-views" className="flex rounded-xl bg-zinc-950 p-1"><button onClick={()=>setView("week")} className={`rounded-lg px-4 py-2 text-xs font-bold ${view==="week"?"bg-white text-zinc-950":"text-zinc-500"}`}>Semana</button><button onClick={()=>setView("month")} className={`rounded-lg px-4 py-2 text-xs font-bold ${view==="month"?"bg-white text-zinc-950":"text-zinc-500"}`}>Mes</button></div>
      <div data-tour="schedule-filters" className="flex flex-wrap gap-2"><span className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400"><Filter size={13}/>Tipo</span><select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white">{["Todos","Entrenamiento","Partido","Rendimiento","Cuerpo Técnico","Nutrición","Logística"].map(x=><option key={x}>{x}</option>)}</select><span className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Plantel: Reserva</span></div>
      <div data-tour="schedule-actions" className="flex gap-2"><button className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400"><Sparkles size={13}/> Importar</button><button className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400"><Download size={13}/> Exportar</button><button className="rounded-xl border border-white/10 p-2 text-zinc-400"><Settings2 size={14}/></button></div>
    </div>

    {copied&&<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3"><Copy size={15} className="text-violet-300"/><p className="flex-1 text-xs text-violet-200">Copiando <strong>{copied.title}</strong>. Elegí un día para pegarlo.</p><button onClick={()=>setCopied(null)} className="text-xs font-bold text-zinc-400">Cancelar</button></div>}

    {view==="week"?<section data-tour="schedule-week" className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950 p-3"><div className="mb-4 flex items-center justify-between"><button onClick={()=>setWeekOffset(w=>w-1)} className="rounded-xl border border-white/10 p-2 text-zinc-400"><ChevronLeft size={15}/></button><div className="text-center"><h2 className="text-sm font-black text-white">{weekOffset===0?"24 – 30 de agosto de 2026":weekOffset<0?"17 – 23 de agosto de 2026":"31 de agosto – 6 de septiembre"}</h2><p className="mt-1 text-[10px] text-zinc-600">Microciclo competitivo · MD+1 → MD</p></div><button onClick={()=>setWeekOffset(w=>w+1)} className="rounded-xl border border-white/10 p-2 text-zinc-400"><ChevronRight size={15}/></button></div><div className="grid min-w-[980px] grid-cols-7 gap-2">{DAYS.map(day=><div key={day.id} onClick={()=>copied&&setCopied(null)} className={`min-h-[430px] rounded-2xl border ${day.today?"border-blue-500/40 bg-blue-500/[0.05]":"border-white/[0.07] bg-zinc-900/70"}`}><div className="border-b border-white/[0.07] p-3 text-center"><p className="text-[9px] font-black tracking-wider text-zinc-600">{day.label}</p><p className={`mt-1 text-2xl font-black ${day.today?"text-blue-300":"text-white"}`}>{day.date}</p>{day.today&&<span className="mt-1 inline-block rounded-full bg-blue-500 px-2 py-0.5 text-[8px] font-bold text-white">HOY</span>}</div><div className="space-y-2 p-2">{filtered.filter(e=>e.day===day.id).map(e=><EventCard key={e.id} event={e} onCopy={setCopied}/>)}</div><button className="mx-2 mt-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 py-2 text-[10px] text-zinc-700 hover:text-white"><Plus size={11}/> Agregar</button></div>)}</div></section>:
    <section data-tour="schedule-month" className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><div className="mb-5 flex items-center justify-between"><ChevronLeft className="text-zinc-500"/><h2 className="font-black text-white">Agosto 2026</h2><ChevronRight className="text-zinc-500"/></div><div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-800">{Array.from({length:35}).map((_,i)=>{const date=i-3;const inMonth=date>0&&date<=31;const count=inMonth?EVENTS.filter(e=>Number(DAYS.find(d=>d.id===e.day)?.date)===date).length:0;return <div key={i} className={`min-h-28 bg-zinc-950 p-2 ${!inMonth?"opacity-30":""}`}><p className="text-xs font-bold text-zinc-400">{inMonth?date:""}</p>{count>0&&<div className="mt-2 space-y-1"><span className="block rounded bg-blue-500/15 px-1.5 py-1 text-[9px] font-bold text-blue-300">{count} eventos</span></div>}</div>})}</div></section>}

    <section data-tour="schedule-flow" className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-5"><div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-300"><CalendarDays className="text-blue-300" size={17}/><span>Calendario</span><ChevronRight size={13} className="text-zinc-600"/><span>Sesión / Partido</span><ChevronRight size={13} className="text-zinc-600"/><span>Planificación semanal</span><ChevronRight size={13} className="text-zinc-600"/><span>Convocatoria y GPS</span></div><p className="mt-3 text-xs leading-relaxed text-zinc-500">Un evento se registra una sola vez y se conecta con los módulos que necesitan esa información.</p></section>

    {newOpen&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={()=>setNewOpen(false)}><div onClick={(e)=>e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6"><p className="text-[10px] font-black uppercase tracking-wider text-blue-300">Nuevo evento</p><h2 className="mt-2 text-xl font-black text-white">Agregar al calendario</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><input placeholder="Título" className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"/><select className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"><option>Entrenamiento</option><option>Partido</option><option>Logística</option></select><input type="date" defaultValue="2026-08-26" className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"/><input type="time" defaultValue="10:00" className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"/><input placeholder="Lugar" className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white sm:col-span-2"/></div><div className="mt-6 flex gap-2"><button onClick={()=>setNewOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-zinc-400">Cancelar</button><button onClick={()=>setNewOpen(false)} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">Guardar evento</button></div></div></div>}
  </div>;
}
