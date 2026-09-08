import React from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Lock, BookOpen, ShieldCheck, UserPlus, Globe2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";

const sections = [
  { icon: Copy, title: "1. Crear la instancia del cliente", items: ["Clonar exclusivamente desde Software Base.", "Asignar un nombre interno claro: PerformancePitch · Nombre del club.", "Verificar que no existan jugadores, sesiones, partidos ni usuarios heredados.", "Mantener una app y una base de datos separadas para cada club."] },
  { icon: ShieldCheck, title: "2. Configurar identidad y estructura", items: ["Cargar nombre oficial, escudo, colores, zona horaria y temporada.", "Crear los planteles que realmente utilizará el club.", "Definir un plantel predeterminado solo cuando corresponda.", "Revisar que exportaciones y portal del jugador utilicen la identidad correcta."] },
  { icon: UserPlus, title: "3. Administradores, roles e invitaciones", items: ["Crear un administrador principal y uno de respaldo.", "Usar roles por función: técnico, preparador físico, médico, nutrición, analista y dirigente.", "Asignar áreas, páginas, acciones y planteles con criterio de mínimo acceso.", "Invitar desde Usuarios y Accesos; nunca habilitar registro público.", "Dar de baja el acceso al finalizar la relación laboral, sin borrar el historial deportivo."] },
  { icon: Globe2, title: "4. Dominio propio", items: ["Definir el subdominio del club, por ejemplo app.club.com.", "Agregar el dominio en la configuración de publicación de Base44.", "Copiar exactamente los registros DNS que indique Base44 en el proveedor del dominio.", "Eliminar registros anteriores que apunten a una página en construcción solo después de validar el destino.", "Esperar propagación y comprobar HTTPS, acceso staff, acceso jugador y recuperación de contraseña."] },
  { icon: CheckCircle2, title: "5. Prueba de entrega", items: ["Ingresar como administrador y completar la puesta en marcha.", "Probar un usuario limitado de cada área y confirmar que no vea módulos ajenos.", "Probar selección de plantel con usuarios de uno y varios planteles.", "Probar un jugador real de ensayo y luego eliminar o desactivar ese acceso.", "Documentar dominio, administradores, fecha de entrega y responsable del club."] },
];

export default function ImplementationGuide() {
  const { isAdmin } = useWorkspace();
  if (!isAdmin) return <div className="flex h-64 items-center justify-center text-center"><div><Lock className="mx-auto mb-3 text-zinc-600" /><p className="text-sm text-zinc-500">Guía reservada para administradores.</p></div></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><BookOpen size={22} /></span><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Centro de implementación</p><h1 className="text-2xl font-black text-white">Guía para configurar y entregar un club</h1></div></div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">Este documento guía al administrador de la copia. El modelo recomendado es una instancia independiente por club: dominio, usuarios y datos separados.</p>
        <Link to="/setup" className="mt-5 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-cyan-400">Volver a la puesta en marcha</Link>
      </header>

      <div className="grid gap-4">
        {sections.map(({ icon: Icon, title, items }) => (
          <section key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="flex items-center gap-3 font-bold text-white"><Icon size={19} className="text-blue-400" /> {title}</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-400 md:grid-cols-2">
              {items.map(item => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />{item}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <aside className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
        <AlertTriangle className="shrink-0 text-amber-400" size={21} />
        <div><h3 className="font-bold text-amber-200">No entregar una copia con datos de prueba</h3><p className="mt-1 text-sm leading-6 text-amber-100/65">Antes de invitar al cliente, revisar jugadores, staff, GPS, evaluaciones, informes, archivos, partidos y registros de demo. La clonación separa instancias futuras, pero todo dato presente en la plantilla puede copiarse.</p></div>
      </aside>
    </div>
  );
}
