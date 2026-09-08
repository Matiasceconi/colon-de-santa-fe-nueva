// Tipografía base de PerformancePitch Reports.
//
// Se usa una fuente PDF estándar para que el mismo ReportDocument pueda
// renderizarse hoy en el navegador y mañana en un worker/renderer server-side
// sin depender de imports Vite de archivos .ttf. Helvetica cubre correctamente
// el contenido latino habitual (español/portugués/inglés) del producto.
// Si en el futuro necesitamos alfabetos adicionales, este archivo será el único
// punto de entrada para registrar una fuente Unicode portable.
export const REPORT_FONT_FAMILY = "Helvetica";
