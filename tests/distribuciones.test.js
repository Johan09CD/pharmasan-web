import assert from "node:assert/strict";
import test from "node:test";
import { crearGeneradorServicio } from "../src/engine/distribuciones.js";
import { crearFlujoAleatorio } from "../src/engine/prng.js";

test("la distribución constante conserva su media", () => {
  const generar = crearGeneradorServicio("constante", { media: 4 }, () => 0.5);
  assert.deepEqual(Array.from({ length: 3 }, generar), [4, 4, 4]);
});

test("las distribuciones exponencial y Erlang son positivas y reproducibles", () => {
  for (const [dist, parametros] of [
    ["exponencial", { media: 3 }],
    ["erlang", { media: 3, k: 4 }],
  ]) {
    const generar = crearGeneradorServicio(
      dist,
      parametros,
      crearFlujoAleatorio(19, dist),
    );
    const repetir = crearGeneradorServicio(
      dist,
      parametros,
      crearFlujoAleatorio(19, dist),
    );
    const muestras = Array.from({ length: 100 }, generar);
    assert.ok(muestras.every((valor) => Number.isFinite(valor) && valor > 0));
    assert.deepEqual(muestras, Array.from({ length: 100 }, repetir));
  }
});

test("la normal truncada y la empírica nunca devuelven un servicio inválido", () => {
  const normal = crearGeneradorServicio(
    "normal_truncada",
    { media: 0.2, sd: 1 },
    crearFlujoAleatorio(23, "normal"),
  );
  const empirica = crearGeneradorServicio(
    "empirica",
    { media: 2, valores: [1, 3, 5] },
    crearFlujoAleatorio(23, "empirica"),
  );
  assert.ok(Array.from({ length: 100 }, normal).every((valor) => valor > 0));
  assert.ok(
    Array.from({ length: 30 }, empirica).every((valor) => [1, 3, 5].includes(valor)),
  );
});

test("las distribuciones rechazan parámetros incompletos", () => {
  assert.throws(
    () => crearGeneradorServicio("erlang", { media: 2, k: 0 }, () => 0.5),
    /entero positivo/,
  );
  assert.throws(
    () => crearGeneradorServicio("empirica", { media: 2, valores: [] }, () => 0.5),
    /lista de duraciones/,
  );
});
