import { simular } from "../engine/simulador.js";
import { correrReplicas } from "../engine/replicas.js";
import { crearConfiguracionBase } from "./observados.js";
import {
  compararReproduccionObservada,
  crearConfiguracionesReproduccion,
  cifrasVerificadas,
  formatoHoraObservada,
} from "./reproduccion-observados.js";

const botonBase = document.querySelector("#simular-observados");
const botonReplay = document.querySelector("#reproducir-observado");
const estado = document.querySelector("#estado");
const estadoReplay = document.querySelector("#estado-replay");
const resultados = document.querySelector("#resultados");
const resultadosReplay = document.querySelector("#resultados-replay");
const valorWq = document.querySelector("#wq-simulado");
const referenciaWq = document.querySelector("#wq-referencia");
const intervaloReferencia = document.querySelector("#ic-referencia");
const comparacionBase = document.querySelector("#comparacion");
const selectorDia = document.querySelector("#dia-observado");
const selectorTramo = document.querySelector("#tramo-observado");
const tablaComparacion = document.querySelector("#tabla-comparacion");
const tablaPacientes = document.querySelector("#tabla-pacientes");
const listaCifras = document.querySelector("#lista-cifras");
const resumenSeleccion = document.querySelector("#resumen-seleccion");
const estadoComparacion = document.querySelector("#estado-comparacion");
const lineaTiempo = document.querySelector("#linea-tiempo");
const numeroReplicas = 500;
const formatoMinutos = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function mostrarError(elemento, error, boton) {
  elemento.textContent = `No fue posible ejecutar la operación: ${error.message}`;
  elemento.className = "estado estado-error";
  boton.disabled = false;
}

async function cargarDatosObservados() {
  const respuesta = await fetch("data/observados.json");
  if (!respuesta.ok) {
    throw new Error(
      `No se pudieron cargar los datos observados (HTTP ${respuesta.status}).`,
    );
  }
  return respuesta.json();
}

function obtenerReferenciaBase(datos) {
  const referencia = datos.referencia_python?.escenarios?.find(
    (escenario) => escenario.escenario === "base",
  );
  if (
    !referencia ||
    !Number.isFinite(referencia.wq_min) ||
    !Number.isFinite(referencia.wq_ic95_inferior) ||
    !Number.isFinite(referencia.wq_ic95_superior) ||
    referencia.wq_ic95_inferior > referencia.wq_ic95_superior
  ) {
    throw new Error(
      "Falta la referencia base de Wq o su IC 95 % en data/observados.json; debe agregarse desde el exportador de Python.",
    );
  }
  return referencia;
}

function presentarResultadosBase(resumen, referencia) {
  const wq = resumen.resumen.Wq.media;
  const dentroDelIntervalo =
    wq >= referencia.wq_ic95_inferior && wq <= referencia.wq_ic95_superior;

  valorWq.textContent = `${formatoMinutos.format(wq)} min`;
  referenciaWq.textContent = `${formatoMinutos.format(referencia.wq_min)} min`;
  intervaloReferencia.textContent =
    `${formatoMinutos.format(referencia.wq_ic95_inferior)}–` +
    `${formatoMinutos.format(referencia.wq_ic95_superior)} min`;
  comparacionBase.textContent = dentroDelIntervalo
    ? "Dentro del IC 95 % de Python"
    : "Fuera del IC 95 % de Python";
  comparacionBase.className = dentroDelIntervalo
    ? "comparacion comparacion-correcta"
    : "comparacion comparacion-fuera";
  resultados.hidden = false;
}

function formatoValor(indicador, valor) {
  return indicador === "Wq"
    ? `${formatoMinutos.format(valor)} min`
    : new Intl.NumberFormat("es-CO").format(valor);
}

function formatoDiferencia(indicador, valor) {
  const diferencia = Math.abs(valor) < 1e-9 ? 0 : valor;
  const signo = diferencia > 0 ? "+" : "";
  return indicador === "Wq"
    ? `${signo}${formatoMinutos.format(diferencia)} min`
    : `${signo}${new Intl.NumberFormat("es-CO").format(diferencia)}`;
}

