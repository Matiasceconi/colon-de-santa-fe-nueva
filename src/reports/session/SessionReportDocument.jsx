import React from "react";
import { Text, View } from "@react-pdf/renderer";
import {
  ReportDocument,
  ReportPage,
  ReportSection,
  ReportKpis,
  ReportTable,
  ReportPlayerCell,
  ReportEmptyState,
  ReportNote,
  ReportLink,
  formatNumber,
  safeText,
} from "@/reports/components/ReportPrimitives";
import ReportBarChart from "@/reports/charts/ReportBarChart";

function hasSection(snapshot, section) {
  return (snapshot?.sections || []).includes(section);
}

function chunks(rows = [], size = 20) {
  const result = [];
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));
  return result.length ? result : [[]];
}

function orientationFor(snapshot, wide = false) {
  const requested = snapshot?.orientation || "auto";
  if (requested === "portrait" || requested === "landscape") return requested;
  return wide ? "landscape" : "portrait";
}

function seriesLabel(station) {
  const series = Array.isArray(station.series) ? station.series : [];
  if (series.length) {
    return series.map((item, index) => {
      const work = item.reps ? `${item.reps} rep` : item.time ? `${item.time}s` : "serie";
      const loadType = item.load_type || "";
      const loadValue = item.load_value;
      const load = loadValue !== undefined && loadValue !== null && loadValue !== ""
        ? loadType === "pct_1rm" ? `${loadValue}% 1RM`
          : loadType === "pct_bodyweight" ? `${loadValue}% PC`
            : loadType === "kg" ? `${loadValue} kg`
              : String(loadValue)
        : "";
      return `${index + 1}: ${[work, load].filter(Boolean).join(" · ")}`;
    }).join(" | ");
  }
  return station.volume || [station.sets && `${station.sets} series`, station.reps && `${station.reps} rep`, station.time && `${station.time}s`].filter(Boolean).join(" · ") || "—";
}

function SummaryPage({ snapshot }) {
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const session = snapshot.session || {};
  const summary = snapshot.summary || {};
  return (
    <ReportPage snapshot={snapshot} orientation={orientationFor(snapshot)} pageLabel="Resumen">
      <ReportSection title="Resumen operativo" subtitle="Snapshot exacto de la sesión al momento de generar el informe" accent={accent}>
        <ReportKpis items={[
          { label: "Fecha", value: session.date || "—" },
          { label: "MD", value: session.match_day_code || "Sin referencia" },
          { label: "Objetivo", value: session.session_objective || "—" },
          { label: "Duración", value: session.duration_minutes != null ? `${session.duration_minutes} min` : "—" },
          { label: "Jugadores", value: summary.selected_players ?? 0 },
          { label: "Con equipo", value: summary.with_team ?? 0 },
          { label: "Diferenciado", value: summary.differentiated ?? 0 },
          { label: "Kinesiología", value: summary.kinesiology ?? 0 },
        ]} />
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {["session_type", "location", "period", "status"].map((key) => (
            <View key={key} style={{ flexGrow: 1, flexBasis: 0, marginRight: key === "status" ? 0 : 6, borderWidth: 0.6, borderColor: "#E2E8F0", borderRadius: 5, padding: 6 }}>
              <Text style={{ fontSize: 5.7, textTransform: "uppercase", color: "#94A3B8", marginBottom: 2 }}>{({ session_type: "Tipo", location: "Lugar", period: "Período", status: "Estado" })[key]}</Text>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#334155" }}>{safeText(session[key])}</Text>
            </View>
          ))}
        </View>
      </ReportSection>

      {snapshot.gps?.length ? (
        <ReportSection title="Carga externa · lectura rápida" subtitle="Promedios de jugadores incluidos en el grupo principal" accent={accent}>
          <ReportKpis items={[
            { label: "Jugadores GPS", value: summary.gps_players ?? 0 },
            { label: "Distancia media", value: formatNumber(summary.avg_total_distance, 0, " m") },
            { label: "m/min medio", value: formatNumber(summary.avg_m_min, 1, " m/min") },
            { label: "Player Load medio", value: formatNumber(summary.avg_player_load, 1) },
          ]} />
          <Text style={{ marginTop: 3, fontSize: 6.2, color: "#64748B", lineHeight: 1.35 }}>Los promedios excluyen los registros marcados fuera del promedio principal. Los valores faltantes se muestran como “—” y nunca se reemplazan por cero.</Text>
        </ReportSection>
      ) : null}

      <ReportSection title="Contenido de la sesión" subtitle="Cantidad de elementos registrados" accent={accent}>
        <ReportKpis items={[
          { label: "Ejercicios campo", value: summary.field_exercises ?? 0 },
          { label: "Ejercicios fuerza", value: summary.strength_exercises ?? 0 },
          { label: "Videos", value: snapshot.videos?.length ?? 0 },
          { label: "No entrenan", value: summary.not_training ?? 0 },
        ]} />
      </ReportSection>
    </ReportPage>
  );
}

