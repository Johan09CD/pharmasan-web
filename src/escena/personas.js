export const UMBRAL_META_ESPERA = 2;
export const UMBRAL_MAXIMO_ESPERA = 5;

const POSICION_ENTRADA = [-8.35, 0, 5.85];
const POSICION_SALIDA = [-9.2, 0, 5.85];
const POSICIONES_VENTANILLAS = {
  1: [-4.65, 0, -0.75],
  2: [-0.5, 0, -0.75],
  3: [4.35, 0, -0.75],
};
const DURACION_ENTRADA = 0.12;
const DURACION_CAMBIO_FILA = 0.12;
const DURACION_SALIDA = 0.35;

function clonarPosicion(posicion) {
  return [...posicion];
}

function interpolar(inicio, fin, progreso) {
  const fraccion = Math.max(0, Math.min(1, progreso));
  return inicio.map((coordenada, indice) =>
    coordenada + (fin[indice] - coordenada) * fraccion,
  );
}

function posicionFila(tipo, indice) {
  const indiceSeguro = Math.max(0, Math.min(29, indice));
  const fila = Math.floor(indiceSeguro / 5);
  const columna = indiceSeguro % 5;
  const x = tipo === "Preferencial" ? 1.12 : -6.33;
  return [x + columna * 1.31, 0, 0.43 + fila * 0.98];
}

function crearPosiciones(estado) {
  const posiciones = new Map();
  const tipos = estado.tipos ?? {};

  for (const [nombreFila, ids] of Object.entries(estado.filas ?? {})) {
    ids.forEach((id, indice) => {
      const tipo = tipos[id] ?? nombreFila;
      posiciones.set(id, {
        id,
        tipo,
        estado: "fila",
        posicion: posicionFila(tipo, indice),
        ventanilla: null,
      });
    });
  }

  for (const ventanilla of estado.ventanillas ?? []) {
    if (!ventanilla.ocupada || ventanilla.paciente === null) {
      continue;
    }
    posiciones.set(ventanilla.paciente, {
      id: ventanilla.paciente,
      tipo: ventanilla.tipo ?? tipos[ventanilla.paciente] ?? "General",
      estado: "servicio",
      posicion:
        POSICIONES_VENTANILLAS[ventanilla.id] ??
        [Number(ventanilla.id) * 2, 0, -0.75],
      ventanilla: ventanilla.id,
    });
  }
  return posiciones;
}

function validarEventos(eventos) {
  if (!Array.isArray(eventos)) {
    throw new TypeError("La animación requiere el registro de eventos del motor.");
  }
  for (const evento of eventos) {
    if (
      !Number.isFinite(evento.tiempo) ||
      !evento.estado ||
      !Array.isArray(evento.estado.ventanillas) ||
      !evento.estado.filas ||
      typeof evento.paciente_id !== "string"
    ) {
      throw new TypeError("El registro de eventos no tiene el formato esperado.");
    }
  }
}

function posicionesIguales(primera, segunda) {
  return primera.every((valor, indice) => Math.abs(valor - segunda[indice]) < 1e-8);
}

