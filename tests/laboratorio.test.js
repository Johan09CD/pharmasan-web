import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { correrReplicas } from "../src/engine/replicas.js";
import { crearPreajusteLaboratorio, crearConfiguracionLaboratorio, validarEntradaLaboratorio, PREAJUSTES_LABORATORIO } from "../src/ui/laboratorio.js";

const datos = JSON.parse(
  await readFile(new URL("../data/observados.json", import.meta.url), "utf8"),
);
const semilla = datos.meta.semilla_usada;

function estadoActual() {
  return crearPreajusteLaboratorio(
    "Actual (2 generales + 1 preferencial)",
    datos,
    semilla,
  );
}

test("valida límites de pacientes, ventanillas, distribuciones y criterio", () => {
  const entrada = estadoActual();
  assert.deepEqual(validarEntradaLaboratorio(entrada, datos).errores, []);

  const unaVentanilla = {
    ...entrada,
    ventanillas: [
      {
        id: 1,
        nombre: "Única",
        atiende: ["General", "Preferencial"],
      },
    ],
  };
  assert.deepEqual(validarEntradaLaboratorio(unaVentanilla, datos).errores, []);
  const ochoVentanillas = {
    ...entrada,
    ventanillas: Array.from({ length: 8 }, (_, indice) => ({
      id: indice + 1,
      nombre: `Ventanilla ${indice + 1}`,
      atiende: ["General", "Preferencial"],
    })),
  };
  assert.deepEqual(validarEntradaLaboratorio(ochoVentanillas, datos).errores, []);

  const demasiadasVentanillas = {
    ...entrada,
    ventanillas: Array.from({ length: 9 }, (_, indice) => ({
      id: indice + 1,
      nombre: `Ventanilla ${indice + 1}`,
      atiende: ["General", "Preferencial"],
    })),
  };
  assert.match(
    validarEntradaLaboratorio(demasiadasVentanillas, datos).errores[0].mensaje,
    /entre 1 y 8/,
  );

  const cantidadExcesiva = {
    ...entrada,
    modoLimite: "cantidad",
    cantidadPacientes: 501,
  };
  assert.ok(
    validarEntradaLaboratorio(cantidadExcesiva, datos).errores.some(
      (error) => error.campo === "cantidadPacientes",
    ),
  );

  const servicioInvalido = {
    ...entrada,
    atencion: {
      ...entrada.atencion,
      General: { ...entrada.atencion.General, k: 0 },
    },
  };
  assert.ok(
    validarEntradaLaboratorio(servicioInvalido, datos).errores.some(
      (error) => error.campo === "atencion.General.k",
    ),
  );

  const maximoMenorQueMeta = {
    ...entrada,
    meta: 6,
    maximoTolerable: 5,
  };
  assert.ok(
    validarEntradaLaboratorio(maximoMenorQueMeta, datos).errores.some(
      (error) => error.campo === "maximoTolerable",
    ),
  );
});

test("cada preajuste crea una configuración serializable con la política esperada", () => {
  const esperado = {
    "Actual (2 generales + 1 preferencial)": {
      ventanas: 3,
      colas: "separadas",
      atiende: [["General"], ["General"], ["Preferencial"]],
    },
    "Con apoyo": {
      ventanas: 3,
      colas: "separadas",
      atiende: [["General"], ["General"], ["Preferencial", "General"]],
    },
    "Una sola cola compartida": {
      ventanas: 3,
      colas: "compartida",
      atiende: [
        ["Preferencial", "General"],
        ["Preferencial", "General"],
        ["Preferencial", "General"],
      ],
    },
    "Cuarta ventanilla": {
      ventanas: 4,
      colas: "separadas",
      atiende: [["General"], ["General"], ["Preferencial"], ["General"]],
    },
  };

  for (const nombre of PREAJUSTES_LABORATORIO) {
    const entrada = crearPreajusteLaboratorio(nombre, datos, semilla);
    const armado = crearConfiguracionLaboratorio(entrada, datos);
    assert.equal(armado.configuracion.ventanillas.length, esperado[nombre].ventanas);
    assert.equal(armado.configuracion.colas, esperado[nombre].colas);
    assert.deepEqual(
      armado.configuracion.ventanillas.map((ventanilla) => ventanilla.atiende),
      esperado[nombre].atiende,
    );
    assert.equal(armado.configuracion.asignacion_libres, "aleatoria");
    assert.equal(armado.configuracion.semilla, semilla);
    assert.equal(armado.configuracion.llegadas.modo, "intervalos");
    assert.deepEqual(
      Object.keys(armado.configuracion.llegadas.tiempos_entre_llegadas).sort(),
      ["General", "Preferencial"],
    );
    assert.ok(
      Object.values(
        armado.configuracion.llegadas.tiempos_entre_llegadas,
      ).flat().every((intervalo) => intervalo > 0),
    );
    for (const tipo of ["General", "Preferencial"]) {
      const ajuste = datos.atencion[tipo];
      assert.equal(armado.configuracion.atencion[tipo].dist, "erlang");
      assert.equal(
      armado.configuracion.atencion[tipo].media,
      ajuste.erlang.forma / ajuste.erlang.tasa,
      );
      assert.equal(armado.configuracion.atencion[tipo].k, ajuste.erlang.forma);
    }
    assert.doesNotThrow(() => JSON.stringify(armado.configuracion));
  }
});

