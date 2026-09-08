import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email: requestedEmail, token = "" } = await req.json();
    const email = String(requestedEmail || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return Response.json({ valid: false, error: "Ingresá el correo que recibió la invitación." }, { status: 400 });
    }

    const hash = token ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token))))).map(b => b.toString(16).padStart(2, "0")).join("") : "";
    const invitations = await base44.asServiceRole.entities.StaffInvitation.filter(
      { email, active: true, ...(hash ? { token_hash: hash } : {}) },
      "-created_date",
      10
    );

    const invitation = invitations.find((item) =>
      new Date(item.expires_at).getTime() > Date.now() && (item.activation_version !== 2 || Boolean(hash))
    );

    if (!invitation) {
      return Response.json(
        { valid: false, error: "No encontramos una invitación vigente para este correo. Pedile al administrador que la reenvíe." },
        { status: 404 }
      );
    }

    const access = await base44.asServiceRole.entities.UserAccess.get(invitation.access_id);
    const accessEmail = String(access?.user_email || "").trim().toLowerCase();
    const isPending = access &&
      accessEmail === email &&
      access.invitation_status === "pending_password" &&
      access.password_setup_required === true &&
      access.active === false && (access.activation_version !== 2 || Boolean(hash));

    if (!isPending) {
      return Response.json(
        { valid: false, error: "La invitación ya fue utilizada o el acceso fue modificado. Pedile al administrador que la reenvíe." },
        { status: 409 }
      );
    }

    const users = await base44.asServiceRole.entities.User.filter(
      { email },
      "-created_date",
      1
    );
    const registeredUser = users[0];

    return Response.json({
      valid: true,
      email,
      user_exists: Boolean(registeredUser),
      is_verified: registeredUser?.is_verified === true,
    });
  } catch (error) {
    console.error("validate-staff-invitation error:", error);
    return Response.json({ valid: false, error: "No pudimos validar la invitación." }, { status: 500 });
  }
});
