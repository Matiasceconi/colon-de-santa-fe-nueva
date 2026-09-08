import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Shield, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AREAS, MODULES, MODULE_ACTIONS, PAGES } from "@/lib/areasConfig";
import { DEFAULT_ROLES } from "@/lib/defaultRoles";
import { moduleLifecycle } from "@/lib/moduleCatalog";

const LEVELS = [
  { id: "none", label: "Sin acceso", description: "No ve el módulo", perms: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_admin: false } },
  { id: "read", label: "Consultar", description: "Ver y exportar", perms: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: true, can_admin: false } },
  { id: "work", label: "Trabajar", description: "Ver, crear y editar", perms: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, can_admin: false } },
  { id: "manage", label: "Gestionar", description: "Incluye eliminar", perms: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_admin: false } },
];

const MODULE_GROUPS = [
  { id: "operation", label: "Operación deportiva", ids: ["club_dashboard", "dashboard", "sesiones", "partidos", "calendario", "jugadores", "cuerpo_tecnico", "competencias_afa"] },
  { id: "performance", label: "Rendimiento", ids: ["rendimiento_dashboard", "carga_externa", "carga_interna", "minutos_jugados", "evaluaciones"] },
  { id: "health", label: "Salud", ids: ["area_medica", "nutricion"] },
  { id: "resources", label: "Recursos", ids: ["biblioteca_campo", "biblioteca_fuerza", "planes_complementarios"] },
  { id: "management", label: "Gestión", ids: ["gestion_planteles", "accesos_jugadores"] },
];

function initialModulePermissions(role) {
  const stored = role?.module_permissions || {};
  const out = {};
  MODULES.forEach((m) => {
    const legacyVisible = (role?.allowed_pages || []).some((p) => PAGES.find((page) => page.path === p)?.module_id === m.id);
    out[m.id] = {
      can_view: stored[m.id]?.can_view ?? legacyVisible,
      can_create: stored[m.id]?.can_create ?? !!role?.can_create,
      can_edit: stored[m.id]?.can_edit ?? !!role?.can_edit,
      can_delete: stored[m.id]?.can_delete ?? !!role?.can_delete,
      can_export: stored[m.id]?.can_export ?? !!role?.can_export,
      can_admin: stored[m.id]?.can_admin ?? false,
    };
  });
  return out;
}

function normalizePerms(perms = {}) {
  return MODULE_ACTIONS.reduce((acc, action) => ({ ...acc, [action.key]: !!perms[action.key] }), {});
}

function permissionLevel(perms = {}) {
  const normalized = normalizePerms(perms);
  if (!normalized.can_view && !normalized.can_create && !normalized.can_edit && !normalized.can_delete && !normalized.can_export && !normalized.can_admin) return "none";
  if (normalized.can_admin) return "custom";
  for (const level of LEVELS.slice(1)) {
    if (MODULE_ACTIONS.every((action) => normalized[action.key] === !!level.perms[action.key])) return level.id;
  }
  return "custom";
}

function templateName(role) {
  return role.name === "Administrador del Club" ? "Administrador del Club" : role.name;
}

