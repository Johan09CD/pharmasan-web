import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { simular } from "../src/engine/simulador.js";
import {
  compararReproduccionObservada,
  crearConfiguracionesReproduccion,
  cifrasVerificadas,
  seleccionarPacientesObservados,
} from "../src/ui/reproduccion-observados.js";

const datos = JSON.parse(
  await readFile(new URL("../data/observados.json", import.meta.url), "utf8"),
);

function reproducir(seleccion) {
  return crearConfiguracionesReproduccion(datos, seleccion).flatMap((configuracion) =>
    simular(configuracion).pacientes,
  );
}

test("selecciona día y tramo desde los pacientes y el índice de pico exportados", () => {
  const dias = ["Lunes", "Martes", "Viernes"];
  for (const dia of dias) {
    const seleccion = seleccionarPacientesObservados(datos, {
      dia,
      tramo: "hora_pico",
    });
    assert.ok(seleccion.length > 0);
    assert.ok(seleccion.every((paciente) => paciente.dia === dia));
    assert.ok(seleccion.every((paciente) => datos.pico.includes(paciente.id)));
  }

  const picoTresDias = seleccionarPacientesObservados(datos, {
    dia: "Los tres",
    tramo: "hora_pico",
  });
  const jornadaTresDias = seleccionarPacientesObservados(datos, {
    dia: "Los tres",
    tramo: "jornada_completa",
  });
  assert.equal(picoTresDias.length, 71);
  assert.equal(jornadaTresDias.length, 131);
});

test("configura replay de las observaciones por día sin combinar días en una sola corrida", () => {
  const configuraciones = crearConfiguracionesReproduccion(datos, {
    dia: "Los tres",
    tramo: "hora_pico",
  });

  assert.equal(configuraciones.length, 3);
  assert.deepEqual(
    configuraciones.map((configuracion) => configuracion.llegadas.pacientes[0].dia),
    ["Lunes", "Martes", "Viernes"],
  );
  assert.ok(
    configuraciones.every(
      (configuracion) =>
        configuracion.llegadas.modo === "replay" &&
        configuracion.llegadas.ventanilla_observada === true &&
        Number.isInteger(configuracion.semilla),
    ),
  );
});

test("muestra 71 pacientes, 7 esperas y Wq de 0,155 min contra cifras verificadas", () => {
  const seleccion = { dia: "Los tres", tramo: "hora_pico" };
  const comparacion = compararReproduccionObservada(
    datos,
    seleccion,
    reproducir(seleccion),
  );

  assert.equal(comparacion.resultados.pacientes, 71);
  assert.equal(comparacion.resultados.esperaron, 7);
  assert.equal(comparacion.wqCorridaTexto, "0,155 min");
  assert.equal(comparacion.wqReferenciaTexto, "0,155 min");
  assert.equal(comparacion.coincide, true);
  assert.match(comparacion.frase, /Coincide/);
  assert.deepEqual(
    comparacion.filas.map((fila) => fila.diferencia),
    [0, 0, 0],
  );
  assert.ok(
    comparacion.filas.every((fila) =>
      fila.fuente.startsWith("Cifras verificadas"),
    ),
  );
});

test("reproduce jornada completa y expone las cifras exportadas para el panel", () => {
  const seleccion = { dia: "Los tres", tramo: "jornada_completa" };
  const comparacion = compararReproduccionObservada(
    datos,
    seleccion,
    reproducir(seleccion),
  );

  assert.equal(comparacion.resultados.pacientes, 131);
  assert.equal(comparacion.resultados.esperaron, 15);
  assert.equal(comparacion.coincide, true);
  assert.equal(cifrasVerificadas(datos).length, 17);
  assert.equal(
    datos.cifras_verificadas["Pacientes totales / en pico"],
    "131 / 71",
  );
});

test("identifica discrepancias y ofrece una explicación para la marca ámbar", () => {
  const seleccion = { dia: "Los tres", tramo: "hora_pico" };
  const pacientes = reproducir(seleccion);
  pacientes[0] = { ...pacientes[0], espera: pacientes[0].espera + 1 };
  const comparacion = compararReproduccionObservada(
    datos,
    seleccion,
    pacientes,
  );

  assert.equal(comparacion.coincide, false);
  assert.match(comparacion.frase, /Difiere/);
  assert.ok(comparacion.filas.some((fila) => !fila.coincide));
});
