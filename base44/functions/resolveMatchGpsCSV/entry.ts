import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUM_FIELDS = ["total_duration","total_distance","distance_hsr","distance_14_19","sprint_distance","sprint_efforts","accelerations","decelerations","player_load","rhie"];
const MAX_FIELDS = ["max_velocity","max_velocity_percentage"];
function normalizeName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ");
}
function matchColumn(raw) {
  const h=normalizeName(raw).replace(/^\uFEFF/,"");
  const c=h.replace(/\s+/g,"").replace(/,/g,".");
  if (["name","jugador","player","nombre","athlete"].includes(h)) return "player_name";
  if (["period","periodo","period name","period name (short)","period name (long)","period name/label","period name label","period name:","period name ","period name","periodo nombre","tiempo","period name (full)"].includes(h)) return "period_label";
  if (["total duration","tot dur","duration"].includes(h)) return "total_duration";
  if (h.includes("total distance") || ["tot dist","tot dist (m)"].includes(h)) return "total_distance";
  if (/^d/.test(c) && /14(?:\.0)?-19(?:\.8)?/.test(c)) return "distance_14_19";
  if (/^d/.test(c) && /19(?:\.8)?-25(?:\.0)?/.test(c)) return "distance_hsr";
  if (/^d\+/.test(c) && c.includes("25")) return "sprint_distance";
  if (["sprint efforts","sprint effs"].includes(h)) return "sprint_efforts";
  if (/^acc/.test(c) && /eff/.test(c) && !/dist/.test(c) && /\+3/.test(c)) return "accelerations";
  if (/^dec/.test(c) && /eff/.test(c) && !/dist/.test(c) && /\+3/.test(c)) return "decelerations";
  if (["total player load","tot pl","player load"].includes(h)) return "player_load";
  if (h.includes("maximum velocity") || ["max vel (km/h)","max velocity (km/h)"].includes(h)) return "max_velocity";
  if (h.includes("max vel") && h.includes("%")) return "max_velocity_percentage";
  if (["metros x min","m/min","meters per minute"].includes(h)) return "meters_per_minute";
  if (h==="rhie total bouts") return "rhie";
  return null;
}
function parseNum(value) {
  if (value==null || String(value).trim()==="" || value==="-") return null;
  let s=String(value).trim();
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(s) || /^\d+,\d+$/.test(s)) s=s.replace(/\./g,"").replace(",",".");
  const n=Number(s);
  return Number.isFinite(n) && n>=0 ? n : null;
}
function parseDuration(value) {
  const s=String(value||"").trim();
  if (!s.includes(":")) return parseNum(s);
  const p=s.split(":").map(Number);
  if (![2,3].includes(p.length) || p.some(n=>!Number.isFinite(n)||n<0) || p.at(-1)>=60 || (p.length===3 && p[1]>=60)) return null;
  return p.length===3 ? p[0]*60+p[1]+p[2]/60 : p[0]+p[1]/60;
}
function splitCSVLine(line,sep) {
  const result=[]; let cur="",quotes=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"' && quotes && line[i+1]==='"'){cur+='"';i++;}
    else if(ch==='"') quotes=!quotes;
    else if(ch===sep && !quotes){result.push(cur.trim());cur="";}
    else cur+=ch;
  }
  result.push(cur.trim()); return result;
}
function periodCode(label) {
  const p=normalizeName(label).replace(/[º°ª.]/g,"").replace(/\s+/g,"");
  if (["primertiempo","primertiempo1","1ertiempo","1tiempo","1t","pt","firsthalf","1sthalf","half1","h1","primerperiodo","1erperiodo","1periodo","1per","periodo1","p1"].includes(p)) return "first_half";
  if (["segundotiempo","2dotiempo","2tiempo","2t","st","secondhalf","2ndhalf","half2","h2","segundoperiodo","2doperiodo","2periodo","2per","periodo2","p2"].includes(p)) return "second_half";
  if (["","total","partidocompleto","fullmatch","match","partido","entiresession","totalsession","sesioncompleta","partidocomp"].includes(p)) return "total";
  if (/^1/.test(p)&&p.length<=4) return "first_half";
  if (/^2/.test(p)&&p.length<=4) return "second_half";
  return null;
}
function parseCatapultCSV(text) {
  const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(l=>l.trim());
  let header=-1,fields=[],sep=",";
  for(let i=0;i<Math.min(lines.length,20);i++){
    for(const delimiter of [",",";","\t"]){
      const mapped=splitCSVLine(lines[i],delimiter).map(matchColumn);
      if(mapped.includes("player_name") && mapped.filter(Boolean).length>=2){header=i;fields=mapped;sep=delimiter;break;}
    }
    if(header>=0)break;
  }
  if(header<0) return {error:"No se encontró una cabecera con jugador y métricas GPS."};
  const mapped=fields.filter(Boolean);
  if(new Set(mapped).size!==mapped.length) return {error:"Hay columnas duplicadas para una misma métrica. Revisá los encabezados."};
  const groups=new Map(), warnings=[]; let rawCount=0;
  for(let i=header+1;i<lines.length;i++){
    const cols=splitCSVLine(lines[i],sep), row=Object.fromEntries([...SUM_FIELDS,...MAX_FIELDS,"meters_per_minute"].map(f=>[f,null]));
    fields.forEach((f,j)=>{if(f)row[f]=["player_name","period_label"].includes(f)?cols[j]||"":f==="total_duration"?parseDuration(cols[j]):parseNum(cols[j]);});
    let name=String(row.player_name||"").trim();
    if(!name || ["total","promedio","average","team","totals"].includes(normalizeName(name)))continue;
    let label=row.period_label;
    const suffix=name.match(/^(.*?)\s+[-–—]\s+(.+)$/);
    if(suffix){name=suffix[1].trim();label=label||suffix[2];}
    const period=periodCode(label);
    if(!period){warnings.push("Fila "+(i+1)+": período excluido («"+label+"»).");continue;}
    const key=normalizeName(name);
    if(!groups.has(key))groups.set(key,{name,rows:new Map()});
    if(groups.get(key).rows.has(period))return {error:"Más de una fila de "+name+" para "+(label||"Total")+". No se sumaron períodos potencialmente superpuestos."};
    row.player_name=name;row.period=period;delete row.period_label;
    // Duration is GPS exposure, not official minutes or ball-in-play time.
    if(row.total_duration>0 && row.total_distance!=null)row.meters_per_minute=row.total_distance/row.total_duration;
    groups.get(key).rows.set(period,row);rawCount++;
  }
  const rows=[];
  for(const {name,rows:periods} of groups.values()){
    const halves=["first_half","second_half"].map(p=>periods.get(p)).filter(Boolean);
    const explicit=periods.get("total");
    let total;
    if(explicit) total={...explicit,total_source:"csv_total"};
    else{
      total={player_name:name,period:"total",total_source:halves.length===2?"sum_halves":"observed_half"};
      for(const f of SUM_FIELDS) total[f]=halves.every(r=>r[f]!=null)?halves.reduce((sum,r)=>sum+r[f],0):null;
      for(const f of MAX_FIELDS){const v=halves.map(r=>r[f]).filter(n=>n!=null);total[f]=v.length?Math.max(...v):null;}
      total.meters_per_minute=total.total_duration>0 && total.total_distance!=null?total.total_distance/total.total_duration:null;
    }
    if(explicit && halves.length){
      warnings.push(name+": se conserva el Total del CSV; los tiempos no se suman otra vez.");
      if(halves.length===2 && explicit.total_distance!=null && halves.every(r=>r.total_distance!=null)){
        const diff=explicit.total_distance-halves.reduce((s,r)=>s+r.total_distance,0);
        if(Math.abs(diff)>1)warnings.push(name+": diferencia Total vs suma de tiempos: "+diff.toFixed(1)+" m.");
      }
    }
    total.periods=halves;
    rows.push(total);
  }
  if(!rows.length)return {error:"No se encontraron registros de Total, Primer tiempo o Segundo tiempo."};
  return {rows,warnings,raw_count:rawCount};
}
function fuzzyMatch(gpsName,players){
  const words=normalizeName(gpsName).split(" ").filter(Boolean);
  const candidates=players.map(p=>{
    const pw=normalizeName(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(" ")).split(" ").filter(Boolean);
    const matches=words.filter(w=>pw.includes(w)).length;
    return {p,score:matches/Math.max(words.length,pw.length),matches};
  }).filter(c=>c.matches>=2 && c.score>=0.66).sort((a,b)=>b.score-a.score);
  return candidates.length && (candidates.length===1 || candidates[0].score>candidates[1].score) ? candidates[0].p : null;
}
function tournamentLabel(match){
  const competition=String(match?.competition||"");
  if(competition.includes("Apertura"))return "Proyección Apertura";
  if(competition.includes("Clausura"))return "Clausura";
  if(competition.includes("Juvenil"))return "Juveniles";
  if(competition.includes("Amistoso"))return "Amistosos";
  return "Otro";
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (body.mode === "preview") {
      const parsed = parseCatapultCSV(body.csv_text);
      return Response.json(parsed, {status: parsed.error ? 400 : 200});
    }

    if (body.mode === "load_saved") {
      if (!body.match_id) return Response.json({ error: "match_id requerido" }, { status: 400 });
      const [savedRows, players] = await Promise.all([
        base44.asServiceRole.entities.CatapultReport.filter({ session_id: body.match_id }, "player_name", 300),
        base44.asServiceRole.entities.Player.list("", 500),
      ]);
      const playerById = Object.fromEntries(players.map((player) => [player.id, player]));
      const rows = savedRows.map((row) => {
        const player = playerById[row.player_id];
        return {
          ...row,
          player_name: player?.full_name || row.player_name,
          photo_url: player?.photo_url || null,
          jersey_number: player?.jersey_number ?? null,
          position: player?.position || null,
          csv_name: row.player_name,
          unresolved: false,
        };
      });
      return Response.json({
        success: true,
        source: "saved",
        rows,
        warnings: [],
        raw_count: rows.reduce((count, row) => count + Math.max(1, row.periods?.length || 0), 0),
        total: rows.length,
        resolved: rows.length,
        unresolved: 0,
        unresolved_names: [],
        player_options: [],
        persisted: rows.length,
      });
    }

    // ── Modo: clear_import (quitar dataset GPS sin borrar minutos oficiales) ──
    if (body.mode === "clear_import") {
      if (!body.match_id) return Response.json({ error: "match_id requerido" }, { status: 400 });
      const [reports, minuteRows] = await Promise.all([
        base44.asServiceRole.entities.CatapultReport.filter({ session_id: body.match_id }, "", 500),
        base44.asServiceRole.entities.MatchPlayerMinutes.filter({ match_id: body.match_id }, "-created_date", 500),
      ]);
      let removedSuggestions = 0;
      for (const report of reports) await base44.asServiceRole.entities.CatapultReport.delete(report.id);
      for (const row of minuteRows) {
        const isOfficial = row.official_confirmed === true || row.manual_override === true || (row.source && row.source !== "gps_csv");
        if (!isOfficial && row.source === "gps_csv") {
          await base44.asServiceRole.entities.MatchPlayerMinutes.delete(row.id);
          removedSuggestions++;
        } else if (row.gps_suggested_minutes != null || row.gps_suggestion_source || row.gps_suggested_at) {
          await base44.asServiceRole.entities.MatchPlayerMinutes.update(row.id, { gps_suggested_minutes: null, gps_suggestion_source: null, gps_suggested_at: null });
          removedSuggestions++;
        }
      }
      await base44.asServiceRole.entities.MatchReport.update(body.match_id, { gps_duration_suggestion: null, gps_duration_suggested_at: null });
      return Response.json({ success: true, reports_removed: reports.length, suggestions_removed: removedSuggestions });
    }

    // ── Modo: save_mapping (guardar alias manual) ──────────────────────────────
    if (body.mode === "save_mapping") {
      const { csv_name, player_id } = body;
      if (!csv_name || !player_id) return Response.json({ error: "csv_name y player_id requeridos" }, { status: 400 });

      const players = await base44.asServiceRole.entities.Player.list('', 500);
      const player = players.find(p => p.id === player_id);
      if (!player) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });

      const mappings = await base44.asServiceRole.entities.PlayerNameMapping.filter({ player_id }, '', 10);
      const officialName = player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim();

      if (mappings.length > 0) {
        const existing = mappings[0];
        const aliases = new Set([...(existing.aliases || []), csv_name]);
        await base44.asServiceRole.entities.PlayerNameMapping.update(existing.id, {
          aliases: Array.from(aliases),
        });
      } else {
        await base44.asServiceRole.entities.PlayerNameMapping.create({
          player_id,
          player_name: officialName,
          aliases: [csv_name],
          sources: ['Partidos GPS'],
        });
      }

      return Response.json({ success: true, message: `Alias "${csv_name}" vinculado a ${officialName}` });
    }

    // ── Modo: resolve + persist (por defecto) ────────────────────────────────
    // Parámetros: csv_url (requerido), match_id (opcional), match_date (opcional), csv_label (opcional)
    const { csv_url, csv_text, match_id, match_date, csv_label } = body;
    if (!csv_url && !csv_text) return Response.json({ error: "csv_url o csv_text requerido" }, { status: 400 });

    // La carga directa usa exactamente el texto validado en el navegador.
    // csv_url queda como compatibilidad para archivos cargados anteriormente.
    let csvText = csv_text;
    if (!csvText) {
      const csvResponse = await fetch(csv_url);
      if (!csvResponse.ok) return Response.json({error:"No se pudo descargar el CSV."},{status:400});
      csvText = await csvResponse.text();
    }
    const parseResult = parseCatapultCSV(csvText);
    if (parseResult.error) return Response.json({ error: parseResult.error }, { status: 400 });

    // Cargar jugadores y mappings
    const [players, mappings] = await Promise.all([
      base44.asServiceRole.entities.Player.list('', 500),
      base44.asServiceRole.entities.PlayerNameMapping.list('', 500),
    ]);

    // Construir mapa de alias normalizados -> player_id
    const aliasMap = {};
    mappings.forEach(m => {
      const allNames = [m.player_name, ...(m.aliases || [])];
      allNames.forEach(name => {
        aliasMap[normalizeName(name)] = m.player_id;
      });
    });

    const playerById = Object.fromEntries(players.map(p => [p.id, p]));

    const resolvedRows = [];
    const unresolvedNames = new Set();
    const toUpsert = []; // rows to persist in CatapultReport

    for (const row of parseResult.rows) {
      const csvName = (row.player_name || "").trim();
      let playerId = null;
      let officialName = null;

      // 1. Alias map
      const aliasHit = aliasMap[normalizeName(csvName)];
      if (aliasHit && playerById[aliasHit]) {
        playerId = aliasHit;
        const p = playerById[aliasHit];
        officialName = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
      }

      // 2. Nombre exacto normalizado
      if (!playerId) {
        for (const p of players) {
          const pName = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
          if (normalizeName(pName) === normalizeName(csvName)) {
            playerId = p.id;
            officialName = pName;
            break;
          }
        }
      }

      // 3. Fuzzy match
      if (!playerId) {
        const match = fuzzyMatch(csvName, players);
        if (match) {
          playerId = match.id;
          officialName = match.full_name || `${match.first_name || ""} ${match.last_name || ""}`.trim();
        }
      }

      if (playerId) {
        const p = playerById[playerId];
        resolvedRows.push({
          ...row,
          player_id: playerId,
          player_name: officialName || csvName,
          csv_name: csvName,
          photo_url: p?.photo_url || null,
          jersey_number: p?.jersey_number || null,
          position: p?.position || null,
        });
        // Marcar para persistir si se proporcionó match_id
        if (match_id && match_date) {
          toUpsert.push({ row, playerId, officialName: officialName || csvName });
        }
      } else {
        unresolvedNames.add(csvName);
        resolvedRows.push({
          ...row,
          player_id: null,
          player_name: csvName,
          csv_name: csvName,
          unresolved: true,
        });
      }
    }

    const resolvedIds = resolvedRows.filter(r => r.player_id).map(r => r.player_id);
    if (new Set(resolvedIds).size !== resolvedIds.length) {
      return Response.json({error:"Dos nombres del CSV apuntan al mismo jugador. Revisá los vínculos antes de importar."},{status:400});
    }

    // ── Persistir en CatapultReport (upsert por player_id + session_id) ──────
    if (match_id && match_date && toUpsert.length > 0) {
      // Cargar registros existentes para este partido
      const existingReports = await base44.asServiceRole.entities.CatapultReport.filter({ session_id: match_id });
      const existingByPlayerId = Object.fromEntries(existingReports.map(r => [r.player_id, r]));

      const incomingPlayerIds = new Set(toUpsert.map((item) => item.playerId));
      for (const existing of existingReports) {
        if (unresolvedNames.size === 0 && existing.player_id && !incomingPlayerIds.has(existing.player_id)) {
          await base44.asServiceRole.entities.CatapultReport.delete(existing.id);
        }
      }

      for (const { row, playerId, officialName } of toUpsert) {
        const reportData = {
          player_id: playerId,
          player_name: officialName,
          date: match_date,
          session_id: match_id,
          session_label: csv_label || "Partido GPS",
          file_url: csv_url,
          total_duration: row.total_duration,
          total_distance: row.total_distance,
          distance_hsr: row.distance_hsr,
          sprint_distance: row.sprint_distance,
          sprint_efforts: row.sprint_efforts,
          accelerations: row.accelerations,
          decelerations: row.decelerations,
          player_load: row.player_load,
          max_velocity: row.max_velocity,
          max_velocity_percentage: row.max_velocity_percentage,
          meters_per_minute: row.meters_per_minute,
          distance_14_19: row.distance_14_19 ?? null,
          rhie: row.rhie ?? null,
          periods: row.periods || [],
          total_source: row.total_source,
          parser_version: 2,
        };

        if (existingByPlayerId[playerId]) {
          await base44.asServiceRole.entities.CatapultReport.update(existingByPlayerId[playerId].id, reportData);
        } else {
          await base44.asServiceRole.entities.CatapultReport.create(reportData);
        }
      }
    }

    let minutesImported = 0;
    let matchDurationMinutes = null;
    if (body.import_minutes && match_id && match_date && toUpsert.length > 0) {
      const suggestionRows = toUpsert
        .map((item) => ({ ...item, minutes: Math.max(0, Math.round(Number(item.row.total_duration || 0))) }))
        .filter((item) => item.minutes > 0);
      if (suggestionRows.length > 0) {
        matchDurationMinutes = Math.max(...suggestionRows.map((item) => item.minutes));
        const [matchRows, callups, existingMinutes] = await Promise.all([
          base44.asServiceRole.entities.MatchReport.filter({ id: match_id }, "", 1),
          base44.asServiceRole.entities.MatchCallup.filter({ match_id }, "-updated_date", 500),
          base44.asServiceRole.entities.MatchPlayerMinutes.filter({ match_id }, "-created_date", 500),
        ]);
        const match = matchRows[0] || {};
        const callupByPlayer = {};
        const rolePriority = { titular: 3, suplente: 2, pendiente: 1 };
        for (const callup of callups) {
          if (!callup.player_id || callup.status === "desconvocado" || callup.callup_status === "desconvocado") continue;
          const previous = callupByPlayer[callup.player_id];
          if (!previous || (rolePriority[callup.lineup_role] || 0) > (rolePriority[previous.lineup_role] || 0)) callupByPlayer[callup.player_id] = callup;
        }
        const existingByPlayer = {};
        for (const row of existingMinutes) {
          if (!existingByPlayer[row.player_id]) existingByPlayer[row.player_id] = [];
          existingByPlayer[row.player_id].push(row);
        }
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.MatchReport.update(match_id, {
          gps_duration_suggestion: matchDurationMinutes,
          gps_duration_suggested_at: now,
        });

        for (const item of suggestionRows) {
          const currentRows = existingByPlayer[item.playerId] || [];
          const official = currentRows.find((row) => row.official_confirmed === true || row.manual_override === true || (row.source && row.source !== "gps_csv"));
          const suggestionRecord = currentRows.find((row) => row.source === "gps_csv" && row.official_confirmed !== true && row.manual_override !== true);
          const callup = callupByPlayer[item.playerId];
          const suggestionPatch = {
            gps_suggested_minutes: item.minutes,
            gps_suggestion_source: "gps_csv",
            gps_suggested_at: now,
            updated_at: now,
          };
          if (official) {
            await base44.asServiceRole.entities.MatchPlayerMinutes.update(official.id, suggestionPatch);
            for (const duplicate of currentRows) {
              if (duplicate.id !== official.id && duplicate.source === "gps_csv" && duplicate.official_confirmed !== true && duplicate.manual_override !== true) {
                await base44.asServiceRole.entities.MatchPlayerMinutes.delete(duplicate.id);
              }
            }
          } else {
            const payload = {
              match_id, player_id: item.playerId, match_player_key: `${match_id}:${item.playerId}`,
              player_name: item.officialName, player_number: Number(playerById[item.playerId]?.jersey_number) || null,
              squad_id: match.squad_id || null, season_id: match.season_id || null, competition_id: match.competition_id || null,
              competition: match.competition || "", tournament: tournamentLabel(match), match_date,
              match_label: `vs ${match.rival || "Rival"}`, rival: match.rival || "",
              lineup_role: callup?.lineup_role === "titular" ? "titular" : "suplente",
              started: callup?.lineup_role === "titular", entered: false,
              minutes_played: 0, manual_override: false, manual_reason: "",
              source: "gps_csv", source_file: csv_label || "CSV GPS", data_source: "gps_suggestion",
              official_confirmed: false, imported_at: now,
              ...suggestionPatch,
            };
            if (suggestionRecord) await base44.asServiceRole.entities.MatchPlayerMinutes.update(suggestionRecord.id, payload);
            else await base44.asServiceRole.entities.MatchPlayerMinutes.create(payload);
            for (const duplicate of currentRows) {
              if (suggestionRecord && duplicate.id !== suggestionRecord.id && duplicate.source === "gps_csv" && duplicate.official_confirmed !== true && duplicate.manual_override !== true) {
                await base44.asServiceRole.entities.MatchPlayerMinutes.delete(duplicate.id);
              }
            }
          }
          minutesImported++;
        }
      }
    }

    // Candidatos para selección manual
    const playerOptions = players.map(p => ({
      id: p.id,
      full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      jersey_number: p.jersey_number,
      position: p.position,
      photo_url: p.photo_url,
      division: p.division,
    })).sort((a, b) => (a.jersey_number || 99) - (b.jersey_number || 99));

    return Response.json({
      success: true,
      warnings: parseResult.warnings,
      raw_count: parseResult.raw_count,
      rows: resolvedRows,
      total: resolvedRows.length,
      resolved: resolvedRows.filter(r => !r.unresolved).length,
      unresolved: resolvedRows.filter(r => r.unresolved).length,
      unresolved_names: Array.from(unresolvedNames),
      player_options: playerOptions,
      persisted: toUpsert.length,
      minutes_imported: minutesImported,
      match_duration_minutes: matchDurationMinutes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}