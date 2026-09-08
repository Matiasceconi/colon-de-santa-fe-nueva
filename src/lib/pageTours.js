// Definiciones de tutoriales guiados por página.
// Cada paso apunta a un selector CSS (idealmente [data-tour="..."]) y se posiciona
// alrededor del elemento con un spotlight. `placement`: top | bottom | left | right | center.
// Si no hay selector, el popover se centra en la pantalla sin spotlight.

export const CALENDAR_TOUR = [
  {
    title: "Calendario operativo: una sola línea de tiempo",
    text: "El calendario reúne sesiones, partidos y agenda diaria sin crear otra versión de esos datos. Los elementos vinculados se editan desde su módulo de origen; comidas, viajes, reuniones y otros eventos se gestionan acá.",
    placement: "center",
  },
  {
    selector: '[data-tour="calendar-header"]',
    title: "1. Confirmá plantel y vista",
    text: "Podés trabajar en Agenda, Semana o Mes. Agenda es la lectura rápida del día; Semana organiza el microciclo; Mes sirve para navegar el calendario general.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="calendar-filters"]',
    title: "2. Filtrá por actividad o por origen",
    text: "Separá Entrenamientos, Partidos, Gimnasio, Video o logística. También podés distinguir lo que viene de Sesiones, Partidos, integración, carga manual o importaciones históricas.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="calendar-quality"]',
    title: "3. El calendario controla su propia integridad",
    text: "El auditor detecta partidos duplicados, vínculos rotos, pares de entrenamiento y datos legados. No borra información: oculta duplicados evidentes en la vista y deja los conflictos para revisión.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="calendar-content"]',
    title: "4. Abrí la fuente real",
    text: "Una tarjeta marcada como Sesión abre la sesión; una marcada como Partido abre el partido. Los eventos manuales sí se editan directamente desde el calendario.",
    placement: "top",
  },
  {
    selector: '[data-tour="calendar-new"]',
    title: "5. Sumá agenda operativa",
    text: "Usá Nuevo evento para comidas, viajes, reuniones, video, controles u otras actividades. El sistema evita crear otro evento equivalente en la misma fecha y horario.",
    placement: "left",
  },
  {
    title: "Una fuente para cada dato",
    text: "Sesiones gobierna el entrenamiento, Partidos gobierna la competencia y Calendario los presenta junto con la logística. Así una corrección se mantiene consistente en toda la plataforma.",
    placement: "center",
  },
];

export const PLAYERS_TOUR = [
  {
    title: "Creá y habilitá el plantel desde esta pantalla",
    text: "Esta guía te acompaña sin salir de Jugadores. Podés cargar una persona manualmente o importar el plantel completo desde Excel.",
    placement: "center",
  },
  {
    selector: '[data-tour="players-squad"]',
    title: "1. Elegí el plantel",
    text: "Antes de cargar, confirmá el plantel de destino. Los jugadores nuevos y las importaciones quedarán vinculados a este plantel.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="players-new"]',
    title: "2A. Alta manual",
    text: "Usá “Nuevo jugador” para cargar uno por uno. Nombre, apellido, DNI y posición son los datos esenciales; el DNI habilita el ingreso al portal.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="players-import"]',
    title: "2B. Importación por Excel",
    text: "Para un plantel completo, descargá la plantilla, completala y subila desde acá. El sistema controla DNI repetidos y filas inválidas.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="players-table"]',
    title: "3. Revisá la base",
    text: "Después de guardar, comprobá DNI, plantel, posición y estado. Podés editar la ficha, abrir la Carta 360 o compartir el portal.",
    placement: "top",
  },
  {
    selector: '[data-tour="players-share"]',
    title: "4. Compartí el portal",
    text: "El botón de enlace permite copiar el acceso, copiar un mensaje completo o enviarlo por WhatsApp. El DNI nunca se escribe en la URL.",
    placement: "left",
  },
  {
    title: "Listo",
    text: "El jugador ingresará al portal con su DNI, verá el cronograma del día y podrá completar Wellness y RPE. Podés volver a abrir esta guía cuando quieras.",
    placement: "center",
  },
];



