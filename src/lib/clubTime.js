// Timezone-aware "today" helpers.
//
// Raw `moment()` / `new Date()` resolve to the *runtime's* local clock. In a
// server-rendered preview, a CI sandbox, or a browser set to a different
// timezone than the club's, that local clock can already be a full calendar
// day ahead (or behind) Argentina time — e.g. once it's past ~21:00 in
// Buenos Aires (UTC-3), UTC has already rolled over to the next day. Any
// "what day is today" computation must anchor to the club's own timezone
// instead of the runtime's, or widgets like "Cronograma del día" can label
// tomorrow as "Hoy".
//
// Use `clubDateKey` wherever a raw `moment().format("YYYY-MM-DD")` /
// `new Date().toISOString().slice(0, 10)` was standing in for "today".

export const DEFAULT_CLUB_TIMEZONE = "America/Argentina/Buenos_Aires";

export function clubTimezone(institutionProfile) {
  return institutionProfile?.timezone || DEFAULT_CLUB_TIMEZONE;
}

export function clubDateKey(timezone = DEFAULT_CLUB_TIMEZONE, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function clubTimeHHMM(timezone = DEFAULT_CLUB_TIMEZONE, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.hour}:${values.minute}`;
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}
