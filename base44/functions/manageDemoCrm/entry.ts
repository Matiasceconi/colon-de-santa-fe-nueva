import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { isCrmOwner, normalizeEmail, CRM_OWNER_EMAILS } from "../../shared/demoCrmAccess.ts";

const STATUSES = new Set(["new", "contacted", "meeting", "proposal", "client", "discarded"]);
const clean = (value: unknown, max = 4000) => String(value || "").trim().slice(0, max);

function dayKey(value: string) {
  return String(value || "").slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
    if (!isCrmOwner(user.email)) return Response.json({ error: "Acceso reservado al propietario" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "dashboard");

    if (action === "update_lead") {
      const id = clean(body.lead_id, 100);
      const patch: any = {};
      if (body.status != null) {
        const status = clean(body.status, 30);
        if (!STATUSES.has(status)) return Response.json({ error: "Estado no válido" }, { status: 400 });
        patch.status = status;
      }
      if (body.notes != null) patch.notes = clean(body.notes, 4000);
      if (!id || !Object.keys(patch).length) return Response.json({ error: "Actualización incompleta" }, { status: 400 });
      const updated = await base44.asServiceRole.entities.DemoLead.update(id, patch);
      return Response.json({ ok: true, lead: updated });
    }

    if (action !== "dashboard") return Response.json({ error: "Acción no válida" }, { status: 400 });

    let leads = await base44.asServiceRole.entities.DemoLead.filter({ archived: { $ne: true } }, "-registered_at", 2000);
    const users = await base44.asServiceRole.entities.User.filter({}, "-created_date", 1000);

    const leadEmails = new Set(leads.map((lead) => normalizeEmail(lead.email)));
    for (const appUser of users) {
      const email = normalizeEmail(appUser.email);
      if (!email || CRM_OWNER_EMAILS.has(email) || leadEmails.has(email)) continue;
      const created = appUser.created_date || new Date().toISOString();
      const createdLead = await base44.asServiceRole.entities.DemoLead.create({
        auth_user_id: appUser.id || "",
        email,
        full_name: appUser.name || "",
        role_title: "",
        club_name: "",
        source: "existing_user",
        status: "new",
        registered_at: created,
        verified_at: created,
        last_activity_at: appUser.updated_date || created,
        login_count: 0,
        archived: false,
      });
      leads.push(createdLead);
      leadEmails.add(email);
    }

    const events = await base44.asServiceRole.entities.DemoAnalyticsEvent.filter({}, "-occurred_at", 5000);
    const now = Date.now();
    const since7 = now - 7 * 86400000;
    const since30 = now - 30 * 86400000;
    const landingEvents = events.filter((event) => event.event_name === "landing_view");
    const timestamp = (event) => new Date(event.occurred_at || event.created_date || 0).getTime();
    const unique = (rows) => new Set(rows.map((event) => event.visitor_id).filter(Boolean)).size;

    const dailyMap: Record<string, { date: string; visits: number; unique: Set<string> }> = {};
    for (let offset = 13; offset >= 0; offset--) {
      const date = new Date(now - offset * 86400000).toISOString().slice(0, 10);
      dailyMap[date] = { date, visits: 0, unique: new Set() };
    }
    landingEvents.forEach((event) => {
      const date = dayKey(event.occurred_at || event.created_date);
      if (!dailyMap[date]) return;
      dailyMap[date].visits += 1;
      if (event.visitor_id) dailyMap[date].unique.add(event.visitor_id);
    });

    const pathCounts: Record<string, number> = {};
    events.filter((event) => event.event_name === "demo_page_view").forEach((event) => {
      const path = event.path || "/";
      pathCounts[path] = (pathCounts[path] || 0) + 1;
    });

    const sourceCounts: Record<string, number> = {};
    landingEvents.forEach((event) => {
      const source = event.utm_source || event.source || "direct";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const safeLeads = leads
      .sort((a, b) => String(b.registered_at || b.created_date || "").localeCompare(String(a.registered_at || a.created_date || "")))
      .map((lead) => ({
        id: lead.id,
        email: lead.email || "",
        full_name: lead.full_name || "",
        role_title: lead.role_title || "",
        club_name: lead.club_name || "",
        source: lead.source || "direct",
        status: lead.status || "new",
        notes: lead.notes || "",
        registered_at: lead.registered_at || lead.created_date || "",
        last_login_at: lead.last_login_at || "",
        last_activity_at: lead.last_activity_at || "",
        login_count: Number(lead.login_count || 0),
      }));

    return Response.json({
      ok: true,
      owner_email: normalizeEmail(user.email),
      metrics: {
        visits_total: landingEvents.length,
        visits_7d: landingEvents.filter((event) => timestamp(event) >= since7).length,
        visits_30d: landingEvents.filter((event) => timestamp(event) >= since30).length,
        unique_total: unique(landingEvents),
        unique_30d: unique(landingEvents.filter((event) => timestamp(event) >= since30)),
        registrations: safeLeads.length,
        conversion: unique(landingEvents) ? Math.round((safeLeads.length / unique(landingEvents)) * 1000) / 10 : 0,
        whatsapp_clicks: events.filter((event) => event.event_name === "whatsapp_click").length,
        meeting_clicks: events.filter((event) => event.event_name === "meeting_click").length,
      },
      daily: Object.values(dailyMap).map((row) => ({ date: row.date, visits: row.visits, unique: row.unique.size })),
      top_paths: Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count })),
      sources: Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count })),
      leads: safeLeads,
    });
  } catch (error) {
    console.error("manageDemoCrm error", error);
    return Response.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
