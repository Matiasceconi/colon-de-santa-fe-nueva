import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardList, FileSpreadsheet,
  IdCard, Lock, ShieldCheck, UserPlus
} from "lucide-react";

const manualSteps = [
  "Seleccioná el plantel correcto en el selector superior.",
  "Entrá en Jugadores y presioná “Nuevo jugador”.",
  "Completá nombre, apellido, DNI, fecha de nacimiento, posición y estado.",
  "Guardá. El jugador quedará vinculado al plantel seleccionado.",
];

const excelSteps = [
  "Entrá en Jugadores y presioná “Importar Excel”.",
  "Descargá la plantilla y conservá exactamente los nombres de las columnas.",
  "Completá una fila por jugador. DNI, apellido, nombre y posición son obligatorios.",
  "Elegí el plantel de destino, subí el archivo y revisá el resumen de la importación.",
];

const portalSteps = [
  "En Accesos de jugadores, elegí el plantel y revisá que nadie figure “Falta DNI”.",
  "Compartí con el plantel el enlace de Ingreso del jugador.",
  "Cada jugador ingresa únicamente con su DNI, sin puntos ni espacios.",
  "Primero completa el Wellness; después responde el RPE cuando haya una sesión pendiente.",
  "En el mismo portal verá el cronograma del día y los trabajos complementarios asignados.",
];

function StepList({ items }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-300">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">{index + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function PlayerGuide() {
  const { isAdmin } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const playerUrl = `${window.location.origin}/ingreso-jugador`;

  async function copyPortalUrl() {
    await navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center text-center">
        <div><Lock className="mx-auto mb-3 text-zinc-600" /><p className="text-sm text-zinc-500">Guía reservada para administradores.</p></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400"><BookOpen size={15} /> Guía de jugadores</p>
            <h1 className="mt-2 text-2xl font-black text-white">Crear el plantel y habilitar el portal</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Usá uno de los dos métodos de carga y terminá verificando el acceso por DNI. El DNI debe ser único y es el dato que vincula al jugador con Wellness, RPE y cronograma.</p>
          </div>
          <Link to="/players" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-zinc-200">Ir a Jugadores <ArrowRight size={16} /></Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><UserPlus size={22} /></div>
          <h2 className="mt-4 font-black text-white">Opción 1 · Alta manual</h2>
          <p className="mt-1 text-xs text-zinc-500">Ideal para uno o pocos jugadores.</p>
          <StepList items={manualSteps} />
          <Link to="/players" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300">Abrir alta manual <ArrowRight size={14} /></Link>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><FileSpreadsheet size={22} /></div>
          <h2 className="mt-4 font-black text-white">Opción 2 · Importar Excel</h2>
          <p className="mt-1 text-xs text-zinc-500">Ideal para cargar el plantel completo.</p>
          <StepList items={excelSteps} />
          <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-5 text-cyan-100/75">Columnas: DNI, APELLIDO, NOMBRE, FECHA DE NACIMIENTO, POSICION, CATEGORIA y NUMERO.</div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><IdCard size={22} /></div>
          <h2 className="mt-4 font-black text-white">Ingreso del jugador</h2>
          <p className="mt-1 text-xs text-zinc-500">Acceso móvil diario mediante DNI.</p>
          <StepList items={portalSteps} />
          <div className="mt-5 space-y-2">
            <button onClick={copyPortalUrl} className="w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-black text-zinc-950 hover:bg-emerald-400">{copied ? "Enlace copiado" : "Copiar enlace del portal"}</button>
            <Link to="/player-access" className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800">Revisar accesos <ArrowRight size={14} /></Link>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="flex items-center gap-2 font-black text-amber-200"><ShieldCheck size={19} /> Control antes de entregar el acceso</h2>
        <div className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
          {[
            "El jugador pertenece al plantel correcto.",
            "El DNI está cargado solo con números y no está repetido.",
            "El jugador figura activo y “Listo para activar” o “Acceso activo”.",
            "Hay actividades publicadas en el calendario para ese plantel.",
            "La sesión del día está creada para que aparezca el RPE.",
            "Se hizo una prueba desde un teléfono en modo incógnito.",
          ].map((item) => <div key={item} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /><span>{item}</span></div>)}
        </div>
      </section>

      <aside className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <ClipboardList className="shrink-0 text-zinc-400" size={20} />
        <div>
          <h3 className="font-bold text-white">Qué verá el jugador</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Cronograma del día, Wellness, RPE pendientes y entrenamientos complementarios. El RPE se habilita cuando existe una sesión asignada; si no aparece, primero revisá la sesión y el plantel del jugador.</p>
        </div>
      </aside>
    </div>
  );
}
