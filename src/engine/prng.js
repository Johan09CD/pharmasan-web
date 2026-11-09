function hashFlujo(flujo) {
  const texto = String(flujo);
  let hash = 2166136261;

  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function mulberry32(semilla) {
  if (!Number.isInteger(semilla)) {
    throw new TypeError("La semilla debe ser un entero.");
  }
  let estado = semilla >>> 0;

  return function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearFlujoAleatorio(semilla, flujo) {
  if (!Number.isInteger(semilla)) {
    throw new TypeError("La semilla debe ser un entero.");
  }

  return mulberry32((semilla ^ hashFlujo(flujo)) >>> 0);
}
