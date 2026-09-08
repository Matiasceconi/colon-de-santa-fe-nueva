import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireStaffAccessAdmin } from "../../shared/staffAccessAdmin.ts";

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
async function all(entity, query = {}) {
  const rows = [];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter(query, "id", 200, skip);
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}
async function platformAdminUsers(db) {
  try { return await all(db.User, { role: "admin" }); }
  catch { return []; }
}
async function isPlatformAdminEmail(db, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const admins = await platformAdminUsers(db);
  return admins.some(user => String(user.email || "").trim().toLowerCase() === normalized);
}
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) fail("No autorizado.", 401);
    const { action, accessId, staffId, activeSquadId, form = {} } = await req.json();
    const db = base44.asServiceRole.entities;
    if (action === "directory") {
      if (!activeSquadId) fail("Falta el plantel activo.");
      const platformAdmin = caller.role === "admin";
      const callerRows = platformAdmin ? [] : await db.UserAccess.filter({ user_email: String(caller.email || "").trim().toLowerCase(), active: true }, "-created_date", 20);
      const callerCanAccess = platformAdmin || callerRows.some(access => access.all_squads === true || (access.squad_ids || []).includes(activeSquadId));
      if (!callerCanAccess) fail("No tenés acceso a este plantel.", 403);
      const [accesses, staff, roles, squads] = await Promise.all([all(db.UserAccess), all(db.StaffMember), all(db.AppRole), all(db.Squad)]);
      const scopedAccesses = accesses.filter(access => access.all_squads === true || (access.squad_ids || []).includes(activeSquadId));
      return Response.json({ accesses: scopedAccesses, staff, roles, squads });
    }
    await requireStaffAccessAdmin(base44, caller);
    if (action === "list") {
      const [accesses, staff, roles, platformAdmins, registeredUsers] = await Promise.all([
        all(db.UserAccess),
        all(db.StaffMember, { active: true }),
        all(db.AppRole),
        platformAdminUsers(db),
        all(db.User).catch(() => []),
      ]);
      return Response.json({
        accesses,
        staff,
        roles,
        platform_admins: platformAdmins.map(user => ({ id: user.id, email: user.email, role: user.role })),
        registered_users: registeredUsers.map(user => ({ id: user.id, email: user.email, is_verified: user.is_verified === true, disabled: user.disabled === true })),
      });
    }
    if (action !== "prepare" && action !== "set-active") fail("Acción no válida.");
    const existing = accessId ? await db.UserAccess.get(accessId) : null;
    if (accessId && !existing) fail("El acceso no existe.", 404);
    if (action === "set-active") {
      if (!existing || typeof form.active !== "boolean") fail("Falta el estado del acceso.");
      if (await isPlatformAdminEmail(db, existing.user_email)) fail("El Administrador General está protegido y no se modifica desde Usuarios y Accesos.", 409);
      if (String(existing.user_email).trim().toLowerCase() === String(caller.email).trim().toLowerCase() && !form.active) fail("No podés suspender tu propio acceso.", 409);
      const saved = await db.UserAccess.update(existing.id, {
        active: form.active,
        invitation_status: form.active ? "active" : "disabled",
        password_setup_required: false,
        activation_version: 3,
      });
      return Response.json({ access: { ...existing, ...saved, active: form.active } });
    }
    const member = await db.StaffMember.get(existing?.staff_id || staffId);
    if (!member || member.active === false) fail("Elegí un miembro activo del staff.");
    const email = existing ? existing.user_email : String(form.user_email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Ingresá un correo válido.");
    if (await isPlatformAdminEmail(db, email)) fail("El Administrador General usa la autoridad de plataforma y no necesita un UserAccess editable.", 409);
    if (existing && form.user_email && String(form.user_email).trim().toLowerCase() !== String(email).trim().toLowerCase()) fail("El correo de una cuenta existente no se cambia desde sus permisos.");
    if (!existing) {
      const [emailRows, staffRows] = await Promise.all([db.UserAccess.filter({ user_email: email }, "-created_date", 1), db.UserAccess.filter({ staff_id: member.id }, "-created_date", 1)]);
      if (emailRows.length || staffRows.length) fail("Esta persona o correo ya tiene acceso. Editá la cuenta existente.", 409);
    }
    if (!Array.isArray(form.role_ids) || !Array.isArray(form.squad_ids)) fail("Seleccioná roles y planteles válidos.");
    const roleIds = [...new Set(form.role_ids)];
    const squadIds = [...new Set(form.squad_ids)];
    const allSquads = form.all_squads === true;
    if (!roleIds.length && !existing?.role) fail("Elegí un rol.");
    if (!allSquads && !squadIds.length) fail("Elegí al menos un plantel.");
    const roles = await Promise.all(roleIds.map(id => db.AppRole.get(id)));
    if (roles.some(role => !role || (role.active === false && !(existing?.role_ids || []).includes(role.id)))) fail("Hay un rol inválido o inactivo.");
    const squads = await Promise.all(squadIds.map(id => db.Squad.get(id)));
    if (squads.some(squad => !squad)) fail("Hay un plantel inválido.");
    const payload = { role_ids: roleIds, squad_ids: squadIds, squad_names: squads.map(s => s.name), all_squads: allSquads };
    if (roleIds.length) Object.assign(payload, { role: roles.map(role => role.name).join(", ") });
    if (!existing) Object.assign(payload, {
      staff_id: member.id, user_email: email,
      staff_name: `${member.first_name} ${member.last_name}`.trim(), user_name: `${member.first_name} ${member.last_name}`.trim(),
      active: true,
      invitation_status: "active",
      password_setup_required: false,
      activation_version: 3,
      authorized_at: new Date().toISOString(),
      authorized_by_email: String(caller.email || "").trim().toLowerCase(),
    });
    const saved = existing ? await db.UserAccess.update(existing.id, payload) : await db.UserAccess.create(payload);
    return Response.json({ access: { ...existing, ...payload, ...saved } });
  } catch (error) {
    return Response.json({ error: error.message || "No se pudo gestionar el acceso." }, { status: error.status || 500 });
  }
}