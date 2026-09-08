import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, RefreshCw, Save, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';

const CORE_FIELDS = [
  ['possession_pct','Posesión','%'],
  ['shots','Tiros',''],
  ['shots_on_target','Tiros al arco',''],
  ['corners','Córners',''],
  ['fouls','Faltas',''],
  ['offsides','Offsides',''],
  ['yellow_cards','Amarillas',''],
  ['red_cards','Rojas',''],
  ['passes','Pases',''],
  ['accurate_passes','Pases correctos',''],
  ['pass_accuracy_pct','Precisión de pase','%'],
];
const ADV_FIELDS = [
  ['xg','xG',''],
  ['field_tilt_pct','Field tilt','%'],
  ['ppda','PPDA',''],
  ['recoveries','Recuperaciones',''],
  ['turnovers','Pérdidas',''],
  ['progressive_passes','Pases progresivos',''],
  ['final_third_entries','Entradas último tercio',''],
  ['box_entries','Entradas al área',''],
];
function normalizeStats(row, side) {
  return { team_side:side, source:'manual', provider:'', ...Object.fromEntries([...CORE_FIELDS,...ADV_FIELDS].map(([key]) => [key, row?.[key] ?? ''])), ...(row || {}) };
}
function numeric(value) { if (value === '' || value == null) return ''; const n=Number(value); return Number.isFinite(n)?n:''; }

export default function MatchStatisticsTab({ match }) {
  const { toast } = useToast();
  const { isAdmin, can, clubBrand } = useWorkspace();
  const canEdit = isAdmin || can?.('edit','/matches') || can?.('create','/matches') || can?.('admin','/matches');
  const [own, setOwn] = useState(() => normalizeStats(null,'own'));
  const [rival, setRival] = useState(() => normalizeStats(null,'rival'));
  const [integration, setIntegration] = useState({ has_integration_data:false, providers:[] });
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageMatchAnalysis', { operation:'get', match_id:match.id });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      const rows = data.team_stats || [];
      setOwn(normalizeStats(rows.find((r)=>r.team_side==='own'),'own'));
      setRival(normalizeStats(rows.find((r)=>r.team_side==='rival'),'rival'));
      setPlayerStats(data.player_stats || []);
      setIntegration(data.integration || { has_integration_data:false, providers:[] });
    } catch (error) { toast({ title:error.message || 'No se pudieron cargar las estadísticas', variant:'destructive' }); }
    finally { setLoading(false); }
  }, [match.id, toast]);
  useEffect(() => { load(); }, [load]);

  const dirtyManualAllowed = useMemo(() => canEdit, [canEdit]);
  async function save() {
    if (!dirtyManualAllowed) return;
    setSaving(true);
    try {
      for (const row of [own,rival]) {
        const payload = { ...row, source:'manual', provider:'' };
        delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
        const res = await base44.functions.invoke('manageMatchAnalysis', { operation:'save_team_stats', match_id:match.id, stats:payload });
        const data = res.data || res; if (data.error) throw new Error(data.error);
      }
      await load();
      toast({ title:'Estadísticas guardadas', description:'La carga manual queda confirmada y no depende de una integración.' });
    } catch (error) { toast({ title:error.message || 'No se pudieron guardar las estadísticas', variant:'destructive' }); }
    finally { setSaving(false); }
  }

  const clubName = clubBrand?.shortName || clubBrand?.name || 'Nuestro equipo';
  return <div className="space-y-4">
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white"><BarChart3 size={17} className="text-yellow-300"/> Estadísticas del partido</h2>
          <p className="mt-1 text-xs text-zinc-500">Carga manual siempre disponible. Las integraciones futuras escriben sobre este mismo modelo canónico.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><RefreshCw size={13} className="mr-1 inline"/>Actualizar</button>{canEdit&&<button onClick={save} disabled={saving} className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-yellow-400 disabled:opacity-50"><Save size={13} className="mr-1 inline"/>{saving?'Guardando…':'Guardar estadísticas'}</button>}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">Manual disponible</span>{integration.has_integration_data?<span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-blue-300">Integrado · {(integration.providers||[]).join(', ')||'Proveedor externo'}</span>:<span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-500">Sin proveedor conectado</span>}<span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-500">Manual tiene prioridad</span></div>
    </div>

    {loading ? <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-white"/></div> : <>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-[1fr_150px_150px] border-b border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-500"><span>Estadística</span><span className="text-center text-white">{clubName}</span><span className="text-center text-white">{match.rival || 'Rival'}</span></div>
        <div className="divide-y divide-zinc-800/70">{CORE_FIELDS.map(([key,label,suffix])=><StatRow key={key} field={key} label={label} suffix={suffix} own={own} rival={rival} setOwn={setOwn} setRival={setRival} canEdit={canEdit}/>)}</div>
      </div>

      <button onClick={()=>setShowAdvanced((v)=>!v)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"><Sparkles size={14} className="text-violet-300"/>{showAdvanced?'Ocultar métricas avanzadas':'Mostrar métricas avanzadas'}</button>
      {showAdvanced&&<div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-900"><div className="border-b border-zinc-800 px-4 py-3"><p className="text-sm font-bold text-white">Métricas avanzadas opcionales</p><p className="mt-1 text-xs text-zinc-500">No son obligatorias. Se completan manualmente o por un proveedor que las ofrezca.</p></div><div className="divide-y divide-zinc-800/70">{ADV_FIELDS.map(([key,label,suffix])=><StatRow key={key} field={key} label={label} suffix={suffix} own={own} rival={rival} setOwn={setOwn} setRival={setRival} canEdit={canEdit}/>)}</div></div>}

      {playerStats.length>0&&<div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex items-center gap-2"><Activity size={15} className="text-blue-300"/><h3 className="text-sm font-bold text-white">Datos individuales integrados</h3></div><p className="mt-1 text-xs text-zinc-500">{playerStats.length} jugadores tienen estadísticas individuales disponibles desde proveedor. El modelo ya está preparado para mostrarlas en una fase posterior.</p></div>}
    </>}
  </div>;
}

function StatRow({ field,label,suffix,own,rival,setOwn,setRival,canEdit }) {
  const update = (setter,value) => setter((current)=>({ ...current, [field]:numeric(value), source:'manual', provider:'' }));
  return <div className="grid grid-cols-[1fr_150px_150px] items-center px-4 py-3"><span className="text-sm text-zinc-300">{label}</span><ValueInput value={own[field]} suffix={suffix} disabled={!canEdit} onChange={(v)=>update(setOwn,v)} source={own.source} provider={own.provider}/><ValueInput value={rival[field]} suffix={suffix} disabled={!canEdit} onChange={(v)=>update(setRival,v)} source={rival.source} provider={rival.provider}/></div>;
}
function ValueInput({ value,suffix,disabled,onChange,source,provider }) { return <div className="flex flex-col items-center gap-1"><div className="relative w-28"><input type="number" step="any" min="0" disabled={disabled} value={value ?? ''} onChange={(e)=>onChange(e.target.value)} className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 pr-8 text-center text-sm font-bold text-white outline-none focus:border-yellow-500 disabled:opacity-70"/>{suffix&&<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}</div>{source==='integration'&&<span className="text-[9px] text-blue-300">{provider||'Integración'}</span>}</div>; }
