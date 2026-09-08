import { createBrandedPdf, buildExportFileName, formatExportNumber, drawPlayerHeader } from "@/lib/exports/pdfExportKit";
import { drawVectorChart } from "@/lib/exports/vectorChart";

const fmt = (value, unit = "") => formatExportNumber(value, { decimals: 1, suffix: unit ? " " + unit : "" });
function rowDuration(row) {
  const direct = Number(row.duration_minutes || row.minutes || row.duration || 0);
  if (direct) return direct;
  const distance = Number(row.total_distance || 0);
  const mMin = Number(row.m_min || 0);
  return distance && mMin ? distance / mMin : 0;
}

function aggregatePlayerRows(rows, metrics, playerMap = {}) {
  const byPlayer = {};
  rows.forEach((row) => {
    const id = row.player_id;
    if (!id) return;
    const player = row.player || playerMap[id] || {};
    const current = byPlayer[id] || {
      id,
      name: row.player_name || player.full_name || "Jugador",
      position: row.position || player.position || "",
      photoUrl: player.photo_url || row.photo_url || "",
      values: {},
      distanceDuration: 0,
      loadDuration: 0,
      total_distance: 0,
      player_load: 0,
      sessions: new Set(),
    };

    metrics.forEach((metric) => {
      const value = row[metric.key] == null || String(row[metric.key]).trim() === "" ? NaN : Number(row[metric.key]);
      if (metric.rankMode === "weightedDistanceDuration") {
        const duration = rowDuration(row);
        if (duration > 0 && row.total_distance != null && Number.isFinite(Number(row.total_distance))) {
          current.distanceDuration += duration;
          current.total_distance += Number(row.total_distance);
        }
      } else if (metric.rankMode === "weightedPlayerLoadDuration") {
        const duration = rowDuration(row);
        if (duration > 0 && row.player_load != null && Number.isFinite(Number(row.player_load))) {
          current.loadDuration += duration;
          current.player_load += Number(row.player_load);
        }
      } else if (metric.rankMode === "countSessions") {
        if (row.session_id) current.sessions.add(row.session_id);
      } else if (metric.rankMode === "max" || metric.mode === "max") {
        current.values[metric.key] = Number.isFinite(value)
          ? Math.max(current.values[metric.key] || 0, value)
          : current.values[metric.key];
      } else if (Number.isFinite(value)) {
        current.values[metric.key] = (current.values[metric.key] || 0) + value;
      }
    });
    byPlayer[id] = current;
  });

  return Object.values(byPlayer)
    .map((player) => ({
      ...player,
      values: Object.fromEntries(metrics.map((metric) => [
        metric.key,
        metric.rankMode === "weightedDistanceDuration"
          ? (player.distanceDuration ? player.total_distance / player.distanceDuration : null)
          : metric.rankMode === "weightedPlayerLoadDuration"
            ? (player.loadDuration ? player.player_load / player.loadDuration : null)
            : metric.rankMode === "countSessions"
              ? player.sessions.size
              : player.values[metric.key],
      ])),
    }))
    .sort((left, right) => (right.values.total_distance || 0) - (left.values.total_distance || 0));
}


