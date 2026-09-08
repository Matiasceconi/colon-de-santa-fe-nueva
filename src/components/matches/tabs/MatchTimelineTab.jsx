import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Goal, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';

const TYPES = [
  ['goal','Gol'], ['own_goal','Gol en contra'], ['penalty_goal','Gol de penal'], ['penalty_missed','Penal errado'],
  ['yellow_card','Amarilla'], ['second_yellow','Doble amarilla'], ['red_card','Roja'], ['substitution','Cambio'],
  ['injury','Lesión/incidencia'], ['var','VAR'], ['kickoff','Inicio'], ['halftime','Fin 1T'], ['fulltime','Final'], ['other','Otro'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
const PERIODS = [['1T','1T'],['2T','2T'],['ET1','Alargue 1'],['ET2','Alargue 2'],['PEN','Penales'],['PRE','Prepartido'],['POST','Postpartido']];
const TEAM_LABEL = { own:'Nuestro equipo', rival:'Rival', neutral:'Neutral' };
const EMPTY = { period:'1T', minute:'', added_minute:'', event_type:'goal', team_side:'own', player_id:'', secondary_player_id:'', player_in_id:'', player_out_id:'', rival_player_name:'', notes:'' };

function minuteLabel(event) {
  if (['PRE','POST'].includes(event.period)) return event.period === 'PRE' ? 'PRE' : 'POST';
  const minute = Number(event.minute || 0);
  const added = Number(event.added_minute || 0);
  return added > 0 ? `${minute}+${added}'` : `${minute}'`;
}
function tone(type) {
  if (['goal','own_goal','penalty_goal'].includes(type)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (['yellow_card','second_yellow'].includes(type)) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
  if (type === 'red_card') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (type === 'substitution') return 'border-blue-500/30 bg-blue-500/10 text-blue-200';
  return 'border-zinc-700 bg-zinc-800 text-zinc-300';
}
function eventSummary(event) {
  if (event.event_type === 'substitution') return [event.player_in_name && `Entra ${event.player_in_name}`, event.player_out_name && `Sale ${event.player_out_name}`].filter(Boolean).join(' · ');
  if (event.team_side === 'rival') return event.rival_player_name || event.title || TYPE_LABEL[event.event_type] || 'Evento rival';
  const main = event.player_name || event.title || TYPE_LABEL[event.event_type] || 'Evento';
  const second = event.secondary_player_name ? `Asist. ${event.secondary_player_name}` : '';
  return [main, second].filter(Boolean).join(' · ');
}

export default function MatchTimelineTab({ match, players = [] }) {
  const { toast } = useToast();
  const { isAdmin, can } = useWorkspace();
  const canEdit = isAdmin || can?.('create','/matches') || can?.('edit','/matches') || can?.('admin','/matches');
  const [events, setEvents] = useState([]);
  const [integration, setIntegration] = useState({ has_integration_data:false, providers:[] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playerName = (id) => {
    const p = playerMap.get(id);
    return p?.full_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageMatchAnalysis', { operation:'get', match_id:match.id });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setEvents(data.events || []);
      setIntegration(data.integration || { has_integration_data:false, providers:[] });
    } catch (error) {
      toast({ title:error.message || 'No se pudo cargar la cronología', variant:'destructive' });
    } finally { setLoading(false); }
  }, [match.id, toast]);
  useEffect(() => { load(); }, [load]);

  async function saveEvent(form) {
    setSaving(true);
    try {
      const payload = {
        ...form,
        minute: form.minute === '' ? 0 : Number(form.minute),
        added_minute: form.added_minute === '' ? 0 : Number(form.added_minute),
        player_name: playerName(form.player_id),
        secondary_player_name: playerName(form.secondary_player_id),
        player_in_name: playerName(form.player_in_id),
        player_out_name: playerName(form.player_out_id),
        source: form.source || 'manual',
      };
      const res = await base44.functions.invoke('manageMatchAnalysis', { operation:'save_event', match_id:match.id, event:payload });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setModal(null);
      await load();
      toast({ title:'Evento guardado' });
    } catch (error) { toast({ title:error.message || 'No se pudo guardar el evento', variant:'destructive' }); }
    finally { setSaving(false); }
  }

  async function remove(event) {
    if (event.source === 'integration') return toast({ title:'Este evento proviene de una integración', description:'No se elimina manualmente para conservar trazabilidad.' });
    if (!window.confirm(`¿Eliminar ${TYPE_LABEL[event.event_type] || 'este evento'} de la cronología?`)) return;
    try {
      const res = await base44.functions.invoke('manageMatchAnalysis', { operation:'delete_event', match_id:match.id, id:event.id });
      const data = res.data || res; if (data.error) throw new Error(data.error);
      await load();
    } catch (error) { toast({ title:error.message || 'No se pudo eliminar', variant:'destructive' }); }
  }

  const periods = useMemo(() => PERIODS.map(([key,label]) => ({ key,label,items:events.filter((e) => e.period === key) })).filter((group) => group.items.length), [events]);

  return <div className="space-y-4">
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white"><Clock3 size={17} className="text-yellow-300"/> Cronología del partido</h2>
          <p className="mt-1 text-xs text-zinc-500">Core manual listo para integraciones. Un proveedor futuro completa este mismo modelo; no crea una página paralela.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><RefreshCw size={13} className="mr-1 inline"/>Actualizar</button>
          {canEdit && <button onClick={() => setModal({ ...EMPTY })} className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-yellow-400"><Plus size={14} className="mr-1 inline"/>Agregar evento</button>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-400">{events.length} eventos</span>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">Carga manual disponible</span>
        {integration.has_integration_data ? <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-blue-300">Integrado · {(integration.providers || []).join(', ') || 'Proveedor externo'}</span> : <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-500">Sin proveedor conectado</span>}
      </div>
    </div>

    {loading ? <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-white"/></div> : periods.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center"><Goal size={30} className="mx-auto text-zinc-700"/><p className="mt-3 text-sm font-semibold text-white">Todavía no hay cronología cargada</p><p className="mt-1 text-xs text-zinc-500">Podés empezar manualmente. Si el club conecta un proveedor, los eventos se incorporarán acá.</p></div> : <div className="space-y-4">{periods.map((group) => <section key={group.key} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"><header className="border-b border-zinc-800 px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{group.label}</p></header><div className="divide-y divide-zinc-800/70">{group.items.map((event) => <div key={event.id} className="grid grid-cols-[72px_1fr_auto] items-start gap-3 px-4 py-3"><div className="pt-1 text-lg font-black text-white">{minuteLabel(event)}</div><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(event.event_type)}`}>{TYPE_LABEL[event.event_type] || event.event_type}</span><span className="text-[10px] uppercase tracking-wide text-zinc-600">{TEAM_LABEL[event.team_side] || event.team_side}</span>{event.source === 'integration' && <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-300">{event.provider || 'Integración'}</span>}{event.review_status === 'needs_review' && <span className="inline-flex items-center gap-1 text-[10px] text-amber-300"><AlertTriangle size={11}/>Revisar</span>}</div><p className="mt-1 text-sm font-semibold text-white">{eventSummary(event)}</p>{event.notes && <p className="mt-1 text-xs text-zinc-500">{event.notes}</p>}</div><div className="flex items-center gap-1">{canEdit && event.source !== 'integration' && <><button onClick={() => setModal({ ...event })} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Pencil size={13}/></button><button onClick={() => remove(event)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13}/></button></>}</div></div>)}</div></section>)}</div>}

    {modal && <EventModal form={modal} setForm={setModal} players={players} saving={saving} onClose={() => setModal(null)} onSave={saveEvent}/>} 
  </div>;
}

function EventModal({ form, setForm, players, saving, onClose, onSave }) {
  const set = (key,value) => setForm((current) => ({ ...current, [key]:value }));
  const ownPlayer = form.team_side !== 'rival';
  const substitution = form.event_type === 'substitution';
  const assistable = ['goal','penalty_goal'].includes(form.event_type);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><h3 className="font-bold text-white">{form.id ? 'Editar evento' : 'Agregar evento'}</h3><p className="text-xs text-zinc-500">La carga manual queda confirmada y tiene prioridad sobre adapters externos.</p></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><X size={17}/></button></div><div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
    <Field label="Período"><select value={form.period} onChange={(e)=>set('period',e.target.value)} className="input-dark">{PERIODS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-2"><Field label="Minuto"><input type="number" min="0" max="180" value={form.minute ?? ''} onChange={(e)=>set('minute',e.target.value)} className="input-dark"/></Field><Field label="Adicional"><input type="number" min="0" max="30" value={form.added_minute ?? ''} onChange={(e)=>set('added_minute',e.target.value)} className="input-dark" placeholder="+2"/></Field></div>
    <Field label="Evento"><select value={form.event_type} onChange={(e)=>set('event_type',e.target.value)} className="input-dark">{TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
    <Field label="Equipo"><select value={form.team_side} onChange={(e)=>set('team_side',e.target.value)} className="input-dark"><option value="own">Nuestro equipo</option><option value="rival">Rival</option><option value="neutral">Neutral</option></select></Field>
    {substitution && ownPlayer ? <><Field label="Entra"><PlayerSelect value={form.player_in_id} onChange={(v)=>set('player_in_id',v)} players={players}/></Field><Field label="Sale"><PlayerSelect value={form.player_out_id} onChange={(v)=>set('player_out_id',v)} players={players}/></Field></> : ownPlayer ? <><Field label="Jugador"><PlayerSelect value={form.player_id} onChange={(v)=>set('player_id',v)} players={players}/></Field>{assistable && <Field label="Asistencia (opcional)"><PlayerSelect value={form.secondary_player_id} onChange={(v)=>set('secondary_player_id',v)} players={players}/></Field>}</> : <Field label="Jugador rival (opcional)" className="sm:col-span-2"><input value={form.rival_player_name || ''} onChange={(e)=>set('rival_player_name',e.target.value)} className="input-dark" placeholder="Nombre informado por planilla/proveedor"/></Field>}
    <Field label="Nota" className="sm:col-span-2"><textarea rows={3} value={form.notes || ''} onChange={(e)=>set('notes',e.target.value)} className="input-dark resize-none" placeholder="Detalle opcional"/></Field>
  </div><div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4"><button onClick={onClose} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button><button disabled={saving} onClick={()=>onSave(form)} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-yellow-400 disabled:opacity-50">{saving?'Guardando…':'Guardar evento'}</button></div></div></div>;
}
function PlayerSelect({ value, onChange, players }) { return <select value={value || ''} onChange={(e)=>onChange(e.target.value)} className="input-dark"><option value="">— Sin jugador —</option>{players.map((p)=><option key={p.id} value={p.id}>{p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</option>)}</select>; }
function Field({ label, className='', children }) { return <label className={className}><span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>{children}</label>; }
