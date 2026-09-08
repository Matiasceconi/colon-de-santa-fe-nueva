import React from "react";
import { Users, Footprints, CalendarDays, Home, Building2, FileText } from "lucide-react";

function StatCard({ label, value, detail, icon: Icon, active, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}>
    <div className="flex items-center justify-between"><span className="text-xs font-medium text-zinc-500">{label}</span><Icon size={16} className={active ? "text-cyan-300" : "text-zinc-600"} /></div>
    <p className="mt-3 text-2xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p>
  </button>;
}

export default function RosterQuickStats({ rows, legFilter, housingFilter, residenceFilter, contractFilter, onLeg, onHousing, onResidence, onContract, onReset }) {
  const ages = rows.map((row) => row.age).filter(Number.isFinite);
  const right = rows.filter((row) => row.player.dominant_leg === "Derecha").length;
  const left = rows.filter((row) => row.player.dominant_leg === "Izquierda").length;
  const amba = rows.filter((row) => (row.player.residence_zone || row.player.current_residence) === "AMBA").length;
  const interior = rows.filter((row) => (row.player.residence_zone || row.player.current_residence) === "INTERIOR").length;
  const housing = rows.filter((row) => ["Interna", "Externa"].includes(row.player.housing_type)).length;
  const contracted = rows.filter((row) => (row.player.contract_status || (row.player.has_contract === true ? "Con contrato" : "Sin información")) === "Con contrato").length;
  const average = ages.length ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : "—";
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
    <StatCard label="Total del plantel" value={rows.length} detail="jugadores" icon={Users} onClick={onReset} />
    <StatCard label="Diestros" value={right} detail="jugadores" icon={Footprints} active={legFilter === "Derecha"} onClick={() => onLeg(legFilter === "Derecha" ? "all" : "Derecha")} />
    <StatCard label="Zurdos" value={left} detail="jugadores" icon={Footprints} active={legFilter === "Izquierda"} onClick={() => onLeg(legFilter === "Izquierda" ? "all" : "Izquierda")} />
    <StatCard label="Edad promedio" value={average} detail="años" icon={CalendarDays} />
    <StatCard label="AMBA" value={amba} detail="residencia" icon={Home} active={residenceFilter === "AMBA"} onClick={() => onResidence(residenceFilter === "AMBA" ? "all" : "AMBA")} />
    <StatCard label="Interior" value={interior} detail="residencia" icon={Home} active={residenceFilter === "INTERIOR"} onClick={() => onResidence(residenceFilter === "INTERIOR" ? "all" : "INTERIOR")} />
    <StatCard label="Pensión" value={housing} detail="interna o externa" icon={Building2} active={housingFilter === "Con pensión"} onClick={() => onHousing(housingFilter === "Con pensión" ? "all" : "Con pensión")} />
    <StatCard label="Con contrato" value={contracted} detail="confirmados" icon={FileText} active={contractFilter === "Con contrato"} onClick={() => onContract(contractFilter === "Con contrato" ? "all" : "Con contrato")} />
  </div>;
}