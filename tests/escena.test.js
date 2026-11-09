import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPACIDAD_FILAS,
  FPS_OBJETIVO,
  UMBRAL_CALIDAD_REDUCIDA,
  requiereCalidadReducida,
} from "../src/escena/local3d.js";

test("la maqueta reserva 60 espacios y limita el render a 30 fps", () => {
  assert.equal(CAPACIDAD_FILAS, 60);
  assert.equal(FPS_OBJETIVO, 30);
});

test("activa calidad reducida desde 120 personas", () => {
  assert.equal(UMBRAL_CALIDAD_REDUCIDA, 120);
  assert.equal(requiereCalidadReducida(119), false);
  assert.equal(requiereCalidadReducida(120), true);
  assert.equal(requiereCalidadReducida(121), true);
});

test("rechaza cantidades de personas que no son enteros no negativos", () => {
  for (const cantidad of [-1, 1.5, Number.NaN]) {
    assert.throws(() => requiereCalidadReducida(cantidad), RangeError);
  }
});
