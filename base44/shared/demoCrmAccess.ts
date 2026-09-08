export const CRM_OWNER_EMAILS = new Set([
  "performance@performance-pitch.com",
  "matiasceconi@gmail.com",
]);

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isCrmOwner(email: unknown) {
  return CRM_OWNER_EMAILS.has(normalizeEmail(email));
}
