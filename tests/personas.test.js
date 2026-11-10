import assert from "node:assert/strict";
import test from "node:test";
import { crearControlPersonas } from "../src/escena/personas.js";

function crearEventosPrueba() {
  const estado = (fila, ocupado) => ({
    filas: { General: fila, Preferencial: [] },
    ventanillas: [
      {
        id: 1,
        ocupada: Boolean(ocupado),
        paciente: ocupado ?? null,
        tipo: ocupado ? "General" : null,
      },
    ],
  });
  return [
    {
      tipo: "llegada",
      tiempo: 0,
      paciente_id: "G1",
      paciente_tipo: "General",
      estado: estado([], "G1"),
    },
    {
      tipo: "llegada",
      tiempo: 0.5,
      paciente_id: "G2",
      paciente_tipo: "General",
      estado: estado(["G2"], "G1"),
    },
    {
      tipo: "fin_servicio",
      tiempo: 2,
      paciente_id: "G1",
      paciente_tipo: "General",
      estado: estado([], "G2"),
    },
    {
      tipo: "fin_servicio",
      tiempo: 4,
      paciente_id: "G2",
      paciente_tipo: "General",
      estado: estado([], null),
    },
  ];
}

function congelarProfundo(valor) {
  if (valor && typeof valor === "object" && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    Object.values(valor).forEach(congelarProfundo);
  }
  return valor;
}

test("la animación de personas no modifica el registro ni las métricas", () => {
  const eventos = congelarProfundo(crearEventosPrueba());
  const metricas = congelarProfundo({ n: 2, Wq: 0.75, Lq: 0.2 });
  const control = crearControlPersonas();
  const metricasAntes = structuredClone(metricas);

  control.cargar(eventos);
  for (const tiempo of [0.06, 0.25, 1, 2.1, 3.5, 4.1]) {
    control.actualizar(tiempo);
  }

  assert.deepEqual(metricas, metricasAntes);
  assert.equal(eventos.length, 4);
});

test("las posiciones y transiciones se derivan de los eventos del motor", () => {
  const control = crearControlPersonas();
  control.cargar(crearEventosPrueba());

  const antesDeLlegar = control.actualizar(-0.1);
  assert.deepEqual(antesDeLlegar.personas, []);

  const entrando = control.actualizar(0.06);
  assert.equal(entrando.personas.length, 1);
  assert.equal(entrando.personas[0].id, "G1");
  assert.ok(entrando.personas[0].posicion[0] < -4.65);

  const enServicio = control.actualizar(0.25);
  assert.deepEqual(enServicio.personas[0].posicion, [-4.65, 0, -0.75]);
  assert.equal(enServicio.personas[0].estado, "servicio");

  const enFila = control.actualizar(1);
  const pacienteEnFila = enFila.personas.find((persona) => persona.id === "G2");
  assert.deepEqual(pacienteEnFila.posicion, [-6.33, 0, 0.43]);

  const saliendo = control.actualizar(2.1);
  const pacienteQueSale = saliendo.personas.find((persona) => persona.id === "G1");
  assert.equal(pacienteQueSale.estado, "salida");
  assert.ok(pacienteQueSale.posicion[0] < -4.65);
});

test("reiniciar devuelve el estado de personas al inicio", () => {
  const control = crearControlPersonas();
  const estadoInicial = control.obtenerEstado();
  control.cargar(crearEventosPrueba());
  control.actualizar(3.2);

  assert.deepEqual(control.reiniciar(), estadoInicial);
  assert.equal(control.obtenerCantidad(), 0);
});
