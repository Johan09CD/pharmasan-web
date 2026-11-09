import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { correrReplicas } from "../src/engine/replicas.js";
import { crearConfiguracionBase } from "../src/ui/observados.js";

test("cada hipótesis del caso base se compara con 500 réplicas y semillas fijas", async () => {
  const datos = JSON.parse(
    await readFile(new URL("../data/observados.json", import.meta.url), "utf8"),
  );
  const referencia = datos.referencia_python.escenarios.find(
    (escenario) => escenario.escenario === "base",
  );
  const basePython = crearConfiguracionBase(datos);
  const cantidadPreferencial = datos.pacientes
    .filter((paciente) => datos.pico.includes(paciente.id))
    .filter((paciente) => paciente.tipo === "Preferencial").length;
  const cantidadPico = datos.pico.length;
  const uniforme = {
    ...basePython,
    llegadas: {
      modo: "conteos_uniformes",
      intervalos: datos.llegadas.conteos_5_min,
    },
  };
  const uniformePrimeraLibre = {
    ...uniforme,
    asignacion_libres: "primera_libre",
  };
  const uniformeAleatoria = {
    ...uniforme,
    asignacion_libres: "aleatoria",
  };
  const intervalosGlobales = {
    ...basePython,
    llegadas: {
      modo: "intervalos",
      intervalos_min: datos.llegadas.tiempos_entre_llegadas_pico.map(
        (registro) => registro.intervalo_min,
      ),
      proporcion_preferencial: cantidadPreferencial / cantidadPico,
    },
  };
  const porGrupoPrimeraLibre = {
    ...basePython,
    asignacion_libres: "primera_libre",
  };
  const variantes = [
    ["a) uniforme actual + primera libre", uniformePrimeraLibre],
    ["a) uniforme actual + aleatoria", uniformeAleatoria],
    ["b) 68 intervalos globales + aleatoria", intervalosGlobales],
    ["c) intervalos Python por grupo + primera libre", porGrupoPrimeraLibre],
    ["c) intervalos Python por grupo + aleatoria", basePython],
  ];
  const tabla = [];

  for (const [hipotesis, configuracion] of variantes) {
    const resultado = correrReplicas(configuracion, 500);
    tabla.push({
      hipótesis: hipotesis,
      Wq_min: resultado.resumen.Wq.media,
      IC95_inferior: resultado.resumen.Wq.ic95.inferior,
      IC95_superior: resultado.resumen.Wq.ic95.superior,
    });
  }

  console.table(tabla);
  assert.ok(tabla[0].Wq_min > referencia.wq_ic95_superior);
  assert.equal(tabla[0].Wq_min, tabla[1].Wq_min);
  assert.ok(tabla[2].Wq_min > referencia.wq_ic95_superior);
  assert.equal(tabla[3].Wq_min, tabla[4].Wq_min);
  assert.ok(
    tabla[4].Wq_min >= referencia.wq_ic95_inferior &&
      tabla[4].Wq_min <= referencia.wq_ic95_superior,
  );
});
