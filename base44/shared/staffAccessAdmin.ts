// Resolve administrative authority from server-owned access records, never request fields.
export async function requireStaffAccessAdmin(base44, caller) {
  if (!caller?.email || caller.disabled === true) throw Object.assign(new Error("Ingresá con una cuenta habilitada."), { status: 401 });
  if (caller.role === "admin") return;
  const email = String(caller.email).trim().toLowerCase();
  const accesses = await base44.asServiceRole.entities.UserAccess.filter({ user_email: email, active: true }, "-created_date", 100);
  for (const access of accesses) {
    if (access.password_setup_required || access.invitation_status === "disabled") continue;
    const legacy = String(access.role || "").trim().toLowerCase();
    if (access.can_admin === true || ["admin", "administrador", "administrador general", "administrador del club"].includes(legacy)) return;
    for (const id of access.role_ids || []) {
      let role;
      try { role = await base44.asServiceRole.entities.AppRole.get(id); } catch { continue; }
      if (role?.active !== false && role?.can_admin === true) return;
    }
  }
  throw Object.assign(new Error("Tu cuenta no tiene permisos para administrar usuarios."), { status: 403 });
}
