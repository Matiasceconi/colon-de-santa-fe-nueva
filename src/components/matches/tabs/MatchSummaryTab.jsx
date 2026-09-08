import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, ClipboardCheck, Clock3, FileVideo2, Gauge, MapPin, PackageCheck, RefreshCw, ShieldCheck, Users } from "lucide-react";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerName, getPositionGroup } from "@/lib/matchCallupUtils";

function parseLogistics(value) {
  if (!value) return {};
  try { return JSON.parse(value) || {}; } catch { return {}; }
}

function uniqueActiveCallups(rows) {
  const rank = { titular: 3, suplente: 2, pendiente: 1 };
  const byPlayer = new Map();
  (rows || []).forEach((row) => {
    if (!row.player_id || row.status === "desconvocado" || row.callup_status === "desconvocado") return;
    const previous = byPlayer.get(row.player_id);
    if (!previous || (rank[row.lineup_role] || 0) > (rank[previous.lineup_role] || 0)) byPlayer.set(row.player_id, row);
  });
  return Array.from(byPlayer.values());
}

function StatusRow({ ok, warning = false, icon: Icon, title, detail, action }) {
  const tone = ok ? "text-emerald-300" : warning ? "text-amber-300" : "text-zinc-500";
  const StatusIcon = ok ? CheckCircle2 : warning ? AlertTriangle : Circle;
  return <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ${tone}`}><Icon size={16} /></div>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-0.5 text-xs text-zinc-500">{detail}</p></div>
    <StatusIcon size={16} className={tone} />
    {action}
  </div>;
}

function ActionButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-yellow-500/40 hover:text-white">{children}</button>;
}

export default function MatchSummaryTab({ match, players = [], onMatchUpdated, onNavigateTab }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ callups: [], minutes: [], gps: [], checklists: [] });

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [callups, minutes, gps, checklists] = await Promise.all([
        base44.entities.MatchCallup.filter({ match_id: match.id }, "-updated_date", 500).catch(() => []),
        base44.entities.MatchPlayerMinutes.filter({ match_id: match.id }, "-updated_date", 500).catch(() => []),
        base44.entities.CatapultReport.filter({ session_id: match.id }, "player_name", 500).catch(() => []),
        base44.entities.EquipmentChecklist.filter({ match_id: match.id }, "-event_date", 100).catch(() => []),
      ]);
      setData({ callups: callups || [], minutes: minutes || [], gps: gps || [], checklists: checklists || [] });
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [match.id]);

  const playerMap = useMemo(() => new Map((players || []).map((player) => [player.id, player])), [players]);
  const callups = useMemo(() => uniqueActiveCallups(data.callups), [data.callups]);
  const titulars = callups.filter((row) => row.lineup_role === "titular");
  const substitutes = callups.filter((row) => row.lineup_role === "suplente");
  const missingShirts = callups.filter((row) => !Number(row.shirt_number));
  const goalie = titulars.find((row) => getPositionGroup(playerMap.get(row.player_id)?.position || row.player_position) === "Arquero");
  const logistics = useMemo(() => parseLogistics(match.match_logistics), [match.match_logistics]);
  const logisticsReady = Boolean((logistics.presentation_time || match.match_time) && (logistics.stadium || match.match_venue));
  const planReady = Boolean(match.match_plan_pdf_url || match.video_analysis_url || match.rival_notes);
  const equipmentChecklist = data.checklists.find((row) => row.context_type === "match") || data.checklists[0];
  const equipmentReady = Boolean(equipmentChecklist && ["prepared", "checked", "closed"].includes(equipmentChecklist.status) && (equipmentChecklist.items || []).every((item) => Number(item.prepared_qty || 0) >= Number(item.required_qty || 0)));
  const officialMinutes = data.minutes.filter((row) => row.official_confirmed === true || (row.source && row.source !== "gps_csv" && row.minutes_played != null));
  const gpsSuggestions = data.minutes.filter((row) => Number(row.gps_suggested_minutes || 0) > 0 || row.source === "gps_csv");
  const hasResult = match.our_score != null && match.rival_score != null;
  const durationConfirmed = Boolean(match.total_duration_minutes && !["gps_suggestion", "calculated_from_max_player"].includes(match.duration_source));
  const isPast = moment(match.date).endOf("day").isBefore(moment());

  const preparationChecks = [
    callups.length >= 16,
    titulars.length === 11,
    Boolean(goalie),
    Boolean(match.captain_player_id),
    missingShirts.length === 0,
    planReady,
    logisticsReady,
    equipmentReady,
  ];
  const readiness = Math.round((preparationChecks.filter(Boolean).length / preparationChecks.length) * 100);

  const closeWarnings = [
    !hasResult ? "Falta cargar el resultado." : null,
    !durationConfirmed ? "Falta confirmar la duración oficial." : null,
    officialMinutes.length === 0 ? "Todavía no hay minutos oficiales confirmados." : null,
  ].filter(Boolean);

  async function toggleClosed() {
    try {
      const nextStatus = match.status === "finalizado" ? "activo" : "finalizado";
      await base44.entities.MatchReport.update(match.id, { status: nextStatus });
      onMatchUpdated?.({ status: nextStatus });
      toast({ title: nextStatus === "finalizado" ? "Partido cerrado" : "Partido reabierto" });
    } catch {
      toast({ title: "No se pudo cambiar el estado del partido", variant: "destructive" });
    }
  }

  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">Preparando resumen operativo…</div>;

  return <div className="space-y-4">
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Gauge size={17} className="text-yellow-400" /><h2 className="font-semibold text-white">Estado operativo del partido</h2></div>
          <p className="mt-1 text-xs text-zinc-500">Una sola vista para saber qué está listo antes del partido y qué falta cerrar después.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load(true)} disabled={refreshing} className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /></button>
          <div className="min-w-28 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center"><p className="text-3xl font-black text-white">{readiness}%</p><p className="text-[10px] uppercase tracking-wide text-zinc-500">Preparación</p></div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${readiness}%` }} /></div>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div><h3 className="font-semibold text-white">Preparación prepartido</h3><p className="mt-1 text-xs text-zinc-500">Convocatoria, formación, plan, logística y utilería.</p></div>
        <StatusRow ok={callups.length >= 16} warning={callups.length > 0} icon={Users} title="Convocatoria" detail={`${callups.length} convocados · ${substitutes.length} suplentes`} action={<ActionButton onClick={() => onNavigateTab?.("convocatoria-formacion")}>Abrir</ActionButton>} />
        <StatusRow ok={titulars.length === 11 && Boolean(goalie)} warning={titulars.length > 0} icon={ShieldCheck} title="Formación" detail={`${titulars.length}/11 titulares${goalie ? " · arquero correcto" : " · falta arquero entre titulares"}`} action={<ActionButton onClick={() => onNavigateTab?.("convocatoria-formacion")}>Revisar</ActionButton>} />
        <StatusRow ok={Boolean(match.captain_player_id)} warning={titulars.length === 11} icon={ShieldCheck} title="Capitán" detail={match.captain_player_id ? getPlayerName(playerMap.get(match.captain_player_id)) : "Pendiente de definir"} />
        <StatusRow ok={missingShirts.length === 0 && callups.length > 0} warning={missingShirts.length > 0} icon={Users} title="Dorsales" detail={missingShirts.length ? `${missingShirts.length} jugadores sin dorsal` : "Dorsales completos"} />
        <StatusRow ok={planReady} warning={!planReady && !isPast} icon={FileVideo2} title="Plan y video" detail={planReady ? "Material de partido disponible" : "Sin plan, análisis o notas cargadas"} action={<ActionButton onClick={() => onNavigateTab?.("plan-video")}>Abrir</ActionButton>} />
        <StatusRow ok={logisticsReady} warning={!logisticsReady && !isPast} icon={MapPin} title="Logística" detail={logisticsReady ? "Horario/citación y sede disponibles" : "Faltan datos operativos básicos"} action={<ActionButton onClick={() => onNavigateTab?.("logistica")}>Abrir</ActionButton>} />
        <StatusRow ok={equipmentReady} warning={Boolean(equipmentChecklist)} icon={PackageCheck} title="Utilería" detail={equipmentChecklist ? `${equipmentChecklist.title} · ${equipmentChecklist.status}` : "Sin checklist vinculado al partido"} action={<ActionButton onClick={() => window.location.assign(`/club-operations/equipment?match_id=${match.id}`)}>Utilería</ActionButton>} />
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div><h3 className="font-semibold text-white">Cierre postpartido</h3><p className="mt-1 text-xs text-zinc-500">Resultado, duración, minutos oficiales y datos de rendimiento.</p></div>
        <StatusRow ok={hasResult} warning={isPast && !hasResult} icon={ShieldCheck} title="Resultado" detail={hasResult ? `${match.our_score} - ${match.rival_score}` : "Resultado pendiente"} />
        <StatusRow ok={durationConfirmed} warning={Boolean(match.gps_duration_suggestion)} icon={Clock3} title="Duración oficial" detail={durationConfirmed ? `${match.total_duration_minutes}' confirmados` : match.gps_duration_suggestion ? `GPS sugiere ${match.gps_duration_suggestion}' · requiere confirmación` : "Pendiente de confirmar"} action={<ActionButton onClick={() => onNavigateTab?.("minutos")}>Minutos</ActionButton>} />
        <StatusRow ok={officialMinutes.length > 0} warning={gpsSuggestions.length > 0} icon={ClipboardCheck} title="Minutos oficiales" detail={officialMinutes.length ? `${officialMinutes.length} jugadores confirmados` : gpsSuggestions.length ? `${gpsSuggestions.length} sugerencias GPS pendientes de confirmar` : "Sin minutos cargados"} action={<ActionButton onClick={() => onNavigateTab?.("minutos")}>Abrir</ActionButton>} />
        <StatusRow ok={data.gps.length > 0} warning={Boolean(match.csv_url)} icon={Gauge} title="GPS" detail={data.gps.length ? `${data.gps.length} jugadores con reporte físico` : match.csv_url ? "Archivo cargado; revisar resolución de jugadores" : "Sin GPS cargado"} action={<ActionButton onClick={() => onNavigateTab?.("gps")}>Abrir</ActionButton>} />
        <StatusRow ok={Boolean(match.match_video_url)} warning={Boolean(match.video_analysis_url)} icon={FileVideo2} title="Video del partido" detail={match.match_video_url ? "Video completo disponible" : "Video completo pendiente"} action={<ActionButton onClick={() => onNavigateTab?.("plan-video")}>Abrir</ActionButton>} />

        <div className={`mt-4 rounded-xl border p-4 ${match.status === "finalizado" ? "border-emerald-500/30 bg-emerald-500/10" : closeWarnings.length ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
          <div className="flex items-start gap-3">
            {match.status === "finalizado" ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" /> : closeWarnings.length ? <AlertTriangle size={18} className="mt-0.5 text-amber-300" /> : <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" />}
            <div className="flex-1"><p className="text-sm font-semibold text-white">{match.status === "finalizado" ? "Partido cerrado" : closeWarnings.length ? "Todavía hay pendientes críticos" : "Listo para cerrar"}</p>{closeWarnings.length > 0 && match.status !== "finalizado" && <ul className="mt-2 space-y-1 text-xs text-amber-200">{closeWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>}</div>
            <button onClick={toggleClosed} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950">{match.status === "finalizado" ? "Reabrir" : "Cerrar partido"}</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