function agregarCelda(fila, texto, etiqueta = "td") {
  const celda = document.createElement(etiqueta);
  celda.textContent = texto;
  fila.append(celda);
  return celda;
}

function mostrarComparacion(comparacion) {
  tablaComparacion.replaceChildren();
  for (const filaResultado of comparacion.filas) {
    const fila = document.createElement("tr");
    agregarCelda(fila, filaResultado.indicador);
    const referencia = agregarCelda(
      fila,
      formatoValor(filaResultado.indicador, filaResultado.referencia),
    );
    const fuente = document.createElement("small");
    fuente.textContent = filaResultado.fuente;
    referencia.append(fuente);
    agregarCelda(
      fila,
      formatoValor(filaResultado.indicador, filaResultado.corrida),
    );
    agregarCelda(
      fila,
      formatoDiferencia(filaResultado.indicador, filaResultado.diferencia),
    );
    tablaComparacion.append(fila);
  }

  estadoComparacion.textContent = comparacion.frase;
  estadoComparacion.className = comparacion.coincide
    ? "comparacion comparacion-correcta"
    : "comparacion comparacion-diferente";
}

function mostrarCifras(datos) {
  listaCifras.replaceChildren();
  for (const [nombre, valor] of cifrasVerificadas(datos)) {
    const termino = document.createElement("dt");
    termino.textContent = nombre;
    const descripcion = document.createElement("dd");
    descripcion.textContent = valor;
    listaCifras.append(termino, descripcion);
  }
}

function mostrarTablaPacientes(pacientes, datos) {
  const registros = new Map(datos.pacientes.map((paciente) => [paciente.id, paciente]));
  tablaPacientes.replaceChildren();
  for (const paciente of pacientes) {
    const registro = registros.get(paciente.id);
    const fila = document.createElement("tr");
    [
      paciente.id,
      registro.dia,
      paciente.tipo,
      formatoHoraObservada(paciente.llegada),
      `V${paciente.ventanilla}`,
      formatoHoraObservada(paciente.inicio),
      formatoValor("Wq", paciente.atencion).replace("Wq", ""),
      formatoValor("Wq", paciente.espera),
      formatoHoraObservada(paciente.fin),
    ].forEach((valor) => agregarCelda(fila, valor));
    tablaPacientes.append(fila);
  }
}

function crearCarril(dia, ventanilla, pacientes, maximo) {
  const contenedor = document.createElement("div");
  contenedor.className = "carril-tiempo";
  const etiqueta = document.createElement("span");
  etiqueta.className = "nombre-carril";
  etiqueta.textContent = `${dia} · Ventanilla ${ventanilla}`;
  const pista = document.createElement("div");
  pista.className = "pista-tiempo";

  for (const paciente of pacientes) {
    const barra = document.createElement("span");
    const inicio = Math.max(0, paciente.inicio);
    const fin = Math.max(inicio, paciente.fin);
    barra.className = "barra-servicio";
    barra.style.left = `${(100 * inicio) / maximo}%`;
    barra.style.width = `${Math.max((100 * (fin - inicio)) / maximo, 0.4)}%`;
    barra.title =
      `${paciente.id}: ${formatoHoraObservada(paciente.inicio)}–` +
      `${formatoHoraObservada(paciente.fin)}`;
    barra.setAttribute("aria-label", barra.title);
    pista.append(barra);
  }

  contenedor.append(etiqueta, pista);
  return contenedor;
}

function mostrarLineaTiempo(pacientes, datos) {
  const registros = new Map(datos.pacientes.map((paciente) => [paciente.id, paciente]));
  const dias = [...new Set(pacientes.map((paciente) => registros.get(paciente.id).dia))];
  const maximo = Math.max(1, ...pacientes.map((paciente) => paciente.fin));
  const carriles = new Map();
  for (const paciente of pacientes) {
    const dia = registros.get(paciente.id).dia;
    const clave = `${dia}|${paciente.ventanilla}`;
    if (!carriles.has(clave)) {
      carriles.set(clave, []);
    }
    carriles.get(clave).push(paciente);
  }

  lineaTiempo.replaceChildren();
  for (const dia of dias) {
    for (const ventanilla of [1, 2, 3]) {
      const pacientesCarril = carriles.get(`${dia}|${ventanilla}`);
      if (pacientesCarril?.length) {
        lineaTiempo.append(
          crearCarril(dia, ventanilla, pacientesCarril, maximo),
        );
      }
    }
  }

  const eje = document.createElement("div");
  eje.className = "eje-tiempo";
  for (let indice = 0; indice <= 4; indice += 1) {
    const etiqueta = document.createElement("span");
    etiqueta.textContent = formatoHoraObservada((maximo * indice) / 4);
    eje.append(etiqueta);
  }
  lineaTiempo.append(eje);
}

