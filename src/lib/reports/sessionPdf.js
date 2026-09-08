import moment from "moment";
import { createBrandedPdf, buildExportFileName, drawSessionHeader, formatExportNumber, savePdfDocument } from "@/lib/exports/pdfExportKit";
import { isGoalkeeper } from "@/components/squad/squadConstants";

function attendanceLabel(value) {
  return {
    presente: "Presente",
    diferenciado: "Diferenciado",
    kinesiologia: "Kinesiología",
    ausente: "Ausente",
  }[value] || value || "—";
}

export async function generateSessionPdf({
  session,
  sessionPlayers = [],
  exercises = [],
  gpsRows = [],
  videoLinks = [],
  strengthStations = [],
  brand,
  download = true,
} = {}) {
  if (!session?.id) throw new Error("No se encontró la sesión a exportar.");

  const pdf = await createBrandedPdf({
    orientation: "portrait",
    brand,
    title: `Informe de sesión${session.session_number ? ` #${session.session_number}` : ""}`,
    subtitle: session.title || "Planificación y registro operativo",
    meta: [session.squad_name || "Plantel", session.period || "", session.date ? moment(session.date).format("DD/MM/YYYY") : ""],
    footerLabel: "Sesión · PerformancePitch",
  });

  drawSessionHeader(pdf, { session: { ...session, date: session.date ? moment(session.date).format("DD/MM/YYYY") : "" } });

  const present = sessionPlayers.filter((row) => row.attendance === "presente");
  const summary = {
    campo: present.filter((row) => !isGoalkeeper({ position: row.position })).length,
    arqueros: present.filter((row) => isGoalkeeper({ position: row.position })).length,
    diferenciados: sessionPlayers.filter((row) => row.attendance === "diferenciado").length,
    kinesiologia: sessionPlayers.filter((row) => row.attendance === "kinesiologia").length,
    ausentes: sessionPlayers.filter((row) => row.attendance === "ausente").length,
  };

  pdf.keyValueGrid([
    { label: "Jugadores", value: sessionPlayers.length },
    { label: "Campo", value: summary.campo },
    { label: "Arqueros", value: summary.arqueros },
    { label: "Diferenciados", value: summary.diferenciados },
    { label: "Kinesiología", value: summary.kinesiologia },
    { label: "Ausentes", value: summary.ausentes },
  ], 3);

  pdf.sectionTitle("Jugadores y disponibilidad");
  pdf.table({
    columns: [
      { key: "player_name", label: "Jugador", bold: true },
      { key: "position", label: "Posición" },
      { key: "attendance_label", label: "Estado" },
      { key: "origin", label: "Origen" },
    ],
    widths: [3.2, 2, 1.7, 2],
    rows: sessionPlayers.map((row) => ({
      ...row,
      attendance_label: attendanceLabel(row.attendance),
      origin: row.origin_squad_name || row.squad_name || session.squad_name || "—",
    })),
    emptyLabel: "No hay jugadores vinculados a la sesión.",
  });

  pdf.sectionTitle("Ejercicios de campo");
  pdf.table({
    columns: [
      { key: "order_label", label: "#", align: "center" },
      { key: "name", label: "Ejercicio", bold: true },
      { key: "format", label: "Formato" },
      { key: "duration", label: "Duración", align: "center" },
      { key: "blocks_label", label: "Bloques", align: "center" },
      { key: "players_label", label: "Jug.", align: "center" },
      { key: "space", label: "Espacio" },
      { key: "eii_label", label: "EII" },
    ],
    widths: [0.45, 2.5, 1.5, 1.1, 0.9, 0.8, 1.35, 1.1],
    fontSize: 6.6,
    rows: exercises.map((exercise, index) => ({
      ...exercise,
      order_label: index + 1,
      format: exercise.format_label || exercise.exercise_type || "—",
      duration: exercise.duration_min != null ? `${exercise.duration_min} min` : "—",
      blocks_label: exercise.blocks ?? exercise.block_count ?? "—",
      players_label: exercise.players_count ?? exercise.eii_players_count ?? "—",
      space: exercise.length_m && exercise.width_m ? `${exercise.length_m}×${exercise.width_m} m` : exercise.total_area ? `${exercise.total_area} m²` : "—",
      eii_label: exercise.eii != null ? `${exercise.eii} m²/jug` : "—",
    })),
    emptyLabel: "Sin ejercicios de campo cargados.",
  });

  const descriptions = exercises.filter((exercise) => exercise.description || exercise.instructions || exercise.notes);
  if (descriptions.length) {
    pdf.sectionTitle("Consignas y observaciones de ejercicios");
    descriptions.forEach((exercise, index) => {
      pdf.paragraph(`${index + 1}. ${exercise.name || "Ejercicio"}`, { bold: true, fontSize: 8, gap: 1 });
      pdf.paragraph(exercise.description || exercise.instructions || exercise.notes, { fontSize: 7.4, gap: 3 });
    });
  }

  pdf.sectionTitle("Fuerza");
  pdf.table({
    columns: [
      { key: "index", label: "#", align: "center" },
      { key: "exercise_name", label: "Ejercicio", bold: true },
      { key: "method", label: "Método" },
      { key: "exercise_type", label: "Tipo" },
      { key: "volume_label", label: "Volumen" },
      { key: "load_label", label: "Carga" },
      { key: "rest_label", label: "Pausa" },
    ],
    widths: [0.5, 2.5, 1.5, 1.4, 1.5, 1.2, 1.2],
    rows: strengthStations.map((station, index) => ({
      ...station,
      index: index + 1,
      exercise_name: station.exercise_name || station.name || "Ejercicio",
      volume_label: station.volume || [station.sets && `${station.sets} series`, station.reps && `${station.reps} reps`].filter(Boolean).join(" · ") || "—",
      load_label: station.load || station.weight || station.intensity || "—",
      rest_label: station.rest || station.pause || "—",
    })),
    emptyLabel: "Sin trabajo de fuerza cargado.",
  });

  pdf.sectionTitle("GPS · carga externa");
  pdf.table({
    columns: [
      { key: "player_name", label: "Jugador", bold: true },
      { key: "distance", label: "Dist. (m)", align: "right" },
      { key: "mmin", label: "m/min", align: "right" },
      { key: "hsr", label: "D>19.8 (m)", align: "right" },
      { key: "sprint_distance", label: "D>25 (m)", align: "right" },
      { key: "sprints_label", label: "Sprints", align: "right" },
      { key: "acc", label: "ACC+3", align: "right" },
      { key: "dec", label: "DEC+3", align: "right" },
      { key: "pl", label: "Player Load", align: "right" },
      { key: "smax_label", label: "Smax", align: "right" },
    ],
    widths: [2.5, 1.2, 1, 1.2, 1.1, 0.9, 0.9, 0.9, 1.1, 0.9],
    fontSize: 5.9,
    rows: gpsRows.map((row) => ({
      ...row,
      distance: formatExportNumber(row.total_distance, { decimals: 0 }),
      mmin: formatExportNumber(row.m_min, { decimals: 1 }),
      hsr: formatExportNumber(row.distance_19_8, { decimals: 0 }),
      sprint_distance: formatExportNumber(row.distance_25, { decimals: 0 }),
      sprints_label: formatExportNumber(row.sprints, { decimals: 0 }),
      acc: formatExportNumber(row.acc_3, { decimals: 0 }),
      dec: formatExportNumber(row.dec_3, { decimals: 0 }),
      pl: formatExportNumber(row.player_load, { decimals: 1 }),
      smax_label: formatExportNumber(row.smax, { decimals: 1, suffix: " km/h" }),
    })),
    emptyLabel: "Sin GPS cargado para esta sesión.",
  });

  pdf.sectionTitle("Videos y material vinculado");
  pdf.table({
    columns: [
      { key: "title_label", label: "Título", bold: true },
      { key: "type_label", label: "Tipo" },
      { key: "video_url", label: "Enlace" },
    ],
    widths: [2.2, 1.4, 5.4],
    rows: videoLinks.map((link) => ({
      ...link,
      title_label: link.title || "Video",
      type_label: link.type || link.video_type || "—",
    })),
    emptyLabel: "Sin videos vinculados.",
    fontSize: 6.4,
  });

  if (session.notes) {
    pdf.sectionTitle("Observaciones de la sesión");
    pdf.paragraph(session.notes, { fontSize: 8 });
  }

  pdf.finalize();
  const filename = buildExportFileName("Sesion", [session.squad_name || "Plantel", session.date || "sin_fecha"], "pdf");
  if (download) savePdfDocument(pdf.doc, filename);
  return { doc: pdf.doc, filename };
}
