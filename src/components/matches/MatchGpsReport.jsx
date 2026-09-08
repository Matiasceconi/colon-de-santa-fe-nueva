import React, {useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {AlertTriangle,ChevronRight,UserCheck} from "lucide-react";
import {useToast} from "@/components/ui/use-toast";
import MatchGpsAnalysisStudio from "./MatchGpsAnalysisStudioV3";

function UnresolvedNamesPanel({ unresolvedNames, playerOptions, onResolved, matchId, matchDate, csvUrl, csvLabel }) {
  const { toast } = useToast();
  const [selections, setSelections] = useState({}); // csvName -> player_id
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({});

  async function saveMapping(csvName) {
    const playerId = selections[csvName];
    if (!playerId) return;
    setSaving(true);
    try {
      await base44.functions.invoke("resolveMatchGpsCSV", {
        mode: "save_mapping",
        csv_name: csvName,
        player_id: playerId,
        match_id: matchId,
        match_date: matchDate,
        csv_url: csvUrl,
        csv_label: csvLabel,
      });
      setSaved(s => ({ ...s, [csvName]: true }));
      toast({ title: `"${csvName}" vinculado correctamente` });
      onResolved?.();
    } catch {
      toast({ title: "Error al guardar el vínculo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const pending = unresolvedNames.filter(n => !saved[n]);
  if (pending.length === 0) return null;

  return (
    <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-orange-400" />
        <p className="text-sm font-semibold text-orange-300">
          {pending.length} jugador{pending.length !== 1 ? "es" : ""} sin identificar en el CSV
        </p>
      </div>
      <p className="text-xs text-orange-400/70">
        Asignales su perfil del plantel para que queden unificados en todos los reportes futuros.
      </p>
      <div className="space-y-2">
        {pending.map((csvName) => (
          <div key={csvName} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 px-2 py-1 rounded min-w-[140px]">
              {csvName}
            </span>
            <ChevronRight size={12} className="text-zinc-600 shrink-0" />
            <select
              value={selections[csvName] || ""}
              onChange={e => setSelections(s => ({ ...s, [csvName]: e.target.value }))}
              className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500/50"
            >
              <option value="">— Seleccionar jugador —</option>
              {playerOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.full_name} {p.division ? `(${p.division})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => saveMapping(csvName)}
              disabled={!selections[csvName] || saving}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 rounded-lg transition-colors disabled:opacity-40"
            >
              <UserCheck size={11} /> Vincular
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function MatchGpsReport({match}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const request=useRef(0);
  async function loadData(){
    const id=++request.current;
    setData(null);setError("");
    if(!match.csv_url){setLoading(false);return;}
    setLoading(true);
    try{
      const [saved, minuteRows]=await Promise.all([
        base44.functions.invoke("resolveMatchGpsCSV",{mode:"load_saved",match_id:match.id}),
        base44.entities.MatchPlayerMinutes.filter({match_id:match.id},"-updated_date",300).catch(()=>[]),
      ]);
      let payload=saved.data;
      const needsMigration=!payload?.rows?.length||payload.rows.filter(row=>!row.unresolved).some(row=>Number(row.parser_version||0)<2||!Array.isArray(row.periods)||!row.periods.length);
      if(needsMigration){
        const processed=await base44.functions.invoke("resolveMatchGpsCSV",{csv_url:match.csv_url,match_id:match.id,match_date:match.date,csv_label:match.csv_label});
        payload=processed.data;
      }
      if(payload?.error)throw new Error(payload.error);
      const minuteByPlayer=new Map();
      for(const row of minuteRows||[]){
        if(!row.player_id)continue;
        const current=minuteByPlayer.get(row.player_id);
        const priority=(value)=>value?.official_confirmed===true||value?.manual_override===true?3:value?.source&&value.source!=="gps_csv"?2:1;
        if(!current||priority(row)>priority(current))minuteByPlayer.set(row.player_id,row);
      }
      payload={...payload,rows:(payload.rows||[]).map(row=>{
        const min=minuteByPlayer.get(row.player_id);
        const hasOfficialMinutes=!!min&&(min.official_confirmed===true||min.manual_override===true||(min.source&&min.source!=="gps_csv"));
        return {...row,official_minutes:hasOfficialMinutes?Number(min.minutes_played??min.minutes_calculated??0):null,lineup_role:min?.lineup_role||"",started:min?.started===true};
      })};
      if(id===request.current)setData(payload);
    }catch(e){if(id===request.current)setError(e?.response?.data?.error||e.message||"No se pudo procesar el CSV.");}
    finally{if(id===request.current)setLoading(false);}
  }
  useEffect(()=>{loadData();return()=>{request.current++;};},[match.id,match.csv_url,match.date]);
  if(!match.csv_url)return null;
  if(loading)return <div className="rounded-xl border border-zinc-700 p-6 text-zinc-200">Analizando jugadores, tiempos y métricas GPS…</div>;
  if(error)return <div role="alert" className="rounded-xl border border-rose-600 p-5 text-rose-200"><p>{error}</p><button className="mt-3 rounded-lg border border-zinc-500 px-3 py-2 text-white" onClick={loadData}>Reintentar</button></div>;
  if(!data)return null;
  return <div className="space-y-4">
    {!!data.unresolved_names?.length&&<UnresolvedNamesPanel key={match.csv_url} unresolvedNames={data.unresolved_names} playerOptions={data.player_options||[]} onResolved={loadData} matchId={match.id} matchDate={match.date} csvUrl={match.csv_url} csvLabel={match.csv_label}/>}
    <MatchGpsAnalysisStudio key={match.id+":"+match.csv_url} match={match} data={data}/>
  </div>;
}