function PlayersPages({ snapshot }) {
  const rows = snapshot.players || [];
  const primary = snapshot.brand?.colors?.primary || "#1E293B";
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const orientation = orientationFor(snapshot);
  const perPage = orientation === "landscape" ? 34 : 24;
  const groups = chunks(rows, perPage);
  return groups.map((group, index) => (
    <ReportPage key={`players-${index}`} snapshot={snapshot} orientation={orientation} pageLabel={`Plantel ${index + 1}/${groups.length}`}>
      <ReportSection title="Plantel del día" subtitle={`${rows.length} jugador${rows.length === 1 ? "" : "es"} incluidos en este informe`} accent={accent}>
        <ReportTable
          primary={primary}
          rows={group}
          emptyLabel="No hay jugadores incluidos en este informe."
          columns={[
            { key: "player", label: "Jugador", width: 3.2, render: (row) => <ReportPlayerCell player={row} photo={snapshot.assets?.playerPhotos?.[row.player_id]} /> },
            { key: "attendance_label", label: "Trabajo del día", width: 1.7, bold: true },
            { key: "status_at_session", label: "Estado inicial", width: 1.6 },
            { key: "minutes", label: "Min.", width: 0.8, align: "right", value: (row) => row.minutes ?? "—" },
            { key: "rpe", label: "RPE", width: 0.7, align: "right", value: (row) => row.rpe ?? "—" },
            { key: "internal_load", label: "Carga int.", width: 1, align: "right", value: (row) => row.internal_load ?? "—" },
          ]}
        />
      </ReportSection>
    </ReportPage>
  ));
}

function FieldPages({ snapshot }) {
  const rows = snapshot.exercises || [];
  const primary = snapshot.brand?.colors?.primary || "#1E293B";
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const orientation = orientationFor(snapshot);
  const perPage = orientation === "landscape" ? 22 : 14;
  const groups = chunks(rows, perPage);
  return groups.map((group, index) => (
    <ReportPage key={`field-${index}`} snapshot={snapshot} orientation={orientation} pageLabel={`Campo ${index + 1}/${groups.length}`}>
      <ReportSection title="Campo" subtitle="La configuración pertenece a esta sesión; no modifica la biblioteca" accent={accent}>
        <ReportTable
          primary={primary}
          rows={group}
          emptyLabel="Sin ejercicios de campo cargados."
          columns={[
            { key: "order", label: "#", width: 0.4, align: "center", value: (row, idx) => row.order ?? idx + 1 },
            { key: "name", label: "Ejercicio", width: 2.3, bold: true },
            { key: "format_label", label: "Formato", width: 1.5 },
            { key: "blocks", label: "Bloques", width: 0.8, align: "center", value: (row) => row.blocks ?? "—" },
            { key: "duration_min", label: "Duración", width: 0.9, align: "right", value: (row) => row.duration_min != null ? `${row.duration_min} min` : "—" },
            { key: "space", label: "Espacio", width: 1.3, value: (row) => row.length_m && row.width_m ? `${row.length_m}×${row.width_m} m` : row.total_area ? `${row.total_area} m²` : "—" },
            { key: "eii", label: "EII", width: 1.1, align: "right", value: (row) => row.eii != null ? `${formatNumber(row.eii, 1)} m²/jug` : "—" },
            { key: "objective", label: "Objetivo", width: 1.5 },
          ]}
        />
      </ReportSection>
      {group.some((row) => row.description || row.notes) ? <ReportSection title="Consignas" accent={accent}>{group.filter((row) => row.description || row.notes).map((row) => <ReportNote key={`note-${row.id}`} title={row.name} text={row.description || row.notes} />)}</ReportSection> : null}
    </ReportPage>
  ));
}

