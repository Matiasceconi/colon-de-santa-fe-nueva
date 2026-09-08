import React, { useEffect, useState } from "react";
import {
  Activity, ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, FileSpreadsheet,
  Filter, MapPin, Search, ShieldCheck, Sparkles, Star, UserCheck,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PLAYERS = [
  ["p1","Lucas Herrera","ARQ",1],["p2","Nicolás Paz","DFC",2],["p3","Franco Vega","DFC",6],
  ["p4","Julián Torres","LD",4],["p5","Matías Luna","LI",3],["p6","Tomás Silva","MC",8],
  ["p7","Mateo Ríos","MC",5],["p8","Bruno Ferrer","MCO",10],["p9","Santiago Leiva","ED",7],
  ["p10","Lautaro Benítez","EI",11],["p11","Agustín Castro","DC",9],["p12","Iván Molina","ARQ",12],
  ["p13","Facundo Díaz","DFC",13],["p14","Benjamín Sosa","LD",14],["p15","Thiago Acosta","MC",15],
  ["p16","Juan Cruz Romero","MC",16],["p17","Alan Méndez","MCO",17],["p18","Valentín Ruiz","ED",18],
  ["p19","Joaquín Pereyra","EI",19],["p20","Emiliano Suárez","DC",20],["p21","Máximo Arias","DFC",21],
  ["p22","Felipe Gómez","MC",22],["p23","Ramiro Núñez","DC",23],["p24","Alexis Roldán","LI",24],
  ["p25","Damián López","MC",25],["p26","Kevin Martínez","ED",26],
].map(([id,name,position,number])=>({id,name,position,number}));

const MATCHES = [
  { id:"m1", date:"23 AGO", rival:"Atlético Central", competition:"Liga Nacional · Fecha 16", result:"2 - 1", location:"Local", gps:true, called:23, status:"Finalizado" },
  { id:"m2", date:"30 AGO", rival:"Deportivo Norte", competition:"Liga Nacional · Fecha 17", result:"VS", location:"Local", gps:false, called:0, status:"Próximo" },
  { id:"m3", date:"06 SEP", rival:"Unión Metropolitana", competition:"Liga Nacional · Fecha 18", result:"VS", location:"Visitante", gps:false, called:0, status:"Programado" },
];

const FORMATION = [
  {key:"gk",label:"ARQ",x:50,y:86},{key:"lb",label:"LI",x:18,y:68},{key:"lcb",label:"DFC",x:40,y:70},
  {key:"rcb",label:"DFC",x:60,y:70},{key:"rb",label:"LD",x:82,y:68},{key:"dm",label:"MC",x:50,y:50},
  {key:"lcm",label:"MC",x:32,y:42},{key:"rcm",label:"MCO",x:68,y:42},{key:"lw",label:"EI",x:18,y:20},
  {key:"st",label:"DC",x:50,y:13},{key:"rw",label:"ED",x:82,y:20},
];

const GPS_ROWS = [
  {name:"Tomás Silva",distance:10840,intensity:912,sprints:11,smax:31.2},
  {name:"Mateo Ríos",distance:10420,intensity:860,sprints:9,smax:30.4},
  {name:"Santiago Leiva",distance:10180,intensity:1080,sprints:14,smax:33.1},
  {name:"Lautaro Benítez",distance:9950,intensity:1025,sprints:13,smax:32.7},
  {name:"Agustín Castro",distance:9470,intensity:790,sprints:8,smax:30.8},
];

function Shield({label="AC",tone="blue"}) {
  return <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xs font-black ${tone==="club"?"border-blue-400/30 bg-blue-600 text-white":"border-white/10 bg-zinc-800 text-zinc-300"}`}>{label}</span>;
}

function MatchCard({match,onOpen}) {
  return <button data-tour={match.gps?"matches-example":undefined} onClick={onOpen} className="group w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/85 text-left transition hover:border-blue-500/40 hover:bg-zinc-900">
    <div className="grid items-center gap-4 p-4 md:grid-cols-[78px_1fr_auto_1fr_210px]">
      <div className="rounded-xl bg-black/20 p-3 text-center"><p className="text-xl font-black text-white">{match.date.split(" ")[0]}</p><p className="text-[10px] font-bold text-zinc-500">{match.date.split(" ")[1]}</p></div>
      <div className="flex items-center gap-3"><Shield label="PFC" tone="club"/><div><p className="font-black text-white">Performance FC</p><p className="text-xs text-zinc-500">Reserva</p></div></div>
      <div className="text-center"><p className={`text-2xl font-black ${match.result==="2 - 1"?"text-emerald-300":"text-zinc-500"}`}>{match.result}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{match.status}</p></div>
      <div className="flex items-center gap-3"><Shield label={match.rival.split(" ").map(w=>w[0]).join("").slice(0,2)}/><div><p className="font-black text-white">{match.rival}</p><p className="text-xs text-zinc-500">{match.location}</p></div></div>
      <div><p className="text-xs font-bold text-zinc-300">{match.competition}</p><div className="mt-2 flex flex-wrap gap-1.5">{match.called>0&&<span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-300">{match.called} convocados</span>}{match.gps&&<span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-300">GPS procesado</span>}</div></div>
    </div>
    <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-4 py-2 text-xs font-bold text-blue-300">Abrir ficha completa <ChevronRight size={14}/></div>
  </button>;
}

function Callups({called,setCalled}) {
  const [search,setSearch]=useState("");
  const [position,setPosition]=useState("todas");
  const rows=PLAYERS.filter(p=>(position==="todas"||p.position===position)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const selected=new Set(called);
  return <div data-tour="matches-callups" className="grid gap-5 xl:grid-cols-[1fr_330px]">
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black text-white">Seleccionar convocatoria</h3><p className="mt-1 text-xs text-zinc-500">Marcá los jugadores disponibles para este partido.</p></div><div className="flex gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar jugador" className="h-9 rounded-xl border border-white/10 bg-zinc-950 pl-9 pr-3 text-xs text-white outline-none"/></div><select value={position} onChange={(e)=>setPosition(e.target.value)} className="h-9 rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs text-white"><option value="todas">Todas</option>{["ARQ","DFC","LD","LI","MC","MCO","ED","EI","DC"].map(p=><option key={p}>{p}</option>)}</select></div></div>
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(p=><button key={p.id} onClick={()=>setCalled((cur)=>selected.has(p.id)?cur.filter(id=>id!==p.id):[...cur,p.id])} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected.has(p.id)?"border-blue-500/40 bg-blue-500/10":"border-white/[0.07] bg-black/15 hover:border-white/20"}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-white">{p.number}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white">{p.name}</span><span className="text-[10px] text-zinc-500">{p.position}</span></span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected.has(p.id)?"border-blue-400 bg-blue-500 text-white":"border-zinc-700"}`}>{selected.has(p.id)&&<Check size={12}/>}</span></button>)}</div>
    </section>
    <aside className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.06] p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-300">Convocatoria actual</p><p className="mt-2 text-4xl font-black text-white">{called.length}</p></div><UserCheck size={30} className="text-blue-300"/></div><div className="mt-5 grid grid-cols-2 gap-2">{["ARQ","DEF","MED","ATA"].map((group,i)=><div key={group} className="rounded-xl bg-black/20 p-3"><p className="text-lg font-black text-white">{[2,7,9,5][i]}</p><p className="text-[9px] font-bold text-zinc-600">{group}</p></div>)}</div><p className="mt-5 text-xs leading-relaxed text-zinc-400">La lista alimenta automáticamente Formación, Minutos, GPS y Portal del Jugador.</p><button className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">Guardar convocatoria</button></aside>
  </div>;
}

