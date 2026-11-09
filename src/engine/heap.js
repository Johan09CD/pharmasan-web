export function compararEventos(a, b) {
  if (a.tiempo !== b.tiempo) {
    return a.tiempo - b.tiempo;
  }

  const prioridadA = a.tipo === "fin_servicio" ? 0 : 1;
  const prioridadB = b.tipo === "fin_servicio" ? 0 : 1;

  return prioridadA - prioridadB || a.orden - b.orden;
}

export class MonticuloMinimo {
  constructor(comparar = compararEventos) {
    this.elementos = [];
    this.comparar = comparar;
  }

  get longitud() {
    return this.elementos.length;
  }

  insertar(valor) {
    const elementos = this.elementos;
    elementos.push(valor);
    let indice = elementos.length - 1;

    while (indice > 0) {
      const padre = Math.floor((indice - 1) / 2);
      if (this.comparar(elementos[padre], valor) <= 0) {
        break;
      }
      elementos[indice] = elementos[padre];
      indice = padre;
    }

    elementos[indice] = valor;
  }

  extraerMinimo() {
    if (this.elementos.length === 0) {
      return undefined;
    }

    const minimo = this.elementos[0];
    const ultimo = this.elementos.pop();

    if (this.elementos.length > 0 && ultimo !== undefined) {
      this.elementos[0] = ultimo;
      let indice = 0;
      const elementos = this.elementos;

      while (true) {
        const izquierdo = indice * 2 + 1;
        const derecho = izquierdo + 1;
        let menor = indice;

        if (
          izquierdo < elementos.length &&
          this.comparar(elementos[izquierdo], elementos[menor]) < 0
        ) {
          menor = izquierdo;
        }
        if (
          derecho < elementos.length &&
          this.comparar(elementos[derecho], elementos[menor]) < 0
        ) {
          menor = derecho;
        }
        if (menor === indice) {
          break;
        }

        [elementos[indice], elementos[menor]] = [
          elementos[menor],
          elementos[indice],
        ];
        indice = menor;
      }
    }

    return minimo;
  }
}
