import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { formatNumber } from "@/reports/components/ReportPrimitives";

function maxValue(points = []) {
  return Math.max(0, ...points.map((point) => Number(point.value)).filter(Number.isFinite));
}

export default function ReportBarChart({ chart, accent = "#0EA5E9", maxRows = 12 }) {
  const points = (chart?.points || []).slice(0, maxRows);
  const max = maxValue(points);
  if (!points.length || max <= 0) {
    return <View style={{ borderWidth: 0.6, borderColor: "#CBD5E1", borderStyle: "dashed", borderRadius: 6, padding: 14 }}><Text style={{ fontSize: 7, color: "#94A3B8", textAlign: "center" }}>Sin datos para este gráfico</Text></View>;
  }

  return (
    <View style={{ borderWidth: 0.6, borderColor: "#E2E8F0", borderRadius: 6, padding: 8, marginBottom: 8 }} wrap={false}>
      <Text style={{ fontSize: 8.5, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{chart.title}</Text>
      {points.map((point) => {
        const value = Number(point.value);
        const pct = max > 0 ? Math.max(1.5, (value / max) * 100) : 0;
        return (
          <View key={`${point.player_id || point.label}-${chart.id}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ width: 92, fontSize: 5.8, color: "#334155" }}>{point.label}</Text>
            <View style={{ flexGrow: 1, flexBasis: 0, height: 10, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: 10, backgroundColor: accent, borderRadius: 3 }} />
            </View>
            <Text style={{ width: 55, marginLeft: 6, textAlign: "right", fontSize: 6.2, fontWeight: 700, color: "#0F172A" }}>{formatNumber(value, chart.decimals || 0, chart.unit ? ` ${chart.unit}` : "")}</Text>
          </View>
        );
      })}
      {chart.points?.length > maxRows ? <Text style={{ marginTop: 3, fontSize: 5.5, color: "#94A3B8" }}>Se muestran los {maxRows} valores más altos de {chart.points.length} jugadores.</Text> : null}
    </View>
  );
}
