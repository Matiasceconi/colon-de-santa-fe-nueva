import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Edit2, Plus, Shield } from "lucide-react";
import StaffForm from "@/components/staff/StaffForm";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";

export default function StaffManager() {
  const [members, setMembers] = useState([]); const [squads, setSquads] = useState([]); const [accesses, setAccesses] = useState({});
  const [editing, setEditing] = useState(undefined); const [permissions, setPermissions] = useState(null); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const [memberRows, squadRows, accessRows] = await Promise.all([base44.entities.StaffMember.list("-created_date", 200), base44.entities.Squad.list("name", 100), base44.entities.UserAccess.list("-created_date", 200)]); setMembers(memberRows); setSquads(squadRows); setAccesses(Object.fromEntries(accessRows.filter(a => a.staff_id).map(a => [a.staff_id, a]))); setLoading(false); }
  useEffect(() => { load(); }, []);
  if (loading) return <div className="p-10 text-center text-zinc-500">Cargando staff…</div>;
  return <div className="space-y-4"><header className="flex justify-between"><div><h2 className="font-bold text-white">Cuerpo Técnico y Staff</h2><p className="text-xs text-zinc-500">Gestión para la preparación inicial del club</p></div><button onClick={() => setEditing(null)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900"><Plus size={14}/>Agregar miembro</button></header>
    {members.map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"><div className="flex-1"><p className="font-semibold text-white">{member.first_name} {member.last_name}</p><p className="text-xs text-zinc-500">{member.job_title || member.role} · {(member.squad_names || []).join(", ") || "Sin plantel"}</p></div><button onClick={() => setPermissions(member)} className="p-2 text-blue-400"><Shield size={15}/></button><button onClick={() => setEditing(member)} className="p-2 text-zinc-400"><Edit2 size={15}/></button></div>)}
    {editing !== undefined && <StaffForm member={editing} squads={squads} onSaved={() => { setEditing(undefined); load(); }} onClose={() => setEditing(undefined)}/>} {permissions && <StaffPermissionsModal member={permissions} squads={squads} existingAccess={accesses[permissions.id] || null} onSaved={() => { setPermissions(null); load(); }} onClose={() => setPermissions(null)}/>} 
  </div>;
}