export function crearRecorridoDesdeEventos(eventos) {
  validarEventos(eventos);
  const fotogramas = [];
  const tipos = new Map();
  const llegadas = new Map();
  const inicios = new Map();
  const finales = new Map();
  const salidas = new Map();

  for (let indice = 0; indice < eventos.length; indice += 1) {
    const evento = eventos[indice];
    const anterior = fotogramas.at(-1);
    if (evento.tipo === "llegada") {
      llegadas.set(evento.paciente_id, evento.tiempo);
      if (evento.paciente_tipo) {
        tipos.set(evento.paciente_id, evento.paciente_tipo);
      }
    }
    if (evento.tipo === "fin_servicio") {
      finales.set(evento.paciente_id, evento.tiempo);
      salidas.set(evento.paciente_id, evento.tiempo);
    }

    let posiciones = crearPosiciones(evento.estado);
    for (const [id, persona] of posiciones) {
      if (persona.tipo === "General" || persona.tipo === "Preferencial") {
        tipos.set(id, persona.tipo);
      }
    }
    for (const ventanilla of evento.estado.ventanillas) {
      if (ventanilla.ocupada && !inicios.has(ventanilla.paciente)) {
        inicios.set(ventanilla.paciente, evento.tiempo);
      } else if (ventanilla.ocupada && anterior) {
        const ocupacionAnterior = anterior.ventanillas.find(
          (elemento) => String(elemento.id) === String(ventanilla.id),
        );
        if (ocupacionAnterior?.paciente !== ventanilla.paciente) {
          inicios.set(ventanilla.paciente, evento.tiempo);
        }
      }
    }

    if (evento.tipo === "fin_servicio") {
      const personaAnterior =
        anterior?.posiciones.get(evento.paciente_id) ??
        crearPosiciones(indice > 0 ? eventos[indice - 1].estado : evento.estado).get(
          evento.paciente_id,
        );
      posiciones.set(evento.paciente_id, {
        id: evento.paciente_id,
        tipo: tipos.get(evento.paciente_id) ?? personaAnterior?.tipo ?? "General",
        estado: "salida",
        posicion: clonarPosicion(POSICION_SALIDA),
        ventanilla: null,
      });
    }
    for (const [id, salida] of salidas) {
      if (evento.tiempo - salida < DURACION_SALIDA && !posiciones.has(id)) {
        posiciones.set(id, {
          id,
          tipo: tipos.get(id) ?? "General",
          estado: "salida",
          posicion: clonarPosicion(POSICION_SALIDA),
          ventanilla: null,
        });
      }
    }

    const transiciones = new Map(anterior?.transiciones ?? []);
    for (const [id, transicion] of transiciones) {
      if (evento.tiempo >= transicion.inicio + transicion.duracion) {
        transiciones.delete(id);
      }
    }
    const ids = new Set([
      ...(anterior?.posiciones.keys() ?? []),
      ...posiciones.keys(),
    ]);
    for (const id of ids) {
      const desde = anterior?.posiciones.get(id);
      const hasta = posiciones.get(id);
      if (!hasta) {
        continue;
      }
      if (!desde && id === evento.paciente_id && evento.tipo === "llegada") {
        transiciones.set(id, {
          desde: clonarPosicion(POSICION_ENTRADA),
          hasta: clonarPosicion(hasta.posicion),
          inicio: evento.tiempo,
          duracion: DURACION_ENTRADA,
        });
      } else if (desde && desde.estado === "servicio" && hasta.estado === "salida") {
        transiciones.set(id, {
          desde: clonarPosicion(desde.posicion),
          hasta: clonarPosicion(hasta.posicion),
          inicio: evento.tiempo,
          duracion: DURACION_SALIDA,
        });
      } else if (
        desde &&
        (desde.estado !== hasta.estado ||
          !posicionesIguales(desde.posicion, hasta.posicion))
      ) {
        transiciones.set(id, {
          desde: clonarPosicion(desde.posicion),
          hasta: clonarPosicion(hasta.posicion),
          inicio: evento.tiempo,
          duracion: DURACION_CAMBIO_FILA,
        });
      }
    }

    fotogramas.push({
      tiempo: evento.tiempo,
      tipoEvento: evento.tipo,
      pacienteId: evento.paciente_id,
      posiciones,
      transiciones,
      ventanillas: evento.estado.ventanillas.map((ventanilla) => ({
        id: ventanilla.id,
        ocupada: Boolean(ventanilla.ocupada),
        paciente: ventanilla.paciente,
      })),
      filas: Object.fromEntries(
        Object.entries(evento.estado.filas).map(([nombre, idsFila]) => [
          nombre,
          [...idsFila],
        ]),
      ),
    });
  }

  return {
    fotogramas,
    tipos,
    llegadas,
    inicios,
    finales,
    salidas,
    inicio: fotogramas[0]?.tiempo ?? 0,
    fin: fotogramas.at(-1)?.tiempo ?? 0,
  };
}