let datosObservados;
let referenciaBase;
let numeroCorrida = 0;

botonBase.addEventListener("click", async () => {
  if (!datosObservados || !referenciaBase) {
    return;
  }

  botonBase.disabled = true;
  estado.textContent = `Ejecutando ${numeroReplicas} réplicas con las interllegadas observadas por grupo y día…`;
  estado.className = "estado";
  await new Promise((resolver) => setTimeout(resolver, 0));

  try {
    const semilla =
      datosObservados.meta.semilla_usada + numeroCorrida * numeroReplicas;
    const configuracion = crearConfiguracionBase(datosObservados, semilla);
    const resumen = correrReplicas(configuracion, numeroReplicas);
    presentarResultadosBase(resumen, referenciaBase);
    numeroCorrida += 1;
    estado.textContent =
      `Simulación completada: ${numeroReplicas} réplicas, semillas ` +
      `${resumen.semillas[0]}–${resumen.semillas.at(-1)}.`;
    estado.className = "estado estado-correcto";
  } catch (error) {
    mostrarError(estado, error, botonBase);
  } finally {
    botonBase.disabled = false;
  }
});

botonReplay.addEventListener("click", async () => {
  if (!datosObservados) {
    return;
  }

  botonReplay.disabled = true;
  estadoReplay.textContent = "Reproduciendo los registros observados…";
  estadoReplay.className = "estado";
  await new Promise((resolver) => setTimeout(resolver, 0));

  try {
    const seleccion = {
      dia: selectorDia.value,
      tramo: selectorTramo.value,
    };
    const configuraciones = crearConfiguracionesReproduccion(
      datosObservados,
      seleccion,
    );
    const pacientesReproducidos = configuraciones.flatMap((configuracion) =>
      simular(configuracion).pacientes,
    );
    const comparacion = compararReproduccionObservada(
      datosObservados,
      seleccion,
      pacientesReproducidos,
    );
    const tramo =
      seleccion.tramo === "hora_pico"
        ? "hora pico (08:02–09:02)"
        : "jornada completa";

    mostrarComparacion(comparacion);
    mostrarCifras(datosObservados);
    mostrarTablaPacientes(comparacion.pacientes, datosObservados);
    mostrarLineaTiempo(comparacion.pacientes, datosObservados);
    resumenSeleccion.textContent =
      `${seleccion.dia} · ${tramo} · ${comparacion.resultados.pacientes} pacientes.`;
    resultadosReplay.hidden = false;
    estadoReplay.textContent =
      `Reproducción completada para ${seleccion.dia.toLowerCase()}: ` +
      `${comparacion.resultados.pacientes} pacientes.`;
    estadoReplay.className = "estado estado-correcto";
  } catch (error) {
    mostrarError(estadoReplay, error, botonReplay);
  } finally {
    botonReplay.disabled = false;
  }
});

try {
  datosObservados = await cargarDatosObservados();
  referenciaBase = obtenerReferenciaBase(datosObservados);
  if (!datosObservados.cifras_verificadas) {
    throw new Error(
      "Faltan cifras_verificadas en data/observados.json; deben agregarse desde el exportador de Python.",
    );
  }
  botonBase.disabled = false;
  botonReplay.disabled = false;
  selectorDia.disabled = false;
  selectorTramo.disabled = false;
  estado.textContent =
    "Datos y referencia Python cargados. La simulación remuestrea por separado las interllegadas de cada grupo y día.";
  estadoReplay.textContent =
    "Elige un día y un tramo para reproducir los registros observados.";
} catch (error) {
  mostrarError(estado, error, botonBase);
  estadoReplay.textContent = error.message;
  estadoReplay.className = "estado estado-error";
}
