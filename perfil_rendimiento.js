/**
 * Script de perfilado del motor de personas y escena.
 * Mide tiempos de crearRecorridoDesdeEventos, obtenerFrameDesdeEventos,
 * buscarFotograma (lineal vs binaria), y reconstrucción de posiciones.
 */
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { crearRecorridoDesdeEventos, obtenerFrameDesdeEventos } from "./src/escena/personas.js";
import { simular } from "./src/engine/simulador.js";
import { crearConfiguracionesReproduccion } from "./src/ui/reproduccion-observados.js";
import { crearConfiguracionBase } from "./src/ui/observados.js";

const datos = JSON.parse(readFileSync("data/observados.json", "utf-8"));

// --- Caso 1: 131 pacientes (jornada completa, los tres días) ---
function corridasObservadas() {
  const configs = crearConfiguracionesReproduccion(datos, {
    dia: "Los tres",
    tramo: "jornada_completa",
  });
  return configs.map((c) => simular(c));
}

// --- Caso 2: ~300 pacientes sintéticos ---
function corridaSintetica300() {
  const eventos = [];
  let offset = 0;
  let seed = datos.meta.semilla_usada;
  let pacientesUnicos = new Set();
  while (pacientesUnicos.size < 300) {
    const cfg = crearConfiguracionBase(datos, seed);
    const resultado = simular(cfg);
    for (const ev of resultado.eventos) {
      const nuevoId = `S${seed}_${ev.paciente_id}`;
      pacientesUnicos.add(nuevoId);
      eventos.push({
        ...ev,
        tiempo: ev.tiempo + offset,
        paciente_id: nuevoId,
        estado: {
          ...ev.estado,
          filas: Object.fromEntries(
            Object.entries(ev.estado.filas).map(([k, v]) => [
              k,
              v.map((id) => `S${seed}_${id}`),
            ]),
          ),
          ventanillas: ev.estado.ventanillas.map((v) => ({
            ...v,
            paciente: v.paciente ? `S${seed}_${v.paciente}` : null,
          })),
        },
      });
    }
    offset += 200;
    seed += 1;
  }
  return { eventos, pacientesUnicos: pacientesUnicos.size };
}

function perfilar(nombre, eventos, numFrames) {
  console.log(`\n=== ${nombre} (${eventos.length} eventos) ===`);

  // 1. Crear recorrido
  const t0 = performance.now();
  const recorrido = crearRecorridoDesdeEventos(eventos);
  const t1 = performance.now();
  console.log(`crearRecorridoDesdeEventos: ${(t1 - t0).toFixed(2)} ms`);
  console.log(`  Fotogramas: ${recorrido.fotogramas.length}`);
  console.log(`  Pacientes únicos: ${recorrido.llegadas.size}`);

  // 2. obtenerFrameDesdeEventos N veces
  const inicio = recorrido.inicio;
  const fin = recorrido.fin;
  const paso = (fin - inicio) / numFrames;
  const tiempos = [];
  for (let i = 0; i < numFrames; i++) {
    const tiempo = inicio + paso * i;
    const t2 = performance.now();
    const frame = obtenerFrameDesdeEventos(recorrido, tiempo);
    const t3 = performance.now();
    tiempos.push({ dt: t3 - t2, personas: frame.personas.length });
  }

  const dtTotal = tiempos.reduce((s, t) => s + t.dt, 0);
  const dtPromedio = dtTotal / tiempos.length;
  const dtMax = Math.max(...tiempos.map((t) => t.dt));
  const personasPromedio =
    tiempos.reduce((s, t) => s + t.personas, 0) / tiempos.length;
  console.log(`obtenerFrameDesdeEventos (${numFrames} llamadas):`);
  console.log(`  Total: ${dtTotal.toFixed(2)} ms`);
  console.log(`  Promedio: ${dtPromedio.toFixed(4)} ms/frame`);
  console.log(`  Máximo: ${dtMax.toFixed(4)} ms`);
  console.log(`  Personas visibles (promedio): ${personasPromedio.toFixed(1)}`);

  // 3. buscarFotograma lineal aislado
  const fotogramas = recorrido.fotogramas;
  const tBusqueda0 = performance.now();
  for (let i = 0; i < numFrames; i++) {
    const tiempo = inicio + paso * i;
    let anterior = null;
    for (const f of fotogramas) {
      if (f.tiempo > tiempo) break;
      anterior = f;
    }
  }
  const tBusqueda1 = performance.now();
  console.log(`buscarFotograma lineal (${numFrames}×): ${(tBusqueda1 - tBusqueda0).toFixed(2)} ms`);

  // 4. buscarFotograma binaria
  const tBinaria0 = performance.now();
  for (let i = 0; i < numFrames; i++) {
    const tiempo = inicio + paso * i;
    let lo = 0;
    let hi = fotogramas.length - 1;
    let resultado = null;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (fotogramas[mid].tiempo <= tiempo) {
        resultado = fotogramas[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }
  const tBinaria1 = performance.now();
  console.log(`buscarFotograma binaria (${numFrames}×): ${(tBinaria1 - tBinaria0).toFixed(2)} ms`);

  return { dtPromedio, dtMax, personasPromedio };
}

console.log("Perfilado de rendimiento del motor de personas");
console.log("==============================================\n");

// Caso 1
const corridas131 = corridasObservadas();
const todosEventos131 = corridas131.flatMap((c) => c.eventos);
const totalPac131 = corridas131.reduce((s, c) => s + c.pacientes.length, 0);
console.log(`Total pacientes jornada completa: ${totalPac131}`);
perfilar("131 pacientes (jornada completa)", todosEventos131, 500);

// Caso 2
console.log("\nGenerando corrida sintética de ~300 pacientes...");
const sintetica = corridaSintetica300();
console.log(`Pacientes únicos sintéticos: ${sintetica.pacientesUnicos}`);
perfilar("~300 pacientes sintéticos", sintetica.eventos, 500);