function StrengthPages({ snapshot }) {
  const rows = snapshot.strength || [];
  const primary = snapshot.brand?.colors?.primary || "#1E293B";
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const orientation = orientationFor(snapshot);
  const perPage = orientation === "landscape" ? 22 : 14;
  const groups = chunks(rows, perPage);
  return groups.map((group, index) => (
    <ReportPage key={`strength-${index}`} snapshot={snapshot} orientation={orientation} pageLabel={`Fuerza ${index + 1}/${groups.length}`}>
      <ReportSection title="Fuerza" subtitle="Prescripción de esta sesión; la biblioteca conserva únicamente la identidad del ejercicio" accent={accent}>
        <ReportTable
          primary={primary}
          rows={group}
          emptyLabel="Sin trabajo de fuerza cargado."
          columns={[
            { key: "exercise_name", label: "Ejercicio", width: 2.4, bold: true },
            { key: "strength_group", label: "Cuadro", width: 1.2 },
            { key: "method", label: "Método", width: 1.2 },
            { key: "exercise_type", label: "Tipo", width: 1.2 },
            { key: "prescription", label: "Prescripción", width: 3.2, value: seriesLabel },
            { key: "rest_time", label: "Pausa", width: 0.8, align: "right", value: (row) => row.rest_time ? `${row.rest_time}s` : "—" },
            { key: "rir", label: "RIR", width: 0.6, align: "right" },
          ]}
        />
      </ReportSection>
    </ReportPage>
  ));
}

function GpsPages({ snapshot }) {
  const rows = snapshot.gps || [];
  const primary = snapshot.brand?.colors?.primary || "#1E293B";
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const orientation = orientationFor(snapshot, true);
  const perPage = orientation === "landscape" ? 23 : 20;
  const groups = chunks(rows, perPage);
  const playerColumn = { key: "player_name", label: "Jugador", width: 2.2, bold: true };
  const common = [
    playerColumn,
    { key: "total_distance", label: "Dist. m", width: 1, align: "right", value: (row) => formatNumber(row.total_distance, 0) },
    { key: "m_min", label: "m/min", width: 0.9, align: "right", value: (row) => formatNumber(row.m_min, 1) },
    { key: "distance_19_8", label: "D>19.8", width: 0.9, align: "right", value: (row) => formatNumber(row.distance_19_8, 0) },
    { key: "distance_25", label: "D>25", width: 0.9, align: "right", value: (row) => formatNumber(row.distance_25, 0) },
  ];
  const neuro = [
    { key: "sprints", label: "Sprints", width: 0.8, align: "right", value: (row) => formatNumber(row.sprints, 0) },
    { key: "acc_3", label: "ACC+3", width: 0.8, align: "right", value: (row) => formatNumber(row.acc_3, 0) },
    { key: "dec_3", label: "DEC+3", width: 0.8, align: "right", value: (row) => formatNumber(row.dec_3, 0) },
    { key: "player_load", label: "P.Load", width: 0.9, align: "right", value: (row) => formatNumber(row.player_load, 1) },
    { key: "smax", label: "Smax", width: 0.9, align: "right", value: (row) => formatNumber(row.smax, 1) },
  ];
  return groups.flatMap((group, index) => {
    if (orientation === "landscape") {
      return [<ReportPage key={`gps-${index}`} snapshot={snapshot} orientation="landscape" pageLabel={`GPS ${index + 1}/${groups.length}`}>
        <ReportSection title="GPS · carga externa" subtitle="Mismos registros y filtros del snapshot; dato faltante = —" accent={accent}>
          <ReportTable primary={primary} rows={group} emptyLabel="Sin GPS cargado para la selección." columns={[...common, ...neuro]} />
        </ReportSection>
      </ReportPage>];
    }
    return [
      <ReportPage key={`gps-vol-${index}`} snapshot={snapshot} orientation="portrait" pageLabel={`GPS volumen ${index + 1}/${groups.length}`}>
        <ReportSection title="GPS · volumen e intensidad" accent={accent}><ReportTable primary={primary} rows={group} emptyLabel="Sin GPS cargado para la selección." columns={common} /></ReportSection>
      </ReportPage>,
      <ReportPage key={`gps-neuro-${index}`} snapshot={snapshot} orientation="portrait" pageLabel={`GPS neuromuscular ${index + 1}/${groups.length}`}>
        <ReportSection title="GPS · neuromuscular" accent={accent}><ReportTable primary={primary} rows={group} emptyLabel="Sin GPS cargado para la selección." columns={[playerColumn, ...neuro]} /></ReportSection>
      </ReportPage>,
    ];
  });
}

