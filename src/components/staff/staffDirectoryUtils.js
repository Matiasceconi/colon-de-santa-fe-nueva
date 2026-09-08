export const STAFF_ROLES = ["entrenador", "PF", "analista", "médico", "kinesiólogo", "nutricionista", "utilero", "coordinador", "dirigente", "admin"];

export function roleGroup(role = "") {
  const value = role.toLowerCase();
  if (/entrenador|coordinador|director|técnico|tecnico/.test(value)) return "technical";
  if (/pf|preparador|analista|rendimiento|físico|fisico/.test(value)) return "performance";
  if (/médico|medico|kinesi|nutric|salud/.test(value)) return "health";
  return "other";
}

export function formatLastSeen(value) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function staffName(entry) {
  const member = entry.member;
  return member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() : entry.access.user_name || entry.access.staff_name || "Perfil de staff incompleto";
}