export const SESSIONS_LIST_TOUR = [
  {
    title: "Sesiones: todo el trabajo de un día en un solo lugar",
    text: "Desde acá creás una sesión, definís quién participa y después completás campo, fuerza, GPS y video. La guía cambia automáticamente según la pantalla que estés viendo.",
    placement: "center",
  },
  {
    selector: '[data-tour="sessions-header"]',
    title: "1. Confirmá el plantel",
    text: "El nombre debajo de “Sesiones” indica el plantel activo. Todo lo que crees o consultes quedará asociado a ese plantel.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="sessions-new"]',
    title: "2. Creá una sesión",
    text: "Empezá por “Nueva sesión”. Primero se completa la fecha y la información básica; luego se eligen los jugadores y su estado para ese día.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="sessions-filters"]',
    title: "3. Encontrá rápidamente una sesión",
    text: "Podés filtrar por fecha, número, período, objetivo, GPS o video. Es útil cuando el plantel ya tiene muchas sesiones cargadas.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="sessions-list"]',
    title: "4. Abrí el área que necesitás",
    text: "Cada fila resume jugadores, ejercicios, GPS y video. Entrá a la sesión completa o directamente a Ejercicios, Fuerza, GPS o Video.",
    placement: "top",
  },
  {
    title: "La ayuda siempre acompaña a la pantalla",
    text: "Cuando estés creando o editando una sesión, tocá nuevamente “Tutorial”. Se abrirá la guía específica de ese momento.",
    placement: "center",
  },
];

export const SESSIONS_CREATE_TOUR = [
  {
    title: "Crear una sesión es un recorrido corto",
    text: "Completá los datos básicos, revisá el plantel y definí el estado de cada jugador. El sistema evita que una misma persona entrene en dos planteles el mismo día.",
    placement: "center",
  },
  {
    selector: '[data-tour="session-create-basics"]',
    title: "1. Datos de la sesión",
    text: "Elegí fecha, plantel, período, código MD, objetivo, duración y lugar. Estos datos ordenan el calendario y los informes.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="session-create-players"]',
    title: "2. Jugadores y estado del día",
    text: "Marcá quién está presente, diferenciado, en kinesiología o ausente. También podés sumar un jugador de otra categoría solo para esta fecha.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-create-actions"]',
    title: "3. Guardá y completá el contenido",
    text: "Al crearla se abrirá la sesión. Allí vas a cargar ejercicios, fuerza, el CSV de GPS y los videos.",
    placement: "top",
  },
];

