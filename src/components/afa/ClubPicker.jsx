import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function normalizeStr(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ClubShield({ logo, name, size = "w-7 h-7" }) {
  const [err, setErr] = useState(false);
  if (!logo || err) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
    return (
      <div className={`${size} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0`}>
        <span className="text-[9px] font-bold text-zinc-400">{initials}</span>
      </div>
    );
  }
  return <img src={logo} alt={name} className={`${size} object-contain shrink-0`} onError={() => setErr(true)} />;
}

export default function ClubPicker({ label = "Club", selectedClubId, onSelect, placeholder = "Buscar club...", allowClear = false, onClear, filterMode = false, excludeId = null }) {
  const [clubs, setClubs] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await base44.entities.Club.list("name", 500);
        if (cancelled) return;
        setClubs((all || []).filter((c) => c.active !== false));
      } catch (e) {
        console.error("club picker load", e);
        setClubs([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => (clubs || []).find((c) => c.id === selectedClubId) || null, [clubs, selectedClubId]);

  const filtered = useMemo(() => {
    if (!clubs) return [];
    const q = normalizeStr(query);
    return clubs
      .filter((c) => (excludeId ? c.id !== excludeId : true))
      .filter((c) => !q || normalizeStr(c.name).includes(q) || normalizeStr(c.short_name || "").includes(q))
      .slice(0, 50);
  }, [clubs, query, excludeId]);

  function pick(club) {
    onSelect?.(club?.id || "", club ? { homeTeam: club.name, awayTeam: club.name, logo_url: club.logo_url, club_id: club.id } : {});
    setOpen(false);
    setQuery("");
  }

  if (filterMode && selected) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <ClubShield logo={selected.logo_url} name={selected.name} size="w-6 h-6" />
          <span className="truncate">{selected.short_name || selected.name}</span>
        </button>
        {allowClear && (
          <button onClick={onClear} className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-800">
            <X size={14} />
          </button>
        )}
        {open && renderDropdown()}
      </div>
    );
  }

  function renderDropdown() {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4" onClick={() => setOpen(false)}>
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
            <Search size={16} className="text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
            />
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {clubs === null ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="text-zinc-600 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-6">No se encontraron clubes</p>
            ) : (
              filtered.map((club) => (
                <button
                  key={club.id}
                  onClick={() => pick(club)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                >
                  <ClubShield logo={club.logo_url} name={club.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{club.name}</p>
                    {club.short_name && <p className="text-xs text-zinc-500 truncate">{club.short_name}</p>}
                  </div>
                  {club.city && <span className="text-xs text-zinc-600 shrink-0">{club.city}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="text-xs text-zinc-400 mb-1 block">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white hover:border-zinc-500 transition-colors"
      >
        {selected ? (
          <>
            <ClubShield logo={selected.logo_url} name={selected.name} size="w-6 h-6" />
            <span className="truncate flex-1 text-left">{selected.short_name || selected.name}</span>
            {allowClear && (
              <span
                onClick={(e) => { e.stopPropagation(); onClear?.(); }}
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-700"
              >
                <X size={14} />
              </span>
            )}
          </>
        ) : (
          <>
            <Plus size={16} className="text-zinc-500" />
            <span className="text-zinc-500 flex-1 text-left">{placeholder}</span>
          </>
        )}
      </button>
      {open && renderDropdown()}
    </div>
  );
}