export function normalizeRosterText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

export function playerAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function resolvePlayerCategory(player, membership, squads) {
  const byId = squads.find((squad) => squad.id === membership?.squad_id) || squads.find((squad) => squad.id === player.squad_id);
  if (byId) return { id: byId.id, name: byId.name.trim() };
  const stored = membership?.squad_name || player.squad_name || player.division || "Sin categoría";
  const normalized = normalizeRosterText(stored).replace("divison", "division");
  const exact = squads.find((squad) => normalizeRosterText(squad.name).replace("divison", "division") === normalized);
  if (exact) return { id: exact.id, name: exact.name.trim() };
  const keyword = ["primera", "reserva", "cuarta", "quinta", "sexta"].find((word) => normalized.includes(word));
  const alias = keyword && squads.find((squad) => normalizeRosterText(squad.name).includes(keyword));
  return alias ? { id: alias.id, name: alias.name.trim() } : { id: `legacy:${normalized}`, name: stored.trim() };
}