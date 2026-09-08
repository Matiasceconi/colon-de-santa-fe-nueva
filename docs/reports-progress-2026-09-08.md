# PerformancePitch Reports — avance 2026-09-08

Estado: corrección de interfaz y coherencia aplicada; auditoría integral NO aprobada.

## Evidencia y recuperación
Los archivos src/lib/exports/pdfExportKit.js, exportSecurity.js, fileExport.js y src/lib/reports/sessionPdf.js existen en el código actual y quedaron incluidos en checkpoint 6a9ff61a55bbcb7f4e60c088 (commit c775e2e6b91b52cd083763e43b6b9fb1ad4a5426).
El problema de superposición procede del main con relative z-10 de Layout y el Sidebar z-50: aumentar el z-index del descendiente no libera el contexto de apilamiento.

## Cambios
- ReportSurface compartido basado en Dialog/Portal de Radix, fuera del main. Modal, bloqueo de scroll de fondo, foco y Escape. Capa 91 sobre navegación y debajo de avisos 100.
- Adoptado por constructor de sesiones, GPS de sesión, fuerza, calendario, formación/convocatoria y táctica.
- Sesiones: ancho completo, panel 300px plegable; pantallas menores de 1024 alternan configuración/preview. Acción Generar siempre en cabecera.
- Sesiones: opciones modificadas invalidan descarga/guardado hasta regenerar; restauración de filtros del historial; validación de métricas; guardado fallido no anuncia éxito; edición de síntesis persistida antes del artefacto.
- Calendario: descarga vinculada a configuración de la preview, errores visibles, liberación de object URLs y validación de rangos semanales.

## Lógica común
Configurar alcance y secciones → preparar datos autorizados → generar preview → guardar/descargar exactamente esa configuración.
Las interfaces se comparten; los adaptadores de datos y documentos permanecen específicos por módulo.
No registrar un renderer como migrado hasta comprobar fidelidad de datos y documento.
PDF: tablas/textos estructurados, gráficos vectoriales donde sea posible, medidas físicas independientes de viewport, marca de club dinámica, fotos/escudos opcionales y fallback.
PNG es un formato de imagen separado, no el motor universal del PDF.
Preservar permisos, filtros de plantel/temporada/jugadores, unidades y reglas de agregación en cada migración.

## Pendientes concretos
1. Validación visual autenticada de las seis superficies, escritorio y móvil, navegación por teclado y errores.
2. Descargas reales de sesión con muchas filas, orientaciones A4, sin GPS/fotos, filtros, historial y permisos.
3. GPS de sesión aún usa html2canvas en SessionGPSReportModal: migrar conservando referencias, tareas, comparación y gráficos del studio.
4. Táctica: selector de tamaños no aplicado a imágenes; alcance all actualmente exporta solo pizarra actual; PDF estira la imagen. Corregir antes de aprobarlo.
5. Revisar motores de partido (matchGpsPDF, formación/convocados, matchReportPdf/Excel), mapa del día, planificación, carga externa/microciclo e individuales, minutos, nutrición, mensual y bibliotecas.
6. SessionPDFExport.jsx es implementación antigua sin consumidores hallados; no confundir con el constructor activo de SessionDetail.
7. Generalizar registro/historial solo después de adaptar y validar cada tipo; hoy REPORT_REGISTRY contiene session.professional.

## Verificación
npm run build: exit 0.
ESLint focalizado sobre siete archivos modificados: sin errores.
Advertencia preexistente: base de Browserslist antigua.
La prueba visual real quedó bloqueada por inicio de sesión de Base44 en el navegador disponible. No se publicaron cambios ni se modificaron registros deportivos.
