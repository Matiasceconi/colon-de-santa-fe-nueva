import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { isCrmOwner, normalizeEmail } from "../../shared/demoCrmAccess.ts";

const EVENTS = new Set([
  "landing_view", "demo_cta_click", "registration_started", "registration_completed",
  "login_completed", "demo_entered", "demo_guided_started", "demo_free_started",
  "demo_page_view", "whatsapp_click", "meeting_click",
]);

const clean = (value: unknown, max = 180) => String(value || "").trim().slice(0, max);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const eventName = clean(body.event_name, 50);
    const visitorId = clean(body.visitor_id, 100);
    if (!EVENTS.has(eventName) || !visitorId) {
      return Response.json({ error: "Evento no válido" }, { status: 400 });
    }

    let user: any = null;
    try { user = await base44.auth.me(); } catch { user = null; }

    const now = new Date().toISOString();
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const email = normalizeEmail(user?.email || payload.email);
    const source = clean(body.source || body.utm_source || "direct", 80);

    await base44.asServiceRole.entities.DemoAnalyticsEvent.create({
      visitor_id: visitorId,
      session_id: clean(body.session_id, 100),
      auth_user_id: clean(user?.id, 100),
      email,
      event_name: eventName,
      path: clean(body.path || "/", 240),
      source,
      utm_source: clean(body.utm_source, 100),
      utm_medium: clean(body.utm_medium, 100),
      utm_campaign: clean(body.utm_campaign, 120),
      metadata: {
        demo_mode: clean(payload.demo_mode, 30),
        referrer_host: clean(payload.referrer_host, 120),
      },
      occurred_at: now,
    });

    if (email && !isCrmOwner(email) && ["registration_completed", "login_completed", "demo_entered", "demo_page_view"].includes(eventName)) {
      const rows = await base44.asServiceRole.entities.DemoLead.filter({ email }, "-created_date", 1);
      const lead = rows[0];
      const patch: any = {
        auth_user_id: clean(user?.id, 100),
        last_activity_at: now,
      };
      if (eventName === "registration_completed") {
        patch.full_name = clean(payload.full_name, 160);
        patch.role_title = clean(payload.role_title, 120);
        patch.club_name = clean(payload.club_name, 160);
        patch.source = source;
        patch.utm_campaign = clean(body.utm_campaign, 120);
        patch.registered_at = now;
        patch.verified_at = now;
      }
      if (eventName === "login_completed") {
        patch.last_login_at = now;
        patch.login_count = Number(lead?.login_count || 0) + 1;
      }
      if (lead) await base44.asServiceRole.entities.DemoLead.update(lead.id, patch);
      else await base44.asServiceRole.entities.DemoLead.create({
        email,
        full_name: clean(payload.full_name || user?.name, 160),
        role_title: clean(payload.role_title, 120),
        club_name: clean(payload.club_name, 160),
        source,
        status: "new",
        registered_at: now,
        verified_at: eventName === "registration_completed" ? now : "",
        last_login_at: eventName === "login_completed" ? now : "",
        last_activity_at: now,
        login_count: eventName === "login_completed" ? 1 : 0,
        archived: false,
        auth_user_id: clean(user?.id, 100),
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("trackDemoAnalytics error", error);
    return Response.json({ ok: false }, { status: 200 });
  }
}
