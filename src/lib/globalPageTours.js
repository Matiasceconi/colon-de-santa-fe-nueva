// Tutoriales globales para las páginas operativas que no montan una guía contextual propia.
// Las guías describen la lógica real de cada módulo y sus subpáginas sin modificar datos.

const intro = (title, text) => ({ title, text, placement: "center" });
const content = (title, text) => ({ selector: '[data-tour="global-page-content"]', title, text, placement: "top" });

export const GLOBAL_PAGE_TOURS = {
  "/dashboard": [
    intro("Tablero del Cuerpo Técnico", "Es la lectura operativa del día para el plantel seleccionado. Resume agenda, disponibilidad, sesión, partido y pendientes sin reemplazar a los módulos de origen."),
    content("1. Empezá por el contexto del día", "Confirmá plantel y fecha. Las tarjetas priorizan lo que el cuerpo técnico necesita resolver hoy y enlazan con Sesiones, Partidos, Calendario y estado del plantel."),
    content("2. Entrá al dato de origen", "Usá el tablero como puerta de entrada. Si necesitás corregir una sesión, un partido o un estado, hacelo en el módulo correspondiente para conservar una sola fuente de verdad."),
    intro("Regla del tablero", "El tablero consulta y resume. Sesiones y Partidos gobiernan la operación; el resto de PerformancePitch se conecta a esas dos fuentes."),
  ],
  "/performance/dashboard": [
    intro("Tablero de Rendimiento", "Integra carga externa, carga interna, minutos, evaluaciones y disponibilidad para detectar qué merece atención. No diagnostica lesiones ni reemplaza el criterio profesional."),
    content("1. Leé el contexto antes del indicador", "Confirmá plantel, temporada y período. Los widgets cruzan fuentes distintas; un valor aislado nunca debe interpretarse sin fecha, exposición y disponibilidad."),
    content("2. Abrí el módulo que explica el dato", "Las alertas y resúmenes sirven para priorizar. GPS se revisa en Carga externa, Wellness/RPE en Carga interna, fuerza en Evaluaciones y exposición competitiva en Minutos."),
    intro("Lectura integrada, fuentes separadas", "PerformancePitch combina información para decidir qué mirar, pero cada módulo conserva su dato canónico y su trazabilidad."),
  ],
  "/gps": [
    intro("Carga externa / GPS", "Este módulo reúne la lectura de sesiones y partidos. La carga manual por CSV es el núcleo; Catapult u otros proveedores pueden agregarse como adaptadores opcionales."),
    content("1. Elegí el nivel de análisis", "Podés pasar de la visión general a una sesión, un jugador o una tarea. El informe parte del registro canónico importado y evita mantener versiones paralelas del mismo GPS."),
    content("2. Compará con referencias configuradas", "Las referencias pueden ser competitivas, por MD, individuales, posicionales o de plantel. Los objetivos son independientes de la referencia y se administran desde Configuración."),
    content("3. Usá gráficos y exportables", "Ordená métricas, fijá gráficos del plantel y exportá el informe cuando la carga esté validada. Los datos no reconocidos deben resolverse antes de sacar conclusiones."),
    intro("Una importación, varios niveles de lectura", "SessionGPSData es la fuente canónica: Sesión → Jugador → Tarea. Las integraciones futuras deben escribir sobre esa misma lógica."),
  ],
  "/performance/external-load": [
    intro("Carga externa / GPS", "Esta ruta conserva compatibilidad con el módulo GPS. El flujo recomendado es trabajar desde Carga externa / GPS y mantener una sola importación canónica por sesión o partido."),
    content("Qué hacer acá", "Revisá sesiones, jugadores, tareas, referencias y reportes. Si el club no tiene integración con un proveedor, el flujo CSV debe seguir funcionando completo."),
  ],
  "/performance/microcycle-history": [
    intro("Historial de microciclos", "Permite revisar semanas anteriores y comparar cómo se distribuyeron volumen, intensidad y exposición neuromuscular alrededor del partido."),
    content("1. Elegí microciclo y plantel", "La comparación tiene sentido cuando las sesiones están correctamente vinculadas a su plantel, temporada y código MD."),
    content("2. Volvé a la sesión para corregir", "Este historial es una lectura agregada. Si detectás un dato incorrecto, corregí la sesión o la fuente GPS original en lugar de modificar el resumen."),
  ],
  "/performance/internal-load": [
    intro("Carga interna", "La página se organiza en Wellness diario, RPE por sesión, Evolución y Accesos de jugadores. Wellness describe el estado previo; RPE registra la percepción posterior a la carga."),
    content("1. Wellness diario", "Controlá respuestas y faltantes del día. La disponibilidad del cuestionario debe relacionarse con el cronograma y no generar respuestas duplicadas."),
    content("2. RPE por sesión", "El RPE se vincula a una TrainingSession concreta. Así la percepción del jugador puede cruzarse con duración, GPS y planificación sin crear otra sesión."),
    content("3. Evolución", "Usá tendencias para ver cambios en el tiempo, siempre revisando adherencia y contexto. Un valor alto o bajo aislado no constituye un diagnóstico."),
    content("4. Accesos de jugadores", "Desde esta subpágina verificás que los jugadores puedan ingresar al portal y responder. Los accesos de staff se administran por separado en Usuarios y accesos."),
  ],
  "/evaluations": [
    intro("Evaluaciones", "Centraliza baterías de fuerza y rendimiento con una estructura común. La página separa Resumen, Fechas, Análisis del plantel, Jugadores, Importaciones y Configuración."),
    content("1. Resumen y Fechas", "Primero validá cuándo se evaluó, qué tests entraron y cuántos jugadores tienen batería completa. Las fechas son la unidad correcta para comparar mediciones."),
    content("2. Análisis del plantel", "Compará distribución, asimetrías y evolución del grupo usando métricas disponibles. PerformancePitch debe mostrar calidad de muestra y evitar transformar automáticamente una diferencia en diagnóstico."),
    content("3. Jugadores", "Entrá al historial individual para ver resultados, baselines y evolución. Los nombres deben estar vinculados al Player oficial antes de consolidar comparaciones."),
    content("4. Importaciones y Configuración", "Los administradores pueden revisar lotes, resolver pendientes y configurar fuentes/tests. El flujo manual debe permanecer disponible aunque no exista VALD u otro proveedor."),
  ],
  "/complementary-strength": [
    intro("Planes de fuerza complementaria", "El módulo se divide en Hoy, Nuevo plan, Plantillas, Planes activos e Historial. Sirve para prescribir y seguir trabajo individual complementario."),
    content("1. Hoy", "Concentrá lo que cada jugador tiene que realizar en la fecha. Un plan publicado debe mostrar objetivo, instrucciones y ejercicios sin necesidad de reconstruirlo cada día."),
    content("2. Nuevo plan y Plantillas", "Podés crear un plan individual desde cero o reutilizar una plantilla. La plantilla acelera el armado, pero el plan del jugador conserva su propia versión."),
    content("3. Activos e Historial", "Los planes publicados permanecen activos hasta cerrarse. El historial conserva lo realizado y evita perder trazabilidad al crear una versión nueva."),
  ],
  "/performance/minutes": [
    intro("Minutos jugados", "MatchPlayerMinutes es la fuente oficial de exposición competitiva. La página combina minutos de partidos del plantel y, cuando corresponde, cargas manuales de jugadores de Reserva que participaron en Juveniles."),
    content("1. Minutos oficiales", "Filtrá por plantel, temporada, competencia, fecha o jugador. Los minutos deben provenir de un MatchReport existente y respetar la duración real del partido."),
    content("2. Agregar minutos manualmente", "Elegí partido existente, jugador, rol y minutos. Si ya hay registro para ese partido/jugador se actualiza el canónico; no se crea un partido paralelo."),
    content("3. Reserva en Juveniles", "La subpágina específica registra esa exposición manual sin alterar convocatorias ni minutos oficiales de Reserva. Es una capa de exposición adicional, no otro partido del plantel."),
    intro("No usar GPS como minuto oficial automático", "El GPS puede sugerir exposición, pero el minuto competitivo oficial requiere confirmación del staff y queda trazado en MatchPlayerMinutes."),
  ],
  "/performance/medical": [
    intro("Área médica", "Registra episodios médicos y el estado actual del jugador. Puede funcionar completamente en modo manual; una planilla externa es una fuente opcional, no obligatoria."),
    content("1. Episodio médico", "La lesión o consulta se documenta una vez y se vincula al Player oficial. Fechas, estado, observaciones y tratamiento deben conservar el origen y las ediciones manuales."),
    content("2. Estado actual", "El módulo resume quién está lesionado, en recuperación, kinesiología, consulta o alta. Ese estado alimenta otras vistas sin que esas páginas creen diagnósticos paralelos."),
    content("3. Derivación a Kinesiología", "Cuando el caso requiere rehabilitación funcional, Kinesiología debe vincularse al episodio médico existente. El alta médica sigue perteneciendo al Área médica."),
  ],
  "/performance/kinesiology": [
    intro("Kinesiología / Retorno al equipo", "Documenta el proceso funcional desde un episodio médico existente. No crea diagnósticos ni altas paralelas."),
    content("1. Casos activos", "Seleccioná un jugador con episodio médico y seguí etapa, responsable, objetivos, restricciones y fecha objetivo. La progresión es siempre una decisión profesional manual."),
    content("2. Plan y sesiones kinésicas", "Dentro del caso registrá objetivos, criterios de progresión y cada sesión realizada. Esto permite compartir con PF qué está habilitado y qué sigue restringido."),
    content("3. Historial y cierre", "El historial conserva la evolución. Completar Kinesiología no equivale automáticamente a un alta médica; ambos procesos quedan relacionados pero separados."),
  ],
  "/performance/nutrition": [
    intro("Nutrición", "Centraliza evaluaciones antropométricas y seguimientos nutricionales. Puede cargarse manualmente o sincronizar una fuente externa sin depender de ella."),
    content("1. Validá jugador y fecha", "Cada medición debe quedar vinculada al Player oficial y a una fecha real. Los registros no reconocidos deben revisarse antes de usarse en tendencias."),
    content("2. Evolución", "Peso, pliegues y composición se interpretan en serie temporal. PerformancePitch conserva el valor original, el origen y las ediciones manuales para que el seguimiento sea auditable."),
    content("3. Manual primero", "Si se corta Drive o cambia la planilla, el equipo debe poder seguir cargando y consultando datos desde la app."),
  ],
  "/team": [
    intro("Staff / Cuerpo técnico", "Esta página describe quién integra el staff de cada plantel. La identidad profesional del StaffMember se separa de la autorización para entrar al sistema."),
    content("1. Elegí plantel", "Revisá qué personas pertenecen al cuerpo técnico, función y datos básicos. El mismo staff puede tener alcance distinto según el plantel."),
    content("2. No confundas staff con acceso", "Agregar una persona al staff no debería darle permisos automáticamente. El ingreso, rol y planteles autorizados se gestionan en Usuarios y accesos."),
  ],
  "/users-access": [
    intro("Usuarios y accesos", "La regla simple es Persona + Rol + Plantel = Acceso. UserAccess define estado y alcance; AppRole define qué puede hacer."),
    content("1. Revisá estado", "Filtrá activos, pendientes y suspendidos. Suspender conserva la historia y es preferible a borrar usuarios que ya realizaron acciones."),
    content("2. Asigná rol y plantel", "El rol contiene los permisos; el usuario recibe uno o más roles y los planteles donde puede trabajar. Evitá permisos individuales salvo excepciones avanzadas."),
    content("3. Administrador General protegido", "Los administradores de plataforma se reconocen por la autoridad de autenticación, no por un email hardcodeado en la interfaz, y no pueden ser degradados desde el flujo normal."),
  ],
  "/roles-permissions": [
    intro("Roles y permisos", "Los roles convierten la seguridad en perfiles reutilizables: Administrador del Club, DT, Rendimiento, Médico, Nutrición y otros."),
    content("1. Partí de roles predefinidos", "Usá permisos simples por módulo para el uso habitual. La matriz granular queda para personalizaciones reales, no para configurar cada usuario desde cero."),
    content("2. Permiso y módulo son dos capas", "Para ver una función, el módulo debe estar habilitado para el club y el rol debe tener permiso. Deshabilitar un módulo no elimina los datos históricos."),
    content("3. Protegé la administración", "Los roles administrativos requieren especial cuidado. Los usuarios de club no deben poder modificar al Administrador General de plataforma."),
  ],
  "/player-access": [
    intro("Accesos de jugadores", "El portal de jugadores es independiente del acceso de staff. Desde acá verificás quién puede entrar y compartir el acceso sin exponer datos sensibles en la URL."),
    content("1. Vinculación", "Cada acceso debe corresponder a un Player real. El documento funciona como identificador del flujo del jugador y nunca debe viajar como credencial visible en un enlace compartido."),
    content("2. Portal", "El jugador ve su cronograma y los formularios habilitados, como Wellness previo y RPE posterior. La disponibilidad depende de la lógica del día y de la sesión."),
  ],
  "/squad-manager": [
    intro("Planteles", "Squad define la estructura deportiva; SquadMembership conserva quién perteneció a cada plantel y en qué período."),
    content("1. Crear o editar planteles", "Definí nombre, temporada y estado. No codifiques Primera, Reserva o Juveniles en la lógica general: cada club debe poder crear su estructura."),
    content("2. Mover jugadores con historial", "Un cambio de plantel debe cerrar la membresía anterior y abrir la nueva. Evitá borrar relaciones históricas porque minutos, sesiones y evaluaciones dependen de ese contexto."),
    content("3. Desactivar antes que borrar", "Si un plantel deja de usarse, desactivalo. La historia de temporadas anteriores debe seguir disponible."),
  ],
  "/field-library": [
    intro("Biblioteca de Campo", "Guarda tareas reutilizables para acelerar la planificación de sesiones. La biblioteca es un recurso; la sesión sigue siendo la fuente de lo que realmente se hizo ese día."),
    content("Cómo usarla", "Buscá o filtrá una tarea, revisá objetivo, espacio, jugadores, duración y material visual, y agregala a una sesión. Una copia dentro de la sesión puede adaptarse sin reescribir el histórico de otras sesiones."),
  ],
  "/strength-library": [
    intro("Biblioteca de Fuerza", "Centraliza ejercicios reutilizables de gimnasio/campo con indicaciones y material visual."),
    content("Cómo usarla", "Creá una base común de ejercicios y reutilizala al armar cuadros de fuerza. El ejercicio de biblioteca no reemplaza las series, repeticiones, carga y contexto definidos en cada sesión."),
  ],
  "/matches": [
    intro("Partidos", "MatchReport es la unidad operativa de competencia. Desde la lista creás, vinculás o abrís cada partido sin duplicar el fixture integrado."),
    content("1. Revisá el partido", "Confirmá plantel, fecha, rival, competencia, condición, horario y duración. Un próximo partido integrado puede convertirse en MatchReport manteniendo su vínculo externo."),
    content("2. Abrí el detalle", "Dentro de cada partido se completa convocatoria/formación, cronología, estadísticas, minutos, GPS, plan/video y logística. Todo queda vinculado al mismo match_id."),
    intro("Manual e integración conviven", "Si no hay proveedor podés operar el partido completo manualmente. Una integración futura debe enriquecer el mismo MatchReport, no crear una segunda versión."),
  ],
  "/matches/:id": [
    intro("Detalle del partido", "Todas las subpáginas trabajan sobre un único MatchReport. El orden recomendado es preparar convocatoria y formación, registrar lo ocurrido y luego cerrar minutos, GPS y análisis."),
    content("1. Resumen", "Verificá datos base, rival, competencia, resultado, estado y duración real. La duración confirmada es clave para validar minutos."),
    content("2. Convocatoria y formación", "Definí convocados, titulares, suplentes, posiciones, capitán y sistema táctico. Esta misma convocatoria alimenta la carga de minutos."),
    content("3. Cronología", "Registrá goles, asistencias, tarjetas, cambios, lesiones, VAR e hitos del partido. MatchEvent acepta origen manual o integración y conserva revisión."),
    content("4. Estadísticas", "Cargá posesión, tiros, córners, faltas, pases y métricas avanzadas opcionales. MatchTeamStats es la fuente canónica del equipo; MatchPlayerStats queda preparada para datos individuales."),
    content("5. Minutos jugados", "Confirmá rol, ingreso/salida y minutos por jugador. MatchPlayerMinutes es la fuente oficial; una sugerencia GPS no se vuelve oficial sin confirmación."),
    content("6. GPS", "Importá el archivo del partido y revisá el informe principal. Cuando haya datos por períodos, el sistema conserva lectura total y análisis 1T/2T sin duplicar al jugador."),
    content("7. Plan y video · Logística", "Adjuntá plan, videos, notas y recursos operativos. Son capas del mismo partido y no deben crear un segundo evento de calendario."),
  ],
  "/club-operations/equipment": [
    intro("Indumentaria y materiales", "El módulo se divide en Inventario, Movimientos y Preparación/Partido para que el utilero pueda trabajar con trazabilidad."),
    content("1. Inventario", "Registrá item, categoría, stock total/disponible, mínimo y ubicación. El stock compartido puede quedar a nivel club o vincularse a un plantel."),
    content("2. Movimientos", "Entregas, devoluciones, lavandería, ingresos, pérdidas y daños generan historial. El movimiento explica por qué cambió la disponibilidad."),
    content("3. Preparación y partido", "Usá checklists para entrenamientos, partidos, viajes o torneos. Así la operación diaria se separa del inventario maestro sin perder relación."),
  ],
  "/competencias-afa": [
    intro("Centro de Competencias", "Esta pantalla es el adaptador de competencias argentinas actualmente configurado. Organiza Plantel superior, Reserva/Proyección y Juveniles."),
    content("1. Plantel superior", "Consultá fixture, próximos partidos y posiciones según la fuente habilitada. La competencia debe quedar vinculada a entidades canónicas antes de alimentar Partidos o Calendario."),
    content("2. Reserva · Proyección", "Mantiene su propia competencia/fixture pero usa los mismos principios de identidad de club, rival y temporada."),
    content("3. Juveniles", "Agrupa categorías y fechas juveniles. La automatización de Liga Profesional es un adapter opcional y no debe impedir la carga manual para otro país o competencia."),
    intro("Importante para otra liga", "El núcleo de PerformancePitch no depende de AFA/Promiedos. Para un club fuera de Argentina se configura otro adaptador y se mantiene Partidos/Calendario manuales."),
  ],
  "/admin": [
    intro("Administración", "Este centro agrupa Configuración del club, Datos e integraciones y Sistema. Está restringido a administradores."),
    content("1. Configuración del club", "Configuración general define identidad, estructura, módulos, integraciones y preferencias; Planteles organiza la estructura; Usuarios y Roles controlan acceso."),
    content("2. Datos e integraciones", "Vinculación de jugadores resuelve identidades y Competencias normaliza torneos. Ninguna integración debería convertirse en requisito del flujo manual."),
    content("3. Sistema", "Herramientas y Auditoría sirven para reparación y trazabilidad. El importador juvenil es un adapter argentino y debe tratarse como opcional."),
    intro("Antes de entregar a otro club", "Usá Diagnóstico y entrega para verificar identidad, planteles, roles, módulos, catálogos, accesos e integraciones antes de habilitar usuarios finales."),
  ],
  "/club-identity-admin": [
    intro("Identidades externas de club", "Esta herramienta vincula la identidad interna del club con los IDs/nombres usados por proveedores externos."),
    content("Qué resolver", "Confirmá que cada proveedor apunte al club correcto y que alias, escudo e ID externo no queden heredados de una copia anterior. Cambiar de club debe invalidar mapeos viejos."),
  ],
  "/player-names": [
    intro("Gestión de nombres de jugadores", "Resuelve alias y nombres provenientes de CSV, planillas o proveedores contra el Player oficial."),
    content("Regla de identidad", "Vinculá una variante una sola vez y reutilizá el alias en cargas futuras. Nunca dupliques un Player solamente porque una fuente escribió el nombre diferente."),
  ],
  "/plantil-diagnostic": [
    intro("Diagnóstico técnico del plantel", "Esta herramienta detecta jugadores sin plantel, duplicados, relaciones incompletas y otros problemas de normalización."),
    content("Usala como auditoría", "Revisá los hallazgos antes de reparar. Las correcciones deben preservar player_id e historial siempre que sea posible."),
  ],
  "/setup": [
    intro("Puesta en marcha del club", "Este asistente se usa en una instancia nueva. El orden correcto es identidad → temporada/planteles → roles/accesos → módulos → jugadores."),
    content("No necesitás integraciones para empezar", "Configurá primero el núcleo manual. GPS, competencias, nutrición o evaluaciones externas pueden conectarse después sin bloquear la operación."),
    content("Final de la puesta en marcha", "Antes de invitar al staff, comprobá que la identidad visible, plantel activo, Administrador del Club y permisos básicos estén correctos."),
  ],
  "/implementation-guide": [
    intro("Guía de implementación", "Resume el orden recomendado para poner una instancia en producción y evita configurar módulos aislados antes de definir la estructura del club."),
    content("Secuencia sugerida", "Identidad y estructura → roles y accesos → jugadores → módulos operativos → datos históricos → integraciones opcionales → validación final."),
  ],
  "/player-guide": [
    intro("Guía del portal del jugador", "Explica cómo habilitar al jugador, compartir el acceso y verificar qué verá en su portal."),
    content("Flujo", "Creá o importá el Player, verificá documento, habilitá su acceso y compartí el enlace. Wellness y RPE aparecen según el cronograma y la sesión configurada."),
  ],
  "/scouting": [
    intro("Scouting & Recruitment", "Organiza todo el proceso de incorporaciones en un solo circuito: necesidad → mercado → observación → evidencia → decisión → incorporación. Ninguna etapa reemplaza el criterio profesional del área."),
    content("1. Necesidades y Mercado", "Una Necesidad describe qué perfil busca el club: posición, plantel, prioridad y presupuesto. Mercado y Matching cruzan esa necesidad contra prospectos y señales de mercado para sugerir candidatos, sin decidir por vos."),
    content("2. Pipeline, Prospectos, Asignaciones e Informes", "Cada prospecto avanza por etapas en el Pipeline. Asignaciones reparte tareas de observación entre el staff de scouting; los informes registran la evidencia de campo con recomendación y fit score."),
    content("3. Comparador, Shadow Squad y Perfiles de rol", "El Comparador cruza prospectos contra jugadores propios. Shadow Squad simula la plantilla con incorporaciones potenciales. Los Perfiles de rol documentan qué criterios técnicos, tácticos, físicos y de mercado definen a un puesto."),
    content("4. Reuniones, Calendario y Watchlists", "Reuniones registra decisiones formales del comité de recruitment. Calendario y alertas avisa vencimientos y seguimientos pendientes. Watchlists agrupa prospectos en listas temáticas para monitorear en el tiempo."),
    intro("Dirección: el resumen ejecutivo", "La pestaña Dirección muestra alertas, necesidades críticas y el estado del pipeline en un solo vistazo antes de entrar al detalle de cada prospecto."),
  ],
};

export const GLOBAL_TOUR_EXCLUDED_PREFIXES = [
  "/club-dashboard",
  "/players",
  "/sessions",
  "/schedule",
];

export function resolveGlobalTour(pathname) {
  if (GLOBAL_TOUR_EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  if (/^\/matches\/[^/]+$/.test(pathname)) return { key: "match-detail", steps: GLOBAL_PAGE_TOURS["/matches/:id"] };
  const direct = GLOBAL_PAGE_TOURS[pathname];
  if (direct) return { key: pathname.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home", steps: direct };
  return null;
}
