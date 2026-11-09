import { simular } from "../engine/simulador.js";
import { correrReplicas } from "../engine/replicas.js";
import { crearLocal3D } from "../escena/local3d.js";
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
const contenedorEscena = document.querySelector("#escena-local");
const estadoEscena = document.querySelector("#estado-escena");
const hud = {
  reloj: document.querySelector("#hud-reloj"),
  llegados: document.querySelector("#hud-llegados"),
  atendidos: document.querySelector("#hud-atendidos"),
  filas: document.querySelector("#hud-filas"),
  wq: document.querySelector("#hud-wq"),
  preferenciales: document.querySelector("#hud-preferenciales"),
  enServicio: document.querySelector("#hud-en-servicio"),
  colaMaxima: document.querySelector("#hud-cola-maxima"),
  posicion: document.querySelector("#posicion-reproduccion"),
  alternar: document.querySelector("#alternar-reproduccion"),
  anterior: document.querySelector("#saltar-anterior"),
  siguiente: document.querySelector("#saltar-siguiente"),
  estado: document.querySelector("#estado-reproduccion"),
};
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

function crearControlReproduccion() {
  let instantes = [];
  let pacientes = [];
  let indice = 0;
  let temporizador;

  function detener() {
    if (temporizador !== undefined) {
      window.clearInterval(temporizador);
      temporizador = undefined;
    }
    hud.alternar.textContent = "Reproducir";
    hud.estado.textContent = "Pausada · Espacio: reproducir/pausar · ←/→: saltar · 1/2/3: vistas.";
  }

  function mostrarInstante() {
    if (instantes.length === 0) {
      return;
    }

    const tiempo = instantes[indice];
    const llegados = pacientes.filter((paciente) => paciente.llegada <= tiempo);
    const atendidos = pacientes.filter((paciente) => paciente.fin <= tiempo);
    const esperando = llegados.filter((paciente) => paciente.inicio > tiempo);
    const enServicio = llegados.filter(
      (paciente) => paciente.inicio <= tiempo && paciente.fin > tiempo,
    );
    const preferenciales = llegados.filter(
      (paciente) => paciente.tipo === "Preferencial",
    );
    const esperaPromedio =
      llegados.length === 0
        ? 0
        : llegados.reduce((suma, paciente) => suma + paciente.espera, 0) /
          llegados.length;
    const colaGeneral = esperando.filter(
      (paciente) => paciente.tipo === "General",
    ).length;
    const colaPreferencial = esperando.filter(
      (paciente) => paciente.tipo === "Preferencial",
    ).length;

    hud.reloj.textContent = formatoHoraObservada(tiempo);
    hud.llegados.textContent = String(llegados.length);
    hud.atendidos.textContent = String(atendidos.length);
    hud.filas.textContent = `${colaGeneral} / ${colaPreferencial}`;
    hud.wq.textContent = `${formatoMinutos.format(esperaPromedio)} min`;
    hud.preferenciales.textContent = String(preferenciales.length);
    hud.enServicio.textContent = String(enServicio.length);
    hud.colaMaxima.textContent = String(esperando.length);
    hud.posicion.value = String(indice);
    hud.estado.textContent =
      `${temporizador ? "Reproduciendo" : "Pausada"} · ` +
      `${indice + 1} de ${instantes.length} instantes.`;
  }

  function saltar(cantidad) {
    if (instantes.length === 0) {
      return;
    }
    detener();
    indice = Math.max(0, Math.min(instantes.length - 1, indice + cantidad));
    mostrarInstante();
  }

  function alternar() {
    if (instantes.length === 0) {
      return;
    }
    if (temporizador !== undefined) {
      detener();
      mostrarInstante();
      return;
    }
    if (indice >= instantes.length - 1) {
      indice = 0;
      mostrarInstante();
    }
    hud.alternar.textContent = "Pausar";
    hud.estado.textContent = "Reproduciendo los instantes de llegada y atención…";
    temporizador = window.setInterval(() => {
      if (indice >= instantes.length - 1) {
        detener();
        mostrarInstante();
        return;
      }
      indice += 1;
      mostrarInstante();
    }, 140);
  }

  function cargar(pacientesSeleccionados) {
    detener();
    pacientes = pacientesSeleccionados;
    instantes = [
      ...new Set(
        pacientes.flatMap((paciente) => [
          paciente.llegada,
          paciente.inicio,
          paciente.fin,
        ]),
      ),
    ].sort((a, b) => a - b);
    indice = 0;
    hud.posicion.min = "0";
    hud.posicion.max = String(Math.max(0, instantes.length - 1));
    hud.posicion.value = "0";
    hud.posicion.disabled = instantes.length === 0;
    hud.alternar.disabled = instantes.length === 0;
    hud.anterior.disabled = instantes.length === 0;
    hud.siguiente.disabled = instantes.length === 0;
    mostrarInstante();
    detener();
    mostrarInstante();
  }

  hud.alternar.addEventListener("click", alternar);
  hud.anterior.addEventListener("click", () => saltar(-1));
  hud.siguiente.addEventListener("click", () => saltar(1));
  hud.posicion.addEventListener("input", () => {
    detener();
    indice = Number(hud.posicion.value);
    mostrarInstante();
  });

  return {
    alternar,
    cargar,
    saltar,
  };
}

