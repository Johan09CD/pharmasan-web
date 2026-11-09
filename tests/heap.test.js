import assert from "node:assert/strict";
import test from "node:test";
import { MonticuloMinimo } from "../src/engine/heap.js";

test("el montículo ordena los eventos y prioriza fin de servicio al empatar", () => {
  const monticulo = new MonticuloMinimo();
  monticulo.insertar({ tipo: "llegada", tiempo: 3, orden: 0 });
  monticulo.insertar({ tipo: "llegada", tiempo: 2, orden: 1 });
  monticulo.insertar({ tipo: "fin_servicio", tiempo: 2, orden: 2 });
  monticulo.insertar({ tipo: "fin_servicio", tiempo: 2, orden: 3 });

  assert.deepEqual(
    Array.from({ length: 4 }, () => {
      const { tipo, tiempo, orden } = monticulo.extraerMinimo();
      return { tipo, tiempo, orden };
    }),
    [
      { tipo: "fin_servicio", tiempo: 2, orden: 2 },
      { tipo: "fin_servicio", tiempo: 2, orden: 3 },
      { tipo: "llegada", tiempo: 2, orden: 1 },
      { tipo: "llegada", tiempo: 3, orden: 0 },
    ],
  );
  assert.equal(monticulo.extraerMinimo(), undefined);
});

test("el montículo conserva el orden de inserción de prioridades iguales", () => {
  const monticulo = new MonticuloMinimo((a, b) => a - b);
  [5, 1, 4, 2, 3].forEach((valor) => monticulo.insertar(valor));
  assert.deepEqual(
    Array.from({ length: 5 }, () => monticulo.extraerMinimo()),
    [1, 2, 3, 4, 5],
  );
});
