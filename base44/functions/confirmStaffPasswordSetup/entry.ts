import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    if (user.is_verified !== true) return Response.json({ error: "Verificá tu cuenta antes de activar." }, { status: 403 });

    const email = user.email.toLowerCase().trim();
    const rows = await base44.asServiceRole.entities.UserAccess.filter(
      { user_email: email, invitation_status: "pending_password" },
      "-created_date",
      20
    );
    const accesses = rows.filter(access => access.activation_version !== 2);
    const completedAt = new Date().toISOString();

    await Promise.all(accesses.map((access) =>
      base44.asServiceRole.entities.UserAccess.update(access.id, {
        active: true,
        invitation_status: "active",
        password_setup_required: false,
        password_setup_completed_at: completedAt,
        last_seen: completedAt,
      })
    ));

    const invitations = await base44.asServiceRole.entities.StaffInvitation.filter(
      { email, active: true },
      "-created_date",
      50
    );
    await Promise.all(invitations.filter(invitation => accesses.some(access => access.id === invitation.access_id)).map((invitation) =>
      base44.asServiceRole.entities.StaffInvitation.update(invitation.id, {
        active: false,
        used_at: completedAt,
      })
    ));

    return Response.json({ success: true, updated: accesses.length });
  } catch (error) {
    console.error("confirmStaffPasswordSetup error:", error);
    return Response.json({ error: error.message || "Error interno" }, { status: 500 });
  }
});
