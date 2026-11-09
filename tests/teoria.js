export function calcularMMs(tasaLlegada, tasaServicio, servidores) {
  const carga = tasaLlegada / tasaServicio;
  const rho = tasaLlegada / (servidores * tasaServicio);
  if (rho >= 1) {
    throw new RangeError("El sistema M/M/s no es estable cuando rho >= 1.");
  }

  let suma = 0;
  for (let estado = 0; estado < servidores; estado += 1) {
    suma += carga ** estado / factorial(estado);
  }
  const terminoCola =
    (carga ** servidores / factorial(servidores)) / (1 - rho);
  const probabilidadVacio = 1 / (suma + terminoCola);
  const probabilidadEspera = terminoCola * probabilidadVacio;
  const Wq = probabilidadEspera / (servidores * tasaServicio - tasaLlegada);

  return {
    rho,
    P_esperar: probabilidadEspera,
    Wq,
    Lq: tasaLlegada * Wq,
  };
}

function factorial(numero) {
  let resultado = 1;
  for (let factor = 2; factor <= numero; factor += 1) {
    resultado *= factor;
  }
  return resultado;
}
