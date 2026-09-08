import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function ManualMatchMinutesModal({ open, onClose, matches = [], players = [], onSaved }) {
  const { toast } = useToast();
  const [matchId, setMatchId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [role, setRole] = useState('titular');
  const [minutes, setMinutes] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = matches[0];
    setMatchId(first?.id || '');
    setDuration(first?.duration ? String(first.duration) : '');
    setPlayerId(''); setRole('titular'); setMinutes(''); setReason(''); setSearch('');
  }, [open, matches]);

  const match = useMemo(() => matches.find((item) => item.id === matchId) || null, [matches, matchId]);
  const player = useMemo(() => players.find((item) => item.player_id === playerId) || null, [players, playerId]);
  const existing = useMemo(() => match?.minuteRows?.find((row) => row.player_id === playerId) || null, [match, playerId]);
  const visiblePlayers = useMemo(() => {
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    if (!q) return players;
    return players.filter((p) => `${p.player_name} ${p.position}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
  }, [players, search]);

  if (!open) return null;

  function changeMatch(value) {
    setMatchId(value);
    const selected = matches.find((item) => item.id === value);
    setDuration(selected?.duration ? String(selected.duration) : '');
    setPlayerId(''); setMinutes('');
  }

  async function submit(event) {
    event.preventDefault();
    const parsedMinutes = Number(minutes);
    const parsedDuration = Number(duration);
    if (!matchId || !playerId) return toast({ title:'Elegí un partido y un jugador', variant:'destructive' });
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 180) return toast({ title:'Ingresá minutos válidos entre 0 y 180', variant:'destructive' });
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0 || parsedDuration > 180) return toast({ title:'Definí la duración real del partido', variant:'destructive' });
    if (parsedMinutes > parsedDuration) return toast({ title:'Los minutos no pueden superar la duración del partido', variant:'destructive' });
    setSaving(true);
    try {
      const res = await base44.functions.invoke('manageManualMatchMinutes', {
        operation:'save', match_id:matchId, player_id:playerId, lineup_role:role,
        minutes:parsedMinutes, match_duration_minutes:parsedDuration, reason,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      toast({ title: existing ? 'Minutos oficiales actualizados' : 'Minutos oficiales agregados', description:'También se mantuvo coherente la convocatoria del partido.' });
      await onSaved?.();
      onClose?.();
    } catch (error) { toast({ title:error.message || 'No se pudieron guardar los minutos', variant:'destructive' }); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
      <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4"><div><h2 className="text-lg font-bold text-white">Agregar minutos manualmente</h2><p className="mt-1 text-xs text-zinc-500">Carga oficial sobre un partido existente. No crea partidos paralelos ni depende del GPS.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><X size={17}/></button></div>
      <div className="space-y-4 p-5">
        <Field label="Partido"><select value={matchId} onChange={(e)=>changeMatch(e.target.value)} className="input-dark"><option value="">Seleccionar partido</option>{matches.map((m)=><option key={m.id} value={m.id}>{m.date} · vs {m.rival} · {m.displayCompetition}</option>)}</select></Field>
        {match&&<div className="flex flex-wrap gap-2 text-[11px] text-zinc-500"><span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{match.location || '—'}</span><span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{match.matchday_number ? `Fecha ${match.matchday_number}` : match.competition_round || 'Sin jornada'}</span><span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{match.status?.label || 'Partido'}</span></div>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2"><label className="text-xs font-medium text-zinc-400">Jugador</label><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar jugador" className="input-dark pl-9"/></div><select size={Math.min(7, Math.max(3, visiblePlayers.length))} value={playerId} onChange={(e)=>setPlayerId(e.target.value)} className="input-dark min-h-[118px]">{visiblePlayers.map((p)=><option key={p.player_id} value={p.player_id}>{p.player_name} · {p.position}</option>)}</select></div>
          <div className="space-y-3">
            <Field label="Rol"><select value={role} onChange={(e)=>setRole(e.target.value)} className="input-dark"><option value="titular">Titular</option><option value="suplente">Suplente</option></select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Minutos jugados"><input type="number" min="0" max="180" step="1" value={minutes} onChange={(e)=>setMinutes(e.target.value)} className="input-dark" placeholder="75"/></Field><Field label="Duración partido"><input type="number" min="1" max="180" step="1" value={duration} onChange={(e)=>setDuration(e.target.value)} className="input-dark" placeholder="90"/></Field></div>
            <Field label="Motivo / nota"><input value={reason} onChange={(e)=>setReason(e.target.value)} className="input-dark" placeholder="Opcional"/></Field>
          </div>
        </div>
        {existing&&<div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>Ya existe un registro oficial para {player?.player_name || 'este jugador'}: <strong>{Number(existing.minutes_played || 0)}'</strong>. Al guardar se actualizará esa fila canónica; no se creará un duplicado.</span></div>}
        {!match?.duration&&match&&<div className="flex items-start gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-xs text-blue-200"><Clock3 size={14} className="mt-0.5 shrink-0"/><span>Este partido todavía no tiene duración oficial. La duración que cargues acá se confirmará como duración manual del partido.</span></div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button><button type="submit" disabled={saving||!matchId||!playerId} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-yellow-400 disabled:opacity-50">{saving?'Guardando…':'Guardar minutos oficiales'}</button></div>
    </form>
  </div>;
}
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>{children}</label>; }
