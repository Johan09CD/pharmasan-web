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
  esperaron: document.querySelector("#hud-esperaron"),
  filas: document.querySelector("#hud-filas"),
  wq: document.querySelector("#hud-wq"),
  preferenciales: document.querySelector("#hud-preferenciales"),
  enServicio: document.querySelector("#hud-en-servicio"),
  colaMaxima: document.querySelector("#hud-cola-maxima"),
  posicion: document.querySelector("#posicion-reproduccion"),
  alternar: document.querySelector("#alternar-reproduccion"),
  anterior: document.querySelector("#saltar-anterior"),
  siguiente: document.querySelector("#saltar-siguiente"),
  reiniciar: document.querySelector("#reiniciar-reproduccion"),
  velocidad: document.querySelector("#velocidad-reproduccion"),
  valorVelocidad: document.querySelector("#valor-velocidad"),
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
  let corridas = [];
  let resumen = null;
  let instantes = [];
  let duracionTotal = 0;
  let tiempoGlobal = 0;
  let corridaActual = -1;
  let corridaEnPausa = null;
  let temporizador;
  let ultimaMarca;

  function detener() {
    if (temporizador !== undefined) {
      window.clearInterval(temporizador);
      temporizador = undefined;
    }
    hud.alternar.textContent = "Reproducir";
    ultimaMarca = undefined;
  }

  function mostrarTiempo() {
    if (corridas.length === 0) {
      return;
    }

    tiempoGlobal = Math.max(0, Math.min(duracionTotal, tiempoGlobal));
    let indiceCorrida =
      corridaEnPausa ??
      corridas.findIndex(
        (corrida, indice) =>
          tiempoGlobal < corrida.inicio + corrida.duracion ||
          indice === corridas.length - 1,
      );
    if (indiceCorrida < 0) {
      indiceCorrida = corridas.length - 1;
    }
    const corrida = corridas[indiceCorrida];
    if (corridaActual !== indiceCorrida) {
      escenaLocal?.actualizarCalidad(resumen.resultados.pacientes);
      escenaLocal?.cargarEventos(corrida.eventos);
      corridaActual = indiceCorrida;
    }
    const tiempoLocal = Math.max(
      0,
      Math.min(corrida.duracion, tiempoGlobal - corrida.inicio),
    );
    const eventos = corrida.eventos.filter(
      (evento) => evento.tiempo <= tiempoLocal,
    );
    const eventosPrevios = corridas
      .slice(0, indiceCorrida)
      .flatMap((elemento) => elemento.eventos);
    const llegadasPrevias = eventosPrevios
      .filter((evento) => evento.tipo === "llegada");
    const finalesPrevios = eventosPrevios
      .filter((evento) => evento.tipo === "fin_servicio");
    const llegadasActuales = eventos.filter((evento) => evento.tipo === "llegada");
    const finalesActuales = eventos.filter((evento) => evento.tipo === "fin_servicio");
    const estadoActual = eventos.at(-1)?.estado;
    const filas = estadoActual?.filas ?? {};
    const colaGeneral = (filas.General ?? []).length;
    const colaPreferencial = (filas.Preferencial ?? []).length;
    const enServicio = (estadoActual?.ventanillas ?? []).filter(
      (ventanilla) => ventanilla.ocupada,
    ).length;
    const preferenciales = [...llegadasPrevias, ...llegadasActuales].filter(
      (evento) => evento.paciente_tipo === "Preferencial",
    ).length;
    const esperaronEnEventos = [...llegadasPrevias, ...llegadasActuales].filter(
      (llegada) =>
        Object.values(llegada.estado.filas).some((ids) =>
          ids.includes(llegada.paciente_id),
        ),
    ).length;
    const colaMaxima = [...eventosPrevios, ...eventos].reduce(
      (maximo, evento) =>
        Math.max(
          maximo,
          Object.values(evento.estado.filas).reduce(
            (total, ids) => total + ids.length,
            0,
          ),
        ),
      0,
    );
    const alFinal = tiempoLocal >= corrida.duracion;
    const llegados = llegadasPrevias.length + llegadasActuales.length;
    const atendidos = finalesPrevios.length + finalesActuales.length;
    escenaLocal?.actualizarTiempo(tiempoLocal);

    hud.reloj.textContent = formatoHoraObservada(tiempoLocal);
    hud.llegados.textContent = String(alFinal ? resumen.resultados.pacientes : llegados);
    hud.atendidos.textContent = String(alFinal ? resumen.resultados.pacientes : atendidos);
    hud.esperaron.textContent = String(
      alFinal ? resumen.resultados.esperaron : esperaronEnEventos,
    );
    hud.filas.textContent = `${colaGeneral} / ${colaPreferencial}`;
    hud.wq.textContent = alFinal
      ? `${formatoMinutos.format(resumen.resultados.Wq)} min`
      : "—";
    hud.preferenciales.textContent = String(preferenciales);
    hud.enServicio.textContent = String(enServicio);
    hud.colaMaxima.textContent = String(colaMaxima);
    hud.posicion.value = String(Math.round(tiempoGlobal * 100));
    hud.estado.textContent =
      `${temporizador ? "Reproduciendo" : "Pausada"} · ` +
      `${corrida.dia} · ${formatoHoraObservada(tiempoLocal)}.`;
  }

  function saltar(cantidad) {
    if (instantes.length === 0) {
      return;
    }
    detener();
    if (corridaEnPausa !== null) {
      corridaEnPausa = null;
      corridaActual = -1;
      mostrarTiempo();
    }
    const siguiente =
      cantidad > 0
        ? instantes.find((instante) => instante > tiempoGlobal + 1e-6)
        : [...instantes].reverse().find((instante) => instante < tiempoGlobal - 1e-6);
    tiempoGlobal =
      siguiente ?? (cantidad > 0 ? duracionTotal : 0);
    corridaActual = -1;
    mostrarTiempo();
  }

  function alternar() {
    if (corridas.length === 0) {
      return;
    }
    if (temporizador !== undefined) {
      detener();
      mostrarTiempo();
      return;
    }
    if (corridaEnPausa !== null) {
      corridaEnPausa = null;
      corridaActual = -1;
      mostrarTiempo();
    }
    if (corridaActual < 0) {
      mostrarTiempo();
    }
    if (tiempoGlobal >= duracionTotal) {
      tiempoGlobal = 0;
      corridaActual = -1;
      mostrarTiempo();
    }
    hud.alternar.textContent = "Pausar";
    ultimaMarca = performance.now();
    temporizador = window.setInterval(() => {
      const ahora = performance.now();
      const incremento =
        ((ahora - ultimaMarca) / 1000) * Number(hud.velocidad.value);
      ultimaMarca = ahora;
      const corrida = corridas[corridaActual];
      const finDia = corrida?.inicio + corrida?.duracion;
      if (
        corrida &&
        corridaActual < corridas.length - 1 &&
        tiempoGlobal + incremento >= finDia
      ) {
        tiempoGlobal = finDia;
        corridaEnPausa = corridaActual;
        detener();
        mostrarTiempo();
        return;
      }
      tiempoGlobal += incremento;
      if (tiempoGlobal >= duracionTotal) {
        tiempoGlobal = duracionTotal;
        detener();
      }
      mostrarTiempo();
    }, 32);
  }

  function reiniciar() {
    detener();
    escenaLocal?.reiniciarAnimacion();
    corridaActual = -1;
    corridaEnPausa = null;
    tiempoGlobal = 0;
    hud.reloj.textContent = "08:00";
    hud.llegados.textContent = "0";
    hud.atendidos.textContent = "0";
    hud.esperaron.textContent = "0";
    hud.filas.textContent = "0 / 0";
    hud.wq.textContent = "—";
    hud.preferenciales.textContent = "0";
    hud.enServicio.textContent = "0";
    hud.colaMaxima.textContent = "—";
    hud.posicion.value = "0";
    hud.estado.textContent = "Pausada · Reproducción reiniciada.";
  }

  function cargar(corridasNuevas, resumenNuevo) {
    detener();
    corridas = [];
    resumen = resumenNuevo;
    duracionTotal = 0;
    instantes = [];
    for (const [indice, corrida] of corridasNuevas.entries()) {
      const duracion = Math.max(0, ...corrida.eventos.map((evento) => evento.tiempo));
      corridas.push({
        ...corrida,
        dia: corrida.dia ?? `Día ${indice + 1}`,
        inicio: duracionTotal,
        duracion,
      });
      for (const evento of corrida.eventos) {
        instantes.push(duracionTotal + evento.tiempo);
      }
      duracionTotal += duracion;
    }
    instantes = [...new Set(instantes)].sort((a, b) => a - b);
    tiempoGlobal = 0;
    corridaActual = -1;
    corridaEnPausa = null;
    hud.posicion.min = "0";
    hud.posicion.max = String(Math.max(0, Math.ceil(duracionTotal * 100)));
    hud.posicion.value = "0";
    hud.posicion.disabled = instantes.length === 0;
    hud.alternar.disabled = instantes.length === 0;
    hud.anterior.disabled = instantes.length === 0;
    hud.siguiente.disabled = instantes.length === 0;
    hud.reiniciar.disabled = instantes.length === 0;
    hud.velocidad.disabled = instantes.length === 0;
    mostrarTiempo();
    detener();
    mostrarTiempo();
  }

  hud.alternar.addEventListener("click", alternar);
  hud.anterior.addEventListener("click", () => saltar(-1));
  hud.siguiente.addEventListener("click", () => saltar(1));
  hud.reiniciar.addEventListener("click", reiniciar);
  hud.velocidad.addEventListener("input", () => {
    hud.valorVelocidad.value = `${hud.velocidad.value}×`;
  });
  hud.posicion.addEventListener("input", () => {
    detener();
    corridaEnPausa = null;
    corridaActual = -1;
    tiempoGlobal = Number(hud.posicion.value) / 100;
    mostrarTiempo();
  });

  return {
    alternar,
    cargar,
    saltar,
    reiniciar,
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
  contenedorEscena.addEventListener("rendimientoescena", (evento) => {
    if (evento.detail.cantidadPersonas > 0) {
      estadoEscena.textContent =
        `Escena: ${evento.detail.fps} fps medidos con carga de ` +
        `${evento.detail.cantidadPersonas} pacientes; ` +
        `${evento.detail.personasVisibles} visibles en este instante.`;
    }
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
    const corridasReproducidas = configuraciones.map((configuracion) =>
      simular(configuracion),
    );
    const pacientesReproducidos = corridasReproducidas.flatMap(
      (corrida) => corrida.pacientes,
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
    controlReproduccion.cargar(
      corridasReproducidas.map((corrida, indice) => ({
        eventos: corrida.eventos,
        dia:
          configuraciones[indice].llegadas.pacientes[0]?.dia ??
          (seleccion.dia === "Los tres" ? `Día ${indice + 1}` : seleccion.dia),
      })),
      comparacion,
    );
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
