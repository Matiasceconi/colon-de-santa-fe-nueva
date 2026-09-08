import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Activity, AlertTriangle, ArrowLeft, Clock3, HeartPulse, Loader2, Plus, Save, UserRound, Dumbbell, CalendarDays } from 'lucide-react';

const STAGES = [
  ['initial', 'Etapa inicial'],
  ['intermediate', 'Etapa intermedia'],
  ['advanced', 'Etapa avanzada'],
  ['on_field', 'Rehabilitación en campo'],
  ['team_integration', 'Integración al equipo'],
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const TYPE_LABEL = { treatment: 'Tratamiento', gym: 'Gimnasio', field: 'Campo', mixed: 'Mixto', evaluation: 'Evaluación' };

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b = todayISO()) {
  if (!a) return null;
  const x = new Date(`${a}T12:00:00`); const y = new Date(`${b}T12:00:00`);
  if (Number.isNaN(x.getTime()) || Number.isNaN(y.getTime())) return null;
  return Math.round((y - x) / 86400000);
}
function splitLines(value) { return String(value || '').split('\n').map((v) => v.trim()).filter(Boolean); }
function joinLines(value) { return (value || []).join('\n'); }

function CaseEditor({ item, onSaved, onBack }) {
  const [form, setForm] = useState({ ...item, goalsText: joinLines(item.goals), restrictionsText: joinLines(item.restrictions), criteriaText: (item.progression_criteria || []).map((c) => c.label || c.criterion || '').filter(Boolean).join('\n') });
  const [session, setSession] = useState({ case_id: item.id, player_id: item.player_id, session_date: todayISO(), session_type: 'treatment', stage: item.stage || 'initial', objective: '', pain_pre: '', pain_post: '', tolerance: 'good', field_minutes: '', running_minutes: '', max_speed_pct: '', treatment_notes: '', exercise_notes: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [error, setError] = useState('');

  async function saveCase() {
    setSaving(true); setError('');
    try {
      const progression_criteria = splitLines(form.criteriaText).map((label) => ({ label, status: 'pending' }));
      const res = await base44.functions.invoke('manageKinesiology', { action: 'saveCase', case: { ...form, goals: splitLines(form.goalsText), restrictions: splitLines(form.restrictionsText), progression_criteria } });
      const data = res.data || res; if (data.error) throw new Error(data.error); await onSaved(data.case?.id || item.id);
    } catch (e) { setError(e?.message || 'Error al guardar'); } finally { setSaving(false); }
  }

  async function saveSession() {
    setSavingSession(true); setError('');
    try {
      const res = await base44.functions.invoke('manageKinesiology', { action: 'saveSession', session });
      const data = res.data || res; if (data.error) throw new Error(data.error);
      setSession((s) => ({ ...s, objective: '', pain_pre: '', pain_post: '', field_minutes: '', running_minutes: '', max_speed_pct: '', treatment_notes: '', exercise_notes: '', notes: '' }));
      await onSaved(item.id);
    } catch (e) { setError(e?.message || 'Error al guardar sesión'); } finally { setSavingSession(false); }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={15}/> Volver a casos</button>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">{item.photo_url ? <img src={item.photo_url} alt="" className="w-full h-full object-cover"/> : <UserRound size={18} className="text-zinc-600"/>}</div>
          <div className="flex-1"><h2 className="text-lg font-black text-white">{item.player_name}</h2><p className="text-sm text-zinc-400">{item.diagnosis || 'Episodio médico vinculado'}</p><p className="text-xs text-zinc-600 mt-1">{item.affected_area || ''}{item.medical_status ? ` · Estado médico: ${item.medical_status}` : ''}</p></div>
          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-300">{STAGE_LABEL[form.stage] || form.stage}</span>
        </div>
        <p className="mt-3 text-[10px] text-zinc-600">El diagnóstico y el alta médica pertenecen al Área Médica. Esta página documenta rehabilitación, tolerancia y progresión funcional.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div><h3 className="font-bold text-white">Plan de rehabilitación</h3><p className="text-xs text-zinc-500 mt-1">Objetivos, restricciones y criterios acordados. El avance nunca es automático.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Etapa</span><select value={form.stage || 'initial'} onChange={(e)=>setForm({...form,stage:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white">{STAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Fecha objetivo orientativa</span><input type="date" value={form.target_return_date || ''} onChange={(e)=>setForm({...form,target_return_date:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Responsable</span><input value={form.responsible_name || ''} onChange={(e)=>setForm({...form,responsible_name:e.target.value})} placeholder="Kinesiólogo / readaptador" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Estado del caso</span><select value={form.status || 'active'} onChange={(e)=>setForm({...form,status:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"><option value="active">Activo</option><option value="paused">Pausado</option><option value="completed">Cerrado kinésicamente</option></select></label>
          </div>
          <label className="space-y-1 block"><span className="text-[10px] text-zinc-500">Objetivos · uno por línea</span><textarea rows={4} value={form.goalsText} onChange={(e)=>setForm({...form,goalsText:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="Recuperar tolerancia a carrera\nRecuperar fuerza excéntrica..."/></label>
          <label className="space-y-1 block"><span className="text-[10px] text-zinc-500">Restricciones actuales · una por línea</span><textarea rows={3} value={form.restrictionsText} onChange={(e)=>setForm({...form,restrictionsText:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="Sin sprint máximo\nEvitar cambios de dirección..."/></label>
          <label className="space-y-1 block"><span className="text-[10px] text-zinc-500">Criterios de progresión · uno por línea</span><textarea rows={4} value={form.criteriaText} onChange={(e)=>setForm({...form,criteriaText:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="Dolor tolerable en tarea\nCriterio de fuerza\nExposición progresiva a sprint..."/></label>
          <label className="space-y-1 block"><span className="text-[10px] text-zinc-500">Notas compartidas</span><textarea rows={3} value={form.notes || ''} onChange={(e)=>setForm({...form,notes:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"/></label>
          <button onClick={saveCase} disabled={saving} className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50 flex items-center justify-center gap-2">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} Guardar plan</button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div><h3 className="font-bold text-white">Registrar sesión kinésica</h3><p className="text-xs text-zinc-500 mt-1">Tratamiento, gimnasio, campo o evaluación. La respuesta del jugador queda en el historial.</p></div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={session.session_date} onChange={(e)=>setSession({...session,session_date:e.target.value})} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/>
            <select value={session.session_type} onChange={(e)=>setSession({...session,session_type:e.target.value})} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white">{Object.entries(TYPE_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          </div>
          <input value={session.objective} onChange={(e)=>setSession({...session,objective:e.target.value})} placeholder="Objetivo de la sesión" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Dolor pre 0-10</span><input type="number" min="0" max="10" value={session.pain_pre} onChange={(e)=>setSession({...session,pain_pre:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Dolor post 0-10</span><input type="number" min="0" max="10" value={session.pain_post} onChange={(e)=>setSession({...session,pain_post:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Tolerancia</span><select value={session.tolerance} onChange={(e)=>setSession({...session,tolerance:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"><option value="good">Buena</option><option value="limited">Limitada</option><option value="adverse">Adversa</option></select></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Minutos campo</span><input type="number" min="0" value={session.field_minutes} onChange={(e)=>setSession({...session,field_minutes:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Minutos carrera</span><input type="number" min="0" value={session.running_minutes} onChange={(e)=>setSession({...session,running_minutes:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
            <label className="space-y-1"><span className="text-[10px] text-zinc-500">Vel. máx objetivo %</span><input type="number" min="0" max="120" value={session.max_speed_pct} onChange={(e)=>setSession({...session,max_speed_pct:e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white"/></label>
          </div>
          <textarea rows={3} value={session.treatment_notes} onChange={(e)=>setSession({...session,treatment_notes:e.target.value})} placeholder="Tratamiento / intervención" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"/>
          <textarea rows={3} value={session.exercise_notes} onChange={(e)=>setSession({...session,exercise_notes:e.target.value})} placeholder="Ejercicios / trabajo realizado" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"/>
          <button onClick={saveSession} disabled={savingSession} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">{savingSession?<Loader2 size={15} className="animate-spin"/>:<Plus size={15}/>} Registrar sesión</button>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 p-4"><h3 className="font-bold text-white">Historial de sesiones</h3></div>
        {(item.sessions || []).length === 0 ? <p className="p-6 text-sm text-zinc-600">Todavía no hay sesiones registradas.</p> : <div className="divide-y divide-zinc-800">{item.sessions.map((s)=><div key={s.id} className="p-4 flex flex-wrap items-center gap-3"><div className="min-w-28"><p className="text-xs font-bold text-white">{s.session_date}</p><p className="text-[10px] text-zinc-600">{TYPE_LABEL[s.session_type] || s.session_type}</p></div><div className="flex-1 min-w-48"><p className="text-sm text-zinc-300">{s.objective || 'Sesión kinésica'}</p><p className="text-[10px] text-zinc-600 mt-1">{[s.field_minutes ? `${s.field_minutes} min campo` : '', s.running_minutes ? `${s.running_minutes} min carrera` : '', s.max_speed_pct ? `${s.max_speed_pct}% Vmáx` : ''].filter(Boolean).join(' · ')}</p></div><div className="text-xs text-zinc-500">Dolor {s.pain_pre ?? '—'} → {s.pain_post ?? '—'}</div><span className={`text-[10px] font-bold ${s.tolerance==='adverse'?'text-red-300':s.tolerance==='limited'?'text-amber-300':'text-emerald-300'}`}>{s.tolerance==='adverse'?'Adversa':s.tolerance==='limited'?'Limitada':'Buena'}</span></div>)}</div>}
      </section>
    </div>
  );
}

export default function Kinesiology() {
  const { activeSquad, activeSquadId } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(null);
  const [responsible, setResponsible] = useState('');

  const load = useCallback(async (keepId = '') => {
    if (!activeSquadId) { setData(null); setLoading(false); return; }
    setLoading(true); setError('');
    try { const res=await base44.functions.invoke('manageKinesiology',{action:'getData',squad_id:activeSquadId}); const d=res.data||res; if(d.error) throw new Error(d.error); setData(d); if(keepId) setSelectedId(keepId); }
    catch(e){ setError(e?.message||'Error al cargar Kinesiología'); } finally { setLoading(false); }
  },[activeSquadId]);
  useEffect(()=>{load();},[load]);

  const activeCases = useMemo(()=> (data?.cases||[]).filter(c=>c.status!=='completed'),[data]);
  const selected = (data?.cases||[]).find(c=>c.id===selectedId);
  const existingEpisodeIds = new Set(activeCases.map(c=>c.medical_episode_id));
  const availableCandidates = (data?.candidates||[]).filter(c=>!existingEpisodeIds.has(c.medical_episode_id));

  async function createCase(candidate){
    try { setCreating(candidate.medical_episode_id); const res=await base44.functions.invoke('manageKinesiology',{action:'saveCase',case:{squad_id:activeSquadId,player_id:candidate.player_id,player_name:candidate.player_name,medical_episode_id:candidate.medical_episode_id,start_date:candidate.start_date||todayISO(),target_return_date:candidate.target_return_date||null,responsible_name:responsible,stage:'initial',status:'active',goals:[],restrictions:[],progression_criteria:[],shared_with_pf:true}}); const d=res.data||res; if(d.error) throw new Error(d.error); await load(d.case.id); }
    catch(e){setError(e?.message||'Error al crear caso');} finally {setCreating(null);}
  }

  if (!activeSquadId) return <div className="p-6 text-zinc-500">Seleccioná un plantel para abrir Kinesiología.</div>;
  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-600"/></div>;
  if (error && !data) return <div className="p-6 text-red-300">{error}</div>;
  if (selected) return <CaseEditor item={selected} onBack={()=>setSelectedId('')} onSaved={(id)=>load(id)} />;

  const onField = activeCases.filter(c=>c.stage==='on_field').length;
  const integration = activeCases.filter(c=>c.stage==='team_integration').length;
  const adverse = activeCases.filter(c=>c.last_session?.tolerance==='adverse').length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-black text-white flex items-center gap-2"><HeartPulse size={22} className="text-sky-400"/> Kinesiología</h1><p className="text-sm text-zinc-500 mt-1">Rehabilitación vinculada al episodio médico · seguimiento funcional y retorno progresivo · {activeSquad?.name}</p></div><a href="/performance/medical" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white">Abrir Área Médica</a></div>
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-zinc-400"><strong className="text-sky-200">Regla del módulo:</strong> Kinesiología no crea diagnósticos ni otorga alta médica. Trabaja sobre un episodio de Área Médica y documenta capacidad, síntomas, exposición y criterios de progresión.</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[[HeartPulse,'Casos activos',activeCases.length,'text-sky-300'],[Activity,'En campo',onField,'text-emerald-300'],[Dumbbell,'Integración equipo',integration,'text-violet-300'],[AlertTriangle,'Respuesta adversa',adverse,'text-red-300']].map(([Icon,label,value,tone])=><div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"><Icon size={15} className={tone}/><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p><p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p></div>)}</div>

      <section className="space-y-3"><div><h2 className="text-sm font-bold uppercase text-zinc-400">Casos activos</h2><p className="text-xs text-zinc-600 mt-1">Cada caso conserva el vínculo con su episodio médico.</p></div>{activeCases.length===0?<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-600">No hay casos kinésicos activos.</div>:<div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{activeCases.map(c=>{const d=daysBetween(c.start_date||c.medical_start_date);return <button key={c.id} onClick={()=>setSelectedId(c.id)} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-sky-500/30"><div className="flex gap-3"><div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">{c.photo_url?<img src={c.photo_url} alt="" className="w-full h-full object-cover"/>:<UserRound size={16} className="text-zinc-600"/>}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-white">{c.player_name}</p><span className="text-[9px] rounded-full bg-sky-500/10 text-sky-300 px-2 py-0.5">{STAGE_LABEL[c.stage]||c.stage}</span></div><p className="text-sm text-zinc-400 mt-1 truncate">{c.diagnosis||'Episodio médico'}</p><div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-600">{d!=null&&<span><Clock3 size={10} className="inline mr-1"/>{d} días</span>}{c.target_return_date&&<span><CalendarDays size={10} className="inline mr-1"/>Objetivo {c.target_return_date}</span>}{c.last_session&&<span>Última sesión {c.last_session.session_date}</span>}</div></div></div></button>})}</div>}</section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3"><div className="flex items-start justify-between gap-3 flex-wrap"><div><h2 className="font-bold text-white">Iniciar rehabilitación</h2><p className="text-xs text-zinc-500 mt-1">Sólo aparecen jugadores con episodio médico activo y sin caso kinésico abierto.</p></div><input value={responsible} onChange={(e)=>setResponsible(e.target.value)} placeholder="Responsable (opcional)" className="rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-2 text-xs text-white"/></div>{availableCandidates.length===0?<p className="text-sm text-zinc-600 py-4">No hay nuevos episodios médicos disponibles para iniciar.</p>:<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{availableCandidates.map(c=><div key={c.medical_episode_id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex gap-2"><div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">{c.photo_url?<img src={c.photo_url} alt="" className="w-full h-full object-cover"/>:<UserRound size={14} className="text-zinc-600"/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white truncate">{c.player_name}</p><p className="text-xs text-zinc-500 truncate">{c.diagnosis}</p><p className="text-[10px] text-zinc-600 mt-1">{c.current_status}</p></div></div><button disabled={creating===c.medical_episode_id} onClick={()=>createCase(c)} className="mt-3 w-full rounded-lg bg-sky-600 py-2 text-xs font-bold text-white disabled:opacity-50">{creating===c.medical_episode_id?'Creando...':'Iniciar caso kinésico'}</button></div>)}</div>}</section>
    </div>
  );
}
