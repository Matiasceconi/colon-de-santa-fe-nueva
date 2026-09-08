import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireModulePermission } from '../../shared/modulePermission.ts';
import { resolveSquadRosterForDate } from '../../shared/squadRosterResolver.ts';
import { getTodayInTimezone } from '../../shared/playerAccessUtils.ts';

async function requirePermission(base44, user, action) {
  const permission = await requireModulePermission(base44, user, 'utileria', action);
  if (!permission) return Response.json({ error: 'Sin permisos para Utilería' }, { status: 403 });
  return null;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'getData');

    if (action === 'getData') {
      const denied = await requirePermission(base44, user, 'can_view');
      if (denied) return denied;
      const squadId = String(body.squad_id || '');
      const [items, movements, checklists, rosterRows] = await Promise.all([
        base44.asServiceRole.entities.EquipmentItem.list('name', 1000),
        base44.asServiceRole.entities.EquipmentMovement.list('-movement_date', 1000),
        base44.asServiceRole.entities.EquipmentChecklist.list('-event_date', 500),
        squadId ? resolveSquadRosterForDate(base44, squadId, getTodayInTimezone()) : Promise.resolve([]),
      ]);
      const visibleItems = items.filter((i) => i.active !== false && (!i.squad_id || !squadId || i.squad_id === squadId));
      const visibleMovements = movements.filter((m) => !squadId || !m.squad_id || m.squad_id === squadId);
      const visibleChecklists = checklists.filter((c) => !squadId || !c.squad_id || c.squad_id === squadId);
      return Response.json({ ok: true, items: visibleItems, movements: visibleMovements, checklists: visibleChecklists, roster: rosterRows.map((row) => row.player) });
    }

    if (action === 'saveItem') {
      const input = body.item || {};
      const denied = await requirePermission(base44, user, input.id ? 'can_edit' : 'can_create');
      if (denied) return denied;
      if (!String(input.name || '').trim()) return Response.json({ error: 'Nombre requerido' }, { status: 400 });
      const total = Number(input.quantity_total || 0);
      const available = input.quantity_available == null ? total : Number(input.quantity_available);
      if (total < 0 || available < 0 || available > total) return Response.json({ error: 'Stock inválido' }, { status: 400 });
      const payload = {
        organization_id: input.organization_id || '', squad_id: input.squad_id || '', name: String(input.name).trim(),
        category: input.category || 'other', sku: input.sku || '', size: input.size || '', variant: input.variant || '', unit: input.unit || 'unidad',
        quantity_total: total, quantity_available: available, min_stock: Number(input.min_stock || 0), storage_location: input.storage_location || '', supplier: input.supplier || '', active: input.active !== false, notes: input.notes || '', updated_by_name: user.full_name || user.email || '',
      };
      const saved = input.id ? await base44.asServiceRole.entities.EquipmentItem.update(input.id, payload) : await base44.asServiceRole.entities.EquipmentItem.create(payload);
      return Response.json({ ok: true, item: saved });
    }

    if (action === 'movement') {
      const denied = await requirePermission(base44, user, 'can_edit');
      if (denied) return denied;
      const input = body.movement || {};
      const item = await base44.asServiceRole.entities.EquipmentItem.get(input.item_id).catch(() => null);
      if (!item) return Response.json({ error: 'Ítem no encontrado' }, { status: 404 });
      const rawQty = Number(input.quantity || 0);
      if (!Number.isFinite(rawQty) || rawQty === 0) return Response.json({ error: 'Cantidad inválida' }, { status: 400 });
      const qty = Math.abs(rawQty);
      let total = Number(item.quantity_total || 0);
      let available = Number(item.quantity_available || 0);
      const type = input.movement_type || 'adjustment';
      if (type === 'intake') { total += qty; available += qty; }
      else if (type === 'issue' || type === 'laundry_out') { available -= qty; }
      else if (type === 'return' || type === 'laundry_in') { available += qty; }
      else if (type === 'loss' || type === 'damage') { total -= qty; available -= qty; }
      else if (type === 'adjustment') { total += rawQty; available += rawQty; }
      if (total < 0 || available < 0 || available > total) return Response.json({ error: 'El movimiento dejaría un stock inválido. Revisá la cantidad disponible.' }, { status: 400 });

      await base44.asServiceRole.entities.EquipmentItem.update(item.id, { quantity_total: total, quantity_available: available, updated_by_name: user.full_name || user.email || '' });
      const movement = await base44.asServiceRole.entities.EquipmentMovement.create({
        organization_id: input.organization_id || item.organization_id || '', squad_id: input.squad_id || item.squad_id || '', item_id: item.id, item_name: item.name,
        movement_type: type, quantity: rawQty, movement_date: input.movement_date || todayISO(), player_id: input.player_id || '', player_name: input.player_name || '', staff_name: input.staff_name || '', context_type: input.context_type || 'other', context_id: input.context_id || '', notes: input.notes || '', created_by_name: user.full_name || user.email || '',
      });
      return Response.json({ ok: true, movement, stock: { quantity_total: total, quantity_available: available } });
    }

    if (action === 'saveChecklist') {
      const input = body.checklist || {};
      const denied = await requirePermission(base44, user, input.id ? 'can_edit' : 'can_create');
      if (denied) return denied;
      if (!input.title || !input.event_date) return Response.json({ error: 'Título y fecha son obligatorios' }, { status: 400 });
      const payload = {
        organization_id: input.organization_id || '', squad_id: input.squad_id || '', title: input.title, event_date: input.event_date,
        context_type: input.context_type || 'training', match_id: input.match_id || '', location: input.location || '', status: input.status || 'draft', responsible_name: input.responsible_name || '', items: Array.isArray(input.items) ? input.items : [], notes: input.notes || '', checked_at: ['checked','closed'].includes(input.status) ? (input.checked_at || new Date().toISOString()) : null, created_by_name: input.created_by_name || user.full_name || user.email || '',
      };
      const saved = input.id ? await base44.asServiceRole.entities.EquipmentChecklist.update(input.id, payload) : await base44.asServiceRole.entities.EquipmentChecklist.create(payload);
      return Response.json({ ok: true, checklist: saved });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    console.error('manageEquipment error:', error);
    return Response.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
