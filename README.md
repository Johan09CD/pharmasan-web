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
