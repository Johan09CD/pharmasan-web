import assert from "node:assert/strict";
import test from "node:test";
import { crearFlujoAleatorio, mulberry32 } from "../src/engine/prng.js";

test("mulberry32 reproduce su secuencia con la misma semilla", () => {
  const primero = mulberry32(20261109);
  const segundo = mulberry32(20261109);
  assert.deepEqual(
    Array.from({ length: 8 }, () => primero()),
    Array.from({ length: 8 }, () => segundo()),
  );
});

test("los flujos de llegadas y servicio son deterministas e independientes", () => {
  const llegada = crearFlujoAleatorio(41, "llegadas");
  const servicio = crearFlujoAleatorio(41, "servicio:General");
  const llegadaRepetida = crearFlujoAleatorio(41, "llegadas");
  assert.notEqual(llegada(), servicio());
  assert.equal(crearFlujoAleatorio(41, "llegadas")(), llegadaRepetida());
  assert.throws(() => crearFlujoAleatorio("41", "llegadas"), /semilla/);
  assert.throws(() => mulberry32("41"), /semilla/);
});
