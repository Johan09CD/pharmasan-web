# Progreso

## 2026-11-09 — Exportación de datos observados

- **Hecho:** recibido desde `pharmasan-sim` el JSON con pacientes observados,
  franja pico, conteos de llegadas, ajustes de atención y referencias Python.
- **Archivos:** `data/observados.json`, `docs/PLAN.md`, `docs/PROGRESO.md` y
  `docs/DECISIONES.md`.
- **Resultados:** 131 registros observados y 71 pacientes en pico; las cifras
  verificadas se calculan desde los datos fuente y coinciden con el contexto.
  La fase 1 de exportación queda completada.
- **Pendiente:** implementar la vista de datos observados de acuerdo con la fase 3.

## 2026-11-09 — Creación del esqueleto inicial

- **Hecho:** creada la estructura estática del proyecto, sus módulos ES vacíos,
  documentación y plan de nueve fases; incorporadas Three.js y OrbitControls
  r160 con importación local.
- **Archivos:** `index.html`, `README.md`, `AGENTS.md`, `.gitignore`,
  `src/engine/*.js` (6), `src/escena/*.js` (4), `src/ui/*` (5),
  `data/observados.json`, `vendor/three/*`, `tests/`, `.github/workflows/pages.yml`
  (marcador pendiente), `docs/PLAN.md`, `docs/PROGRESO.md` y
  `docs/DECISIONES.md`.
- **Resultados:** 9 fases registradas; 6 módulos de motor vacíos; 0 lógica de
  simulación implementada; 3 archivos locales de Three.js (biblioteca,
  OrbitControls y licencia); 16 archivos JavaScript con sintaxis válida y 4/4
  recursos verificados por HTTP local.
- **Pendiente:** exportar datos observados y abordar las fases 1–9 en orden.
