import {
  BackSide,
  BoxGeometry,
  DoubleSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";

/**
 * Warm studio environment built from a handful of emissive light cards and
 * pre-filtered once with PMREM: glossy film and cardboard get soft, appetising
 * reflections with zero HDR download (≈ 1 ms of GPU at start-up).
 */
export function createStudioEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const scene = new Scene();
  const disposables: { dispose(): void }[] = [];
  const card = (w: number, h: number, color: string, intensity: number, position: [number, number, number], lookAt: [number, number, number] = [0, 0, 0]) => {
    const geometry = new PlaneGeometry(w, h);
    const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    scene.add(mesh);
    disposables.push(geometry, material);
  };

  // room: warm dark walls with a brighter floor bounce
  const roomGeometry = new SphereGeometry(20, 32, 16);
  const roomMaterial = new MeshBasicMaterial({ color: new Color("#3a2414"), side: BackSide });
  scene.add(new Mesh(roomGeometry, roomMaterial));
  disposables.push(roomGeometry, roomMaterial);
  const floorGeometry = new BoxGeometry(30, 0.1, 30);
  const floorMaterial = new MeshBasicMaterial({ color: new Color("#a0663a").multiplyScalar(0.7) });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.position.y = -6;
  scene.add(floor);
  disposables.push(floorGeometry, floorMaterial);

  card(10, 6, "#fff1dc", 4.2, [2, 7, 6]); // key softbox, high front-right
  card(3, 12, "#ffd38a", 3.2, [-9, 1, 2]); // gold strip, left
  card(3, 12, "#fff6e8", 2.4, [9, 0, -3]); // cream strip, right-back rim
  card(8, 3, "#cfdcff", 0.9, [-3, 4, -9]); // cool back fill keeps the film from looking flat
  card(14, 4, "#ffb066", 0.8, [0, -5, 6]); // warm bounce below

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return target; // use .texture, dispose() the target when done
}
