import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import moment from "moment";

const root=process.cwd(),out=path.join(root,"node_modules/.cache/reports-audit");
await mkdir(out,{recursive:true});
await build({
 stdin:{contents:`export * from "./src/components/performance/dashboard/gpsMicrocyclePdfRenderer.js"; export * from "./src/lib/reports/strengthPdf.js"; export * from "./src/lib/exports/pdfExportKit.js"; export * from "./src/lib/reports/sessionGpsPdf.js"; export * from "./src/lib/reports/formationPdf.js"; export * from "./src/lib/clubBrandResolver.js"; export * from "./src/lib/exports/fileExport.js"; export * from "./src/components/matches/matchGpsPDF.js"; export * from "./src/components/schedule/professionalSchedulePdf.js"; export * from "./src/components/schedule/monthSchedulePdf.js"; export * from "./src/components/schedule/dailySchedulePdf.js";`,resolveDir:root},
 outfile:path.join(out,"core.mjs"),bundle:true,platform:"node",format:"esm",packages:"external",
 alias:{"@":path.join(root,"src")},
 plugins:[{name:"font-url",setup(b){b.onResolve({filter:/^moment\/locale\/es$/},()=>({path:"moment/locale/es.js",external:true}));b.onResolve({filter:/base44Client/},()=>({path:"client",namespace:"test-client"}));b.onLoad({filter:/.*/,namespace:"test-client"},()=>({contents:"export const base44 = {};"}));b.onResolve({filter:/\.ttf\?url$/},args=>({path:path.join(root,"src",args.path.replace(/^@\//,"").replace(/\?url$/,"")),namespace:"font"}));b.onLoad({filter:/.*/,namespace:"font"},async args=>({contents:"export default "+JSON.stringify("data:font/ttf;base64,"+(await readFile(args.path)).toString("base64")),loader:"js"}));}}],
});
const api=await import(path.join(out,"core.mjs"));
assert.equal(api.formatExportNumber(null),"—");
assert.equal(api.formatExportNumber(" "),"—");
assert.equal(api.formatExportNumber(0),"0");
assert.equal(api.contrastText("#FFFFFF"),"#0F172A");
assert.equal(api.contrastText("#000000"),"#FFFFFF");
assert.equal(api.csvCell("=SUM(A1:A2)"),'"\'=SUM(A1:A2)"');
assert.equal(api.csvCell(-3),'"-3"');
assert.equal(api.resolvePdfBrand(null).name,"Club");
const session={id:"qa-session",title:"Sesión de prueba con nombres extensos",date:"2026-09-08",squad_name:"Plantel de prueba",duration_minutes:85};
const principal=Array.from({length:36},(_,i)=>({player_id:"p"+i,player_name:"Jugador "+String(i+1).padStart(2,"0")+" Apellido Extenso",display_name:"Jugador "+(i+1),total_distance:i===0?null:i*100,m_min:0,player_load:i*5,smax:30+i/10,_player:{full_name:"Jugador "+i}}));
const data={summary:{conGps:36,excluidos:1,diferenciados:2,kinesiologia:1},teamAverages:{total_distance:1800,m_min:0,smax:31.8},highlights:[],insights:["Datos de prueba, sin jugadores reales."],principal,excluded:[{player_id:"excluded",player_name:"Excluido del promedio"}],referenceByPlayer:{},exerciseLoads:Array.from({length:20},(_,i)=>({id:"e"+i,name:"Ejercicio "+i,blocks:2,players:36,total_distance:100+i})),alerts:[{text:"Incidencia de prueba."}],comparisonSession:null};
const brands=[{name:"Club Azul QA",shortName:"AZ",colors:{primary:"#123456",accent:"#0ea5e9"}},{name:"Club Claro QA",shortName:"CL",colors:{primary:"#FFEE00",accent:"#FFFFFF"}},{name:"Club Rojo QA",shortName:"RO",colors:{primary:"#B91C1C",accent:"#111111"}}];
const results=await Promise.all(brands.map(async(brand,i)=>{
 const result=await api.createSessionGpsPdf({session,reportData:data,clubBrand:brand,studioConfig:{charts:[{title:"Todos los jugadores",metric:"total_distance",type:i===1?"line":"bar",dimension:"player"},{title:"Por ejercicio",metric:"total_distance",dimension:"exercise"}]},observations:"Observaciones extensas. ".repeat(120),orientation:i===1?"landscape":"portrait"});
 assert(result.doc.getNumberOfPages()>3);
 assert(result.filename.includes(brand.name.replaceAll(" ","_")));
 await writeFile(path.join(out,"gps-"+i+".pdf"),Buffer.from(result.doc.output("arraybuffer")));
 return {brand:brand.name,pages:result.doc.getNumberOfPages()};
}));
const pdf=await api.createBrandedPdf({brand:brands[1],title:"Prueba de filas multipágina"});
pdf.table({columns:[{key:"name",label:"Jugador"},{key:"text",label:"Observaciones"}],rows:[{name:"Fila larga",text:"Continuación de una misma fila. ".repeat(600)},{name:"ULTIMA FILA",text:"FINAL VERIFICABLE"}]});
await writeFile(path.join(out,"long-row.pdf"),Buffer.from(pdf.finalize().output("arraybuffer")));
const playerMap=new Map(principal.map((p,i)=>[p.player_id,{id:p.player_id,full_name:p.player_name,shirt_number:i+1}]));
const positions=Object.fromEntries(principal.slice(0,11).map((p,i)=>[p.player_id,{x:15+(i%4)*23,y:15+Math.floor(i/4)*30}]));
const formation=await api.createFormationPdf({match:{rival:"Rival QA",date:session.date,squad_name:session.squad_name},system:"4-3-3",positions,playerMap,savedCallups:principal.map((p,i)=>({player_id:p.player_id,lineup_role:"suplente",shirt_number:i+1})),captainPlayerId:"p0",clubBrand:brands[1]});
await writeFile(path.join(out,"formation.pdf"),Buffer.from(formation.doc.output("arraybuffer")));
console.log(JSON.stringify({passed:true,gps:results,longRowPages:pdf.doc.getNumberOfPages(),formationPages:formation.doc.getNumberOfPages(),outputDirectory:out}));
const calendarBrand={...brands[1],logoUrl:"",colors:{...brands[1].colors,primaryDeep:"#8F8500",primaryDark:"#BCAD00",ink:"#0F172A",muted:"#64748B",line:"#E2E8F0",panel:"#F8FAFC"}};
const days=Array.from({length:14},(_,i)=>moment("2026-09-01").add(i,"days"));
const events=days.flatMap((d,i)=>Array.from({length:i===0?18:2},(_,j)=>({id:i+"-"+j,date:d.format("YYYY-MM-DD"),title:"EVENTO "+i+"-"+j+" Título completo",event_type:j%4===0?"partido":"entrenamiento",rival:j%4===0?"Rival de prueba":"",time:"10:00",description:"DETALLE COMPLETO "+i+"-"+j+" "+("Descripción extensa. ".repeat(30)),location:"Sede de prueba"})));
const eventsForDate=date=>events.filter(e=>e.date===date);
for(const [name,doc] of await Promise.all([
 api.buildProfessionalWeekSchedulePDF({days,eventsForDate,weekLabel:"Dos semanas",squadName:"Plantel QA",brand:calendarBrand}).then(doc=>["calendar-week",doc]),
 api.buildMonthSchedulePDF({month:days[0],eventsForDate,squadName:"Plantel QA",brand:calendarBrand}).then(doc=>["calendar-month",doc]),
 api.buildDailySchedulePDF({day:days[0],events:eventsForDate("2026-09-01"),squadName:"Plantel QA",brand:calendarBrand}).then(doc=>["calendar-day",doc])
])){assert(doc.getNumberOfPages()>1);await writeFile(path.join(out,name+".pdf"),Buffer.from(doc.output("arraybuffer")));}
const matchRows=principal.map((p,i)=>({...p,total_duration:80,total_distance:8000+i,player_load:200,max_velocity:30,accelerations:30,sprint_distance:120,periods:[{period:"first_half",total_duration:40,total_distance:4100+i,player_load:110,max_velocity:30,accelerations:20,sprint_distance:70},{period:"second_half",total_duration:40,total_distance:3900,player_load:90,max_velocity:28,accelerations:10,sprint_distance:50}]}));
const match=await api.exportMatchGpsPDF({match:{date:"2026-09-08",rival:"Rival QA",squad_name:"Plantel QA"},brand:brands[1],rows:matchRows,sourceRows:matchRows,metric:{key:"total_distance",label:"Distancia total"},charts:["bar","line","area","halves","radar"].map(type=>({type,metric:"total_distance",period:"first_half"})),download:false});
await writeFile(path.join(out,"match-gps.pdf"),Buffer.from(match.doc.output("arraybuffer")));
const micro=await api.generateMicrocyclePdf({squadName:"Plantel QA",brand:brands[1],dailySummaries:days.map((d,i)=>({date:d.format("YYYY-MM-DD"),total_distance:i*100,objective:"Objetivo extenso ".repeat(20)})),cycleRows:principal,metrics:[{key:"total_distance",label:"Distancia",rankMode:"sum",unit:"m"}],options:{includeCover:true,includeCycleDays:true,includePlayerTable:true,includeCharts:true,includeConclusions:true},aiText:"Conclusiones extensas. ".repeat(900),download:false});
await writeFile(path.join(out,"microcycle.pdf"),Buffer.from(micro.output("arraybuffer")));
const strength=await api.createStrengthPdf({session,brand:brands[1],blocks:[{id:"b",name:"Bloque largo",description:"Descripción. ".repeat(400)}],stations:principal.map((p,i)=>({work_block_id:"b",exercise_name:"EJERCICIO "+i,notes:"Prescripción extensa. ".repeat(i===0?250:3)}))});
await writeFile(path.join(out,"strength.pdf"),Buffer.from(strength.doc.output("arraybuffer")));
console.log(JSON.stringify({extendedPassed:true,matchPages:match.doc.getNumberOfPages(),microPages:micro.getNumberOfPages(),strengthPages:strength.doc.getNumberOfPages()}));
