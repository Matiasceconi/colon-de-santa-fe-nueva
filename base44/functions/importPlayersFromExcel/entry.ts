import { createClientFromRequest } from "npm:@base44/sdk";

const DEFAULT_POSITIONS = [
  "Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo",
  "Mediocampista Central", "Volante Interno", "Extremo Derecho", "Extremo Izquierdo", "Delantero Centro",
];

function normalizeDni(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T\d{2}:\d{2}:\d{2})?/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const local = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (!local) return null;
  let year = Number(local[3]);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const month = Number(local[2]);
  const day = Number(local[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const POSITION_ALIASES: Record<string, string> = {
  "arquero": "Arquero",
  "arquero suplente": "Arquero",
  "defensor central": "Defensor Central",
  "defensor": "Defensor Central",
  "marcador central": "Defensor Central",
  "defensor lateral": "Lateral Derecho",
  "lateral derecho": "Lateral Derecho",
  "lateral por derecha": "Lateral Derecho",
  "lateral izquierdo": "Lateral Izquierdo",
  "lateral por izquierda": "Lateral Izquierdo",
  "mediocampista central": "Mediocampista Central",
  "mediocentro": "Mediocampista Central",
  "volante central": "Mediocampista Central",
  "volante interno": "Volante Interno",
  "mediapunta": "Volante Interno",
  "enganche": "Volante Interno",
  "interior": "Volante Interno",
  "extremo": "Extremo",
  "extremo izquierdo": "Extremo Izquierdo",
  "extremo derecho": "Extremo Derecho",
  "wing izquierdo": "Extremo Izquierdo",
  "wing derecho": "Extremo Derecho",
  "delantero centro": "Delantero Centro",
  "centrodelantero": "Delantero Centro",
  "delantero": "Delantero Centro",
  "nueve": "Delantero Centro",
};

function inferPositionGroup(position: string): string {
  const n = normalizeText(position);
  if (n.includes("arquero") || n === "gk") return "Arqueros";
  if (n.includes("defensor") || n.includes("central") || n.includes("lateral") || n.includes("carrilero")) return "Defensores";
  if (n.includes("medio") || n.includes("volante") || n.includes("interior")) return "Mediocampistas";
  if (n.includes("extremo") || n.includes("wing")) return "Extremos";
  if (n.includes("delantero") || n.includes("nueve") || n.includes("punta")) return "Delanteros";
  return "";
}

function normalizePosition(raw: string, positionOptions: any[]): string | null {
  const n = normalizeText(raw);
  if (!n) return null;
  const options = positionOptions.length ? positionOptions : DEFAULT_POSITIONS.map((label) => ({ label, metadata: {} }));
  const exact = options.find((option) => normalizeText(option.label) === n);
  if (exact) return exact.label;
  const aliasTarget = POSITION_ALIASES[n] || POSITION_ALIASES[Object.keys(POSITION_ALIASES).find((key) => n.includes(key)) || ""];
  if (!aliasTarget) return null;
  return options.find((option) => normalizeText(option.label) === normalizeText(aliasTarget))?.label || null;
}

function positionMetadata(position: string, positionOptions: any[]) {
  const option = positionOptions.find((row) => normalizeText(row.label) === normalizeText(position));
  const group = option?.metadata?.position_group || inferPositionGroup(position);
  return { player_type: group === "Arqueros" ? "arquero" : "jugador_campo", position_group: group || undefined };
}

function mapDominantLeg(raw: string): string | undefined {
  const n = normalizeText(raw);
  if (!n) return undefined;
  if (n.includes("diestro") || n.includes("derecha") || n.includes("dere")) return "Derecha";
  if (n.includes("zurdo") || n.includes("izquierda") || n.includes("izquier")) return "Izquierda";
  if (n.includes("ambidiestro") || n.includes("ambas")) return "Ambidiestro";
  return undefined;
}

function mapDocumentType(raw: string): string | undefined {
  const n = normalizeText(raw);
  if (!n) return undefined;
  if (n === "dni") return "DNI";
  if (n.includes("pasaporte")) return "Pasaporte";
  if (n.includes("cedula")) return "Cédula";
  if (n === "lc") return "LC";
  if (n === "le") return "LE";
  return "Otro";
}

function mapHousingType(raw: string): string | undefined {
  const n = normalizeText(raw);
  if (!n) return undefined;
  if (n.includes("sin") || n.includes("no")) return "Sin pensión";
  if (n.includes("intern")) return "Interna";
  if (n.includes("extern")) return "Externa";
  return undefined;
}

function resolveSquadByName(squadName: string, squads: any[], fallbackSquad: any): any | null {
  const target = normalizeText(squadName);
  if (!target) return fallbackSquad || null;
  let match = squads.find((s) => normalizeText(s.name) === target);
  if (match) return match;
  match = squads.find((s) => {
    const n = normalizeText(s.name);
    return n.includes(target) || target.includes(n);
  });
  return match || fallbackSquad || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const { rows, squad_id, squad_name } = await req.json();
    if (!Array.isArray(rows)) return Response.json({ error: "Faltan las filas a importar" }, { status: 400 });

    let fallbackSquad: any = null;
    if (squad_id) {
      fallbackSquad = await base44.entities.Squad.get(String(squad_id)).catch(() => null);
    }

    const [allSquads, existingPlayers, existingMemberships, optionRows] = await Promise.all([
      base44.entities.Squad.list("name", 500),
      base44.entities.Player.list("-created_date", 5000),
      base44.entities.SquadMembership.list("-effective_from", 10000),
      base44.entities.InstitutionOption.list("order", 500).catch(() => []),
    ]);
    const positionOptions = optionRows.filter((row: any) => row.group === "player_position" && row.active !== false);

    const byDni = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const player of existingPlayers) {
      const dni = normalizeDni(player.dni || player.document_number);
      if (dni && !byDni.has(dni)) byDni.set(dni, player);
      const name = normalizeName(player.full_name || `${player.first_name || ""} ${player.last_name || ""}`);
      if (name && !byName.has(name)) byName.set(name, player);
    }

    const activeMembershipKeys = new Set(
      existingMemberships
        .filter((m: any) => m.status === "activo" && !m.effective_to)
        .map((m: any) => `${m.player_id}:${m.squad_id}`)
    );
    const seenDni = new Set<string>();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let duplicates = 0;
    let membershipsCreated = 0;
    let squadResolved = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] as Record<string, unknown>;
      const line = index + 1;
      const squadRaw = String(row.squad || row.plantel || row.categoria || "").trim();
      const docTypeRaw = String(row.document_type || "").trim();
      const dni = normalizeDni(row.dni || row.document_number);
      const lastName = String(row.last_name || row.apellido || "").trim();
      const firstName = String(row.first_name || row.nombre || "").trim();
      const positionRaw = String(row.position || row.posicion || "").trim();
      const position = normalizePosition(positionRaw, positionOptions);
      const birthDate = row.birth_date ? parseDate(row.birth_date) : null;
      const nationality = String(row.nationality || "").trim();
      const residence = String(row.residence_zone || row.residence || row.current_residence || "").trim();
      const normalizedResidenceZone = residence.toUpperCase();
      const residenceZone = ["AMBA", "INTERIOR", "EXTERIOR"].includes(normalizedResidenceZone) ? normalizedResidenceZone : undefined;
      const housingRaw = String(row.housing || row.housing_type || "").trim();
      const legRaw = String(row.leg || row.dominant_leg || "").trim();
      const jerseyNumber = row.jersey_number === undefined || row.jersey_number === "" ? undefined : Number(row.jersey_number);
      const fullName = `${firstName} ${lastName}`.trim();

      if (!firstName || !lastName || !positionRaw) {
        errors.push(`Fila ${line}: faltan apellido, nombre o posición.`);
        continue;
      }
      if (!position) {
        errors.push(`Fila ${line}: “${positionRaw}” no coincide con una posición activa del catálogo institucional.`);
        continue;
      }
      if (dni && seenDni.has(dni)) {
        duplicates += 1;
        errors.push(`Fila ${line}: el documento ${dni} está repetido dentro de la planilla.`);
        continue;
      }
      if (dni) seenDni.add(dni);
      if (row.birth_date && !birthDate) {
        errors.push(`Fila ${line}: fecha de nacimiento inválida para ${fullName}.`);
        continue;
      }

      const resolvedSquad = resolveSquadByName(squadRaw, allSquads, fallbackSquad);
      if (!resolvedSquad) {
        errors.push(`Fila ${line}: no se encontró el plantel “${squadRaw || "(sin plantel)"}” y no hay plantel de destino.`);
        continue;
      }
      if (squadRaw) squadResolved += 1;
      const targetSquadName = resolvedSquad.name || String(squad_name || "");

      const payload: Record<string, unknown> = {
        dni: dni || undefined,
        document_number: dni || undefined,
        document_type: mapDocumentType(docTypeRaw) || undefined,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        normalized_name: normalizeName(fullName),
        position,
        ...positionMetadata(position, positionOptions),
        dominant_leg: mapDominantLeg(legRaw),
        nationality: nationality || undefined,
        residence_zone: residenceZone,
        // Compatibilidad temporal con registros/pantallas anteriores.
        current_residence: residence || undefined,
        housing_type: mapHousingType(housingRaw),
        birth_date: birthDate || undefined,
        jersey_number: jerseyNumber,
        division: targetSquadName,
        squad_id: resolvedSquad.id,
        squad_name: targetSquadName,
        status: "Disponible",
        active: true,
      };
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      const sameName = byName.get(normalizeName(fullName));
      let player = byDni.get(dni) || (sameName && !normalizeDni(sameName.dni || sameName.document_number) ? sameName : null);
      if (player) {
        player = await base44.entities.Player.update(player.id, payload);
        updated += 1;
      } else {
        player = await base44.entities.Player.create(payload);
        created += 1;
      }
      byDni.set(dni, player);
      byName.set(normalizeName(fullName), player);

      const membershipKey = `${player.id}:${resolvedSquad.id}`;
      const today = new Date().toISOString().slice(0, 10);
      const otherActiveMemberships = existingMemberships.filter((membership: any) => membership.player_id === player.id && membership.status === "activo" && !membership.effective_to && membership.squad_id !== resolvedSquad.id);
      for (const membership of otherActiveMemberships) {
        await base44.entities.SquadMembership.update(membership.id, { status: "fuera_del_plantel", effective_to: today, reason: membership.reason || "Reasignación por importación" });
        activeMembershipKeys.delete(`${player.id}:${membership.squad_id}`);
      }
      if (!activeMembershipKeys.has(membershipKey)) {
        await base44.entities.SquadMembership.create({
          player_id: player.id,
          player_name: fullName,
          squad_id: resolvedSquad.id,
          squad_name: targetSquadName,
          status: "activo",
          effective_from: today,
        });
        activeMembershipKeys.add(membershipKey);
        existingMemberships.push({ player_id: player.id, squad_id: resolvedSquad.id, squad_name: targetSquadName, status: "activo", effective_from: today });
        membershipsCreated += 1;
      }
    }

    return Response.json({
      success: true,
      created,
      updated,
      duplicates,
      invalid_rows: errors.length - duplicates,
      memberships_created: membershipsCreated,
      squads_resolved: squadResolved,
      details: { errors: errors.slice(0, 30) },
    });
  } catch (error) {
    console.error("importPlayersFromExcel:", error);
    return Response.json({ error: error?.message || "Error al importar jugadores" }, { status: 500 });
  }
});