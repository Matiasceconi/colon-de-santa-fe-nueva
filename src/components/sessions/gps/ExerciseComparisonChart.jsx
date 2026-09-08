import React from "react";
import { ResponsiveContainer, Legend, Tooltip, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { fmtMetricVal } from "../gpsReport/sessionGpsReportData";

export default function ExerciseComparisonChart({ chart }) {
  const series = chart.series || [];
  const metrics = chart.metrics || [];
  const data = metrics.map(metric => {
    const values = series.map(item => item.values[metric.key]);
    const max = Math.max(0, ...values.filter(v => v != null));
    return { name: metric.label, ...Object.fromEntries(values.map((v, i) => ["s" + i, v == null || max === 0 ? null : v / max * 100])) };
  });
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7"];
  return <div>
    <p className="text-xs font-semibold">{chart.title}</p>
    <p className="text-[10px] opacity-70 mb-2">Índice por parámetro: mayor valor seleccionado = 100. No es un puntaje de rendimiento. Sin dato o sin máximo positivo: sin índice.</p>
    <ResponsiveContainer width="100%" height={300}>
      {chart.type === "line" ? <LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize:9}} /><YAxis domain={[0,100]} /><Legend wrapperStyle={{fontSize:10}} /><Tooltip formatter={value => [value == null ? "Sin índice" : Number(value).toFixed(1) + "%"]} />
        {series.map((item,i) => <Line key={i} type="monotone" dataKey={"s"+i} name={item.name} stroke={colors[i]} strokeWidth={3} dot={{r:3}} isAnimationActive={false} />)}
      </LineChart> : <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize:9}} /><YAxis domain={[0,100]} /><Legend wrapperStyle={{fontSize:10}} /><Tooltip formatter={value => [value == null ? "Sin índice" : Number(value).toFixed(1) + "%"]} />
        {series.map((item,i) => <Bar key={i} dataKey={"s"+i} name={item.name} fill={colors[i]} isAnimationActive={false} />)}
      </BarChart>}
    </ResponsiveContainer>
    <div className="overflow-x-auto"><table className="w-full text-[10px]"><thead><tr><th className="text-left p-2">Valores reales</th>{metrics.map(m => <th key={m.key} className="p-2 text-right">{m.label} {m.unit}</th>)}</tr></thead><tbody>{series.map((s,i) => <tr key={i} className="border-t border-zinc-500/20"><td className="p-2">{s.name}</td>{metrics.map(m => <td key={m.key} className="p-2 text-right">{fmtMetricVal(m.key,s.values[m.key])}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