test("admite tasas inestables con advertencia sin bloquear la configuración", () => {
  const entrada = {
    ...estadoActual(),
    modoLlegadas: "poisson",
    tasaGeneralHora: 300,
    tasaPreferencialHora: 0,
  };
  const validacion = validarEntradaLaboratorio(entrada, datos);
  assert.deepEqual(validacion.errores, []);
  assert.ok(validacion.rhoEstimado >= 1);
  assert.match(validacion.advertencias[0], /Puedes simular de todas formas/);
  assert.doesNotThrow(() => crearConfiguracionLaboratorio(entrada, datos));
});

test("genera llegadas fijas y normales reproducibles con la cantidad solicitada", () => {
  for (const modoLlegadas of ["intervalo_fijo", "intervalo_normal"]) {
    const entrada = {
      ...estadoActual(),
      modoLlegadas,
      modoLimite: "cantidad",
      cantidadPacientes: 12,
      intervaloMedia: 2,
      intervaloDesviacion: modoLlegadas === "intervalo_normal" ? 0.4 : 0,
    };
    const { configuracion } = crearConfiguracionLaboratorio(entrada, datos);
    assert.equal(configuracion.llegadas.tiempos_llegada.length, 12);
    assert.deepEqual(
      configuracion.llegadas.tiempos_llegada,
      crearConfiguracionLaboratorio(entrada, datos).configuracion.llegadas
        .tiempos_llegada,
    );
  }
});

test("limita los conteos editables a 500 llegadas y conserva grupo y día", () => {
  const entrada = {
    ...estadoActual(),
    modoLlegadas: "conteos",
    factorDemanda: 10,
    conteos: estadoActual().conteos.map((fila) => ({
      ...fila,
      llegadas: 500,
    })),
  };
  const { configuracion, advertencias } = crearConfiguracionLaboratorio(
    entrada,
    datos,
  );
  const filas = configuracion.llegadas.intervalos;
  assert.equal(
    filas.reduce((suma, fila) => suma + fila.llegadas, 0),
    500,
  );
  assert.ok(filas.every((fila) => fila.dia === entrada.diaConteos));
  assert.ok(filas.every((fila) => ["General", "Preferencial"].includes(fila.tipo)));
  assert.ok(advertencias.some((mensaje) => mensaje.includes("500 pacientes")));
});

test("el preajuste Actual reproduce el Wq base dentro del IC 95 % con 500 réplicas", () => {
  const entrada = estadoActual();
  const { configuracion } = crearConfiguracionLaboratorio(entrada, datos);
  const resumen = correrReplicas(configuracion, 500);
  const referencia = datos.referencia_python.escenarios.find(
    (escenario) => escenario.escenario === "base",
  );

  assert.ok(
    resumen.resumen.Wq.media >= referencia.wq_ic95_inferior &&
      resumen.resumen.Wq.media <= referencia.wq_ic95_superior,
    `Wq ${resumen.resumen.Wq.media} fuera del IC [${referencia.wq_ic95_inferior}, ${referencia.wq_ic95_superior}]`,
  );
});