let datosObservados;
let referenciaBase;
let numeroCorrida = 0;
let escenaLocal;
const controlReproduccion = crearControlReproduccion();

try {
  escenaLocal = crearLocal3D(contenedorEscena);
  escenaLocal.actualizarCalidad(0);
  estadoEscena.textContent = escenaLocal.obtenerEstado().calidadReducida
    ? "Calidad reducida automáticamente para este dispositivo."
    : "Maqueta lista: 60 espacios de fila, 12 sillas y controles orbitales.";
  document.querySelectorAll("[data-vista]").forEach((boton) => {
    boton.addEventListener("click", () => {
      try {
        escenaLocal.establecerVista(boton.dataset.vista);
        document
          .querySelectorAll("[data-vista]")
          .forEach((elemento) => elemento.setAttribute("aria-pressed", "false"));
        boton.setAttribute("aria-pressed", "true");
      } catch (error) {
        estadoEscena.textContent = `No fue posible cambiar la vista: ${error.message}`;
        estadoEscena.className = "estado estado-error";
      }
    });
  });
  contenedorEscena.addEventListener("calidadescena", (evento) => {
    estadoEscena.textContent = evento.detail.reducida
      ? `Calidad reducida automáticamente para ${evento.detail.cantidadPersonas} personas.`
      : "Maqueta lista: 60 espacios de fila, 12 sillas y controles orbitales.";
  });
  document
    .querySelector('[data-vista="isometrica"]')
    .setAttribute("aria-pressed", "true");
  document.addEventListener("keydown", (evento) => {
    const objetivo = evento.target;
    if (
      objetivo instanceof HTMLElement &&
      (objetivo.isContentEditable ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "SUMMARY"].includes(
          objetivo.tagName,
        ))
    ) {
      return;
    }

    if (evento.code === "Space") {
      evento.preventDefault();
      controlReproduccion.alternar();
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      controlReproduccion.saltar(-1);
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      controlReproduccion.saltar(1);
    } else if (["1", "2", "3"].includes(evento.key)) {
      const vista = { "1": "cenital", "2": "isometrica", "3": "frontal" }[
        evento.key
      ];
      escenaLocal.establecerVista(vista);
      document
        .querySelectorAll("[data-vista]")
        .forEach((boton) =>
          boton.setAttribute(
            "aria-pressed",
            String(boton.dataset.vista === vista),
          ),
        );
    }
  });
} catch (error) {
  estadoEscena.textContent = `No fue posible cargar la maqueta 3D local: ${error.message}`;
  estadoEscena.className = "estado estado-error";
}

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
    escenaLocal?.actualizarCalidad(comparacion.pacientes.length);
    controlReproduccion.cargar(comparacion.pacientes);
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
