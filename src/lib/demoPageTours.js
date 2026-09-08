// Recorridos contextuales por página para la demo comercial.
// Cada página define sus propios pasos. `target` es un selector CSS de un
// elemento real de la pantalla que el recorrido resaltará. Si el selector
// no se encuentra, el paso se muestra como un modal centrado (sin highlight).
//
// Estructura de cada paso:
//   id        — identificador único dentro del recorrido
//   target    — selector CSS del elemento a resaltar (opcional)
//   title     — título corto del paso
//   text      — explicación (2-3 líneas máx.)
//   chips     — ejemplos visuales tipo badges (opcional)
//   example   — ejemplo destacado (opcional)
//   note      — mensaje pequeño debajo (opcional)
//   flow      — cadena de nodos para pasos de conexión (opcional)
//   closing   — frase final del paso (opcional)

export const PAGE_TOURS = {
  '/club-dashboard': {
    label: 'Tablero del Club',
    steps: [
      {
        id: 'club-identity',
        target: '[data-tour="club-identity"]',
        title: 'La plataforma adopta la identidad del club',
        text: 'Colores, escudo y temporada construyen una experiencia propia para cada institución, manteniendo la estructura de PerformancePitch.',
        chips: ['Identidad dinámica', 'Temporada activa', 'Datos del club'],
      },
      {
        id: 'club-widgets',
        target: '[data-tour="club-widgets"]',
        title: 'Cada usuario construye su propio tablero',
        text: 'El tablero comienza con una configuración recomendada, pero permite agregar, ocultar, reordenar y redimensionar widgets según el rol y la forma de trabajo.',
        chips: ['Agregar', 'Arrastrar', 'Redimensionar', 'Ocultar', 'Restaurar'],
      },
      {
        id: 'club-filters',
        target: '[data-tour="club-filters"]',
        title: 'Los filtros actualizan todos los widgets compatibles',
        text: 'Plantel, área, prioridad, competencia y período modifican la lectura del tablero sin perder la configuración personal.',
        chips: ['Plantel', 'Área', 'Prioridad', 'Competencia', 'Período'],
      },
      {
        id: 'club-agenda',
        target: '[data-tour="club-agenda"]',
        title: 'La jornada comienza con una agenda común',
        text: 'Entrenamientos, controles, reuniones y partidos se ordenan en una única vista para evitar información dispersa.',
        flow: ['Calendario', 'Actividad', 'Área responsable'],
      },
      {
        id: 'club-alerts',
        target: '[data-tour="club-alerts"]',
        title: 'Las alertas importantes llegan al inicio',
        text: 'Médica, rendimiento, nutrición y cuerpo técnico pueden señalar situaciones que requieren atención del staff.',
        chips: ['Prioridad', 'Jugador', 'Área', 'Hora'],
      },
      {
        id: 'club-notes',
        target: '[data-tour="club-notes"]',
        title: 'Las notas rápidas acompañan la operación diaria',
        text: 'El staff puede registrar pendientes simples sin abandonar el tablero general.',
        example: 'Revisar informe GPS del último partido',
      },
      {
        id: 'club-squads',
        target: '[data-tour="club-squads"]',
        title: 'Todos los planteles se leen en un mismo lugar',
        text: 'Primera, Reserva y Juveniles muestran disponibilidad, carga y próximo compromiso con una lectura inmediata.',
        chips: ['Disponibles', 'Carga', 'Próximo partido'],
      },
      {
        id: 'club-competition',
        target: '[data-tour="club-competition"]',
        title: 'El contexto competitivo completa la decisión',
        text: 'Posición, puntos, próximo partido y tabla permiten conectar la operación diaria con el objetivo deportivo.',
        closing: 'El inicio resume lo urgente y permite profundizar en cada módulo.',
      },
    ],
  },
  '/dashboard': {
    label: 'Tablero del Cuerpo Técnico',
    steps: [
      { id: 'staff-personal', target: '[data-tour="staff-personal"]', title: 'Cada integrante tiene su propio tablero', text: 'La configuración se guarda por usuario, plantel y función. El DT y el preparador físico de Reserva pueden trabajar con vistas diferentes sin alterar la del otro.', chips: ['Usuario', 'Plantel', 'Función', 'Vista independiente'] },
      { id: 'staff-widgets', target: '[data-tour="staff-widgets"]', title: 'El tablero se adapta a la forma de trabajar', text: 'Cada miembro puede agregar, ocultar, reordenar y cambiar el tamaño de sus widgets.', chips: ['Agregar', 'Arrastrar', 'Redimensionar', 'Ocultar', 'Restaurar'] },
      { id: 'staff-filters', target: '[data-tour="staff-filters"]', title: 'Los filtros ordenan la información relevante', text: 'Área y prioridad actualizan los widgets compatibles sin modificar la configuración personal.' },
      { id: 'staff-agenda', target: '[data-tour="staff-agenda"]', title: 'La agenda muestra lo que ocurre hoy', text: 'Entrenamientos, controles, video y recuperación se leen en orden horario dentro del plantel activo.' },
      { id: 'staff-availability', target: '[data-tour="staff-availability"]', title: 'La disponibilidad está siempre visible', text: 'El cuerpo técnico identifica rápidamente disponibles, diferenciados, lesionados y convocados.' },
      { id: 'staff-gps', target: '[data-tour="staff-gps"]', title: 'El último dato físico llega al tablero', text: 'El preparador físico puede priorizar carga y GPS; el DT puede ocultarlo o dejar solamente una síntesis.' },
      { id: 'staff-notes', target: '[data-tour="staff-notes"]', title: 'Las notas también son personales', text: 'Los pendientes rápidos quedan asociados a la cuenta, al plantel y a la función activa.', closing: 'El tablero compartido deja de ser una pantalla rígida y se convierte en el espacio de trabajo de cada integrante.' },
    ],
  },
  '/matches': {
    label: 'Partidos',
    steps: [
      { id: 'matches-header', view: 'match-list', target: '[data-tour="matches-header"]', title: 'Cada partido centraliza todo el proceso competitivo', text: 'Fixture, convocatoria, formación, minutos, GPS y análisis se organizan alrededor del mismo encuentro.' },
      { id: 'matches-filters', view: 'match-list', target: '[data-tour="matches-filters"]', title: 'El listado se filtra por contexto', text: 'Plantel, competencia y temporada permiten encontrar rápidamente cada compromiso.' },
      { id: 'matches-example', view: 'match-list', target: '[data-tour="matches-example"]', title: 'Esta demo incluye un partido completo', text: 'Performance FC vs Atlético Central tiene resultado, convocatoria y GPS procesado para recorrer el flujo real.', chips: ['23 convocados', '2–1', 'GPS procesado'] },
      { id: 'matches-detail', view: 'summary', target: '[data-tour="matches-detail"]', title: 'La ficha conserva el contexto del encuentro', text: 'Rival, competencia, fecha, horario, sede, condición y resultado permanecen visibles durante todo el trabajo.' },
      { id: 'matches-callups', view: 'callups', target: '[data-tour="matches-callups"]', title: 'La convocatoria se arma con una selección clara', text: 'Buscá por nombre o posición, marcá jugadores y controlá la composición antes de guardar.', flow: ['Plantel disponible', 'Convocatoria', 'Formación', 'Minutos'] },
      { id: 'matches-formation', view: 'formation', target: '[data-tour="matches-formation"]', title: 'La formación combina cancha y controles', text: 'Elegí sistema, asigná cada jugador, definí capitán y revisá titulares y banco en una misma pantalla.', chips: ['Sistema', '11 titulares', 'Capitán', 'Suplentes'] },
      { id: 'matches-gps', view: 'gps', target: '[data-tour="matches-gps"]', title: 'El GPS queda vinculado al partido y al jugador', text: 'El archivo procesado muestra métricas principales y gráficos con etiquetas visibles para contextualizar el rendimiento competitivo.', flow: ['Archivo GPS', 'Partido', 'Jugador', 'Perfil competitivo'], closing: 'Un partido deja de ser un registro aislado y alimenta toda la historia deportiva.' },
    ],
  },
  '/schedule': {
    label: 'Calendario',
    steps: [
      { id: 'schedule-header', view: 'calendar-week', target: '[data-tour="schedule-header"]', title: 'El calendario organiza la operación del plantel', text: 'Entrenamientos, comidas, video, logística y partidos comparten una única línea temporal.' },
      { id: 'schedule-views', target: '[data-tour="schedule-views"]', title: 'Semana y mes responden a necesidades distintas', text: 'La vista semanal sirve para operar; la mensual permite leer el contexto general y anticipar compromisos.' },
      { id: 'schedule-filters', target: '[data-tour="schedule-filters"]', title: 'Los filtros simplifican el cronograma', text: 'Podés mostrar únicamente entrenamientos, partidos, logística o actividades de un área.' },
      { id: 'schedule-week', view: 'calendar-week', target: '[data-tour="schedule-week"]', title: 'La semana muestra el microciclo completo', text: 'Cada día reúne horarios, lugares, responsables y actividades desde MD+1 hasta el siguiente partido.' },
      { id: 'schedule-event', view: 'calendar-week', target: '[data-tour="schedule-event"]', title: 'Cada evento contiene información operativa', text: 'Hora, título, lugar, tipo y plantel quedan preparados para edición, copia y conexión con otros módulos.' },
      { id: 'schedule-match', view: 'calendar-week', target: '[data-tour="schedule-match"]', title: 'El partido conecta el calendario con el resto del sistema', text: 'Al crear un partido desde el calendario también puede generarse su ficha competitiva.', flow: ['Calendario', 'Partido', 'Planificación', 'Convocatoria', 'GPS'] },
      { id: 'schedule-flow', target: '[data-tour="schedule-flow"]', title: 'La información se carga una sola vez', text: 'El mismo evento alimenta planificación, sesiones, partido y seguimiento posterior.', closing: 'Calendario y módulos deportivos trabajan sobre la misma fuente de información.' },
    ],
  },
  '/performance/dashboard': {
    label: 'Tablero de Rendimiento',
    steps: [
      { id: 'performance-personal', target: '[data-tour="performance-personal"]', title: 'El área de rendimiento tiene su propio centro operativo', text: 'Cada profesional puede combinar carga externa, carga interna, wellness, evaluaciones y alertas según su función.', chips: ['GPS', 'RPE', 'Wellness', 'Evaluaciones', 'Alertas'] },
      { id: 'performance-widgets', target: '[data-tour="performance-widgets"]', title: 'El tablero es personal y completamente editable', text: 'Los widgets pueden agregarse, ocultarse, reordenarse y cambiar de tamaño. La vista se guarda por usuario, plantel y función.', chips: ['Agregar', 'Arrastrar', 'Redimensionar', 'Ocultar'] },
      { id: 'performance-filters', target: '[data-tour="performance-filters"]', title: 'Los filtros cambian la lectura sin alterar el diseño', text: 'Período y prioridad actualizan los widgets compatibles, conservando la distribución personal.' },
      { id: 'performance-overview', target: '[data-tour="performance-overview"]', title: 'La situación del plantel se entiende en segundos', text: 'Disponibilidad, carga, alertas y calidad del dato resumen lo más importante del área.' },
      { id: 'performance-external', target: '[data-tour="performance-external"]', title: 'La carga externa alimenta el tablero', text: 'El volumen y la intensidad semanal aparecen con etiquetas permanentes para evitar depender del cursor.' },
      { id: 'performance-evaluations', target: '[data-tour="performance-evaluations"]', title: 'Las evaluaciones se conectan con la carga', text: 'CMJ, fuerza y asimetrías pueden cruzarse con GPS, wellness y minutos para interpretar la respuesta del jugador.' },
      { id: 'performance-alerts', target: '[data-tour="performance-alerts"]', title: 'Las alertas integradas priorizan decisiones', text: 'PerformancePitch puede combinar diferentes fuentes y señalar qué jugadores necesitan revisión.', flow: ['GPS / RPE / Wellness', 'Reglas', 'Alerta', 'Seguimiento'], closing: 'El tablero convierte datos dispersos en una rutina diaria de trabajo.' },
    ],
  },
  '/gps': {
    label: 'Carga externa y GPS',
    steps: [
      { id: 'gps-list-header', view: 'gps-list', target: '[data-tour="gps-list-header"]', title: 'El análisis comienza en las sesiones que tienen GPS', text: 'La primera pantalla muestra únicamente sesiones procesadas, con fecha, MD, objetivo, jugadores y calidad del archivo.' },
      { id: 'gps-list-filters', view: 'gps-list', target: '[data-tour="gps-list-filters"]', title: 'Encontrá rápidamente el contexto buscado', text: 'Podés filtrar por tipo, objetivo, fecha, MD o nombre de la sesión.' },
      { id: 'gps-session-list', view: 'gps-list', target: '[data-tour="gps-session-list"]', title: 'Cada fila explica qué información está disponible', text: 'Duración, cantidad de jugadores y calidad del dato ayudan a decidir qué sesión analizar.' },
      { id: 'gps-selection', view: 'gps-list', target: '[data-tour="gps-selection"]', title: 'Una sesión o un acumulado de varias', text: 'Seleccioná una para analizar el día o varias para sumar volumen y promediar métricas de intensidad.', chips: ['Sesión individual', 'Acumulado', 'Promedios de intensidad'] },
      { id: 'gps-analysis-header', view: 'gps-analysis', target: '[data-tour="gps-analysis-header"]', title: 'La selección se convierte en un panel de análisis', text: 'El encabezado conserva el contexto de todas las sesiones incluidas.' },
      { id: 'gps-config', view: 'gps-analysis', target: '[data-tour="gps-config"]', title: 'Cada usuario define qué quiere visualizar', text: 'Elegí métricas, creá reglas de colores y agregá hasta seis gráficos con estilos de línea, área o barras.', chips: ['Métricas', 'Reglas', 'Línea', 'Área', 'Barras'] },
      { id: 'gps-player-table', view: 'gps-analysis', target: '[data-tour="gps-player-table"]', title: 'La tabla responde a reglas configurables', text: 'Las celdas se colorean automáticamente al superar o quedar por debajo del umbral definido.' },
      { id: 'gps-charts', view: 'gps-analysis', target: '[data-tour="gps-charts"]', title: 'Los gráficos son dinámicos y siempre muestran sus valores', text: 'Todos los puntos y barras incluyen etiquetas de datos permanentes para una lectura clara.' },
      { id: 'gps-alerts', view: 'gps-analysis', target: '[data-tour="gps-alerts"]', title: 'El sistema transforma resultados en acciones', text: 'Exposiciones altas, objetivos cumplidos y cargas modificadas quedan destacadas para el staff.', flow: ['Sesiones GPS', 'Plantel', 'Jugador', 'Alerta / decisión'], closing: 'Tocar la foto abre el detalle individual de la carga seleccionada.' },
    ],
  },
  '/performance/external-load': {
    label: 'Carga externa y GPS',
    steps: [],
  },
  '/sessions': {
    label: 'Sesiones',
    steps: [
      {
        id: 'session-data',
        target: '[data-tour="session-data"]',
        title: 'Toda la sesión empieza desde un mismo lugar',
        text: 'Definí fecha, plantel, duración, lugar y contexto del entrenamiento.',
        chips: ['SESIÓN 4', 'Miércoles 20/08/2026', 'Performance FC · Primera', '85 min', 'Campo 1'],
      },
      {
        id: 'session-md',
        target: '[data-tour="session-md"]',
        title: 'La sesión se conecta automáticamente con el microciclo',
        text: 'La fecha y el próximo partido permiten contextualizar el entrenamiento dentro de la planificación semanal.',
        example: 'MD-3',
        note: 'El MD puede calcularse automáticamente.',
      },
      {
        id: 'session-objective',
        target: '[data-tour="session-objective"]',
        title: 'Cada sesión tiene un objetivo',
        text: 'Volumen, intensidad, velocidad, recuperación o activación pueden organizarse dentro del contexto del microciclo.',
        example: 'Alta intensidad',
      },
      {
        id: 'session-work-types',
        target: '[data-tour="session-work-types"]',
        title: 'Una sesión puede integrar diferentes áreas de trabajo',
        text: 'Campo, fuerza, prevención y recuperación pueden formar parte de una misma sesión.',
        chips: ['Campo', 'Fuerza', 'Preventivo', 'Recuperación'],
      },
      {
        id: 'session-exercises',
        target: '[data-tour="session-exercises"]',
        title: 'Construí el entrenamiento con la metodología del club',
        text: 'Los ejercicios pueden cargarse desde bibliotecas reutilizables o crearse específicamente para una sesión.',
        chips: ['Biblioteca de Campo', 'Biblioteca de Fuerza'],
      },
      {
        id: 'session-media',
        target: '[data-tour="session-media"]',
        title: 'Cada ejercicio puede contener toda la información necesaria',
        text: 'Videos, imágenes, consignas y parámetros de trabajo permiten que todo el staff entienda exactamente qué se busca.',
        chips: ['Video', 'Imagen', 'Consigna', 'Duración', 'Series', 'Descansos', 'Observaciones'],
      },
      {
        id: 'session-players',
        target: '[data-tour="session-players"]',
        title: 'La sesión trabaja con el plantel disponible',
        text: 'Los jugadores y su disponibilidad pueden provenir de Estado del Plantel, evitando cargar la misma información nuevamente. Esa información puede compartirse entre Cuerpo Técnico, Rendimiento y Área Médica según permisos.',
        chips: ['27 jugadores', '24 disponibles', '2 diferenciados', '1 lesionado'],
      },
      {
        id: 'session-gps',
        target: '[data-tour="session-gps"]',
        title: 'Después del entrenamiento, llegan los datos',
        text: 'La sesión puede recibir información proveniente de GPS y otras fuentes de rendimiento para relacionar lo planificado con lo realizado.',
        flow: ['Sesión', 'GPS / Tracking', 'Carga individual', 'Rendimiento'],
      },
      {
        id: 'session-flow',
        target: '[data-tour="session-flow"]',
        title: 'La sesión no queda aislada',
        text: 'La información generada durante el entrenamiento empieza a formar parte del contexto completo del jugador y del plantel.',
        flow: ['Estado del Plantel', 'Sesión', 'Planificación semanal', 'Calendario', 'GPS / Rendimiento', 'Jugador 360°'],
        closing: 'El dato se carga una vez y empieza a generar valor en diferentes áreas.',
      },
    ],
  },
  '/demo/player': {
    label: 'Portal del Jugador',
    steps: [
      { id: 'dp-home', view: 'inicio', target: '[data-tour="dp-home"]', title: 'El jugador tiene su propio espacio personal', text: 'Desde la app personal del jugador, cada futbolista ve su próxima actividad, su wellness y su carga pendiente.' },
      { id: 'dp-wellness', view: 'wellness', target: '[data-tour="dp-wellness"]', title: 'Puede comunicar diariamente cómo se encuentra', text: 'Sueño, energía, estado muscular, ánimo y molestias se registran en segundos. Información simple para el jugador, útil para el staff.' },
      { id: 'dp-rpe', view: 'rpe', target: '[data-tour="dp-rpe"]', title: 'Después de entrenar registra cómo percibió la carga', text: 'El RPE de la sesión alimenta la carga interna, el rendimiento y el historial del jugador.' },
      { id: 'dp-shared', view: 'inicio', target: '[data-tour="dp-shared"]', title: 'El club decide qué contenidos compartir', text: 'Mi calendario, Mi rendimiento, Videos e Informes son contenidos individuales que el club pone a disposición de cada jugador.' },
      { id: 'dp-connected', view: 'inicio', target: '[data-tour="dp-connected"]', title: 'El jugador también forma parte del ecosistema de información del club', text: 'Wellness y RPE se conectan con Médica, Rendimiento y Cuerpo Técnico para construir el Jugador 360°.', flow: ['Jugador', 'Wellness / RPE', 'Médica / Rendimiento', 'Cuerpo Técnico', 'Jugador 360°'], closing: 'El jugador también forma parte del ecosistema de información del club.' },
    ],
  },
};