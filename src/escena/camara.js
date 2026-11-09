import { OrbitControls } from "../../vendor/three/OrbitControls.js";

const VISTAS = {
  cenital: {
    posicion: [0, 25, 0.1],
    objetivo: [0, 0, 0],
  },
  isometrica: {
    posicion: [16, 15, 19],
    objetivo: [0, 0, 0],
  },
  frontal: {
    posicion: [0, 8, 24],
    objetivo: [0, 1, 0],
  },
  fila: {
    posicion: [8.8, 7.5, 10.5],
    objetivo: [1, 0.8, 2.4],
  },
};

export function crearCamaraEscena(THREE, elemento, renderer) {
  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.07;
  controles.minDistance = 9;
  controles.maxDistance = 48;
  controles.maxPolarAngle = Math.PI * 0.48;
  controles.target.set(0, 0, 0);

  function establecerVista(nombre) {
    const vista = VISTAS[nombre];
    if (!vista) {
      throw new RangeError(`Vista de cámara desconocida: ${nombre}.`);
    }
    camara.position.set(...vista.posicion);
    controles.target.set(...vista.objetivo);
    controles.update();
  }

  function redimensionar() {
    const ancho = Math.max(1, elemento.clientWidth);
    const alto = Math.max(1, elemento.clientHeight);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    renderer.setSize(ancho, alto, false);
  }

  establecerVista("isometrica");

  return {
    camara,
    controles,
    establecerVista,
    redimensionar,
    vistas: Object.keys(VISTAS),
  };
}
