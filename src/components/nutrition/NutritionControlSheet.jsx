import React, { useMemo, useState } from "react";
import moment from "moment";
import { ClipboardPlus, Droplets, Search, Utensils, Weight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const CONTROL_TYPES = [
  ["habitual", "Control habitual"], ["peso", "Peso"], ["antropometria", "Antropometría"],
  ["hidratacion", "Hidratación"], ["alimentacion", "Alimentación"], ["seguimiento_plan", "Seguimiento de plan"],
  ["suplementacion", "Suplementación"], ["retorno_lesion", "Retorno de lesión"], ["otro", "Otro"],
];
const APPETITE = [["muy_bajo", "Muy bajo"], ["bajo", "Bajo"], ["normal", "Normal"], ["alto", "Alto"], ["muy_alto", "Muy alto"]];
const ADHERENCE = [["muy_baja", "Muy baja"], ["baja", "Baja"], ["adecuada", "Adecuada"], ["muy_buena", "Muy buena"]];
const INTERVENTIONS = [["sin_intervencion", "Sin intervención"], ["seguimiento", "Seguimiento"], ["ajustar_plan", "Ajustar plan"], ["citar_jugador", "Citar jugador"], ["derivar", "Derivar"], ["otro", "Otro"]];
const GI_OPTIONS = ["Náuseas", "Dolor abdominal", "Distensión", "Diarrea", "Constipación", "Reflujo", "Otro"];

function nameOf(player) { return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador"; }
function labelOf(options, value) { return options.find(([key]) => key === value)?.[1] || "—"; }
function numeric(value) { return value === "" || value == null ? undefined : Number(value); }

export default function NutritionControlSheet({ players = [], controls = [], activeSquad, onReload }) {
  const { can } = useWorkspace();
  const canCreate = can("create", "/performance/nutrition");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const rows = useMemo(() => controls.filter((row) => {
    const player = playerMap[row.player_id];
    const matchesName = nameOf(player).toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === "all" || row.control_type === typeFilter;
    return matchesName && matchesType;
  }).sort((a, b) => String(b.control_date || "").localeCompare(String(a.control_date || ""))), [controls, playerMap, query, typeFilter]);

  return <div className="space-y-4">
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Planilla nativa PerformancePitch</p><h2 className="mt-2 text-xl font-bold">Controles nutricionales</h2><p className="mt-1 max-w-3xl text-sm text-zinc-500">Cada control registra solo lo que realmente se evaluó ese día: peso, alimentación, adherencia, síntomas, hidratación, intervención y próximo control.</p></div>
        {canCreate && <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-zinc-900 hover:bg-zinc-200"><ClipboardPlus size={16} /> Nuevo control</button>}
      </div>
    </section>

    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 md:flex-row">
      <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador..." className="border-zinc-700 bg-zinc-950 pl-9 text-white" /></div>
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-300"><option value="all">Todos los controles</option>{CONTROL_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>

    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3"><p className="font-bold">Historial de controles</p><p className="text-xs text-zinc-600">{rows.length} registros · {activeSquad?.name || "Plantel"}</p></div>
      <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead className="bg-zinc-950/60 text-left text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="p-3">Jugador</th><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Peso</th><th className="p-3">Alimentación</th><th className="p-3">Hidratación</th><th className="p-3">Intervención</th><th className="p-3">Próximo control</th></tr></thead>
      <tbody>{rows.map((row) => { const player = playerMap[row.player_id]; return <tr key={row.id} className="border-t border-zinc-800/70 hover:bg-zinc-800/25">
        <td className="p-3"><div className="flex items-center gap-2"><PlayerPhoto player={player || { full_name: row.player_name }} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"/><div><p className="font-semibold text-zinc-200">{nameOf(player) || row.player_name}</p><p className="text-[10px] text-zinc-600">{player?.position || ""}</p></div></div></td>
        <td className="p-3 text-zinc-400">{row.control_date ? moment(row.control_date).format("DD/MM/YYYY") : "—"}</td>
        <td className="p-3 text-zinc-300">{labelOf(CONTROL_TYPES, row.control_type)}</td>
        <td className="p-3"><span className="inline-flex items-center gap-1 text-zinc-200"><Weight size={13}/>{row.weight_kg != null ? `${Number(row.weight_kg).toFixed(1)} kg` : "—"}</span></td>
        <td className="p-3"><div className="space-y-0.5"><p className="inline-flex items-center gap-1 text-zinc-300"><Utensils size={13}/> Adh.: {labelOf(ADHERENCE, row.plan_adherence)}</p>{row.gi_symptoms && <p className="text-xs text-amber-300">Síntomas GI registrados</p>}</div></td>
        <td className="p-3">{row.hydration_measured ? <div><p className="inline-flex items-center gap-1 text-cyan-300"><Droplets size={13}/> Medida</p>{row.sweat_rate_l_h != null && <p className="text-xs text-zinc-500">{Number(row.sweat_rate_l_h).toFixed(2)} L/h</p>}</div> : <span className="text-zinc-700">No medida</span>}</td>
        <td className="p-3 text-zinc-300">{labelOf(INTERVENTIONS, row.intervention)}</td>
        <td className="p-3 text-zinc-400">{row.next_control_date ? moment(row.next_control_date).format("DD/MM/YYYY") : "—"}</td>
      </tr>; })}{!rows.length && <tr><td colSpan={8} className="p-12 text-center text-zinc-600">Todavía no hay controles con estos filtros.</td></tr>}</tbody></table></div>
    </section>
    {creating && <ControlModal players={players} activeSquad={activeSquad} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); onReload?.(); }} />}
  </div>;
}

