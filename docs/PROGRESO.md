# Progreso

## 2026-11-09 — Motor de eventos discretos

- **Hecho:** implementados PRNG Mulberry32 con flujos separados, montículo de
  eventos, distribuciones, simulación de colas, métricas y réplicas con IC t de
  Student; añadidas pruebas de reproducibilidad, teoría y replay observado.
- **Archivos:** `src/engine/*.js` (6), `tests/*.js` (8), `README.md`,
  `docs/PLAN.md`, `docs/DECISIONES.md` y `docs/PROGRESO.md`.
- **Resultados:** `node --test`: 22 pruebas aprobadas, 0 fallidas; M/M/1 y M/M/2
  dentro del IC 95 % para Wq y Lq; 131 llegadas reproducidas, 71 en pico,
  Wq pico 0,155 min y 7 esperas. En 500 réplicas base, Wq=0,2570 min frente a
  0,1535 min de referencia (diferencia 0,1034 min).
- **Pendiente:** revisar la diferencia de llegadas entre los conteos uniformes
  por intervalos de cinco minutos y el remuestreo de interllegadas Python; no
  se ajustaron parámetros para forzar la coincidencia. Continuar fase 3.

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
