const DIAS_PERMITIDOS = ["Lunes", "Martes", "Viernes"];
const TRAMOS_PERMITIDOS = ["hora_pico", "jornada_completa"];

function validarSeleccion(datos, seleccion = {}) {
  const dia = seleccion.dia ?? "Los tres";
  const tramo = seleccion.tramo ?? "hora_pico";

  if (dia !== "Los tres" && !DIAS_PERMITIDOS.includes(dia)) {
    throw new RangeError(`Día observado desconocido: ${dia}.`);
  }
  if (!TRAMOS_PERMITIDOS.includes(tramo)) {
    throw new RangeError(`Tramo observado desconocido: ${tramo}.`);
  }
  if (
    !Array.isArray(datos?.pacientes) ||
    !Array.isArray(datos?.pico) ||
    !datos?.cifras_verificadas
  ) {
    throw new TypeError("Faltan pacientes, pico o cifras verificadas exportadas.");
  }

  return { dia, tramo };
}

export function seleccionarPacientesObservados(datos, seleccion = {}) {
  const { dia, tramo } = validarSeleccion(datos, seleccion);
  const dias = dia === "Los tres" ? DIAS_PERMITIDOS : [dia];
  const idsPico = new Set(datos.pico);

  return datos.pacientes.filter(
    (paciente) =>
      dias.includes(paciente.dia) &&
      (tramo === "jornada_completa" || idsPico.has(paciente.id)),
  );
}

export function crearConfiguracionesReproduccion(datos, seleccion = {}) {
  const { dia, tramo } = validarSeleccion(datos, seleccion);
  const dias = dia === "Los tres" ? DIAS_PERMITIDOS : [dia];
  const semilla = datos.meta?.semilla_usada;
  if (!Number.isInteger(semilla)) {
    throw new TypeError("Los datos observados requieren una semilla entera exportada.");
  }
  const idsPico = new Set(datos.pico);

  return dias.map((diaObservado, indice) => ({
    ventanillas: [
      { id: 1, nombre: "Ventanilla 1", atiende: ["General"] },
      { id: 2, nombre: "Ventanilla 2", atiende: ["General"] },
      { id: 3, nombre: "Ventanilla 3", atiende: ["Preferencial"] },
    ],
    llegadas: {
      modo: "replay",
      pacientes: datos.pacientes.filter(
        (paciente) =>
          paciente.dia === diaObservado &&
          (tramo === "jornada_completa" || idsPico.has(paciente.id)),
      ),
      ventanilla_observada: true,
    },
    disciplina: "FIFO",
    colas: "separadas",
    semilla: semilla + indice,
  }));
}

function promedio(valores) {
  return valores.length
    ? valores.reduce((suma, valor) => suma + valor, 0) / valores.length
    : 0;
}

function formatearDecimal(valor, digitos = 3) {
  return valor.toFixed(digitos).replace(".", ",");
}

function obtenerFuenteVerificada(datos, seleccion, indicador) {
  if (seleccion.dia !== "Los tres") {
    return `Registros observados de ${seleccion.dia}`;
  }

  if (indicador === "Wq" && seleccion.tramo === "jornada_completa") {
    return (
      `Promedio de los registros observados de jornada completa; cifras ` +
      `verificadas de contexto: ${datos.cifras_verificadas["Espera media (pico / resto de jornada)"]}`
    );
  }

  const claves = {
    pacientes:
      seleccion.tramo === "hora_pico"
        ? "Pacientes totales / en pico"
        : "Pacientes totales / en pico",
    esperaron: "Pacientes que esperaron (todos / pico)",
    Wq: "Espera media (pico / resto de jornada)",
  };
  const clave = claves[indicador];
  const cifra = datos.cifras_verificadas[clave];
  if (typeof cifra !== "string") {
    throw new Error(`Falta la cifra verificada «${clave}» en los datos exportados.`);
  }
  return `Cifras verificadas · ${clave}: ${cifra}`;
}

export function compararReproduccionObservada(datos, seleccion, pacientesCorrida) {
  const seleccionNormalizada = validarSeleccion(datos, seleccion);
  const pacientesReferencia = seleccionarPacientesObservados(
    datos,
    seleccionNormalizada,
  );
  const idsSeleccionados = new Set(pacientesReferencia.map((paciente) => paciente.id));
  const pacientes = pacientesCorrida.filter((paciente) =>
    idsSeleccionados.has(paciente.id),
  );
  if (pacientes.length !== pacientesReferencia.length) {
    throw new Error(
      `La reproducción devolvió ${pacientes.length} de ${pacientesReferencia.length} pacientes seleccionados.`,
    );
  }

  const esperaronReferencia = pacientesReferencia.filter(
    (paciente) => paciente.espera_min > 0,
  ).length;
  const esperaronCorrida = pacientes.filter((paciente) => paciente.espera > 0).length;
  const wqReferencia = promedio(
    pacientesReferencia.map((paciente) => paciente.espera_min),
  );
  const wqCorrida = promedio(pacientes.map((paciente) => paciente.espera));
  const referencias = {
    pacientes: pacientesReferencia.length,
    esperaron: esperaronReferencia,
    Wq: wqReferencia,
  };
  const resultados = {
    pacientes: pacientes.length,
    esperaron: esperaronCorrida,
    Wq: wqCorrida,
  };
  const filas = Object.keys(referencias).map((indicador) => {
    const referencia = referencias[indicador];
    const corrida = resultados[indicador];
    const diferencia = corrida - referencia;
    return {
      indicador,
      referencia,
      corrida,
      diferencia,
      fuente: obtenerFuenteVerificada(datos, seleccionNormalizada, indicador),
      coincide:
        indicador === "Wq"
          ? Math.abs(diferencia) < 1e-9
          : diferencia === 0,
    };
  });

  return {
    pacientes,
    referencias,
    resultados,
    filas,
    coincide: filas.every((fila) => fila.coincide),
    frase: filas.every((fila) => fila.coincide)
      ? "Coincide: se reprodujeron las llegadas, ventanillas e inicios y duraciones de atención observados."
      : "Difiere: revise el tramo y los días seleccionados; la reproducción debe conservar los registros exportados.",
    wqReferenciaTexto: `${formatearDecimal(wqReferencia)} min`,
    wqCorridaTexto: `${formatearDecimal(wqCorrida)} min`,
  };
}

export function formatoHoraObservada(minuto) {
  const total = 8 * 60 + minuto;
  const horas = Math.floor(total / 60) % 24;
  const minutos = Math.floor(total % 60);
  const segundos = Math.round((total - Math.floor(total)) * 60);
  if (segundos === 60) {
    return formatoHoraObservada(Math.ceil(minuto));
  }
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}${
    segundos ? `:${String(segundos).padStart(2, "0")}` : ""
  }`;
}

export function cifrasVerificadas(datos) {
  return Object.entries(datos.cifras_verificadas);
}
