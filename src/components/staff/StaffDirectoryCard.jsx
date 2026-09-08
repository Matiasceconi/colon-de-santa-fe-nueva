import React from "react";
import { Briefcase, Clock, Mail, ShieldCheck } from "lucide-react";
import { formatLastSeen, staffName } from "@/components/staff/staffDirectoryUtils";

export default function StaffDirectoryCard({ entry, activeSquadName, onOpen }) {
  const { access, member, roleNames } = entry;
  const name = staffName(entry);
  const title = member?.job_title || member?.role || roleNames[0] || access.role || "Sin función informada";
  return <button type="button" onClick={() => onOpen(entry)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/70">
    <div className="flex items-start gap-3">
      {member?.photo_url ? <img src={member.photo_url} alt={name} className="h-12 w-12 rounded-full object-cover"/> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">{name.slice(0, 1).toUpperCase()}</div>}
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{name}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400"><Briefcase size={11}/>{title}</p>{!member && <p className="mt-1 text-[10px] font-medium text-amber-400">Perfil de staff incompleto</p>}</div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${access.active !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>{access.active !== false ? "Acceso activo" : "Acceso inactivo"}</span>
    </div>
    <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500"><p className="flex items-center gap-1.5"><ShieldCheck size={12}/>{access.all_squads ? "Todos los planteles" : activeSquadName}</p><p className="flex items-center gap-1.5 truncate"><Mail size={12}/>{member?.email || access.user_email || "Sin email"}</p><p className="flex items-center gap-1.5"><Clock size={12}/>Último acceso: {formatLastSeen(access.last_seen)}</p></div>
  </button>;
}