import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Copy, FileText, Save, Truck } from "lucide-react";
import { createBrandedPdf, buildExportFileName } from "@/lib/exports/pdfExportKit";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import moment from "moment";

import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";

const EMPTY_LOGISTICS = {
  match_info_date: "",
  match_info_time: "",
  stadium: "",
  address: "",
  locality: "",
  map_link: "",
  presentation_time: "",
  presentation_place: "",
  required_equipment: "",
  items_to_bring: "",
  squad_observations: "",
  transport_type: "",
  departure_place: "",
  departure_time: "",
  arrival_time: "",
  transport_company: "",
  transport_responsible: "",
  transport_observations: "",
  concentration_required: false,
  concentration_hotel: "",
  concentration_address: "",
  concentration_check_in: "",
  concentration_check_out: "",
  room_distribution: "",
  breakfast_time: "",
  lunch_time: "",
  snack_time: "",
  dinner_time: "",
  meal_place: "",
  nutrition_observations: "",
  trip_responsible: "",
  trip_phone: "",
  kit_manager: "",
  doctor_physio: "",
  emergency_contact: "",
};

function parseLogistics(value) {
  if (!value) return EMPTY_LOGISTICS;
  try {
    const parsed = JSON.parse(value);
    return { ...EMPTY_LOGISTICS, ...(parsed || {}) };
  } catch {
    return EMPTY_LOGISTICS;
  }
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

export default function LogisticaTab({ match, onMatchUpdated, onRegisterSave }) {
  const { toast } = useToast();
  const { clubBrand, can } = useWorkspace();
  const clubName = (clubBrand?.name || "Club").toUpperCase();
  const saveTimer = useRef(null);
  const hydratingRef = useRef(true);
  const [form, setForm] = useState(EMPTY_LOGISTICS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    hydratingRef.current = true;
    setForm(parseLogistics(match.match_logistics));
    setDirty(false);
    setLastSavedAt(null);
    const timer = setTimeout(() => {
      hydratingRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [match.id, match.match_logistics]);

  async function persistLogistics(nextForm = form) {
    setSaving(true);
    try {
      const patch = {
        match_logistics: JSON.stringify(nextForm),
        match_time: nextForm.match_info_time || match.match_time || null,
        match_venue: nextForm.stadium || match.match_venue || null,
      };
      await base44.entities.MatchReport.update(match.id, patch);
      onMatchUpdated?.(patch);
      setDirty(false);
      setLastSavedAt(new Date());
    } catch {
      toast({ title: "No se pudo guardar la logística", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (hydratingRef.current) return;
    setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistLogistics(form);
    }, 900);
    return () => clearTimeout(saveTimer.current);
  }, [form]);

  useEffect(() => {
    onRegisterSave?.({
      action: async () => {
        clearTimeout(saveTimer.current);
        await persistLogistics(form);
        toast({ title: "Logística guardada" });
      },
      disabled: saving,
      pending: dirty,
      label: "logística",
    });
  }, [dirty, form, onRegisterSave, saving]);

  function patchField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function copyPreviousLogistics() {
    try {
      const rows = await base44.entities.MatchReport.list("-date", 200);
      const previous = rows.find((item) => item.id !== match.id && item.squad_id === match.squad_id && item.match_logistics && moment(item.date).isBefore(match.date));
      if (!previous) {
        toast({ title: "No hay un partido anterior con logística cargada", variant: "destructive" });
        return;
      }
      const next = parseLogistics(previous.match_logistics);
      setForm(next);
      toast({ title: "Se copió la logística del partido anterior" });
    } catch {
      toast({ title: "No se pudo copiar la logística", variant: "destructive" });
    }
  }

  const whatsappSummary = useMemo(() => {
    const lines = [
      `${clubName} VS ${match.rival || "RIVAL"}`,
      (form.match_info_date || match.date) ? `Fecha: ${form.match_info_date || moment(match.date).format("DD/MM/YYYY")}` : null,
      form.match_info_time ? `Horario del partido: ${form.match_info_time}` : null,
      form.presentation_time ? `Citación: ${form.presentation_time}` : null,
      form.presentation_place ? `Lugar: ${form.presentation_place}` : null,
      form.departure_time || form.departure_place ? `Salida: ${[form.departure_time, form.departure_place ? `desde ${form.departure_place}` : ""].filter(Boolean).join(" ")}` : null,
      form.required_equipment ? `Indumentaria: ${form.required_equipment}` : null,
      form.squad_observations ? `Observaciones: ${form.squad_observations}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  }, [form, match.date, match.rival, clubName]);

  async function copyWhatsappSummary() {
    try {
      await navigator.clipboard.writeText(whatsappSummary);
      toast({ title: "Resumen copiado para WhatsApp" });
    } catch {
      toast({ title: "No se pudo copiar el resumen", variant: "destructive" });
    }
  }

  async function exportPdf() {
    try {
      assertExportAllowed(can, "/matches");
      const pdf = await createBrandedPdf({brand:clubBrand,title:"Itinerario logístico",subtitle:clubName+" vs. "+(match.rival||"Rival"),meta:[match.squad_name,form.match_info_date||match.date].filter(Boolean)});
      const labels = {"match_info_date":"Fecha","match_info_time":"Horario","stadium":"Estadio","address":"Dirección","locality":"Localidad","map_link":"Mapa","presentation_time":"Citación","presentation_place":"Lugar de citación","required_equipment":"Indumentaria","items_to_bring":"Elementos a llevar","squad_observations":"Observaciones del plantel","transport_type":"Tipo de traslado","departure_place":"Salida desde","departure_time":"Hora de salida","arrival_time":"Llegada","transport_company":"Empresa de transporte","transport_responsible":"Responsable del traslado","transport_observations":"Observaciones del traslado","concentration_required":"Concentración","concentration_hotel":"Hotel","concentration_address":"Dirección del hotel","concentration_check_in":"Check-in","concentration_check_out":"Check-out","room_distribution":"Habitaciones","breakfast_time":"Desayuno","lunch_time":"Almuerzo","snack_time":"Merienda","dinner_time":"Cena","meal_place":"Lugar de comidas","nutrition_observations":"Observaciones nutricionales","trip_responsible":"Responsable del viaje","trip_phone":"Teléfono","kit_manager":"Utilero","doctor_physio":"Médico / Fisio","emergency_contact":"Emergencia"};
      const values={...form,match_info_date:form.match_info_date||match.date,match_info_time:form.match_info_time||match.match_time,stadium:form.stadium||match.match_venue};
      for(const [key,label] of Object.entries(labels)) {
        if(key!=="concentration_required" && !values[key])continue;
        if(key.startsWith("concentration_")&&key!=="concentration_required"&&!values.concentration_required)continue;
        if(key==="room_distribution"&&!values.concentration_required)continue;
        pdf.paragraph(label+": "+(key==="concentration_required"?(values[key]?"Sí":"No"):values[key]));
      }
      pdf.finalize().save(buildExportFileName("Itinerario",[clubBrand?.name,match.squad_name,values.match_info_date,match.rival]));
    } catch(error) { toast({title:error.message||"No se pudo generar el itinerario",variant:"destructive"}); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Truck size={16} className="text-yellow-400" /> Logística del partido</h2>
            <p className="mt-1 text-xs text-zinc-500">La logística se guarda automáticamente en la ficha del partido.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyPreviousLogistics} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 transition hover:bg-zinc-700"><Copy size={13} className="mr-1 inline" /> Copiar logística del partido anterior</button>
            <button onClick={copyWhatsappSummary} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20"><Clipboard size={13} className="mr-1 inline" /> Copiar resumen para WhatsApp</button>
            <button onClick={exportPdf} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 transition hover:bg-yellow-500/20"><FileText size={13} className="mr-1 inline" /> Exportar itinerario PDF</button>
            <button onClick={() => persistLogistics(form)} disabled={saving} className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} className="mr-1 inline" /> {saving ? "Guardando..." : "Guardar ahora"}</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">Estado: {saving ? "Guardando..." : dirty ? "Cambios pendientes" : "Sin cambios pendientes"}</span>
          {lastSavedAt && <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">Último guardado: {moment(lastSavedAt).format("HH:mm:ss")}</span>}
        </div>
      </div>

      <Section title="Información del partido" description="Datos base del encuentro y sede.">
        <Field label="Fecha del partido"><input type="date" value={form.match_info_date} onChange={(e) => patchField("match_info_date", e.target.value)} className="input-dark" /></Field>
        <Field label="Hora del partido"><input type="time" value={form.match_info_time} onChange={(e) => patchField("match_info_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Estadio / sede"><input value={form.stadium} onChange={(e) => patchField("stadium", e.target.value)} className="input-dark" /></Field>
        <Field label="Dirección"><input value={form.address} onChange={(e) => patchField("address", e.target.value)} className="input-dark" /></Field>
        <Field label="Localidad"><input value={form.locality} onChange={(e) => patchField("locality", e.target.value)} className="input-dark" /></Field>
        <Field label="Link de mapa"><input value={form.map_link} onChange={(e) => patchField("map_link", e.target.value)} className="input-dark" /></Field>
      </Section>

      <Section title="Citación" description="Presentación del plantel e indicaciones previas.">
        <Field label="Horario de citación"><input type="time" value={form.presentation_time} onChange={(e) => patchField("presentation_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Lugar de citación"><input value={form.presentation_place} onChange={(e) => patchField("presentation_place", e.target.value)} className="input-dark" /></Field>
        <Field label="Indumentaria requerida" className="md:col-span-2"><input value={form.required_equipment} onChange={(e) => patchField("required_equipment", e.target.value)} className="input-dark" /></Field>
        <Field label="Elementos a llevar" className="md:col-span-2"><textarea rows={3} value={form.items_to_bring} onChange={(e) => patchField("items_to_bring", e.target.value)} className="input-dark min-h-[96px] resize-none" /></Field>
        <Field label="Observaciones del plantel" className="md:col-span-2"><textarea rows={3} value={form.squad_observations} onChange={(e) => patchField("squad_observations", e.target.value)} className="input-dark min-h-[96px] resize-none" /></Field>
      </Section>

      <Section title="Traslado" description="Información de salida, llegada y responsable del viaje.">
        <Field label="Tipo de traslado"><input value={form.transport_type} onChange={(e) => patchField("transport_type", e.target.value)} className="input-dark" /></Field>
        <Field label="Lugar de salida"><input value={form.departure_place} onChange={(e) => patchField("departure_place", e.target.value)} className="input-dark" /></Field>
        <Field label="Hora de salida"><input type="time" value={form.departure_time} onChange={(e) => patchField("departure_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Hora estimada de llegada"><input type="time" value={form.arrival_time} onChange={(e) => patchField("arrival_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Empresa de transporte"><input value={form.transport_company} onChange={(e) => patchField("transport_company", e.target.value)} className="input-dark" /></Field>
        <Field label="Responsable"><input value={form.transport_responsible} onChange={(e) => patchField("transport_responsible", e.target.value)} className="input-dark" /></Field>
        <Field label="Observaciones" className="md:col-span-2"><textarea rows={3} value={form.transport_observations} onChange={(e) => patchField("transport_observations", e.target.value)} className="input-dark min-h-[96px] resize-none" /></Field>
      </Section>

      <Section title="Concentración" description="Datos de hotel, check-in y distribución.">
        <Field label="¿Hay concentración?">
          <select value={form.concentration_required ? "si" : "no"} onChange={(e) => patchField("concentration_required", e.target.value === "si")} className="input-dark">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </Field>
        <Field label="Hotel"><input value={form.concentration_hotel} onChange={(e) => patchField("concentration_hotel", e.target.value)} className="input-dark" disabled={!form.concentration_required} /></Field>
        <Field label="Dirección"><input value={form.concentration_address} onChange={(e) => patchField("concentration_address", e.target.value)} className="input-dark" disabled={!form.concentration_required} /></Field>
        <Field label="Check-in"><input type="datetime-local" value={form.concentration_check_in} onChange={(e) => patchField("concentration_check_in", e.target.value)} className="input-dark" disabled={!form.concentration_required} /></Field>
        <Field label="Check-out"><input type="datetime-local" value={form.concentration_check_out} onChange={(e) => patchField("concentration_check_out", e.target.value)} className="input-dark" disabled={!form.concentration_required} /></Field>
        <Field label="Distribución de habitaciones" className="md:col-span-2"><textarea rows={3} value={form.room_distribution} onChange={(e) => patchField("room_distribution", e.target.value)} className="input-dark min-h-[96px] resize-none" disabled={!form.concentration_required} /></Field>
      </Section>

      <Section title="Alimentación" description="Horarios y observaciones nutricionales.">
        <Field label="Desayuno"><input type="time" value={form.breakfast_time} onChange={(e) => patchField("breakfast_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Almuerzo"><input type="time" value={form.lunch_time} onChange={(e) => patchField("lunch_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Merienda"><input type="time" value={form.snack_time} onChange={(e) => patchField("snack_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Cena"><input type="time" value={form.dinner_time} onChange={(e) => patchField("dinner_time", e.target.value)} className="input-dark" /></Field>
        <Field label="Lugar"><input value={form.meal_place} onChange={(e) => patchField("meal_place", e.target.value)} className="input-dark" /></Field>
        <Field label="Observaciones nutricionales" className="md:col-span-2"><textarea rows={3} value={form.nutrition_observations} onChange={(e) => patchField("nutrition_observations", e.target.value)} className="input-dark min-h-[96px] resize-none" /></Field>
      </Section>

      <Section title="Contactos" description="Referentes del viaje y números importantes.">
        <Field label="Responsable del viaje"><input value={form.trip_responsible} onChange={(e) => patchField("trip_responsible", e.target.value)} className="input-dark" /></Field>
        <Field label="Teléfono"><input value={form.trip_phone} onChange={(e) => patchField("trip_phone", e.target.value)} className="input-dark" /></Field>
        <Field label="Utilero"><input value={form.kit_manager} onChange={(e) => patchField("kit_manager", e.target.value)} className="input-dark" /></Field>
        <Field label="Médico / fisio"><input value={form.doctor_physio} onChange={(e) => patchField("doctor_physio", e.target.value)} className="input-dark" /></Field>
        <Field label="Contacto de emergencia" className="md:col-span-2"><input value={form.emergency_contact} onChange={(e) => patchField("emergency_contact", e.target.value)} className="input-dark" /></Field>
      </Section>

      <style>{`.input-dark{width:100%;border-radius:0.75rem;border:1px solid rgb(63 63 70);background:rgb(24 24 27);padding:0.625rem 0.875rem;font-size:0.875rem;color:white;outline:none}.input-dark:focus{border-color:rgb(250 204 21)}.input-dark:disabled{opacity:.55;cursor:not-allowed}`}</style>
    </div>
  );
}