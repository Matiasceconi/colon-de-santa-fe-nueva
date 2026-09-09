import React, { useEffect, useMemo, useState } from "react";
import { Home, Plane, MapPin, Clock, Users, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

const CATEGORY_ORDER = ["4ta", "5ta", "6ta", "7ma", "8va", "9na"];

function fmtFullDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  } catch { return iso; }
}

function Shield({ logo, name, size = "w-12 h-12" }) {
  const [err, setErr] = useState(false);
  if (!logo || err) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
    return (
      <div className={`${size} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0`}>
        <span className="text-xs font-bold text-zinc-400">{initials}</span>
      </div>
    );
  }
  return <img src={logo} alt={name} className={`${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

function ClubBrandShield({ size = "w-12 h-12" }) {
  const { clubBrand } = useWorkspace();
  const [err, setErr] = useState(false);
  if (!clubBrand?.logoUrl || err) {
    return (
      <div className={`${size} rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 flex items-center justify-center shrink-0`}>
        <span className="text-[10px] font-black text-white">{clubBrand?.shortName || "CLUB"}</span>
      </div>
    );
  }
  return <img src={clubBrand.logoUrl} alt={clubBrand?.name} className={`${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

function Block({ title, icon: Icon, tone, venue, items }) {
  const toneCls = tone === "home"
    ? "bg-emerald-500/[0.07] border-emerald-500/30"
    : "bg-blue-500/[0.07] border-blue-500/30";
  const labelCls = tone === "home"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-blue-500/15 text-blue-300 border-blue-500/30";
  const accent = tone === "home" ? "text-emerald-400" : "text-blue-400";

  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${labelCls}`}>
          <Icon size={13} /> {title}
        </span>
      </div>
      {venue && (
        <p className={`text-xs flex items-center gap-1 mb-3 ${accent}`}>
          <MapPin size={12} /> {venue}
        </p>
      )}
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.category} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-950/40">
            <span className="text-sm text-white font-medium">{it.category} División</span>
            <span className="text-xs text-zinc-300 flex items-center gap-1">
              <Clock size={11} className="text-zinc-500" /> {it.time || "—"} hs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NextYouthMatchCard() {
  const { clubBrand } = useWorkspace();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await base44.entities.FootballYouthFixture.filter({ status: "scheduled" }, "-fixtureRound", 200);
        if (cancelled) return;
        setFixtures(all || []);
      } catch (e) {
        console.error("next youth match", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
  }, []);

  const next = useMemo(() => {
    if (!fixtures.length) return null;

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const datedFixtures = fixtures
      .map((fixture) => ({ ...fixture, _date: fixture.date || fixture.matchDate || "" }))
      .filter((fixture) => fixture._date && fixture._date >= today)
      .sort((a, b) => a._date.localeCompare(b._date) || Number(a.fixtureRound || 999) - Number(b.fixtureRound || 999));

    if (!datedFixtures.length) return null;
    const first = datedFixtures[0];
    const date = first._date;
    const round = first.fixtureRound || 0;
    const roundFixtures = datedFixtures.filter((fixture) =>
      fixture._date === date && (!round || Number(fixture.fixtureRound || 0) === Number(round))
    );
    if (!roundFixtures.length) return null;

    const isHomeAny = roundFixtures.some((fixture) => fixture.isHome);
    const rival = isHomeAny
      ? roundFixtures.find((fixture) => fixture.isHome)?.awayTeam || roundFixtures[0]?.awayTeam
      : roundFixtures.find((fixture) => !fixture.isHome)?.homeTeam || roundFixtures[0]?.homeTeam;
    const rivalLogo = roundFixtures[0]?.teamLogo;

    const grandes = roundFixtures
      .filter((fixture) => fixture.isHome)
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
    const chicas = roundFixtures
      .filter((fixture) => !fixture.isHome)
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

    return { round, date, rival, rivalLogo, grandes, chicas };
  }, [fixtures]);

  if (loading) {
    return <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />;
  }

  if (!next) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Users size={18} className="text-emerald-400" /> Próximo Partido — Juveniles
        </h2>
        <p className="text-zinc-500 text-sm text-center py-6">No hay partidos de juveniles programados.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-600/10 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <ClubBrandShield size="w-12 h-12" />
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-emerald-400" /> Próximo Partido — Juveniles
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {clubBrand?.name || "Club"} <span className="text-zinc-600">vs</span> <span className="text-white font-medium">{next.rival}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold">
            <Calendar size={14} /> Fecha {next.round}
          </span>
          <p className="text-xs text-zinc-500 mt-1 capitalize">{fmtFullDate(next.date)}</p>
        </div>
      </div>

      {/* Rival shield centered mini */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <ClubBrandShield size="w-10 h-10" />
        <span className="text-zinc-500 text-sm font-semibold">VS</span>
        <Shield logo={next.rivalLogo} name={next.rival} size="w-10 h-10" />
      </div>

      {/* Two blocks */}
      <div className="grid md:grid-cols-2 gap-3">
        <Block
          title="LAS GRANDES — LOCAL"
          icon={Home}
          tone="home"
          venue={next.grandes[0]?.venue}
          items={next.grandes.length ? next.grandes : [{ category: "4ta", time: "—" }, { category: "5ta", time: "—" }, { category: "6ta", time: "—" }]}
        />
        <Block
          title="LAS CHICAS — VISITANTE"
          icon={Plane}
          tone="away"
          venue={next.chicas[0]?.venue}
          items={next.chicas.length ? next.chicas : [{ category: "7ma", time: "—" }, { category: "8va", time: "—" }, { category: "9na", time: "—" }]}
        />
      </div>
    </div>
  );
}