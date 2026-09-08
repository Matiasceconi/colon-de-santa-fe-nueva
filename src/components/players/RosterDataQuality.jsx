import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function RosterDataQuality({ rows, onLeg, onResidence, onHousing, onContract }) {
  const missingLeg = rows.filter(({ player }) => !player.dominant_leg).length;
  const missingResidence = rows.filter(({ player }) => !(player.residence_zone || (["AMBA", "INTERIOR", "EXTERIOR"].includes(player.current_residence) ? player.current_residence : ""))).length;
  const missingHousing = rows.filter(({ player }) => !player.housing_type).length;
  const missingContract = rows.filter(({ player }) => !player.contract_status && player.has_contract !== true).length;
  const incomplete = rows.filter(({ player }) => {
    const residence = player.residence_zone || (["AMBA", "INTERIOR", "EXTERIOR"].includes(player.current_residence) ? player.current_residence : "");
    const contract = player.contract_status || (player.has_contract === true ? "Con contrato" : "");
    return !player.dominant_leg || !residence || !player.housing_type || !contract;
  }).length;

  if (!incomplete) {
    return <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300"><CheckCircle2 size={15} /> Datos administrativos básicos completos para los jugadores visibles.</div>;
  }

  const items = [
    { label: "Pierna", count: missingLeg, onClick: () => onLeg("Sin información") },
    { label: "Residencia", count: missingResidence, onClick: () => onResidence("Sin información") },
    { label: "Pensión", count: missingHousing, onClick: () => onHousing("Sin información") },
    { label: "Contrato", count: missingContract, onClick: () => onContract("Sin información") },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <span className="mr-1 flex items-center gap-2 text-xs font-semibold text-amber-200"><AlertCircle size={15} /> Datos incompletos: {incomplete} jugadores</span>
      {items.map((item) => <button key={item.label} type="button" onClick={item.onClick} className="rounded-full border border-amber-500/20 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-amber-400/40 hover:text-white">{item.label}: {item.count}</button>)}
    </div>
  );
}
