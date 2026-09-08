import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email: requestedEmail } = await req.json();
    const email = String(requestedEmail || "").trim().toLowerCase();
    if (!validEmail(email)) {
      return Response.json({ authorized: false, error: "Ingresá un correo válido." }, { status: 400 });
    }

    const accesses = await base44.asServiceRole.entities.UserAccess.filter(
      { user_email: email, active: true },
      "-created_date",
      20
    );
    const access = accesses.find(row => row.invitation_status !== "disabled") || null;
    if (!access) {
      return Response.json({ authorized: false });
    }

    let registeredUser = null;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email }, "-created_date", 1);
      registeredUser = users[0] || null;
    } catch { /* El acceso autorizado sigue siendo suficiente para continuar. */ }

    return Response.json({
      authorized: true,
      email,
      account_exists: Boolean(registeredUser),
      is_verified: registeredUser?.is_verified === true,
      first_login_completed: Boolean(access.last_seen),
    });
  } catch (error) {
    console.error("check-staff-authorization error:", error);
    return Response.json({ authorized: false, error: "No se pudo validar el acceso." }, { status: 500 });
  }
});
