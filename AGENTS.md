# Reglas del proyecto

- Aplicación web estática con HTML, CSS y módulos ES, sin frameworks ni paso de
  compilación. Debe funcionar servida como archivos estáticos.
- Three.js se conserva localmente en `vendor/three/`, con versión fija r160. La
  aplicación no depende de CDN durante la ejecución.
- Interfaz, comentarios, mensajes de error y nombres de pruebas en español.
- No inventar datos: los números proceden de `data/observados.json` o de una
  corrida reproducible del motor.
- Toda aleatoriedad usa una semilla explícita y un PRNG propio. No usar
  `Math.random()`.
- Cada módulo del motor debe tener pruebas con `node --test` en `tests/`.
- Al terminar cada tarea, agregar una entrada al inicio de
  `docs/PROGRESO.md` con fecha, trabajo realizado, archivos, resultados
  cuantificados y pendientes; registrar las decisiones en `docs/DECISIONES.md`
  y crear un commit claro.