function ControlModal({ players, activeSquad, onClose, onSaved }) {
  const sortedPlayers = useMemo(() => [...players].sort((a,b) => nameOf(a).localeCompare(nameOf(b))), [players]);
  const [form, setForm] = useState({ player_id: "", control_date: moment().format("YYYY-MM-DD"), control_time: moment().format("HH:mm"), control_type: "habitual", reason: "", weight_kg: "", appetite: "normal", plan_adherence: "adecuada", missed_meals: "0", breakfast_status: "si", pre_training_nutrition: "no_aplica", post_training_recovery: "no_aplica", gi_symptoms: false, gi_symptom_types: [], food_notes: "", hydration_measured: false, pre_weight_kg: "", post_weight_kg: "", fluid_intake_ml: "", urine_output_ml: "", activity_duration_min: "", urine_specific_gravity: "", urine_color: "", temperature_c: "", intervention: "sin_intervencion", next_control_date: "", shared_summary: "", private_notes: "" });
  const [saving, setSaving] = useState(false); const { toast } = useToast();
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleGI = (label) => setForm((f) => ({ ...f, gi_symptom_types: f.gi_symptom_types.includes(label) ? f.gi_symptom_types.filter((x) => x !== label) : [...f.gi_symptom_types, label] }));

  async function save(e) {
    e.preventDefault(); const player = sortedPlayers.find((p) => p.id === form.player_id); if (!player) return;
    setSaving(true);
    try {
      const user = await base44.auth.me(); const now = new Date().toISOString();
      const pre = numeric(form.pre_weight_kg), post = numeric(form.post_weight_kg), intake = numeric(form.fluid_intake_ml) || 0, urine = numeric(form.urine_output_ml) || 0, duration = numeric(form.activity_duration_min);
      const massChange = pre && post ? ((post - pre) / pre) * 100 : undefined;
      const sweatLoss = pre && post ? (pre - post) + (intake - urine) / 1000 : undefined;
      const sweatRate = sweatLoss != null && duration ? sweatLoss / (duration / 60) : undefined;
      const payload = {
        club_id: player.club_id || "", squad_id: activeSquad?.id || player.squad_id || "", season_id: String(activeSquad?.season || player.season_id || ""), player_id: player.id, player_name: nameOf(player), control_date: form.control_date, control_time: form.control_time, control_type: form.control_type, reason: form.reason,
        weight_kg: numeric(form.weight_kg), height_cm: player.height || undefined, appetite: form.appetite, plan_adherence: form.plan_adherence, missed_meals: numeric(form.missed_meals), breakfast_status: form.breakfast_status, pre_training_nutrition: form.pre_training_nutrition, post_training_recovery: form.post_training_recovery, gi_symptoms: form.gi_symptoms, gi_symptom_types: form.gi_symptoms ? form.gi_symptom_types : [], food_notes: form.food_notes,
        hydration_measured: form.hydration_measured, pre_weight_kg: form.hydration_measured ? pre : undefined, post_weight_kg: form.hydration_measured ? post : undefined, fluid_intake_ml: form.hydration_measured ? numeric(form.fluid_intake_ml) : undefined, urine_output_ml: form.hydration_measured ? numeric(form.urine_output_ml) : undefined, activity_duration_min: form.hydration_measured ? duration : undefined, urine_specific_gravity: form.hydration_measured ? numeric(form.urine_specific_gravity) : undefined, urine_color: form.hydration_measured ? numeric(form.urine_color) : undefined, temperature_c: form.hydration_measured ? numeric(form.temperature_c) : undefined, body_mass_change_pct: form.hydration_measured ? massChange : undefined, estimated_sweat_loss_l: form.hydration_measured ? sweatLoss : undefined, sweat_rate_l_h: form.hydration_measured ? sweatRate : undefined,
        intervention: form.intervention, next_control_date: form.next_control_date || undefined, shared_summary: form.shared_summary, private_notes: form.private_notes, source: "app", responsible_user_id: user?.id || "", responsible_name: user?.full_name || user?.email || "Usuario", created_by_name: user?.full_name || user?.email || "Usuario", created_at: now, updated_at: now,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      await base44.entities.NutritionControl.create(payload); toast({ title: "Control nutricional guardado", description: `${nameOf(player)} · ${moment(form.control_date).format("DD/MM/YYYY")}` }); onSaved();
    } catch (error) { toast({ title: "No se pudo guardar", description: error?.message || "Intentá nuevamente.", variant: "destructive" }); } finally { setSaving(false); }
  }

  const input = "border-zinc-700 bg-zinc-800 text-white";
  const MiniSelect = ({ label, value, onValueChange, options }) => <div><label className="mb-1 block text-xs text-zinc-400">{label}</label><Select value={value} onValueChange={onValueChange}><SelectTrigger className={input}><SelectValue /></SelectTrigger><SelectContent className="border-zinc-700 bg-zinc-900">{options.map(([v,l]) => <SelectItem key={v} value={v} className="text-white">{l}</SelectItem>)}</SelectContent></Select></div>;
  return <Dialog open onOpenChange={onClose}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-zinc-800 bg-zinc-900 text-white"><DialogHeader><DialogTitle>Nuevo control nutricional</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-6">
    <section className="grid gap-3 md:grid-cols-4"><div><label className="mb-1 block text-xs text-zinc-400">Jugador *</label><Select value={form.player_id} onValueChange={(v) => patch("player_id", v)}><SelectTrigger className={input}><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent className="border-zinc-700 bg-zinc-900">{sortedPlayers.map((p) => <SelectItem key={p.id} value={p.id} className="text-white">{nameOf(p)}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1 block text-xs text-zinc-400">Fecha *</label><Input type="date" value={form.control_date} onChange={(e)=>patch("control_date",e.target.value)} className={input}/></div><div><label className="mb-1 block text-xs text-zinc-400">Hora</label><Input type="time" value={form.control_time} onChange={(e)=>patch("control_time",e.target.value)} className={input}/></div><MiniSelect label="Tipo de control" value={form.control_type} onValueChange={(v)=>patch("control_type",v)} options={CONTROL_TYPES}/></section>
    <section><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Peso y contexto</p><div className="grid gap-3 md:grid-cols-3"><div><label className="mb-1 block text-xs text-zinc-400">Peso (kg)</label><Input type="number" step="0.1" value={form.weight_kg} onChange={(e)=>patch("weight_kg",e.target.value)} className={input}/></div><div className="md:col-span-2"><label className="mb-1 block text-xs text-zinc-400">Motivo del control</label><Input value={form.reason} onChange={(e)=>patch("reason",e.target.value)} placeholder="Control habitual, seguimiento, retorno, etc." className={input}/></div></div></section>
    <section><div className="mb-3 flex items-center gap-2"><Utensils size={15} className="text-emerald-300"/><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Alimentación y adherencia</p></div><div className="grid gap-3 md:grid-cols-3"><MiniSelect label="Apetito" value={form.appetite} onValueChange={(v)=>patch("appetite",v)} options={APPETITE}/><MiniSelect label="Adherencia al plan" value={form.plan_adherence} onValueChange={(v)=>patch("plan_adherence",v)} options={ADHERENCE}/><div><label className="mb-1 block text-xs text-zinc-400">Comidas omitidas</label><Input type="number" min="0" value={form.missed_meals} onChange={(e)=>patch("missed_meals",e.target.value)} className={input}/></div><MiniSelect label="Desayuno" value={form.breakfast_status} onValueChange={(v)=>patch("breakfast_status",v)} options={[["si","Sí"],["parcial","Parcial"],["no","No"],["no_aplica","No aplica"]]}/><MiniSelect label="Pre entrenamiento" value={form.pre_training_nutrition} onValueChange={(v)=>patch("pre_training_nutrition",v)} options={[["adecuada","Adecuada"],["parcial","Parcial"],["no","No"],["no_aplica","No aplica"]]}/><MiniSelect label="Recuperación post" value={form.post_training_recovery} onValueChange={(v)=>patch("post_training_recovery",v)} options={[["adecuada","Adecuada"],["parcial","Parcial"],["no","No"],["no_aplica","No aplica"]]}/></div><div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={form.gi_symptoms} onChange={(e)=>patch("gi_symptoms",e.target.checked)}/> Molestias gastrointestinales</label>{form.gi_symptoms && <div className="mt-3 flex flex-wrap gap-2">{GI_OPTIONS.map((g) => <button key={g} type="button" onClick={()=>toggleGI(g)} className={`rounded-full border px-3 py-1 text-xs ${form.gi_symptom_types.includes(g) ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-500"}`}>{g}</button>)}</div>}</div><div className="mt-3"><label className="mb-1 block text-xs text-zinc-400">Registro / observaciones de alimentación</label><Textarea rows={3} value={form.food_notes} onChange={(e)=>patch("food_notes",e.target.value)} className="border-zinc-700 bg-zinc-800 text-white"/></div></section>
    <section><label className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-200"><input type="checkbox" checked={form.hydration_measured} onChange={(e)=>patch("hydration_measured",e.target.checked)}/><Droplets size={16}/> Se realizó control de hidratación</label>{form.hydration_measured && <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["pre_weight_kg","Peso pre (kg)","0.1"],["post_weight_kg","Peso post (kg)","0.1"],["fluid_intake_ml","Líquido ingerido (ml)","1"],["urine_output_ml","Orina (ml)","1"],["activity_duration_min","Duración (min)","1"],["urine_specific_gravity","USG","0.001"],["urine_color","Color orina (1-8)","1"],["temperature_c","Temperatura (°C)","0.1"]].map(([k,l,s]) => <div key={k}><label className="mb-1 block text-xs text-zinc-400">{l}</label><Input type="number" step={s} value={form[k]} onChange={(e)=>patch(k,e.target.value)} className={input}/></div>)}</div>}</section>
    <section className="grid gap-3 md:grid-cols-2"><MiniSelect label="Acción / intervención" value={form.intervention} onValueChange={(v)=>patch("intervention",v)} options={INTERVENTIONS}/><div><label className="mb-1 block text-xs text-zinc-400">Próximo control</label><Input type="date" value={form.next_control_date} onChange={(e)=>patch("next_control_date",e.target.value)} className={input}/></div><div><label className="mb-1 block text-xs text-zinc-400">Resumen operativo</label><Textarea rows={3} value={form.shared_summary} onChange={(e)=>patch("shared_summary",e.target.value)} placeholder="Qué necesita saber el equipo autorizado" className="border-zinc-700 bg-zinc-800 text-white"/></div><div><label className="mb-1 block text-xs text-zinc-400">Notas internas Nutrición</label><Textarea rows={3} value={form.private_notes} onChange={(e)=>patch("private_notes",e.target.value)} className="border-zinc-700 bg-zinc-800 text-white"/></div></section>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button><Button type="submit" disabled={saving || !form.player_id || !form.control_date} className="bg-white text-zinc-900 hover:bg-zinc-200">{saving ? "Guardando..." : "Guardar control"}</Button></div>
  </form></DialogContent></Dialog>;
}
