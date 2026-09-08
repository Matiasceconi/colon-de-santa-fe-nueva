import { base44 } from "@/api/base44Client";

const VISITOR_KEY = "pp_visitor_id";
const SESSION_KEY = "pp_analytics_session_id";

function idFor(key, storage) {
  let value = storage.getItem(key);
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storage.setItem(key, value);
  }
  return value;
}

function campaign() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
  };
}

export async function trackDemoEvent(eventName, payload = {}, path = window.location.pathname) {
  try {
    const data = {
      event_name: eventName,
      visitor_id: idFor(VISITOR_KEY, localStorage),
      session_id: idFor(SESSION_KEY, sessionStorage),
      path,
      source: campaign().utm_source || (document.referrer ? "referral" : "direct"),
      ...campaign(),
      payload: {
        ...payload,
        referrer_host: document.referrer ? new URL(document.referrer).hostname : "",
      },
    };
    await base44.functions.invoke("trackDemoAnalytics", data);
  } catch {
    // El seguimiento nunca debe bloquear la navegación.
  }
}
