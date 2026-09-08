import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Activity, ArrowLeft, BarChart3, Download, Eye, Loader2, LogOut,
  MessageCircle, RefreshCw, Search, ShieldCheck, TrendingUp, UserPlus, Users,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const STATUS = {
  new: { label: "Nuevo", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  contacted: { label: "Contactado", className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
  meeting: { label: "Reunión", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  proposal: { label: "Propuesta", className: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  client: { label: "Cliente", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  discarded: { label: "Descartado", className: "bg-zinc-700/30 text-zinc-400 border-zinc-700" },
};

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

function MetricCard({ icon: Icon, label, value, hint, color = "text-blue-400" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon size={17} className={color} />
      </div>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default function DemoCrm() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState("");
  const [notes, setNotes] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await base44.functions.invoke("manageDemoCrm", { action: "dashboard" });
      const payload = response?.data || response;
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo cargar el CRM");
      setData(payload);
      setNotes(Object.fromEntries((payload.leads || []).map((lead) => [lead.id, lead.notes || ""])));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No tenés acceso a este panel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const leads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.leads || []).filter((lead) => {
      const matchesStatus = status === "all" || lead.status === status;
      const haystack = [lead.full_name, lead.email, lead.club_name, lead.role_title].join(" ").toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [data?.leads, search, status]);

  async function updateLead(leadId, patch) {
    setSaving(leadId);
    try {
      const response = await base44.functions.invoke("manageDemoCrm", { action: "update_lead", lead_id: leadId, ...patch });
      const payload = response?.data || response;
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo actualizar");
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((lead) => lead.id === leadId ? { ...lead, ...patch } : lead),
      }));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No se pudo guardar el cambio.");
    } finally {
      setSaving("");
    }
  }

  function exportCsv() {
    const headers = ["Nombre", "Email", "Club", "Función", "Estado", "Fuente", "Registro", "Última actividad", "Notas"];
    const rows = leads.map((lead) => [
      lead.full_name, lead.email, lead.club_name, lead.role_title,
      STATUS[lead.status]?.label || lead.status, lead.source,
      lead.registered_at, lead.last_activity_at, lead.notes,
    ]);
    const quote = (value) => `"${String(value || "").replaceAll('"', '""')}"`;
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(quote).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performancepitch-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="animate-spin text-blue-400" size={30} /></div>;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center">
          <ShieldCheck size={36} className="mx-auto text-red-400" />
          <h1 className="mt-4 text-2xl font-black">Acceso privado</h1>
          <p className="mt-3 text-sm text-zinc-400">{error}</p>
          <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-white hover:bg-white/5"><ArrowLeft size={16} /> Volver al sitio</a>
        </div>
      </div>
    );
  }

  const m = data.metrics;
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700"><Activity size={18} /></span>
            <div>
              <p className="text-sm font-black">Performance<span className="text-blue-400">Pitch</span> CRM</p>
              <p className="text-[10px] text-zinc-500">Panel comercial privado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin" className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 sm:inline-flex"><ArrowLeft size={14} /> Administración</a>
            <span className="hidden lg:inline text-xs text-zinc-500">{data.owner_email}</span>
            <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white"><RefreshCw size={15} /></button>
            <button onClick={() => logout("/")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-zinc-300 hover:bg-white/5"><LogOut size={14} /> Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-8 px-5 py-7 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Resumen comercial</p>
            <h1 className="mt-2 text-3xl font-black">Actividad de la demo</h1>
            <p className="mt-2 text-sm text-zinc-500">Visitas, registros y oportunidades comerciales en un solo lugar.</p>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-zinc-200"><Download size={16} /> Exportar contactos</button>
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon={Eye} label="Visitas" value={m.visits_total} hint={`${m.visits_7d} últimos 7 días`} />
          <MetricCard icon={Users} label="Visitantes únicos" value={m.unique_total} hint={`${m.unique_30d} últimos 30 días`} color="text-cyan-400" />
          <MetricCard icon={UserPlus} label="Registros" value={m.registrations} hint="Cuentas de demo" color="text-emerald-400" />
          <MetricCard icon={TrendingUp} label="Conversión" value={`${m.conversion}%`} hint="Visita → registro" color="text-violet-400" />
          <MetricCard icon={MessageCircle} label="WhatsApp" value={m.whatsapp_clicks} hint="Clics comerciales" color="text-emerald-400" />
          <MetricCard icon={BarChart3} label="Reuniones" value={m.meeting_clicks} hint="Intención comercial" color="text-amber-400" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-sm font-bold">Evolución de visitas · 14 días</h2>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs><linearGradient id="crmVisits" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="visits" name="Visitas" stroke="#3b82f6" fill="url(#crmVisits)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-sm font-bold">Fuentes de tráfico</h2>
            <div className="mt-4 space-y-3">{data.sources.length ? data.sources.map((item) => <div key={item.source} className="flex items-center justify-between text-sm"><span className="capitalize text-zinc-400">{item.source}</span><span className="font-bold text-white">{item.count}</span></div>) : <p className="text-sm text-zinc-600">Sin datos todavía.</p>}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-sm font-bold">Módulos más vistos</h2>
            <div className="mt-4 space-y-3">{data.top_paths.length ? data.top_paths.map((item) => <div key={item.path} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-zinc-400">{item.path}</span><span className="font-bold text-white">{item.count}</span></div>) : <p className="text-sm text-zinc-600">Sin recorrido registrado.</p>}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="font-black">Contactos de la demo</h2><p className="mt-1 text-xs text-zinc-500">{leads.length} resultados</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, email o club" className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-72" /></div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm outline-none">
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead><tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-3">Contacto</th><th className="px-4 py-3">Club / función</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Última actividad</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>
                {leads.map((lead) => {
                  const state = STATUS[lead.status] || STATUS.new;
                  return (
                    <React.Fragment key={lead.id}>
                      <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-5 py-4"><p className="text-sm font-bold text-white">{lead.full_name || "Sin nombre"}</p><a href={`mailto:${lead.email}`} className="mt-1 block text-xs text-blue-400 hover:underline">{lead.email}</a></td>
                        <td className="px-4 py-4"><p className="text-sm text-zinc-300">{lead.club_name || "Sin club informado"}</p><p className="mt-1 text-xs text-zinc-600">{lead.role_title || "Sin función informada"}</p></td>
                        <td className="px-4 py-4 text-xs text-zinc-400">{fmtDate(lead.registered_at)}</td>
                        <td className="px-4 py-4"><p className="text-xs text-zinc-400">{fmtDate(lead.last_activity_at)}</p><p className="mt-1 text-[10px] text-zinc-600">{lead.login_count} ingresos</p></td>
                        <td className="px-4 py-4 text-xs capitalize text-zinc-400">{lead.source}</td>
                        <td className="px-4 py-4">
                          <select value={lead.status} disabled={saving === lead.id} onChange={(e) => updateLead(lead.id, { status: e.target.value })} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none ${state.className}`}>
                            {Object.entries(STATUS).map(([key, item]) => <option className="bg-zinc-900 text-white" key={key} value={key}>{item.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4"><button onClick={() => setExpanded(expanded === lead.id ? "" : lead.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">{expanded === lead.id ? "Cerrar" : "Notas"}</button></td>
                      </tr>
                      {expanded === lead.id && (
                        <tr className="border-b border-white/10 bg-black/20"><td colSpan={7} className="px-5 py-4">
                          <div className="flex gap-3"><textarea value={notes[lead.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))} placeholder="Escribí notas privadas sobre este contacto…" className="min-h-20 flex-1 rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500" /><button disabled={saving === lead.id} onClick={() => updateLead(lead.id, { notes: notes[lead.id] || "" })} className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-50">{saving === lead.id ? "Guardando…" : "Guardar nota"}</button></div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!leads.length && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-zinc-600">No hay contactos que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
