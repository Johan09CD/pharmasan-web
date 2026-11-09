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
- En la comparación de 500 réplicas base, Wq fue 0,2570 min frente a 0,1535 min
  en `referencia_python.base` (diferencia 0,1034 min). Se conserva la
  parametrización solicitada: la causa probable es generar llegadas uniformes
  por conteos de cinco minutos en lugar de remuestrear interllegadas empíricas
  como hace el simulador Python.
