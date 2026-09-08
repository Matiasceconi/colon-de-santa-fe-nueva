import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireStaffAccessAdmin } from "../../shared/staffAccessAdmin.ts";

function escapeHtml(value: string) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char] || char));
}

function normalizeOrigin(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    await requireStaffAccessAdmin(base44, caller);

    const { accessId, email: requestedEmail, staffName = "", sendEmail = true } = await req.json();
    const email = String(requestedEmail || "").trim().toLowerCase();
    if (!accessId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Faltan datos válidos del acceso." }, { status: 400 });
    }

    const access = await base44.asServiceRole.entities.UserAccess.get(accessId);
    if (!access || String(access.user_email || "").trim().toLowerCase() !== email) {
      return Response.json({ error: "El acceso no coincide con el correo indicado." }, { status: 400 });
    }
    if (access.active === false || access.invitation_status === "disabled") {
      return Response.json({ error: "El acceso está suspendido. Reactivalo antes de enviar el ingreso." }, { status: 409 });
    }

    const platformAdmins = await base44.asServiceRole.entities.User.filter({ role: "admin" }, "-created_date", 200).catch(() => []);
    if (platformAdmins.some(user => String(user.email || "").trim().toLowerCase() === email)) {
      return Response.json({ error: "El Administrador General protegido no necesita un aviso de acceso de staff." }, { status: 409 });
    }

    let profiles = [];
    try { profiles = await base44.asServiceRole.entities.InstitutionProfile.filter({ active: true }, "-updated_date", 1); } catch { /* Link relativo disponible. */ }
    const configuredUrl = String(profiles[0]?.application_url || "").trim();
    let applicationOrigin = "";
    try { if (configuredUrl) applicationOrigin = normalizeOrigin(configuredUrl); } catch { /* Mantener rutas relativas. */ }

    const loginPath = `/login?access=staff&email=${encodeURIComponent(email)}`;
    const firstAccessPath = `/activate-staff?email=${encodeURIComponent(email)}`;
    const loginUrl = applicationOrigin ? applicationOrigin + loginPath : null;
    const firstAccessUrl = applicationOrigin ? applicationOrigin + firstAccessPath : null;
    const linkResult = {
      access_path: loginPath,
      access_url: loginUrl,
      first_access_path: firstAccessPath,
      first_access_url: firstAccessUrl,
      link_ready: true,
      email,
      access_preserved: true,
    };

    if (sendEmail === false) return Response.json({ ...linkResult, success: true, email_requested: false });

    let directEmailSent = false;
    let directEmailError = "No hay URL del club configurada.";
    try {
      if (applicationOrigin) {
        const publicBrands = await base44.asServiceRole.entities.PublicClubBrand.filter({ active: true }, "-updated_at", 1).catch(() => []);
        const publicBrand = publicBrands[0] || {};
        const clubName = String(publicBrand.club_name || profiles[0]?.official_name || "el club");
        const logoUrl = String(publicBrand.logo_url || "").trim();
        const safeName = escapeHtml(staffName || access.staff_name || access.user_name || "Usuario");
        const safeClubName = escapeHtml(clubName);
        const safeLoginUrl = escapeHtml(loginUrl || applicationOrigin + loginPath);
        const safeFirstAccessUrl = escapeHtml(firstAccessUrl || applicationOrigin + firstAccessPath);
        const safeEmail = escapeHtml(email);
        const safeLogo = logoUrl ? escapeHtml(logoUrl) : "";

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Tu acceso a ${clubName} ya está habilitado`,
          from_name: `${clubName} · PerformancePitch`,
          body: `
            <div style="background:#07080a;padding:32px 16px;font-family:Arial,sans-serif;color:#ffffff">
              <div style="max-width:580px;margin:auto;background:#18181b;border:1px solid #27272a;border-radius:22px;overflow:hidden">
                <div style="padding:26px 30px;border-bottom:1px solid #27272a;display:flex;align-items:center;gap:14px">
                  ${safeLogo ? `<img src="${safeLogo}" alt="${safeClubName}" style="width:52px;height:52px;object-fit:contain">` : ""}
                  <div><div style="font-size:18px;font-weight:800">${safeClubName}</div><div style="margin-top:4px;font-size:12px;color:#71717a">Tecnología PerformancePitch</div></div>
                </div>
                <div style="padding:30px">
                  <div style="font-size:11px;font-weight:800;letter-spacing:1.7px;color:#60a5fa;text-transform:uppercase">Acceso habilitado</div>
                  <h2 style="margin:12px 0 8px;font-size:26px;line-height:1.2">Hola ${safeName}</h2>
                  <p style="margin:0;color:#a1a1aa;line-height:1.65">El club autorizó el correo <strong style="color:#fff">${safeEmail}</strong> para ingresar a PerformancePitch.</p>
                  <div style="margin:22px 0;padding:16px;background:#09090b;border:1px solid #27272a;border-radius:14px;color:#d4d4d8;font-size:13px;line-height:1.7">
                    Si ya tenés contraseña, ingresá normalmente.<br>
                    Si es tu primera vez, elegí <strong style="color:#fff">Crear contraseña</strong> y verificá tu email.<br>
                    También podés usar Google con el mismo correo autorizado.
                  </div>
                  <a href="${safeLoginUrl}" style="display:block;background:#2563eb;color:#fff;text-align:center;text-decoration:none;padding:15px 22px;border-radius:12px;font-weight:800">Ingresar a PerformancePitch</a>
                  <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#71717a">Primera vez: <a href="${safeFirstAccessUrl}" style="color:#60a5fa;text-decoration:none;font-weight:700">crear contraseña</a></p>
                  <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#71717a">Este aviso no vence. El acceso se mantiene mientras el club lo tenga habilitado.</p>
                </div>
              </div>
            </div>
          `,
        });
        directEmailSent = true;
      }
    } catch (mailError) {
      directEmailError = String(mailError?.message || "El proveedor rechazó el correo.");
    }

    await base44.asServiceRole.entities.UserAccess.update(access.id, {
      invited_at: new Date().toISOString(),
      activation_version: 3,
      password_setup_required: false,
    }).catch(() => {});

    return Response.json({
      ...linkResult,
      success: directEmailSent,
      email_requested: true,
      direct_email_sent: directEmailSent,
      direct_email_error: directEmailSent ? null : directEmailError,
      access_preserved: true,
    });
  } catch (error) {
    console.error("send-staff-invitation error:", error);
    return Response.json({ error: error.message || "No se pudo enviar el acceso." }, { status: error.status || 500 });
  }
});
