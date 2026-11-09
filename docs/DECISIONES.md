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
- El modo «Volver a simular con las llegadas observadas» construye cada tanda
  con `crearConfiguracionBase(datos)` y corre 500 réplicas; no usa los 68
  intervalos globales. La primera tanda parte de `meta.semilla_usada` y cada
  nueva tanda avanza 500 semillas. El panel compara el promedio Wq con el
  escenario base de `referencia_python.escenarios` y sus límites exportados
  `wq_ic95_inferior`/`wq_ic95_superior`; solo el resultado dentro del intervalo
  se marca en verde. No se editaron manualmente los datos exportados.
- «Reproducir lo observado» filtra por día y por los IDs de `pico` exportados
  (o muestra la jornada completa) y conserva para cada paciente llegada,
  ventanilla, inicio y atención reales mediante el modo `replay` existente.
  Cuando se seleccionan los tres días, cada uno se simula en una corrida aparte
  para no tratar como simultáneos eventos de jornadas distintas. La referencia
  seleccionada se calcula desde los registros observados; sus agregados
  coinciden con `cifras_verificadas` para la selección de los tres días.
  Diferencias nulas se indican en verde; si la corrida no coincide, se muestra
  el valor de diferencia en ámbar y una explicación. La tabla de pacientes y
  la línea de tiempo usan la salida de replay, con carriles separados por día
  y ventanilla. `data/observados.json` y los módulos del motor no se editan.
- La maqueta 3D es esquemática, no a escala: no se recibieron fotos/medidas;
  la distribución acordada ubica la puerta a la izquierda de las ventanillas
  y la espera al frente. El mostrador queda al fondo, con V1/V2 General y V3
  Adulto Mayor. Se reservan 30 marcas de fila por grupo, separadas por postes
  y cintas, y 12 sillas fuera de las filas. Las cuatro vistas predefinidas
  comparten OrbitControls; geometrías, materiales, estantería, postes, marcas y
  sillas usan caché o instancing. El render se limita a 30 fps; a partir de
  120 personas se reduce el pixel ratio y se desactivan sombras. No se animan
  personas en esta fase. El rendimiento de 30 fps es el objetivo de diseño y
  debe medirse en equipos de destino.
- El diseño pasa a priorizar PC: a partir de 1280 px usa una cuadrícula de
  escena principal y columna lateral fija; el panel lateral puede desplazarse
  internamente cuando hay resultados extensos, sin desplazar la escena ni la
  página. Bajo 768 px se apila la interfaz, el canvas ocupa 45 svh, se oculta
  el scroll horizontal del documento y los botones táctiles miden al menos
  44 px. Los indicadores esenciales del HUD quedan visibles y los secundarios
  van en un desplegable.
- Los controles de reproducción avanzan por los instantes observados de
  llegada, inicio y fin; espacio alterna reproducir/pausar, flechas saltan un
  instante y 1/2/3 cambian las vistas cenital/isométrica/frontal. El modo
  móvil impone calidad reducida (pixel ratio limitado a 0,7 y sombras
  desactivadas), además del umbral de carga de 120 personas; no hay sombras ni
  animación de pacientes. En Playwright se verificó el encuadre 1366×768 y
  390×844: sin solapamiento de escena/HUD y sin overflow horizontal. El
  objetivo de 30 fps aún requiere medirlo en equipos reales.