export const SESSIONS_DETAIL_TOUR = [
  {
    title: "Cómo completar una sesión",
    text: "Este recorrido abrirá cada pestaña automáticamente. No modifica datos: solamente te muestra dónde trabajar y en qué orden conviene hacerlo.",
    placement: "center",
  },
  {
    selector: '[data-tour="session-summary"]',
    title: "1. Revisá el encabezado",
    text: "Acá se ven fecha, plantel, duración, lugar, objetivo y el resumen de estados. “Editar sesión” permite corregir esos datos.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="session-players-content"]',
    tab: "players",
    title: "2. Confirmá los jugadores",
    text: "Revisá presentes, diferenciados, kinesiología y ausentes. Desde esta pestaña también podés agregar a alguien de otra categoría sin duplicarlo en otra sesión del día.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-exercises-content"]',
    tab: "exercises",
    title: "3. Armá el trabajo de campo",
    text: "Usá “Desde Biblioteca” para reutilizar una tarea o “Nuevo ejercicio” para crearla. Completá objetivo, espacio, jugadores, duración, consignas e imagen o video.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-exercises-actions"]',
    tab: "exercises",
    title: "Ejercicios: dos formas simples",
    text: "La biblioteca acelera la carga y mantiene criterios comunes. Un ejercicio nuevo queda disponible para reutilizarlo en futuras sesiones.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-strength-content"]',
    tab: "strength",
    title: "4. Planificá la fuerza",
    text: "Creá cuadros o bloques de trabajo, agregá estaciones y definí series, repeticiones, carga, pausa y observaciones. También podés partir de la biblioteca de fuerza.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-strength-actions"]',
    tab: "strength",
    title: "Fuerza: elegí el método de carga",
    text: "“Nuevo cuadro” permite armarlo manualmente. La importación desde imagen ayuda a convertir una planificación existente y siempre debe revisarse antes de guardar.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="session-gps-upload"]',
    tab: "gps",
    title: "5. Cargá el CSV",
    text: "Seleccioná el CSV exportado por el GPS. El sistema detecta columnas y jugadores, y muestra una vista previa antes de confirmar. Revisá especialmente nombres y métricas reconocidas.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="session-gps-preview"]',
    tab: "gps",
    title: "Confirmá antes de importar",
    text: "En la vista previa elegís los campos que querés guardar. Confirmá solamente cuando la cantidad de jugadores y las columnas coincidan con el archivo original.",
    placement: "top",
  },
  {
    selector: '[data-tour="gps-player-ranking"]',
    tab: "gps",
    title: "6. Ordená la tabla por la variable que te interese",
    text: "La tabla muestra fotos, ranking y todas las métricas del jugador. Elegí Distancia, m/min, D>25, Player Load, Smax u otra variable para ver automáticamente quiénes fueron los primeros. También podés mostrar u ocultar referencias.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-gps-reference"]',
    tab: "gps",
    title: "7. Interpretá la sesión contra referencias reales",
    text: "El informe muestra qué porcentaje representa cada dato respecto de la referencia configurada por el club. Si el jugador todavía no tiene muestra suficiente, PerformancePitch lo marca como referencia en construcción o aplica el fallback definido.",
    placement: "top",
  },
  {
    selector: '[data-tour="gps-pinned-charts"]',
    tab: "gps",
    title: "8. Construí una vista gráfica que se repita en cada sesión",
    text: "Agregá tantos gráficos como necesites, elegí métrica, Barras o Línea, por jugador o por ejercicio y si querés mostrar la referencia. El administrador puede guardar esta combinación como vista fija del plantel para que las próximas sesiones se abran igual.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-gps-unmatched"]',
    tab: "gps",
    title: "Si un nombre no coincide",
    text: "Vinculalo una sola vez con el jugador correcto y guardá el alias. En próximas cargas el reconocimiento será automático.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-video-content"]',
    tab: "video",
    title: "9. Sumá video y observaciones",
    text: "Podés guardar un video general, observaciones del cuerpo técnico y varios enlaces clasificados como sesión, ejercicio, fuerza, análisis o clip.",
    placement: "top",
  },
  {
    selector: '[data-tour="session-actions"]',
    tab: "players",
    title: "10. Consultá o exportá",
    text: "“Videos” reúne el material cargado. “Exportar PDF” genera el informe de la sesión con la información registrada.",
    placement: "bottom",
  },
  {
    title: "Orden recomendado",
    text: "Jugadores → Ejercicios → Fuerza → GPS → Video. Podés volver a abrir esta guía en cualquier momento desde “Tutorial”; siempre mostrará la ayuda de la pantalla actual.",
    placement: "center",
  },
];

