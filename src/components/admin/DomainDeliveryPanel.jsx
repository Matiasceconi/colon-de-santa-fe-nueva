import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Circle, ExternalLink, Globe2, Loader2, Save, ShieldCheck } from "lucide-react";

const CHECKS = [
  ["admin_created", "Administrador principal del club creado"],
  ["limited_user_tested", "Usuario con permisos limitados probado"],
  ["player_tested", "Ingreso de jugador probado"],
  ["password_tested", "Recuperación de contraseña probada"],
  ["domain_https", "Dominio y HTTPS verificados"],
  ["no_test_data", "Datos de prueba revisados o eliminados"],
];

export default function DomainDeliveryPanel() {
  const { institutionProfile, reloadInstitutionProfile } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    application_url: "",
    custom_domain: "",
    domain_status: "pendiente",
    client_admin_name: "",
    client_admin_email: "",
    delivery_notes: "",
    delivery_checklist: {},
    handoff_ready: false,
  });

  useEffect(() => {
    if (!institutionProfile) return;
    setForm({
      application_url: institutionProfile.application_url || "",
      custom_domain: institutionProfile.custom_domain || "",
      domain_status: institutionProfile.domain_status || "pendiente",
      client_admin_name: institutionProfile.client_admin_name || "",
      client_admin_email: institutionProfile.client_admin_email || "",
      delivery_notes: institutionProfile.delivery_notes || "",
      delivery_checklist: institutionProfile.delivery_checklist || {},
      handoff_ready: !!institutionProfile.handoff_ready,
    });
  }, [institutionProfile]);

  const completed = useMemo(() => CHECKS.filter(([key]) => form.delivery_checklist?.[key]).length, [form.delivery_checklist]);
  const allChecked = completed === CHECKS.length;

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCheck(key) {
    setForm((current) => ({
      ...current,
      delivery_checklist: {
        ...(current.delivery_checklist || {}),
        [key]: !current.delivery_checklist?.[key],
      },
    }));
  }

  async function save(markReady = false) {
    if (!institutionProfile?.id) {
      toast({ title: "Primero configurá la información del club", variant: "destructive" });
      return;
    }
    if (!form.application_url.trim()) {
      toast({ title: "Ingresá la URL pública de esta copia", variant: "destructive" });
      return;
    }
    if (markReady && !allChecked) {
      toast({ title: "Faltan controles de entrega", description: "Completá los seis controles antes de marcar la copia como lista.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.InstitutionProfile.update(institutionProfile.id, {
        ...form,
        setup_owner_email: user?.email || "",
        handoff_ready: markReady ? true : form.handoff_ready,
        handoff_at: markReady ? now : institutionProfile.handoff_at || null,
        updated_at: now,
      });
      setForm((current) => ({ ...current, handoff_ready: markReady ? true : current.handoff_ready }));
      await reloadInstitutionProfile?.();
      toast({ title: markReady ? "✓ Copia marcada como lista para entregar" : "✓ Datos de dominio guardados" });
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-blue-500";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Globe2 size={19} className="text-blue-400" /> Dominio y entrega</h2>
        <p className="mt-1 text-sm text-zinc-500">Registrá el dominio elegido, el responsable del club y la prueba final de esta copia.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-zinc-400">URL pública completa de esta copia *</span>
          <input type="url" className={inputClass} value={form.application_url} onChange={(e) => set("application_url", e.target.value)} placeholder="https://app.nombreclub.com" />
          <span className="block text-[10px] text-zinc-600">Los correos de invitación usarán exclusivamente esta dirección para abrir la creación de contraseña.</span>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400">Dominio o subdominio del club</span>
          <input className={inputClass} value={form.custom_domain} onChange={(e) => set("custom_domain", e.target.value)} placeholder="app.nombreclub.com" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400">Estado del dominio</span>
          <select className={inputClass} value={form.domain_status} onChange={(e) => set("domain_status", e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="dns_pendiente">Esperando configuración DNS</option>
            <option value="verificando">Verificando</option>
            <option value="activo">Activo con HTTPS</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400">Administrador responsable del club</span>
          <input className={inputClass} value={form.client_admin_name} onChange={(e) => set("client_admin_name", e.target.value)} placeholder="Nombre y apellido" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-400">Email del administrador</span>
          <input type="email" className={inputClass} value={form.client_admin_email} onChange={(e) => set("client_admin_email", e.target.value)} placeholder="administrador@club.com" />
        </label>
        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-zinc-400">Notas de entrega</span>
          <textarea className="min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" value={form.delivery_notes} onChange={(e) => set("delivery_notes", e.target.value)} placeholder="Proveedor del dominio, fecha estimada, observaciones..." />
        </label>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs leading-5 text-blue-100/75 md:col-span-2">
          <p className="font-bold text-blue-200">Configuración externa en Base44</p>
          <p className="mt-1">Después de guardar el dominio deseado, abrí la copia del club en Base44 → Settings → Domains. Agregá el dominio y copiá los registros DNS exactamente como los indique Base44.</p>
          <span className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-300"><ExternalLink size={12} /> Este paso se realiza una vez por cada copia</span>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-white"><ShieldCheck size={18} className="text-emerald-400" /> Control final</h3>
            <p className="mt-1 text-xs text-zinc-500">{completed}/{CHECKS.length} controles completados</p>
          </div>
          {form.handoff_ready && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">Lista para entregar</span>}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {CHECKS.map(([key, label]) => {
            const checked = !!form.delivery_checklist?.[key];
            return (
              <button key={key} type="button" onClick={() => toggleCheck(key)} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-left text-sm text-zinc-300 hover:border-zinc-700">
                {checked ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : <Circle size={18} className="shrink-0 text-zinc-600" />}
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={() => save(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
        </button>
        <button onClick={() => save(true)} disabled={saving || !allChecked} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40">
          <CheckCircle2 size={15} /> Marcar lista para entregar
        </button>
      </div>
    </div>
  );
}
