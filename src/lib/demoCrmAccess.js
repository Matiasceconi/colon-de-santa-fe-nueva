const CRM_OWNER_EMAILS = new Set([
  "performance@performance-pitch.com",
  "matiasceconi@gmail.com",
]);

export function canAccessDemoCrm(email) {
  return CRM_OWNER_EMAILS.has(String(email || "").trim().toLowerCase());
}