function buscarFotograma(fotogramas, tiempo) {
  let anterior = null;
  for (const fotograma of fotogramas) {
    if (fotograma.tiempo > tiempo) {
      break;
    }
    anterior = fotograma;
  }
  return anterior;
}

export function obtenerFrameDesdeEventos(recorrido, tiempo) {
  if (!recorrido || !Array.isArray(recorrido.fotogramas)) {
    throw new TypeError("Se requiere un recorrido construido desde eventos.");
  }
  if (!Number.isFinite(tiempo)) {
    throw new RangeError("El instante de animación debe ser finito.");
  }

  const fotograma = buscarFotograma(recorrido.fotogramas, tiempo);
  if (!fotograma) {
    return { tiempo, personas: [], ventanillas: [], filas: {} };
  }
  const personas = [];
  for (const [id, persona] of fotograma.posiciones) {
    const llegada = recorrido.llegadas.get(id);
    const salida = recorrido.salidas.get(id);
    if (
      llegada === undefined ||
      tiempo < llegada ||
      (salida !== undefined && tiempo - salida >= DURACION_SALIDA)
    ) {
      continue;
    }
    const transicion = fotograma.transiciones.get(id);
    const progreso =
      transicion && transicion.duracion > 0
        ? Math.max(
            0,
            Math.min(1, (tiempo - transicion.inicio) / transicion.duracion),
          )
        : 1;
    const posicion =
      transicion && progreso < 1
        ? interpolar(transicion.desde, transicion.hasta, progreso)
        : clonarPosicion(persona.posicion);
    const inicio = recorrido.inicios.get(id);
    const espera =
      inicio === undefined
        ? Math.max(0, tiempo - llegada)
        : Math.min(Math.max(0, inicio - llegada), Math.max(0, tiempo - llegada));
    personas.push({
      id,
      tipo: recorrido.tipos.get(id) ?? persona.tipo ?? "General",
      estado: persona.estado,
      ventanilla: persona.ventanilla,
      posicion,
      colorEspera:
        espera <= UMBRAL_META_ESPERA
          ? "verde"
          : espera <= UMBRAL_MAXIMO_ESPERA
            ? "amarillo"
            : "rojo",
    });
  }

  return {
    tiempo,
    personas,
    ventanillas: fotograma.ventanillas.map((ventanilla) => {
      const inicio = recorrido.inicios.get(ventanilla.paciente);
      const fin = recorrido.finales.get(ventanilla.paciente);
      return {
        ...ventanilla,
        progreso:
          ventanilla.ocupada && inicio !== undefined && fin > inicio
            ? Math.max(0, Math.min(1, (tiempo - inicio) / (fin - inicio)))
            : 0,
      };
    }),
    filas: fotograma.filas,
  };
}

export function crearControlPersonas() {
  let recorrido = crearRecorridoDesdeEventos([]);
  let tiempo = 0;

  function obtenerEstado() {
    return obtenerFrameDesdeEventos(recorrido, tiempo);
  }

  return {
    cargar(eventos) {
      recorrido = crearRecorridoDesdeEventos(eventos);
      tiempo = recorrido.inicio;
      return obtenerEstado();
    },
    actualizar(nuevoTiempo) {
      const estado = obtenerFrameDesdeEventos(recorrido, nuevoTiempo);
      tiempo = nuevoTiempo;
      return estado;
    },
    reiniciar() {
      recorrido = crearRecorridoDesdeEventos([]);
      tiempo = 0;
      return obtenerEstado();
    },
    obtenerEstado,
    obtenerCantidad() {
      return recorrido.llegadas.size;
    },
  };
}