function ChartPages({ snapshot }) {
  const charts = snapshot.charts || [];
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const orientation = orientationFor(snapshot, true);
  const groups = chunks(charts, orientation === "landscape" ? 2 : 1);
  return groups.map((group, index) => (
    <ReportPage key={`charts-${index}`} snapshot={snapshot} orientation={orientation} pageLabel={`Gráficos ${index + 1}/${groups.length}`}>
      <ReportSection title="Gráficos vectoriales" subtitle="Construidos directamente desde el snapshot; no son capturas de pantalla" accent={accent}>
        {group.length ? group.map((chart) => <ReportBarChart key={chart.id} chart={chart} accent={accent} maxRows={orientation === "landscape" ? 14 : 12} />) : <ReportEmptyState label="No hay gráficos con datos para exportar." />}
      </ReportSection>
    </ReportPage>
  ));
}

function MaterialPage({ snapshot }) {
  const accent = snapshot.brand?.colors?.accent || "#0EA5E9";
  const primary = snapshot.brand?.colors?.primary || "#1E293B";
  const videos = snapshot.videos || [];
  const ai = snapshot.ai_summary || "";
  const showVideos = hasSection(snapshot, "videos");
  const showObs = hasSection(snapshot, "observations");
  const showAi = hasSection(snapshot, "ai");
  if (!showVideos && !showObs && !showAi) return null;
  return (
    <ReportPage snapshot={snapshot} orientation={orientationFor(snapshot)} pageLabel="Material y conclusiones">
      {showVideos ? <ReportSection title="Videos y material vinculado" accent={accent}>
        <ReportTable primary={primary} rows={videos} emptyLabel="Sin videos vinculados." columns={[
          { key: "title", label: "Título", width: 2.2, bold: true },
          { key: "video_type", label: "Tipo", width: 1.3 },
          { key: "source", label: "Fuente", width: 1.2 },
          { key: "link", label: "Enlace", width: 3.5, render: (row) => <View style={{ paddingHorizontal: 4, paddingVertical: 4 }}>{row.video_url ? <ReportLink href={row.video_url}>{row.video_url}</ReportLink> : <Text style={{ fontSize: 6.5, color: "#94A3B8" }}>—</Text>}</View> },
        ]} />
      </ReportSection> : null}
      {showObs ? <ReportSection title="Observaciones" accent={accent}>
        <ReportNote title="Sesión" text={snapshot.observations?.session || "Sin observaciones de sesión."} />
        <ReportNote title="GPS" text={snapshot.observations?.gps || "Sin observaciones GPS."} />
      </ReportSection> : null}
      {showAi ? <ReportSection title="Resumen asistido por IA" subtitle="Texto generado desde el snapshot y sujeto a revisión profesional" accent={accent}>
        <ReportNote title={ai ? "Síntesis" : "Pendiente"} text={ai || "El resumen IA no fue generado para esta versión del informe."} />
        {ai ? <Text style={{ fontSize: 5.8, color: "#94A3B8", marginTop: 2 }}>La síntesis no reemplaza la interpretación del cuerpo técnico y no incorpora datos externos al snapshot.</Text> : null}
      </ReportSection> : null}
    </ReportPage>
  );
}

export default function SessionReportDocument({ snapshot, assets = {} }) {
  const hydrated = { ...snapshot, assets };
  const pages = [];
  if (hasSection(hydrated, "summary")) pages.push(<SummaryPage key="summary" snapshot={hydrated} />);
  if (hasSection(hydrated, "players")) pages.push(...PlayersPages({ snapshot: hydrated }));
  if (hasSection(hydrated, "field")) pages.push(...FieldPages({ snapshot: hydrated }));
  if (hasSection(hydrated, "strength")) pages.push(...StrengthPages({ snapshot: hydrated }));
  if (hasSection(hydrated, "gps")) pages.push(...GpsPages({ snapshot: hydrated }));
  if (hasSection(hydrated, "charts")) pages.push(...ChartPages({ snapshot: hydrated }));
  const material = MaterialPage({ snapshot: hydrated });
  if (material) pages.push(React.cloneElement(material, { key: "material" }));
  if (!pages.length) pages.push(<SummaryPage key="fallback-summary" snapshot={{ ...hydrated, sections: ["summary"] }} />);
  return <ReportDocument title={`Informe de sesión · ${hydrated.session?.squad_name || "Plantel"}`}>{pages}</ReportDocument>;
}
