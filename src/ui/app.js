import { correrReplicas } from "../engine/replicas.js";
import { crearConfiguracionBase } from "./observados.js";

const boton = document.querySelector("#simular-observados");
const estado = document.querySelector("#estado");
const resultados = document.querySelector("#resultados");
const valorWq = document.querySelector("#wq-simulado");
const referenciaWq = document.querySelector("#wq-referencia");
const intervaloReferencia = document.querySelector("#ic-referencia");
const comparacion = document.querySelector("#comparacion");
const numeroReplicas = 500;
const formatoMinutos = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function mostrarError(error) {
  estado.textContent = `No fue posible ejecutar la simulación: ${error.message}`;
  estado.className = "estado estado-error";
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

function presentarResultados(resumen, referencia) {
  const wq = resumen.resumen.Wq.media;
  const dentroDelIntervalo =
    wq >= referencia.wq_ic95_inferior && wq <= referencia.wq_ic95_superior;

  valorWq.textContent = `${formatoMinutos.format(wq)} min`;
  referenciaWq.textContent = `${formatoMinutos.format(referencia.wq_min)} min`;
  intervaloReferencia.textContent =
    `${formatoMinutos.format(referencia.wq_ic95_inferior)}–` +
    `${formatoMinutos.format(referencia.wq_ic95_superior)} min`;
  comparacion.textContent = dentroDelIntervalo
    ? "Dentro del IC 95 % de Python"
    : "Fuera del IC 95 % de Python";
  comparacion.className = dentroDelIntervalo
    ? "comparacion comparacion-correcta"
    : "comparacion comparacion-fuera";
  resultados.hidden = false;
}

let datosObservados;
let referenciaBase;
let numeroCorrida = 0;

boton.addEventListener("click", async () => {
  if (!datosObservados || !referenciaBase) {
    return;
  }

  boton.disabled = true;
  estado.textContent = `Ejecutando ${numeroReplicas} réplicas con las interllegadas observadas por grupo y día…`;
  estado.className = "estado";
  await new Promise((resolver) => setTimeout(resolver, 0));

  try {
    const semilla =
      datosObservados.meta.semilla_usada + numeroCorrida * numeroReplicas;
    const configuracion = crearConfiguracionBase(datosObservados, semilla);
    const resumen = correrReplicas(configuracion, numeroReplicas);
    presentarResultados(resumen, referenciaBase);
    numeroCorrida += 1;
    estado.textContent =
      `Simulación completada: ${numeroReplicas} réplicas, semillas ` +
      `${resumen.semillas[0]}–${resumen.semillas.at(-1)}.`;
    estado.className = "estado estado-correcto";
  } catch (error) {
    mostrarError(error);
  } finally {
    boton.disabled = false;
  }
});

try {
  datosObservados = await cargarDatosObservados();
  referenciaBase = obtenerReferenciaBase(datosObservados);
  boton.disabled = false;
  estado.textContent =
    "Datos y referencia Python cargados. La simulación remuestrea por separado las interllegadas de cada grupo y día.";
} catch (error) {
  mostrarError(error);
}