export const GPS_REFERENCES_TOUR = [
  {
    title: "Configurá la metodología GPS del club",
    text: "PerformancePitch separa tres cosas: referencia (contra qué comparás), objetivo (qué querés alcanzar) y definición de métrica (cómo se mide HSR, sprint, ACC o DEC). Este recorrido te muestra cada nivel.",
    placement: "center",
    tab: "model",
  },
  {
    selector: '[data-tour="gps-ref-model"]',
    title: "1. Elegí el modelo de trabajo",
    text: "El perfil híbrido combina histórico individual del mismo MD, demanda competitiva y máximo individual. También podés priorizar partido, MD o configurar todo manualmente.",
    placement: "top",
    tab: "model",
  },
  {
    selector: '[data-tour="gps-ref-metrics"]',
    title: "2. La referencia se define por métrica",
    text: "Distancia, m/min, HSR, sprint, ACC/DEC, Player Load y Smax no tienen por qué compararse contra la misma fuente. Elegí una referencia distinta para cada variable.",
    placement: "top",
    tab: "references",
  },
  {
    selector: '[data-tour="gps-ref-criteria"]',
    title: "3. Definí cuándo una referencia es confiable",
    text: "Configurá partidos mínimos, minutos válidos, cantidad de sesiones del mismo MD y ventanas recientes. Si la muestra no alcanza, el informe lo indica como referencia en construcción.",
    placement: "top",
    tab: "criteria",
  },
  {
    selector: '[data-tour="gps-ref-fallback"]',
    title: "4. Ordená el fallback",
    text: "Cuando falta historial individual, PerformancePitch puede pasar a posición y luego a plantel. Nunca cambia la fuente en silencio: el informe muestra qué referencia terminó usando.",
    placement: "top",
    tab: "criteria",
  },
  {
    selector: '[data-tour="gps-ref-objectives"]',
    title: "5. Agregá objetivos sin confundirlos con la referencia",
    text: "Podés definir rangos por MD, objetivo físico, posición o jugador. Una excepción individual tiene prioridad sobre una regla general. Los estados serán En rango, Por debajo o Por encima; no se presentan como riesgo de lesión.",
    placement: "top",
    tab: "objectives",
  },
  {
    selector: '[data-tour="gps-ref-thresholds"]',
    title: "6. Documentá cómo mide el club",
    text: "Definí los umbrales de HSR, sprint, aceleraciones y desaceleraciones. Estos valores deben coincidir con el proveedor o con el método de normalización usado para interpretar el CSV.",
    placement: "top",
    tab: "definitions",
  },
  {
    selector: '[data-tour="gps-ref-save"]',
    title: "7. Guardá y recalculá",
    text: "Al guardar, la configuración queda asociada al plantel y temporada. PerformancePitch recalcula los perfiles para que los informes siguientes utilicen la metodología vigente.",
    placement: "bottom",
    tab: "model",
  },
  {
    title: "El software se adapta al club",
    text: "No hay porcentajes universales impuestos por PerformancePitch. El club define su metodología y cada informe explica qué referencia, muestra y objetivo está utilizando.",
    placement: "center",
  },
];

export const CLUB_DASHBOARD_TOUR = [
  {
    title: "Bienvenido al Tablero del Club",
    text: "Este es tu centro de control. Desde acá ves el resumen del plantel, próximos partidos, estado médico y novedades del club en un solo lugar.",
    placement: "center",
  },
  {
    selector: '[data-tour="dashboard-title"]',
    title: "Tu tablero personalizable",
    text: "El tablero se adapta a vos. Podés reordenar las tarjetas, cambiar su tamaño y agregar o quitar widgets según lo que más uses.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="dashboard-edit"]',
    title: "Modo edición",
    text: "Tocá “Editar tablero” para desbloquear el arrastre de tarjetas, cambiar tamaños y agregar nuevos widgets. Cuando termines, volvé a tocar para guardar los cambios.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="dashboard-widgets"]',
    title: "Widgets del club",
    text: "Cada tarjeta muestra información del club: próximos partidos, tabla de posiciones, estado del plantel y más. En modo edición las acomodás a tu gusto.",
    placement: "top",
  },
  {
    title: "Listo para empezar",
    text: "Cambió de plantel desde el selector del menú lateral. Podés volver a abrir este tutorial cuando quieras desde el botón “Ver tutorial” del menú.",
    placement: "center",
  },
];