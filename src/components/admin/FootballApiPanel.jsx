import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, CheckCircle2, XCircle, KeyRound, Globe, Link2, Trophy } from "lucide-react";

export default function FootballApiPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://v3.football.api-sports.io");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [search, setSearch] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("footballApi", { action: "getSettings" });
      const s = res.data || res;
      setSettings(s.settings);
      if (s.settings?.has_key) setApiKey("");
      if (s.settings?.base_url) setBaseUrl(s.settings.base_url);
      const compRes = await base44.entities.Competitions.list("name", 300);
      setCompetitions(compRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await base44.functions.invoke("footballApi", { action: "saveSettings", api_key: apiKey.trim(), base_url: baseUrl });
      setApiKey("");
      await load();
    } catch (e) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("footballApi", { action: "testConnection" });
      const r = res.data || res;
      setTestResult({ ok: true, rateLimit: r.rateLimitRemaining });
      await load();
    } catch (e) {
      setTestResult({ ok: false, error: e?.message || "Error" });
    } finally {
      setTesting(false);
    }
  }

  async function searchLeagues(e) {
    e?.preventDefault();
    if (search.trim().length < 3) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke("footballApi", { action: "searchLeagues", search: search.trim() });
      const r = res.data || res;
      setLeagues(r.leagues || []);
    } catch (e) {
      alert(e?.message || "Error en la búsqueda");
    } finally {
      setSearching(false);
    }
  }

  async function linkLeague(league) {
    setLinking(league.id);
    try {
      if (selectedComp) {
        await base44.entities.Competitions.update(selectedComp, {
          provider_competition_id: String(league.id),
          logo: league.logo || undefined,
          updated_at: new Date().toISOString(),
        });
        alert(`Competencia vinculada a "${league.name}" (${league.country})`);
      } else {
        const now = new Date().toISOString();
        await base44.entities.Competitions.create({
          name: league.name,
          short_name: league.name,
          normalized_name: league.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          logo: league.logo,
          provider_competition_id: String(league.id),
          competition_type: "liga",
          official: true,
          active: true,
          color: "#F0C800",
          created_at: now,
          updated_at: now,
        });
        alert(`Competencia "${league.name}" creada y vinculada a la API`);
      }
      await load();
      setSelectedComp("");
    } catch (e) {
      alert(e?.message || "Error al vincular");
    } finally {
      setLinking(null);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  const configured = settings?.has_key;

  return (
    <div className="space-y-5">
      {/* ── Configuración de la API ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-yellow-400" />
          <h3 className="text-white font-bold">Credenciales de API-Football</h3>
        </div>
        <p className="text-zinc-500 text-xs mb-4">Obtené tu API key en <a href="https://www.api-football.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">api-football.com</a>. La conexión usa el header <code className="text-zinc-400">x-apisports-key</code>.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">API key</label>
            <input type="password" placeholder={configured ? "•••••••• (guardada)" : "Ingresá tu API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">URL base</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 text-sm text-white focus:outline-none focus:border-yellow-500" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={saveSettings} disabled={!apiKey.trim() || saving} className="px-4 py-2 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null} {configured ? "Actualizar key" : "Guardar"}
          </button>
          {configured && (
            <button onClick={testConnection} disabled={testing} className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
              {testing ? <Loader2 size={14} className="animate-spin" /> : null} Probar conexión
            </button>
          )}
          {testResult && (
            <span className={`flex items-center gap-1.5 text-sm ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
              {testResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {testResult.ok ? `Conexión OK${testResult.rateLimit != null ? ` · ${testResult.rateLimit} requests restantes` : ""}` : testResult.error}
            </span>
          )}
        </div>

        {configured && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> API key guardada</span>
            {settings?.last_test_at && <span>Última prueba: {settings.last_test_ok ? "✓" : "✕"} {new Date(settings.last_test_at).toLocaleString("es-AR")}</span>}
            {settings?.rate_limit_remaining != null && <span>Requests restantes: {settings.rate_limit_remaining}</span>}
          </div>
        )}
      </div>

      {/* ── Búsqueda y vinculación de ligas ──────────────────────────────── */}
      {configured ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-yellow-400" />
            <h3 className="text-white font-bold">Buscar ligas / torneos</h3>
          </div>
          <p className="text-zinc-500 text-xs mb-4">Buscá una liga por nombre y vinculala a una competencia existente, o creá una nueva desde la API.</p>

          <form onSubmit={searchLeagues} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input autoFocus placeholder="Ej: Liga Profesional, Premier League, Serie A..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500" />
            </div>
            <button type="submit" disabled={search.trim().length < 3 || searching} className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
            </button>
          </form>

          {competitions.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-zinc-400 mb-1.5 block">Competencia destino (opcional — si no elegís, se crea una nueva)</label>
              <select value={selectedComp} onChange={(e) => setSelectedComp(e.target.value)} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white">
                <option value="">Crear competencia nueva</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.provider_competition_id ? ` (ya vinculada: ${c.provider_competition_id})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          {leagues.length > 0 && (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {leagues.map((league) => {
                const linked = competitions.find((c) => String(c.provider_competition_id) === String(league.id));
                return (
                  <div key={league.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                    {league.logo ? <img src={league.logo} alt="" className="w-9 h-9 object-contain shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-zinc-800 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{league.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{league.country} · {league.type} · ID {league.id}</p>
                    </div>
                    {linked ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 shrink-0"><Link2 size={13} /> {linked.name}</span>
                    ) : (
                      <button onClick={() => linkLeague(league)} disabled={linking === league.id} className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5">
                        {linking === league.id ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Vincular
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {leagues.length === 0 && !searching && search.trim().length >= 3 && (
            <p className="text-zinc-500 text-sm text-center py-6">Buscá una liga para ver resultados</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <KeyRound size={28} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">Guardá tu API key para habilitar la búsqueda de ligas y la vinculación de competencias.</p>
        </div>
      )}
    </div>
  );
}