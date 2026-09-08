import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, GripVertical, Copy, Dumbbell, Loader2, Save, Send, X, UserRound, Calendar, ChevronDown, ChevronUp, Bookmark, Search, CheckCircle2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ExercisePickerModal from './ExercisePickerModal';

const BLOCK_TYPES = [
  { value: 'activation', label: 'Activación' },
  { value: 'main', label: 'Bloque principal' },
  { value: 'accessories', label: 'Accesorios / preventivo' },
];

function emptyExercise(lib) {
  return {
    library_exercise_id: lib.id,
    library_exercise_name: lib.name,
    library_exercise_image: lib.image_url || '',
    library_exercise_video: lib.video_url || '',
    sets: lib.sets ? Number(lib.sets) : null,
    repetitions: lib.reps || '',
    rest_seconds: lib.rest_time && Number.isFinite(Number(lib.rest_time)) ? Number(lib.rest_time) : null,
    prescribed_load_kg: null,
    target_type: 'none',
    target_value: '',
    technical_instructions: lib.notes || '',
    general_note: '',
  };
}

function ExerciseRow({ ex, onChange, onRemove, onDuplicate }) {
  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/35 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
          {ex.library_exercise_image ? <img src={ex.library_exercise_image} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Dumbbell size={15} className="text-zinc-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-semibold truncate">{ex.library_exercise_name || 'Ejercicio'}</p>
          <p className="text-[10px] text-zinc-600">Prescripción exclusiva de este jugador</p>
        </div>
        <button type="button" onClick={onDuplicate} className="text-zinc-500 hover:text-white p-1" title="Duplicar"><Copy size={13} /></button>
        <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1" title="Quitar"><Trash2 size={13} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="space-y-1"><span className="text-[10px] text-zinc-500">Series</span><input type="number" min="1" value={ex.sets ?? ''} onChange={(e) => onChange({ ...ex, sets: e.target.value ? Number(e.target.value) : null })} placeholder="4" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" /></label>
        <label className="space-y-1"><span className="text-[10px] text-zinc-500">Reps / tiempo</span><input value={ex.repetitions || ''} onChange={(e) => onChange({ ...ex, repetitions: e.target.value })} placeholder="6 / 30s" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" /></label>
        <label className="space-y-1"><span className="text-[10px] text-zinc-500">Pausa (s)</span><input type="number" min="0" value={ex.rest_seconds ?? ''} onChange={(e) => onChange({ ...ex, rest_seconds: e.target.value === '' ? null : Number(e.target.value) })} placeholder="90" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" /></label>
        <label className="space-y-1"><span className="text-[10px] text-zinc-500">Carga (kg)</span><input type="number" min="0" step="0.5" value={ex.prescribed_load_kg ?? ''} onChange={(e) => onChange({ ...ex, prescribed_load_kg: e.target.value === '' ? null : Number(e.target.value) })} placeholder="70" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" /></label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select value={ex.target_type || 'none'} onChange={(e) => onChange({ ...ex, target_type: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white">
          <option value="none">Sin objetivo de esfuerzo</option>
          <option value="RIR">Objetivo RIR</option>
          <option value="RPE">Objetivo RPE</option>
        </select>
        <input value={ex.target_value || ''} onChange={(e) => onChange({ ...ex, target_value: e.target.value })} placeholder="Valor objetivo" disabled={ex.target_type === 'none'} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white disabled:opacity-40" />
        <input value={ex.technical_instructions || ''} onChange={(e) => onChange({ ...ex, technical_instructions: e.target.value })} placeholder="Indicación técnica" className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
      </div>
      <input value={ex.general_note || ''} onChange={(e) => onChange({ ...ex, general_note: e.target.value })} placeholder="Nota para el jugador" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove, squadId }) {
  const [open, setOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercise(lib) {
    onChange({ ...block, exercises: [...(block.exercises || []), emptyExercise(lib)] });
  }
  function updateEx(i, ex) {
    const list = [...(block.exercises || [])];
    list[i] = ex;
    onChange({ ...block, exercises: list });
  }
  function removeEx(i) {
    onChange({ ...block, exercises: (block.exercises || []).filter((_, idx) => idx !== i) });
  }
  function dupEx(i) {
    const list = [...(block.exercises || [])];
    list.splice(i + 1, 0, { ...list[i], id: undefined });
    onChange({ ...block, exercises: list });
  }
  function onDragEnd(result) {
    if (!result.destination) return;
    const list = [...(block.exercises || [])];
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    onChange({ ...block, exercises: list });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <GripVertical size={14} className="text-zinc-600" />
        <select value={block.block_type || 'main'} onChange={(e) => onChange({ ...block, block_type: e.target.value })} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white">
          {BLOCK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={block.name || ''} onChange={(e) => onChange({ ...block, name: e.target.value })} placeholder="Nombre del bloque" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white" />
        <button type="button" onClick={() => setOpen(!open)} className="text-zinc-500 hover:text-white p-1">{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
        <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <input value={block.instructions || ''} onChange={(e) => onChange({ ...block, instructions: e.target.value })} placeholder="Indicaciones del bloque" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={`individual-ex-${block._key || block.id || block.name || 'block'}`}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {(block.exercises || []).map((ex, i) => (
                    <Draggable key={ex.id || `${ex.library_exercise_id}-${i}`} draggableId={`individual-ex-${block._key || block.id || 'b'}-${i}`} index={i}>
                      {(p, s) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={s.isDragging ? 'opacity-70' : ''}>
                          <ExerciseRow ex={ex} onChange={(e) => updateEx(i, e)} onRemove={() => removeEx(i)} onDuplicate={() => dupEx(i)} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button type="button" onClick={() => setPickerOpen(true)} className="w-full py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-400 hover:border-zinc-500 hover:text-white flex items-center justify-center gap-1"><Plus size={12} /> Agregar ejercicio desde biblioteca</button>
        </div>
      )}
      {pickerOpen && <ExercisePickerModal squadId={squadId} onPick={addExercise} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function WorkoutEditor({ workout, onChange, onRemove, squadId }) {
  const [open, setOpen] = useState(true);
  function addBlock(type) {
    onChange({ ...workout, blocks: [...(workout.blocks || []), { _key: `${Date.now()}-${Math.random()}`, block_type: type, name: '', instructions: '', exercises: [] }] });
  }
  function updateBlock(i, b) {
    const list = [...(workout.blocks || [])];
    list[i] = b;
    onChange({ ...workout, blocks: list });
  }
  function removeBlock(i) {
    onChange({ ...workout, blocks: (workout.blocks || []).filter((_, idx) => idx !== i) });
  }
  function onDragEnd(result) {
    if (!result.destination) return;
    const list = [...(workout.blocks || [])];
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    onChange({ ...workout, blocks: list });
  }

  const exerciseCount = (workout.blocks || []).reduce((sum, b) => sum + (b.exercises || []).length, 0);
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-zinc-900/50">
        <Calendar size={15} className="text-blue-400" />
        <input type="date" value={workout.workout_date || ''} onChange={(e) => onChange({ ...workout, workout_date: e.target.value })} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white" />
        <input value={workout.title || ''} onChange={(e) => onChange({ ...workout, title: e.target.value })} placeholder="Título del trabajo" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white" />
        <span className="hidden md:inline text-[10px] text-zinc-600">{exerciseCount} ejercicios</span>
        <button type="button" onClick={() => setOpen(!open)} className="text-zinc-500 hover:text-white p-1">{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
        <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
      </div>
      {open && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={workout.objective || ''} onChange={(e) => onChange({ ...workout, objective: e.target.value })} placeholder="Objetivo del día" className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
            <input type="number" min="1" value={workout.estimated_duration_minutes ?? ''} onChange={(e) => onChange({ ...workout, estimated_duration_minutes: e.target.value ? Number(e.target.value) : null })} placeholder="Duración estimada (min)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
          </div>
          <input value={workout.instructions || ''} onChange={(e) => onChange({ ...workout, instructions: e.target.value })} placeholder="Indicaciones del entrenamiento para el jugador" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white" />
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={`individual-blocks-${workout._key || workout.id || workout.workout_date || 'w'}`}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {(workout.blocks || []).map((b, i) => (
                    <Draggable key={b.id || b._key || i} draggableId={`individual-blk-${workout._key || workout.id || 'w'}-${i}`} index={i}>
                      {(p, s) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={s.isDragging ? 'opacity-70' : ''}>
                          <BlockEditor block={b} onChange={(nb) => updateBlock(i, nb)} onRemove={() => removeBlock(i)} squadId={squadId} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_TYPES.map((t) => <button type="button" key={t.value} onClick={() => addBlock(t.value)} className="flex-1 min-w-36 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-[11px] hover:border-zinc-500 flex items-center justify-center gap-1"><Plus size={11} /> {t.label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeInitialPlan(initialPlan, squadInfo) {
  if (!initialPlan) return {
    name: '', objective: '', description: '', general_instructions: '',
    squad_id: squadInfo?.id || '', squad_name: squadInfo?.name || '', season_id: squadInfo?.season || '',
    organization_id: squadInfo?.club_id || '', status: 'draft', is_template: false,
    player_id: '', player_name: '', assignments: [], workouts: [],
  };
  const firstAssignment = initialPlan.assignments?.[0];
  return {
    ...initialPlan,
    player_id: initialPlan.player_id || firstAssignment?.player_id || '',
    player_name: initialPlan.player_name || firstAssignment?.player_name || '',
    assignments: initialPlan.is_template ? [] : (firstAssignment ? [firstAssignment] : []),
  };
}

export default function PlanBuilder({ initialPlan, roster, squadInfo, onSaved, onCancel }) {
  const [plan, setPlan] = useState(() => normalizeInitialPlan(initialPlan, squadInfo));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  const selectedAssignment = plan.assignments?.[0] || null;
  const selectedPlayer = roster.find((p) => p.id === selectedAssignment?.player_id) || null;
  const filteredRoster = useMemo(() => {
    const q = playerSearch.toLowerCase().trim();
    if (!q) return roster;
    return roster.filter((p) => `${p.first_name || ''} ${p.last_name || ''} ${p.position || ''}`.toLowerCase().includes(q));
  }, [roster, playerSearch]);

  function selectPlayer(player) {
    const name = `${player.first_name || ''} ${player.last_name || ''}`.trim();
    setPlan((p) => ({ ...p, player_id: player.id, player_name: name, assignments: [{ player_id: player.id, player_name: name }] }));
    setPlayerSearch('');
  }

  function addWorkout() {
    const today = new Date().toISOString().slice(0, 10);
    setPlan((p) => ({ ...p, workouts: [...(p.workouts || []), { _key: `${Date.now()}-${Math.random()}`, workout_date: today, title: '', objective: '', estimated_duration_minutes: null, instructions: '', status: 'draft', blocks: [] }] }));
  }
  function updateWorkout(i, w) {
    const list = [...(plan.workouts || [])];
    list[i] = w;
    setPlan((p) => ({ ...p, workouts: list }));
  }
  function removeWorkout(i) {
    setPlan((p) => ({ ...p, workouts: (p.workouts || []).filter((_, idx) => idx !== i) }));
  }

  async function save(asPublish = false) {
    if (!plan.name.trim()) { setError('Ingresá un nombre para el plan'); return; }
    if (!plan.is_template && !selectedAssignment?.player_id) { setError('Seleccioná el jugador del plan'); return; }
    if (!plan.workouts?.length) { setError('Agregá al menos un entrenamiento'); return; }
    if (plan.workouts.some((w) => !w.workout_date)) { setError('Todas las fechas deben estar definidas'); return; }
    setSaving(true);
    setError('');
    try {
      const assignments = plan.is_template ? [] : [selectedAssignment];
      const payloadPlan = { ...plan, assignments, player_id: plan.is_template ? '' : selectedAssignment?.player_id || '', player_name: plan.is_template ? '' : selectedAssignment?.player_name || '' };
      const res = await base44.functions.invoke('saveComplementaryStrengthPlan', { plan: payloadPlan, assignments, workouts: plan.workouts });
      const result = res.data || res;
      if (result.error) throw new Error(result.error);
      if (asPublish) {
        if (plan.is_template) throw new Error('Las plantillas se guardan; no se publican al portal.');
        setPublishing(true);
        const pub = await base44.functions.invoke('setComplementaryStrengthPlanStatus', { plan_id: result.plan_id, action: 'publish' });
        const pubResult = pub.data || pub;
        if (pubResult.error) throw new Error(pubResult.error);
      }
      onSaved();
    } catch (e) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  const totalExercises = (plan.workouts || []).reduce((sum, w) => sum + (w.blocks || []).reduce((s, b) => s + (b.exercises || []).length, 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">{plan.id ? 'Editar plan individual' : 'Crear plan individual'}</h2>
          <p className="text-xs text-zinc-500 mt-1">Un plan pertenece a un solo jugador. Lo que publiques aparecerá únicamente en su portal.</p>
        </div>
        <button type="button" onClick={onCancel} className="text-zinc-400 hover:text-white p-1"><X size={18} /></button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}

      {!plan.is_template && (
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-3">
          <div className="flex items-center gap-2"><UserRound size={16} className="text-blue-400" /><div><p className="text-sm font-bold text-white">Jugador</p><p className="text-[10px] text-zinc-500">Seleccioná una única persona. No se comparte la prescripción con el resto del plantel.</p></div></div>
          {selectedPlayer || selectedAssignment ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                {selectedPlayer?.photo_url ? <img src={selectedPlayer.photo_url} alt="" className="w-full h-full object-cover" /> : <UserRound size={18} className="text-zinc-600" />}
              </div>
              <div className="flex-1 min-w-0"><p className="text-white font-bold text-sm truncate">{selectedAssignment?.player_name}</p><p className="text-xs text-zinc-500">{selectedPlayer?.position || 'Jugador seleccionado'}</p></div>
              <CheckCircle2 size={17} className="text-emerald-400" />
              <button type="button" onClick={() => setPlan((p) => ({ ...p, player_id: '', player_name: '', assignments: [] }))} className="text-xs text-zinc-500 hover:text-white">Cambiar</button>
            </div>
          ) : (
            <>
              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><input value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} placeholder="Buscar jugador por nombre o posición..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white" /></div>
              <div className="max-h-56 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredRoster.map((player) => (
                  <button type="button" key={player.id} onClick={() => selectPlayer(player)} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-left hover:border-blue-500/40">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">{player.photo_url ? <img src={player.photo_url} alt="" className="w-full h-full object-cover" /> : <UserRound size={13} className="text-zinc-600" />}</div>
                    <div className="min-w-0"><p className="text-sm text-white font-medium truncate">{player.first_name} {player.last_name}</p><p className="text-[10px] text-zinc-600">{player.position || '—'}</p></div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-[10px] uppercase tracking-wide text-zinc-500">Nombre del plan</span><input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="Ej: Fuerza posterior · 4 semanas" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium" /></label>
          <label className="space-y-1"><span className="text-[10px] uppercase tracking-wide text-zinc-500">Objetivo general</span><input value={plan.objective || ''} onChange={(e) => setPlan({ ...plan, objective: e.target.value })} placeholder="Ej: Fuerza máxima / prevención isquios" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" /></label>
        </div>
        <textarea value={plan.description || ''} onChange={(e) => setPlan({ ...plan, description: e.target.value })} placeholder="Contexto del plan" rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
        <textarea value={plan.general_instructions || ''} onChange={(e) => setPlan({ ...plan, general_instructions: e.target.value })} placeholder="Indicaciones generales que verá el jugador" rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!plan.is_template} onChange={(e) => setPlan({ ...plan, is_template: e.target.checked })} className="rounded" />
          <span className="flex items-center gap-1.5 text-sm text-zinc-300"><Bookmark size={13} className="text-amber-400" /> Guardar como plantilla reutilizable</span>
        </label>
        {plan.is_template && <p className="text-[10px] text-amber-300">Las plantillas no se asignan ni se publican al portal hasta que se dupliquen como plan individual.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-zinc-300 uppercase">Entrenamientos ({(plan.workouts || []).length})</h3><p className="text-[10px] text-zinc-600 mt-0.5">{totalExercises} ejercicios totales en el plan</p></div><button type="button" onClick={addWorkout} className="flex items-center gap-1 px-3 py-2 bg-white text-zinc-950 rounded-lg text-xs font-bold hover:bg-zinc-200"><Plus size={13} /> Agregar fecha</button></div>
        {(plan.workouts || []).map((w, i) => <WorkoutEditor key={w.id || w._key || i} workout={w} onChange={(nw) => updateWorkout(i, nw)} onRemove={() => removeWorkout(i)} squadId={plan.squad_id} />)}
        {(plan.workouts || []).length === 0 && <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-sm">Agregá la primera fecha del plan individual.</div>}
      </section>

      <div className="flex gap-2 sticky bottom-0 bg-zinc-950/95 backdrop-blur py-3 border-t border-zinc-800 z-10">
        <button type="button" onClick={() => save(false)} disabled={saving || publishing} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50">{saving && !publishing ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> {plan.is_template ? 'Guardar plantilla' : 'Guardar borrador'}</>}</button>
        {!plan.is_template && <button type="button" onClick={() => save(true)} disabled={saving || publishing} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 flex items-center justify-center gap-2 disabled:opacity-50">{publishing ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Publicar al jugador</>}</button>}
      </div>
    </div>
  );
}
