const TIPOS = ["General", "Preferencial"];

export function crearConfiguracionBase(datos, semilla = datos?.meta?.semilla_usada) {
  if (!datos || !Array.isArray(datos.pacientes) || !Array.isArray(datos.pico)) {
    throw new TypeError("Los datos observados deben incluir pacientes y el pico.");
  }
  if (!Number.isInteger(semilla)) {
    throw new TypeError("La configuración base requiere una semilla entera.");
  }

  const idsPico = new Set(datos.pico);
  const pacientesPico = datos.pacientes.filter((paciente) => idsPico.has(paciente.id));
  if (pacientesPico.length === 0) {
    throw new RangeError("No hay pacientes observados en el pico.");
  }

  const tiemposEntreLlegadas = Object.fromEntries(
    TIPOS.map((tipo) => {
      const intervalos = [];
      const dias = [
        ...new Set(
          pacientesPico
            .filter((paciente) => paciente.tipo === tipo)
            .map((paciente) => paciente.dia),
        ),
      ];

      for (const dia of dias) {
        const tiempos = pacientesPico
          .filter((paciente) => paciente.dia === dia && paciente.tipo === tipo)
          .map((paciente) => paciente.llegada_min)
          .sort((a, b) => a - b);
        for (let indice = 1; indice < tiempos.length; indice += 1) {
          const intervalo = tiempos[indice] - tiempos[indice - 1];
          if (intervalo > 0) {
            intervalos.push(intervalo);
          }
        }
      }

      if (intervalos.length === 0) {
        throw new RangeError(`No hay interllegadas observadas para ${tipo}.`);
      }
      return [tipo, intervalos];
    }),
  );

  const atencion = Object.fromEntries(
    TIPOS.map((tipo) => {
      const erlang = datos.atencion?.[tipo]?.erlang;
      if (
        !erlang ||
        !Number.isInteger(erlang.forma) ||
        erlang.forma < 1 ||
        !Number.isFinite(erlang.tasa) ||
        erlang.tasa <= 0
      ) {
        throw new RangeError(`No hay un ajuste Erlang válido para ${tipo}.`);
      }
      return [
        tipo,
        {
          dist: "erlang",
          media: erlang.forma / erlang.tasa,
          k: erlang.forma,
        },
      ];
    }),
  );

  return {
    ventanillas: [
      { id: 1, nombre: "Ventanilla 1", atiende: ["General"] },
      { id: 2, nombre: "Ventanilla 2", atiende: ["General"] },
      { id: 3, nombre: "Ventanilla 3", atiende: ["Preferencial"] },
    ],
    llegadas: {
      modo: "intervalos",
      tiempos_entre_llegadas: tiemposEntreLlegadas,
    },
    atencion,
    disciplina: "FIFO",
    colas: "separadas",
    asignacion_libres: "aleatoria",
    horizonte_min: 60,
    semilla,
  };
}
