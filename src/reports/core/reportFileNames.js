function clean(value, fallback = "") {
  const normalized = String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return normalized || fallback;
}

export function sessionReportFilename(snapshot = {}) {
  const session = snapshot.session || {};
  const squad = clean(session.squad_name || snapshot.brand?.squadName, "Plantel");
  const date = clean(session.date, "sin_fecha");
  return `Sesion_${squad}_${date}.pdf`;
}

export function reportFilenamePart(value, fallback = "Informe") {
  return clean(value, fallback);
}