function Pitch({called,lineup,setLineup,captain,setCaptain}) {
  const options=called.map(id=>PLAYERS.find(p=>p.id===id)).filter(Boolean);
  const used=new Set(Object.values(lineup));
  const bench=options.filter(p=>!used.has(p.id));
  return <div data-tour="matches-formation" className="grid gap-5 xl:grid-cols-[minmax(620px,1.2fr)_minmax(320px,.8fr)]">
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-white">Formación titular</h3><p className="mt-1 text-xs text-zinc-500">Sistema 4-3-3 · elegí cada jugador y el capitán.</p></div><div className="flex gap-2"><select className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white"><option>4-3-3</option><option>4-2-3-1</option><option>3-5-2</option></select><button className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300"><Sparkles size={13} className="mr-1 inline"/>Autocompletar</button></div></div>
      <div className="relative aspect-[1.35] min-h-[520px] overflow-hidden rounded-2xl border-4 border-white/80 bg-emerald-700 shadow-inner"><div className="absolute inset-x-0 top-1/2 border-t-2 border-white/70"/><div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70"/><div className="absolute left-1/2 top-0 h-20 w-52 -translate-x-1/2 border-x-2 border-b-2 border-white/70"/><div className="absolute bottom-0 left-1/2 h-20 w-52 -translate-x-1/2 border-x-2 border-t-2 border-white/70"/>
        {FORMATION.map((slot)=>{const player=PLAYERS.find(p=>p.id===lineup[slot.key]);return <div key={slot.key} className="absolute w-32 -translate-x-1/2 -translate-y-1/2 text-center" style={{left:`${slot.x}%`,top:`${slot.y}%`}}><button onClick={()=>player&&setCaptain(player.id)} className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-black shadow-lg ${captain===player?.id?"border-amber-300 bg-amber-400 text-zinc-950":"border-white bg-zinc-950 text-white"}`}>{captain===player?.id?<Star size={15} fill="currentColor"/>:(player?.number||slot.label)}</button><select value={lineup[slot.key]||""} onChange={(e)=>setLineup((l)=>({...l,[slot.key]:e.target.value}))} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-950/90 px-1 py-1 text-[10px] font-bold text-white outline-none"><option value="">{slot.label}</option>{options.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>})}
      </div>
    </section>
    <aside className="space-y-4"><div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><div className="flex items-center justify-between"><div><h3 className="font-black text-white">Control de formación</h3><p className="mt-1 text-xs text-zinc-500">11 titulares · {bench.length} suplentes</p></div><ShieldCheck className="text-emerald-400"/></div><div className="mt-4 space-y-2">{[["Sistema","4-3-3"],["Titulares",Object.values(lineup).filter(Boolean).length],["Capitán",PLAYERS.find(p=>p.id===captain)?.name||"Sin elegir"],["Suplentes",bench.length]].map(([l,v])=><div key={l} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-xs"><span className="text-zinc-500">{l}</span><span className="font-bold text-white">{v}</span></div>)}</div></div><div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><h3 className="font-black text-white">Banco de suplentes</h3><div className="mt-3 flex flex-wrap gap-2">{bench.map(p=><span key={p.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] text-zinc-300">#{p.number} {p.name}</span>)}</div></div><button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">Guardar formación</button></aside>
  </div>;
}

function GpsPanel() {
  return <div data-tour="matches-gps" className="space-y-5"><section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><FileSpreadsheet size={20}/></span><div><h3 className="font-black text-white">GPS cargado y procesado</h3><p className="mt-1 text-xs text-zinc-500">23 jugadores vinculados · Catapult · 23/08/2026</p></div></div><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Datos de ejemplo</span></div></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Distancia media","10.420 m"],["m/min","111,8"],["Alta intensidad","933 m"],["Velocidad máxima","33,1 km/h"]].map(([l,v])=><div key={l} className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{l}</p><p className="mt-3 text-2xl font-black text-white">{v}</p></div>)}</div><section className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><h3 className="font-black text-white">Distancia total por jugador</h3><p className="mt-1 text-xs text-zinc-500">Valores y etiquetas visibles para lectura inmediata.</p><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={GPS_ROWS} margin={{top:24,right:12,left:0,bottom:10}}><CartesianGrid stroke="#27272a" vertical={false}/><XAxis dataKey="name" tick={{fill:"#a1a1aa",fontSize:10}} interval={0}/><YAxis tick={{fill:"#71717a",fontSize:10}}/><Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:12}}/><Bar dataKey="distance" name="Distancia (m)" fill="#3b82f6" radius={[8,8,0,0]}><LabelList dataKey="distance" position="top" fill="#e4e4e7" fontSize={11} fontWeight={700}/></Bar></BarChart></ResponsiveContainer></div></section></div>;
}

export default function DemoMatches() {
  const [screen,setScreen]=useState("list");
  const [tab,setTab]=useState("summary");
  const [called,setCalled]=useState(PLAYERS.slice(0,23).map(p=>p.id));
  const [lineup,setLineup]=useState({ gk:"p1", lb:"p5", lcb:"p2", rcb:"p3", rb:"p4", dm:"p7", lcm:"p6", rcm:"p8", lw:"p10", st:"p11", rw:"p9" });
  const [captain,setCaptain]=useState("p6");

  useEffect(()=>{const handler=(event)=>{const view=event.detail;if(view==="match-list"){setScreen("list");setTab("summary");}else{setScreen("detail");if(["summary","callups","formation","gps"].includes(view))setTab(view);}};window.addEventListener("pp-demo-tour-view",handler);return()=>window.removeEventListener("pp-demo-tour-view",handler);},[]);

  if(screen==="list") return <div className="mx-auto max-w-[1500px] space-y-5 pb-24"><section data-tour="matches-header" className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/80 via-zinc-900 to-zinc-950 p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Centro competitivo</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-white">Partidos</h1><p className="mt-2 text-sm text-zinc-400">Fixture, convocatoria, formación, minutos, GPS y análisis en una sola ficha.</p></div><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">+ Nuevo partido</button></div></section><div data-tour="matches-filters" className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-3"><span className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400"><Filter size={13}/> Reserva</span><span className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Liga Nacional</span><span className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Temporada 2026</span></div><div className="space-y-3">{MATCHES.map(m=><MatchCard key={m.id} match={m} onOpen={()=>{setScreen("detail");setTab(m.gps?"summary":"callups");}}/>)}</div></div>;

  const tabs=[["summary","Resumen"],["callups","Convocatoria"],["formation","Formación"],["gps","GPS"]];
  return <div className="mx-auto max-w-[1500px] space-y-5 pb-24"><button onClick={()=>setScreen("list")} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft size={14}/> Volver a partidos</button><section data-tour="matches-detail" className="rounded-3xl border border-white/10 bg-zinc-900 p-5"><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><Shield label="PFC" tone="club"/><div><p className="text-[10px] uppercase tracking-wider text-zinc-500">Liga Nacional · Fecha 16</p><h1 className="mt-1 text-2xl font-black text-white">Performance FC <span className="text-zinc-600">2 - 1</span> Atlético Central</h1><div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500"><span className="flex items-center gap-1"><CalendarDays size={12}/>23/08/2026</span><span className="flex items-center gap-1"><Clock3 size={12}/>18:00</span><span className="flex items-center gap-1"><MapPin size={12}/>Estadio Performance</span></div></div></div><span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Finalizado · GPS cargado</span></div></section><div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-2" data-tour="matches-steps">{tabs.map(([id,label],i)=><button key={id} onClick={()=>setTab(id)} className={`relative rounded-xl px-3 py-3 text-xs font-bold transition ${tab===id?"bg-blue-600 text-white":"text-zinc-500 hover:bg-white/5 hover:text-white"}`}><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[10px]">{i+1}</span>{label}</button>)}</div>{tab==="summary"&&<div className="grid gap-5 lg:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 lg:col-span-2"><h3 className="font-black text-white">Flujo completo del partido</h3><div className="mt-5 grid gap-3 sm:grid-cols-4">{[["Convocados",called.length],["Titulares",11],["Minutos","Cargados"],["GPS","Procesado"]].map(([l,v],i)=><button key={l} onClick={()=>setTab(["callups","formation","summary","gps"][i])} className="rounded-xl border border-white/[0.07] bg-black/20 p-4 text-left"><p className="text-xl font-black text-white">{v}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{l}</p></button>)}</div></div><div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.06] p-5"><Activity className="text-blue-300"/><p className="mt-4 text-sm font-bold text-white">Ejemplo completo</p><p className="mt-2 text-xs leading-relaxed text-zinc-400">Este partido permite recorrer convocatoria, formación y un archivo GPS ya cargado.</p></div></div>}{tab==="callups"&&<Callups called={called} setCalled={setCalled}/>} {tab==="formation"&&<Pitch called={called} lineup={lineup} setLineup={setLineup} captain={captain} setCaptain={setCaptain}/>} {tab==="gps"&&<GpsPanel/>}</div>;
}
