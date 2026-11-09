function numeroPositivo(valor, nombre) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError(`${nombre} debe ser positivo y finito.`);
  }
  return valor;
}

export function normalEstandar(aleatorio) {
  const u1 = Math.max(aleatorio(), Number.MIN_VALUE);
  const u2 = aleatorio();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function crearGeneradorServicio(distribucion, parametros, aleatorio) {
  if (!parametros || typeof parametros !== "object") {
    throw new TypeError("Faltan los parámetros de la distribución de servicio.");
  }
  if (typeof aleatorio !== "function") {
    throw new TypeError("La distribución requiere un generador aleatorio.");
  }

  const media = numeroPositivo(parametros.media, "La media de servicio");

  switch (distribucion) {
    case "constante":
      return () => media;
    case "exponencial":
      return () => -media * Math.log(Math.max(aleatorio(), Number.MIN_VALUE));
    case "erlang": {
      const k = parametros.k;
      if (!Number.isInteger(k) || k < 1) {
        throw new RangeError("El parámetro k de Erlang debe ser un entero positivo.");
      }
      return () => {
        let duracion = 0;
        for (let etapa = 0; etapa < k; etapa += 1) {
          duracion -= (media / k) * Math.log(Math.max(aleatorio(), Number.MIN_VALUE));
        }
        return duracion;
      };
    }
    case "normal_truncada": {
      const sd = parametros.sd;
      if (!Number.isFinite(sd) || sd < 0) {
        throw new RangeError("La desviación de servicio debe ser finita y no negativa.");
      }
      if (sd === 0) {
        return () => media;
      }
      return () => {
        let duracion;
        do {
          duracion = media + sd * normalEstandar(aleatorio);
        } while (duracion <= 0);
        return duracion;
      };
    }
    case "empirica": {
      const valores =
        parametros.valores ??
        parametros.valores_min ??
        parametros.valores_observados_min;
      if (
        !Array.isArray(valores) ||
        valores.length === 0 ||
        valores.some((valor) => !Number.isFinite(valor) || valor <= 0)
      ) {
        throw new RangeError(
          "La distribución empírica requiere una lista de duraciones positivas.",
        );
      }
      return () => valores[Math.floor(aleatorio() * valores.length)];
    }
    default:
      throw new RangeError(`Distribución de servicio desconocida: ${distribucion}.`);
  }
}