export default function RoleFormModal({ existingRole, onSaved, onClose }) {
  const [form, setForm] = useState(() => ({
    name: existingRole?.name || "",
    description: existingRole?.description || "",
    areas: existingRole?.areas || [],
    module_permissions: initialModulePermissions(existingRole),
    can_admin: existingRole?.can_admin || false,
    active: existingRole ? existingRole.active !== false : true,
  }));
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const { toast } = useToast();

  function setF(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleArea(id) { setForm((current) => ({ ...current, areas: current.areas.includes(id) ? current.areas.filter((area) => area !== id) : [...current.areas, id] })); }

  function setModuleLevel(moduleId, levelId) {
    const level = LEVELS.find((item) => item.id === levelId);
    if (!level) return;
    setForm((current) => ({ ...current, module_permissions: { ...current.module_permissions, [moduleId]: { ...level.perms } } }));
  }

  function toggleModulePermission(moduleId, key) {
    setForm((current) => {
      const permissions = current.module_permissions[moduleId] || {};
      const nextValue = !permissions[key];
      const next = { ...permissions, [key]: nextValue };
      if (key === "can_view" && !nextValue) MODULE_ACTIONS.forEach((action) => { next[action.key] = false; });
      if (key !== "can_view" && nextValue) next.can_view = true;
      return { ...current, module_permissions: { ...current.module_permissions, [moduleId]: next } };
    });
  }

  function applyTemplate(index) {
    const template = DEFAULT_ROLES[index];
    if (!template) return;
    setTemplateId(String(index));
    setForm((current) => ({
      ...current,
      name: templateName(template),
      description: template.description || "",
      areas: [...(template.areas || [])],
      module_permissions: initialModulePermissions(template),
      can_admin: !!template.can_admin,
      active: true,
    }));
  }

  const visibleGroups = useMemo(() => MODULE_GROUPS.map((group) => ({
    ...group,
    modules: group.ids.map((id) => MODULES.find((module) => module.id === id)).filter((module) => module && moduleLifecycle(module.id).status === "available"),
  })).filter((group) => group.modules.length), []);

  const advancedModules = useMemo(() => MODULES.filter((module) => {
    const lifecycle = moduleLifecycle(module.id);
    if (lifecycle.status === "available") return true;
    if (lifecycle.status === "legacy") return Object.values(form.module_permissions[module.id] || {}).some(Boolean);
    if (lifecycle.status === "internal") return form.can_admin;
    return false;
  }), [form.module_permissions, form.can_admin]);

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "El nombre del rol es obligatorio", variant: "destructive" }); return; }
    const allowed_pages = PAGES.filter((page) => form.module_permissions[page.module_id]?.can_view).map((page) => page.path);
    const aggregate = Object.values(form.module_permissions).reduce((acc, permissions) => ({
      can_create: acc.can_create || !!permissions.can_create,
      can_edit: acc.can_edit || !!permissions.can_edit,
      can_delete: acc.can_delete || !!permissions.can_delete,
      can_export: acc.can_export || !!permissions.can_export,
    }), { can_create: false, can_edit: false, can_delete: false, can_export: false });
    const payload = { ...form, name: form.name.trim(), description: form.description.trim(), allowed_pages, can_view: allowed_pages.length > 0, ...aggregate };
    setSaving(true);
    try {
      const response = await base44.functions.invoke("manage-roles", { action: "save", roleId: existingRole?.id || null, payload });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: existingRole ? "✓ Rol actualizado" : "✓ Rol creado" });
      onSaved();
    } catch (error) {
      toast({ title: "No se pudo guardar el rol", description: error?.response?.data?.error || error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-zinc-800 p-5">
          <div>
            <p className="text-sm font-black">{existingRole ? "Editar rol" : "Nuevo rol"}</p>
            <p className="mt-1 text-xs text-zinc-500">Definí qué puede hacer una persona. Los planteles se asignan después desde Usuarios y accesos.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X size={16} /></button>
        </header>

        <div className="space-y-6 p-5">
          {!existingRole && (
            <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
              <div className="flex items-start gap-3">
                <Shield size={17} className="mt-0.5 shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white">Empezar desde una plantilla</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">Es la opción recomendada. Después podés ajustar sólo los módulos necesarios.</p>
                  <select value={templateId} onChange={(event) => event.target.value === "" ? setTemplateId("") : applyTemplate(Number(event.target.value))} className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs text-white md:max-w-md">
                    <option value="">Elegir plantilla…</option>
                    {DEFAULT_ROLES.map((role, index) => <option key={`${role.name}-${index}`} value={index}>{role.name}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-400">Nombre del rol *<input value={form.name} onChange={(event) => setF("name", event.target.value)} placeholder="Ej: Preparador Físico" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
            <label className="text-xs font-semibold text-zinc-400">Descripción<input value={form.description} onChange={(event) => setF("description", event.target.value)} placeholder="Qué función cumple este rol" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Área de trabajo</p>
            <p className="mt-1 text-xs text-zinc-600">Sirve para organizar el rol. Los permisos reales se definen abajo.</p>
            <div className="mt-3 flex flex-wrap gap-2">{AREAS.map((area) => <button key={area.id} type="button" onClick={() => toggleArea(area.id)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${form.areas.includes(area.id) ? "border-violet-500/40 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:text-zinc-300"}`}>{form.areas.includes(area.id) && <Check size={9} className="mr-1 inline" />}{area.name}</button>)}</div>
          </section>

          <section className={`rounded-2xl border p-4 ${form.can_admin ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-zinc-800 bg-zinc-950/40"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">Administrador del Club</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Da acceso total a configuración, usuarios, planteles y todos los módulos habilitados. Usalo sólo para responsables administrativos del club.</p>
              </div>
              <button type="button" onClick={() => setF("can_admin", !form.can_admin)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black ${form.can_admin ? "border-amber-500/40 bg-amber-500/15 text-amber-200" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}>{form.can_admin ? "Acceso total activado" : "Dar acceso total"}</button>
            </div>
            {form.can_admin && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-black/20 p-3 text-xs leading-5 text-amber-100"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Un usuario con este rol puede administrar otros usuarios. El Administrador General de plataforma sigue protegido y no puede modificarse desde esta función.</div>}
          </section>

          {!form.can_admin && (
            <section className="space-y-4">
              <div>
                <p className="text-sm font-black text-white">Acceso por módulo</p>
                <p className="mt-1 text-xs text-zinc-500">Elegí uno de cuatro niveles simples. Para excepciones puntuales usá “Personalizar acciones”.</p>
              </div>
              {visibleGroups.map((group) => (
                <div key={group.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="text-xs font-black text-zinc-300">{group.label}</p>
                  <div className="mt-3 space-y-2">{group.modules.map((module) => {
                    const level = permissionLevel(form.module_permissions[module.id]);
                    return <div key={module.id} className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="text-xs font-bold text-white">{module.label}</p>{level === "custom" && <p className="mt-0.5 text-[10px] text-amber-400">Permisos personalizados</p>}</div><div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{LEVELS.map((item) => <button key={item.id} type="button" onClick={() => setModuleLevel(module.id, item.id)} title={item.description} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${level === item.id ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200" : "border-zinc-700 bg-zinc-950 text-zinc-600 hover:text-zinc-300"}`}>{item.label}</button>)}</div></div>;
                  })}</div>
                </div>
              ))}
            </section>
          )}

          {!form.can_admin && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40">
              <button type="button" onClick={() => setAdvanced((value) => !value)} className="flex w-full items-center justify-between p-4 text-left"><div><p className="text-xs font-black text-white">Personalizar acciones</p><p className="mt-1 text-[10px] text-zinc-600">Avanzado · Ver / Crear / Editar / Eliminar / Exportar / Administrar por módulo.</p></div>{advanced ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}</button>
              {advanced && <div className="overflow-x-auto border-t border-zinc-800"><table className="w-full min-w-[820px] text-xs"><thead><tr className="bg-black/20 text-zinc-500"><th className="p-3 text-left">Módulo</th>{MODULE_ACTIONS.map((action) => <th key={action.key} className="min-w-24 p-3 text-center">{action.label}</th>)}</tr></thead><tbody>{advancedModules.map((module) => { const lifecycle = moduleLifecycle(module.id); return <tr key={module.id} className="border-t border-zinc-800"><td className="p-3"><p className="font-semibold text-white">{module.label}</p>{lifecycle.status === "legacy" && <p className="mt-0.5 text-[9px] text-amber-400">Legacy · {lifecycle.replacement ? `reemplazo: ${lifecycle.replacement}` : "compatibilidad"}</p>}</td>{MODULE_ACTIONS.map((action) => <td key={action.key} className="p-3 text-center"><button type="button" onClick={() => toggleModulePermission(module.id, action.key)} className={`h-6 w-6 rounded-md border ${form.module_permissions[module.id]?.[action.key] ? "border-emerald-400 bg-emerald-400" : "border-zinc-600 bg-zinc-800"}`}>{form.module_permissions[module.id]?.[action.key] && <Check size={13} className="mx-auto text-zinc-950" />}</button></td>)}</tr>; })}</tbody></table></div>}
            </section>
          )}

          <section className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div><p className="text-xs font-bold text-white">Rol disponible</p><p className="mt-0.5 text-[10px] text-zinc-600">Si lo desactivás no podrá asignarse a nuevos usuarios.</p></div>
            <button type="button" onClick={() => setF("active", !form.active)} className={`relative h-6 w-11 rounded-full ${form.active ? "bg-emerald-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`} /></button>
          </section>

          <footer className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white">Cancelar</button><button onClick={handleSave} disabled={saving} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">{saving ? "Guardando…" : existingRole ? "Guardar cambios" : "Crear rol"}</button></footer>
        </div>
      </div>
    </div>
  );
}