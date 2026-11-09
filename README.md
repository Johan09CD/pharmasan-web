# Pharmasan Web

Esqueleto de una aplicación web estática para simular la atención de la
droguería Pharmasan (Bochalema). La interfaz está escrita en español y no usa
frameworks ni requiere un paso de compilación.

## Ejecución

Sirve este directorio con cualquier servidor estático y abre la dirección local
que indique. Por ejemplo:

```powershell
python -m http.server 8000
```

Después visita `http://localhost:8000`. La aplicación y Three.js se cargarán
desde archivos locales.

## Estructura

- `src/engine/`: módulos del motor.
- `src/escena/`: módulos de la escena 3D.
- `src/ui/`: interfaz.
- `data/observados.json`: datos que se exportarán en una fase posterior.
- `vendor/three/`: dependencias locales con versiones fijas.
- `tests/`: pruebas del motor con `node --test`.
- `docs/`: progreso, decisiones y fases del proyecto.

Consulta [AGENTS.md](AGENTS.md) para las reglas de desarrollo.

## Motor de eventos

Los módulos de `src/engine/` exponen `simular(configuracion)`,
`calcularMetricas(resultado, opciones)` y
`correrReplicas(configuracion, cantidad, opciones)`. La configuración es un
objeto serializable, requiere una semilla entera y admite los modos de llegada
`replay`, `conteos`, `poisson`, `intervalos` y `csv`. Las tasas y los tiempos se
expresan en minutos; los conteos de observaciones con varios días eligen un día
observado por réplica y ubican cada llegada dentro de su intervalo de cinco
minutos. `replay` acepta los registros de `data/observados.json`; para repetir
también el horario y la ventanilla observados, usa
`llegadas.ventanilla_observada: true`.

Los resultados incluyen pacientes y el estado de las filas y ventanillas tras
cada evento. Las métricas contienen utilización, promedios de cola y sistema,
espera y permanencia, probabilidad de esperar y evaluación del criterio de
servicio. Las réplicas usan semillas consecutivas e intervalos t de Student
bilaterales del 95 %.

Ejecuta todas las pruebas con:

```powershell
node --test
```
