import React from "react";
import { contrastText } from "@/lib/clubBrandResolver";
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { REPORT_FONT_FAMILY } from "@/reports/core/reportFonts";

try { Font.registerHyphenationCallback((word) => [word]); } catch { /* renderer compatibility */ }

export const REPORT_EMPTY = "—";

const styles = StyleSheet.create({
  page: {
    fontFamily: REPORT_FONT_FAMILY,
    fontSize: 8,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  header: {
    minHeight: 62,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: { width: 38, height: 38, objectFit: "contain", marginRight: 10 },
  logoFallback: { width: 38, height: 38, borderRadius: 8, marginRight: 10, alignItems: "center", justifyContent: "center" },
  logoFallbackText: { color: "#FFFFFF", fontSize: 10, fontWeight: 700 },
  headerText: { flexGrow: 1, flexBasis: 0 },
  eyebrow: { fontSize: 6.5, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 3 },
  title: { fontSize: 15, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.15 },
  subtitle: { fontSize: 7.5, color: "#E2E8F0", marginTop: 3 },
  headerMeta: { width: 150, textAlign: "right", marginLeft: 8 },
  metaLine: { color: "#E2E8F0", fontSize: 6.5, marginBottom: 2 },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 10,
    paddingTop: 5,
    borderTopWidth: 0.6,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { color: "#64748B", fontSize: 6 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  sectionMark: { width: 3, height: 13, borderRadius: 2, marginRight: 6 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#0F172A" },
  sectionSubtitle: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  kpiRow: { flexDirection: "row", marginHorizontal: -3, marginBottom: 8 },
  kpi: { flexGrow: 1, flexBasis: 0, marginHorizontal: 3, borderWidth: 0.6, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 6, padding: 7 },
  kpiLabel: { fontSize: 5.7, color: "#64748B", textTransform: "uppercase", marginBottom: 3 },
  kpiValue: { fontSize: 11, fontWeight: 700, color: "#0F172A" },
  table: { borderWidth: 0.6, borderColor: "#CBD5E1", borderRadius: 4, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.45, borderBottomColor: "#E2E8F0", minHeight: 20, alignItems: "center" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  tableHeader: { flexDirection: "row", minHeight: 22, alignItems: "center" },
  tableHeaderCell: { color: "#FFFFFF", fontSize: 6, fontWeight: 700, paddingHorizontal: 4, paddingVertical: 5 },
  tableCell: { color: "#334155", fontSize: 6.5, paddingHorizontal: 4, paddingVertical: 4, lineHeight: 1.25 },
  tableCellBold: { color: "#0F172A", fontWeight: 700 },
  empty: { borderWidth: 0.6, borderColor: "#CBD5E1", borderStyle: "dashed", borderRadius: 6, padding: 16, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 7 },
  note: { backgroundColor: "#F8FAFC", borderWidth: 0.6, borderColor: "#E2E8F0", borderRadius: 6, padding: 8, marginBottom: 6 },
  noteTitle: { fontSize: 7, fontWeight: 700, marginBottom: 3, color: "#0F172A" },
  noteText: { fontSize: 7, color: "#475569", lineHeight: 1.35 },
  avatar: { width: 18, height: 18, borderRadius: 9, objectFit: "cover", marginRight: 5 },
  avatarFallback: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#475569", alignItems: "center", justifyContent: "center", marginRight: 5 },
  avatarFallbackText: { color: "#FFFFFF", fontSize: 5.8, fontWeight: 700 },
  playerCell: { flexDirection: "row", alignItems: "center" },
  link: { color: "#2563EB", textDecoration: "none", fontSize: 6.5 },
  badge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 5.8, fontWeight: 700 },
});

export function safeText(value, fallback = REPORT_EMPTY) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  return String(value);
}

export function formatNumber(value, decimals = 0, suffix = "") {
  if (value == null || (typeof value === "string" && !value.trim())) return REPORT_EMPTY;
  const number = Number(value);
  if (!Number.isFinite(number)) return REPORT_EMPTY;
  return `${number.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

function initials(value) {
  return String(value || "J").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "J";
}

export function ReportDocument({ children, title = "PerformancePitch Report" }) {
  return <Document title={title} author="PerformancePitch" creator="PerformancePitch Reports" producer="PerformancePitch Reports">{children}</Document>;
}

export function ReportPage({ children, snapshot, orientation = "portrait", pageLabel = "Informe" }) {
  const brand = snapshot?.brand || {};
  const colors = brand.colors || {};
  const primary = colors.primary || "#1E293B";
  const accent = colors.accent || "#0EA5E9";
  const session = snapshot?.session || {};
  const assets = snapshot?.assets || {};
  return (
    <Page size="A4" orientation={orientation} style={styles.page} wrap>
      {assets.watermark ? <Image src={assets.watermark} style={{ position: "absolute", width: 230, height: 230, left: "50%", top: "42%", marginLeft: -115, opacity: 0.035, objectFit: "contain" }} fixed /> : null}
      <View style={[styles.header, { backgroundColor: primary, borderBottomWidth: 3, borderBottomColor: accent }]}>
        {assets.logo ? <Image src={assets.logo} style={styles.logo} /> : (
          <View style={[styles.logoFallback, { backgroundColor: accent }]}><Text style={styles.logoFallbackText}>{safeText(brand.shortName || brand.name, "CL").slice(0, 3).toUpperCase()}</Text></View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: contrastText(primary) }]}>{safeText(brand.name, "Club")}{brand.showPerformancePitchBrand === false ? "" : " · PerformancePitch Reports"}</Text>
          <Text style={[styles.title, { color: contrastText(primary) }]}>INFORME PROFESIONAL DE SESIÓN</Text>
          <Text style={[styles.subtitle, { color: contrastText(primary) }]}>{[session.squad_name || brand.squadName, session.title, session.match_day_code].filter(Boolean).join(" · ")}</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={[styles.metaLine, { color: contrastText(primary) }]}>{safeText(session.date, "Sin fecha")}</Text>
          <Text style={[styles.metaLine, { color: contrastText(primary) }]}>{session.start_time ? `${session.start_time}${session.end_time ? `–${session.end_time}` : ""}` : "Horario no informado"}</Text>
          <Text style={[styles.metaLine, { color: contrastText(primary) }]}>{pageLabel} · v{safeText(snapshot?.template_version, "1.0.0")}</Text>
        </View>
      </View>
      {children}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>{brand.footerText || `${safeText(brand.name, "Club")} · ${brand.showPerformancePitchBrand === false ? "" : "PerformancePitch Reports"}`}</Text>
        <Text style={[styles.footerText, { color: primary }]} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  );
}

export function ReportSection({ title, subtitle, children, accent = "#0EA5E9" }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionMark, { backgroundColor: accent }]} />
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function ReportKpis({ items = [] }) {
  if (!items.length) return null;
  const chunks = [];
  for (let i = 0; i < items.length; i += 4) chunks.push(items.slice(i, i + 4));
  return <>{chunks.map((chunk, index) => (
    <View key={index} style={styles.kpiRow} wrap={false}>
      {chunk.map((item) => <View key={item.label} style={styles.kpi}><Text style={styles.kpiLabel}>{item.label}</Text><Text style={styles.kpiValue}>{safeText(item.value)}</Text></View>)}
      {Array.from({ length: Math.max(0, 4 - chunk.length) }).map((_, filler) => <View key={`f-${filler}`} style={{ flexGrow: 1, flexBasis: 0, marginHorizontal: 3 }} />)}
    </View>
  ))}</>;
}

export function ReportTable({ columns = [], rows = [], primary = "#1E293B", emptyLabel = "Sin datos para esta sección" }) {
  if (!rows.length) return <ReportEmptyState label={emptyLabel} />;
  return (
    <View style={styles.table}>
      <View style={[styles.tableHeader, { backgroundColor: primary }]} fixed>
        {columns.map((column) => <Text key={column.key} style={[styles.tableHeaderCell, { flexGrow: column.width || 1, flexBasis: 0, textAlign: column.align || "left", color: contrastText(primary) }]}>{column.label}</Text>)}
      </View>
      {rows.map((row, index) => (
        <View key={row.id || row.player_id || `${index}`} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : null]} wrap={false}>
          {columns.map((column) => {
            const raw = typeof column.value === "function" ? column.value(row, index) : row[column.key];
            const content = column.render ? column.render(row, index) : <Text style={[styles.tableCell, column.bold ? styles.tableCellBold : null, { textAlign: column.align || "left" }]}>{safeText(raw)}</Text>;
            return <View key={column.key} style={{ flexGrow: column.width || 1, flexBasis: 0 }}>{content}</View>;
          })}
        </View>
      ))}
    </View>
  );
}

export function ReportPlayerCell({ player, photo }) {
  const name = player?.player_name || player?.full_name || "Jugador";
  return (
    <View style={[styles.tableCell, styles.playerCell]}>
      {photo ? <Image src={photo} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>{initials(name)}</Text></View>}
      <View style={{ flexGrow: 1, flexBasis: 0 }}><Text style={styles.tableCellBold}>{name}</Text>{player?.position ? <Text style={{ fontSize: 5.5, color: "#94A3B8", marginTop: 1 }}>{player.position}</Text> : null}</View>
    </View>
  );
}

export function ReportEmptyState({ label = "Sin datos" }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{label}</Text></View>;
}

export function ReportNote({ title, text }) {
  if (!text) return null;
  return <View style={styles.note} wrap={false}>{title ? <Text style={styles.noteTitle}>{title}</Text> : null}<Text style={styles.noteText}>{text}</Text></View>;
}

export function ReportLink({ href, children }) {
  return <Link src={href} style={styles.link}>{children}</Link>;
}

export function ReportBadge({ label, background = "#E2E8F0", color = "#334155" }) {
  return <View style={[styles.badge, { backgroundColor: background }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>;
}
