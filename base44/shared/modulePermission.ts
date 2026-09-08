export async function requireModulePermission(base44, user, moduleId, action = "can_view") {
  if (!user) return null;
  if (user.role === "admin") return { platform_admin: true, user };

  const email = String(user.email || "").toLowerCase().trim();
  if (!email) return null;
  const rows = await base44.asServiceRole.entities.UserAccess.filter(
    { user_email: email, active: true },
    "-created_date",
    1
  );
  const access = rows[0];
  if (!access) return null;
  if (access.can_admin === true || /administrador/i.test(String(access.role || ""))) return { access, admin: true };

  const roleIds = access.role_ids || [];
  if (!roleIds.length) return null;
  const allRoles = await base44.asServiceRole.entities.AppRole.list("name", 300);
  const roles = allRoles.filter((role) => roleIds.includes(role.id) && role.active !== false);
  const allowed = roles.some((role) => {
    if (role.can_admin === true) return true;
    const modulePermission = role.module_permissions?.[moduleId];
    return modulePermission?.[action] === true;
  });
  return allowed ? { access, roles } : null;
}
