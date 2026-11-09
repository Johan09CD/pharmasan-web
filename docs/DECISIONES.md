# Decisiones

- La aplicación se entrega como archivos estáticos y módulos ES nativos, sin
  framework ni compilación.
- Three.js se fija en r160 y se conserva en `vendor/three/`; la ejecución no
  debe depender de una red o CDN.
- `OrbitControls.js` importa `three.module.js` mediante una ruta relativa para
  que funcione como módulo ES local sin resolución de paquetes ni CDN.
- El esqueleto no contiene lógica de simulación ni datos observados inventados.
- Se usarán un PRNG propio con semilla explícita y pruebas de Node.js para cada
  módulo del motor cuando se implemente.
- El plan define nueve fases ordenadas; el despliegue de GitHub Pages queda para
  la última fase.
- El archivo `.github/workflows/pages.yml` se mantiene como marcador sin
  configuración hasta la fase de despliegue.
- `data/observados.json` se genera en `pharmasan-sim` desde el CSV procesado y
  las tablas de análisis/escenarios existentes; la web consume ese artefacto
  sin mantener una copia manual de las cifras.
- El calendario procesa `fin_servicio` antes que `llegada` en empates; las
  réplicas usan Mulberry32 y flujos separados para llegadas, servicio por grupo
  y asignación de ventanillas.
- `conteos` elige un día entre los registros observados disponibles y genera
  tiempos dentro de cada intervalo de cinco minutos. `replay` puede reproducir
  horarios y ventanillas observados si se activa esa opción explícitamente.
- El caso base del simulador Python remuestrea interllegadas positivas por tipo
  y día, usa servicios Erlang, horizonte de 60 min y la regla de asignación
  elegida por `ejecutar_experimentos`. La fila exportada del escenario base
  confirma 500 réplicas y asignación `aleatoria`.
- El caso base web reproduce la generación de interllegadas Python a partir de
  pacientes pico, separadas por grupo y día; no remuestrea los 68 intervalos
  globales mezclados (incluyen un intervalo cero y saltos entre grupos que
  Python excluye). Los ajustes Erlang y el horizonte proceden de los datos y el
  código Python. `conteos_uniformes` se conserva como alternativa explícita.
- En las pruebas de 500 réplicas con semillas 20261101–20261600, Wq fue
  0,256980 min para llegadas uniformes, 0,874050 min para los 68 intervalos
  globales mezclados y 0,152560 min para interllegadas separadas por grupo.
  Cambiar `primera_libre` por `aleatoria` no cambió Wq en estas corridas. La
  referencia Python es 0,153536 min con IC 95 % [0,137024; 0,170048] min.
  La diferencia se explica por la estructura de llegadas por grupo, no por el
  servicio ni por la asignación.
- Evidencia del código Python: `pharmasan-sim/src/pharmasan_sim/simulador.py`
  (generación empírica por grupo y día, Erlang, horizonte y despacho) y
  `pharmasan-sim/src/pharmasan_sim/experimentos.py` (selección de la regla de
  asignación). La media y el IC Python se contrastaron además ejecutando 500
  réplicas sin guardar archivos y coinciden con `outputs/tablas/escenarios.csv`.
- Los límites del IC 95 % de Wq de cada escenario en `data/observados.json`
  provienen de `wq_media_ic95_inferior` y `wq_media_ic95_superior` en
  `pharmasan-sim/outputs/tablas/escenarios.csv`; el exportador Python es la
  única fuente del JSON y no se mantienen valores manuales.