export async function generateMicrocyclePdf({
  squadName, season, clubName, clubLogoUrl, brand, dailySummaries = [], highlights = [],
  comparison = [], metrics = [], cycleDays = [], matchContext = null, cycleRows = [],
  playerMap = {}, options = {}, chartConfig = {}, aiText = "", download = true,
}) {
  const days = [...dailySummaries].sort((a,b) => String(a.date).localeCompare(String(b.date)));
  const identity = brand || { name: clubName || "Club", logoUrl: clubLogoUrl };
  const pdf = await createBrandedPdf({ brand: identity, orientation: "landscape", title: "Carga del microciclo",
    subtitle: squadName || "Plantel", meta: [season, days[0]?.date, days.at(-1)?.date].filter(Boolean) });
  if (options.includeCover) {
    pdf.sectionTitle(identity.name || "Club");
    pdf.paragraph("Informe de rendimiento · " + (squadName || "Plantel"));
    pdf.paragraph("Período: " + (days[0]?.date || "—") + " al " + (days.at(-1)?.date || "—"));
    if (matchContext?.rival) pdf.paragraph([matchContext.date, "vs. " + matchContext.rival, matchContext.competition, matchContext.time].filter(Boolean).join(" · "));
    pdf.paragraph("Incluye las cargas y los jugadores del período seleccionado. Los valores sin registro se muestran como —.");
    pdf.pageBreak();
  }
  if (options.includeCycleDays) {
    pdf.sectionTitle("Cargas del período");
    pdf.table({columns:[{key:"date",label:"Fecha"},{key:"md",label:"MD"},{key:"objective",label:"Objetivo",width:2},{key:"sessions",label:"Cargas",width:2},{key:"observations",label:"Observaciones",width:2}],
      rows:days.map(day=>{const plan=cycleDays.find(d=>d.date===day.date)||{};return {...day,md:day.md||plan.md,objective:day.objetivo||day.objective||plan.physical_objective,sessions:(day.sessions||[]).map(s=>s.title||s.id).join("\n"),observations:[day.observations,day.rival ? "Rival: "+day.rival : ""].filter(Boolean).join("\n")};})});
  }
  if (options.includePlayerTable) {
    const players=aggregatePlayerRows(cycleRows,metrics,playerMap);
    for(let i=0;i<metrics.length;i+=5) {
      const group=metrics.slice(i,i+5);
      pdf.sectionTitle("Acumulado individual");
      pdf.table({columns:[{key:"name",label:"Jugador",width:2},{key:"position",label:"Posición"},...group.map(m=>({key:m.key,label:m.label+(m.unit?" ("+m.unit+")":""),value:r=>fmt(r.values[m.key]),align:"right"}))],rows:players});
    }
    pdf.paragraph("Volumen: suma de las cargas. Velocidad máxima: máximo registrado. Intensidad: distancia o carga dividida por la duración con datos válidos.",{fontSize:7});
  }
  if (options.includeCharts) for(const metric of metrics) {
    drawVectorChart(pdf,{title:metric.label+" · evolución diaria",points:days.map(d=>({label:d.date,value:d[metric.key]})),color:metric.color,type:chartConfig.chartTypes?.[metric.key]||"bar",unit:metric.unit,decimals:1});
  }
  if (options.includeRankings) for(const highlight of highlights) {
    pdf.sectionTitle("Ranking · "+highlight.metric.label);
    pdf.table({columns:[{key:"rank",label:"Puesto"},{key:"name",label:"Jugador",width:3},{key:"position",label:"Posición"},{key:"value",label:highlight.metric.unit||"Valor",value:r=>fmt(r.value)}],rows:highlight.top||[]});
  }
  if (options.includeHighlightedPlayers) {
    const players=new Map();
    for(const h of highlights) for(const p of h.top||[]) {
      const id=p.player_id||p.player?.id;
      if(!players.has(id))players.set(id,{...p,details:[]});
      players.get(id).details.push("#"+p.rank+" "+h.metric.label+": "+fmt(p.value,h.metric.unit));
    }
    for(const [id,p] of players) {
      await drawPlayerHeader(pdf,{player:{...(playerMap[id]||p.player||{}),full_name:p.name},subtitle:"Destacado del período"});
      pdf.paragraph(p.details.join("\n"));
    }
  }
  if (options.includeWeeklyComparison && comparison.length) {
    pdf.sectionTitle("Comparación con la semana anterior");
    pdf.table({columns:[{key:"metric",label:"Métrica",value:r=>r.metric.label,width:2},{key:"current",label:"Período actual",value:r=>fmt(r.current,r.metric.unit)},{key:"previous",label:"Período anterior",value:r=>fmt(r.previous,r.metric.unit)}],rows:comparison});
  }
  if(options.includeConclusions && aiText) {pdf.sectionTitle("Conclusiones del profesional");pdf.paragraph(aiText);}
  const doc=pdf.finalize();
  doc.exportFilename=buildExportFileName("Microciclo",[identity.name,squadName,days[0]?.date,days.at(-1)?.date]);
  if(download)doc.save(doc.exportFilename);
  return doc;
}
