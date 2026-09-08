export async function getFootballSettings(base44) {
  const rows = await base44.asServiceRole.entities.FootballApiSettings.list();
  return rows.find((s) => s.active !== false) || rows[0] || null;
}

export async function callFootballApi(settings, endpoint, params = {}) {
  const url = new URL(`${settings.base_url}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": settings.api_key },
  });
  const remaining = res.headers.get("x-ratelimit-remaining");
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Error ${res.status} en API-Football`);
  }
  return { data: json, rateLimitRemaining: remaining ? Number(remaining) : null };
}