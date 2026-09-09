# Nutrición — checkpoint previo a reestructuración

Fecha: 2026-09-09
App: COLON DE SANTA FE NUEVA (`6aa05e94dccbb66f573319b1`)
Commit observado antes de iniciar: `4c7ecaf21da26c167cc53148a29cab7960ec2acd`

## Estado previo
- `Nutrition.jsx` funciona como wrapper de dashboard antropométrico + planilla manual.
- Datos principales actuales: `NutritionAssessment`, `NutritionInterpretation`, `NutritionReadingStatus`, `NutritionReferenceRange`, `NutritionSyncState`.
- Integración `syncNutritionFromSheet` se conserva.
- `NutritionRecord` se conserva por compatibilidad; no es fuente principal de la pantalla actual.

## Objetivo de esta intervención
Agregar una capa nativa de nutrición deportiva sin destruir el histórico existente:
- controles nutricionales periódicos;
- alimentación y adherencia;
- hidratación opcional;
- seguimiento temporal de peso;
- planes nutricionales individuales;
- dashboard operativo;
- antropometría existente como módulo específico.

No se ejecutarán migraciones destructivas sobre los registros existentes.