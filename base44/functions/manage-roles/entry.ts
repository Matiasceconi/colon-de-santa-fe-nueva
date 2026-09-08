import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireStaffAccessAdmin } from "../../shared/staffAccessAdmin.ts";

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) fail("No autorizado.", 401);
    const { action, roleId, payload } = await req.json();
    const db = base44.asServiceRole.entities;

    // All actions require app-level admin (platform admin or UserAccess admin)
    await requireStaffAccessAdmin(base44, caller);

    if (action === "save") {
      if (!payload || !payload.name || !String(payload.name).trim()) fail("El nombre del rol es obligatorio.");
      const normalizedName = String(payload.name).trim().toLowerCase();
      const currentRoles = await db.AppRole.list("name", 300);
      const duplicate = currentRoles.find(role => role.id !== roleId && String(role.name || "").trim().toLowerCase() === normalizedName);
      if (duplicate) fail("Ya existe un rol con ese nombre.", 409);

      if (roleId) {
        const existing = await db.AppRole.get(roleId);
        if (!existing) fail("El rol no existe.", 404);
        if (existing.can_admin === true && payload.can_admin !== true) {
          const activeAccesses = await db.UserAccess.filter({ active: true }, "-created_date", 500);
          const assigned = activeAccesses.filter(access => (access.role_ids || []).includes(roleId));
          if (assigned.length > 0) fail("Este rol administra el club y todavía está asignado a usuarios activos. Reasigná esos accesos antes de quitarle administración.", 409);
        }
        const saved = await db.AppRole.update(roleId, { ...payload, name: String(payload.name).trim() });
        return Response.json({ role: saved });
      } else {
        const created = await db.AppRole.create({ ...payload, name: String(payload.name).trim() });
        return Response.json({ role: created });
      }
    }

    if (action === "toggle") {
      if (!roleId) fail("Falta el ID del rol.");
      const existing = await db.AppRole.get(roleId);
      if (!existing) fail("El rol no existe.", 404);
      const nextActive = typeof payload?.active === "boolean" ? payload.active : existing.active !== false;
      if (!nextActive) {
        const activeAccesses = await db.UserAccess.filter({ active: true }, "-created_date", 500);
        const assigned = activeAccesses.filter(access => (access.role_ids || []).includes(roleId));
        if (assigned.length > 0) fail("El rol está asignado a usuarios activos. Reasigná esos accesos antes de desactivarlo.", 409);
      }
      const saved = await db.AppRole.update(roleId, { active: nextActive });
      return Response.json({ role: saved });
    }

    if (action === "seed-defaults") {
      const current = await db.AppRole.list("name", 200);
      if (current.length > 0) return Response.json({ roles: current, seeded: false });
      const defaults = Array.isArray(payload?.defaults) ? payload.defaults : [];
      if (defaults.length > 0) await Promise.all(defaults.map(role => db.AppRole.create(role)));
      const seeded = await db.AppRole.list("name", 200);
      return Response.json({ roles: seeded, seeded: true });
    }

    fail("Acción no válida.");
  } catch (error) {
    return Response.json({ error: error.message || "No se pudo gestionar el rol." }, { status: error.status || 500 });
  }
}