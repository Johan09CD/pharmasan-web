# Progreso

## 2026-11-09 — Simulación observada y comparación Python en la interfaz

- **Hecho:** conectado el botón «Volver a simular con las llegadas observadas»
  a `crearConfiguracionBase(datos)` y a 500 réplicas. El panel compara el Wq
  promedio con la referencia base exportada y resalta en verde los resultados
  dentro de su IC 95 %. No se usaron los 68 intervalos globales ni se modificó
  `data/observados.json`.
- **Archivos:** `index.html`, `src/ui/app.js`, `src/ui/estilos.css`,
  `README.md`, `docs/PLAN.md`, `docs/PROGRESO.md` y `docs/DECISIONES.md`.
- **Resultados:** semillas 20261101–20261600; Wq simulado **0,152560 min**,
  referencia Python **0,153536 min**, IC 95 % **[0,137024; 0,170048] min**.
  La interfaz mostró «Dentro del IC 95 % de Python». `node --test`: **24
  pruebas aprobadas, 0 fallidas**; sintaxis JS y `git diff --check` correctos.
- **Pendiente:** fase 4, crear la escena 3D.

## 2026-11-09 — Sincronización de intervalos de confianza de Wq

- **Hecho:** actualizado `data/observados.json` desde el exportador del
  repositorio `pharmasan-sim`, con los límites del IC 95 % del Wq medio en
  todos los escenarios, sin añadir cifras manualmente.
- **Archivos:** `data/observados.json`, `docs/PROGRESO.md` y
  `docs/DECISIONES.md`.
- **Resultados:** los intervalos del escenario base son
  `[0.137023803739987, 0.1700480084692139]`; las copias de ambos proyectos
  coinciden byte por byte. La suite Python completa pasó 71 pruebas.
- **Pendiente:** ninguno para la exportación; continuar la fase activa del plan.

## 2026-11-09 — Diagnóstico y corrección del caso base

- **Hecho:** trazada la implementación Python; aisladas las hipótesis de
  llegadas y asignación con 500 réplicas; añadido un constructor de caso base
  por grupo y una prueba estricta contra el IC 95 % Python. Se conservó la
  alternativa de conteos uniformes como `conteos_uniformes`.
- **Archivos:** `src/ui/observados.js`, `src/engine/simulador.js`,
  `tests/diagnostico_base.test.js`, `tests/simulador.test.js`,
  `data/observados.json`, `README.md`, `docs/DECISIONES.md` y
  `docs/PROGRESO.md`.
- **Resultados:** semillas 20261101–20261600, Erlang ajustado y horizonte de
  60 min en todas las variantes. Wq: uniforme + primera libre **0,256980**;
  uniforme + aleatoria **0,256980**; 68 intervalos globales + aleatoria
  **0,874050**; interllegadas Python por grupo (44 General, 21 Preferencial) +
  primera libre **0,152560**; misma configuración + aleatoria **0,152560**.
  Python: media **0,153536**, IC 95 % **[0,137024; 0,170048]**. La causa es
  remuestrear intervalos globales mezclados/uniformes en lugar de los conjuntos
  empíricos positivos independientes por grupo y día; la asignación no explica
  la diferencia observada. `node --test`: **24 pruebas aprobadas, 0 fallidas**.
- **Pendiente:** continuar la fase 3. La prueba comparativa usa el intervalo
  Python exportado y exige que la media JS de 500 réplicas caiga dentro de él.

| Variante (500 réplicas) | Wq medio (min) |
|---|---:|
| Conteos uniformes, primera libre | 0,256980 |
| Conteos uniformes, aleatoria | 0,256980 |
| 68 intervalos mezclados, aleatoria | 0,874050 |
| Interllegadas por grupo Python (44 G + 21 P), primera libre | 0,152560 |
| Interllegadas por grupo Python (44 G + 21 P), aleatoria | 0,152560 |
| Referencia Python (IC 95 %) | 0,153536 [0,137024; 0,170048] |

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
