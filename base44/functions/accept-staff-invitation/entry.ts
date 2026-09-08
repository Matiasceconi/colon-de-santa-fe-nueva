import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: "No autenticado." }, { status: 401 });

    if (user.disabled === true || user.is_verified !== true) return Response.json({ error: "La cuenta debe estar verificada." }, { status: 403 });
    const { token = "" } = await req.json();
    const hash = token ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token))))).map(b => b.toString(16).padStart(2, "0")).join("") : "";
    const email = user.email.trim().toLowerCase();
    const invitations = await base44.asServiceRole.entities.StaffInvitation.filter(
      { email, active: true, ...(hash ? { token_hash: hash } : {}) }, "-created_date", 10
    );
    const invitation = invitations.find(item => (item.activation_version !== 2 || Boolean(hash)) && new Date(item.expires_at).getTime() > Date.now());
    if (!invitation) return Response.json({ error: "La invitación no existe o ya fue utilizada." }, { status: 400 });
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await base44.asServiceRole.entities.StaffInvitation.update(invitation.id, { active: false });
      return Response.json({ error: "La invitación venció. Pedile al administrador que la reenvíe." }, { status: 400 });
    }

    const access = await base44.asServiceRole.entities.UserAccess.get(invitation.access_id);
    if (!access || String(access.user_email || "").trim().toLowerCase() !== email || access.invitation_status !== "pending_password" || !access.password_setup_required || (access.activation_version === 2 && !hash)) {
      return Response.json({ error: "Este acceso fue modificado o ya no está pendiente." }, { status: 409 });
    }

    const completedAt = new Date().toISOString();
    await base44.asServiceRole.entities.UserAccess.update(invitation.access_id, {
      active: true,
      invitation_status: "active",
      password_setup_required: false,
      password_setup_completed_at: completedAt,
      last_seen: completedAt,
    });
    await base44.asServiceRole.entities.StaffInvitation.update(invitation.id, {
      active: false,
      used_at: completedAt,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("accept-staff-invitation error:", error);
    return Response.json({ error: error.message || "No se pudo activar el acceso." }, { status: 500 });
  }
});
