import { BoxGeometry, Color, CylinderGeometry, DirectionalLight, HemisphereLight, IcosahedronGeometry, InstancedMesh,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Raycaster, Scene, TorusGeometry, Vector2, Vector3,
  type BufferGeometry, type Material } from 'three';
import { gardenPointer, gardenPositions } from './garden-model.js';

export function buildGardenScene(count: number) {
  if (!Number.isInteger(count) || count < 2 || count > 4) throw new Error('The garden supports two to four explicit options');
  const scene = new Scene(), camera = new PerspectiveCamera(40, 1.35, .1, 40), raycaster = new Raycaster();
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), instances: InstancedMesh[] = [];
  const geometry = <T extends BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const material = (color: string) => { const value = new MeshStandardMaterial({ color, roughness: .9, metalness: 0, flatShading: true }); materials.add(value); return value; };
  const stone = material('#d8c9df'), edge = material('#9c8eab'), sage = material('#a4b49d'), brass = material('#ba9d73');
  const lilac = material('#9e87b7'), cream = material('#efe3cc'), water = material('#b4b9c7');
  const cylinder = geometry(new CylinderGeometry(1, 1, 1, 32)), cube = geometry(new BoxGeometry(1, 1, 1));
  const leaf = geometry(new IcosahedronGeometry(1, 1)), ring = geometry(new TorusGeometry(1, .045, 6, 40));
  function add(shape: BufferGeometry, surface: Material, position: [number, number, number], scale: [number, number, number]) {
    const mesh = new Mesh(shape, surface); mesh.position.set(...position); mesh.scale.set(...scale); scene.add(mesh); return mesh;
  }
  scene.add(new HemisphereLight('#fff8ed', '#665377', 2.4));
  const sun = new DirectionalLight('#fff0d6', 3); sun.position.set(-3, 7, 5); scene.add(sun);
  add(cylinder, edge, [0, -.15, 0], [3.52, .23, 3.52]);
  add(cylinder, stone, [0, .02, 0], [3.45, .16, 3.45]);
  add(cylinder, water, [0, .15, .05], [1, .08, 1]);
  const poolRim = add(ring, cream, [0, .2, .05], [1.05, 1.05, 1.05]); poolRim.rotation.x = -Math.PI / 2;
  const arch = geometry(new TorusGeometry(2.35, .055, 6, 48, Math.PI));
  add(arch, brass, [0, .2, -2.05], [1, 1, 1]);
  const innerArch = add(arch, lilac, [0, .2, -2.18], [.91, .91, .91]); innerArch.rotation.y = .015;
  add(cube, brass, [-2.35, .19, -2.05], [.25, .18, .3]); add(cube, brass, [2.35, .19, -2.05], [.25, .18, .3]);
  // Repeated leaves share one draw call and one geometry, with no downloaded model/texture.
  const leaves = new InstancedMesh(leaf, sage, 24), transform = new Object3D(); instances.push(leaves);
  for (let index = 0; index < 24; index++) {
    const side = index < 12 ? -1 : 1, slot = index % 12;
    transform.position.set(side * (2.2 + Math.sin(slot * 2.7) * .32), .45 + (slot % 4) * .22, -1.65 + Math.cos(slot * 1.7) * .4);
    transform.scale.set(.24, .47 + (slot % 3) * .07, .22); transform.rotation.set(.18, slot, side * .4); transform.updateMatrix();
    leaves.setMatrixAt(index, transform.matrix);
  }
  leaves.instanceMatrix.needsUpdate = true; scene.add(leaves);
  const pavers = new InstancedMesh(cylinder, cream, 7); instances.push(pavers);
  for (let index = 0; index < 7; index++) {
    transform.position.set(Math.sin(index * .7) * .18, .14, 1.32 + index * .26); transform.rotation.set(0, index, 0);
    transform.scale.set(.24, .06, .16); transform.updateMatrix(); pavers.setMatrixAt(index, transform.matrix);
  }
  pavers.instanceMatrix.needsUpdate = true; scene.add(pavers);
  const targets: Mesh[] = [], halos: Mesh[] = [], bodies: MeshStandardMaterial[] = [];
  const haloMaterial = new MeshBasicMaterial({ color: '#76518d' }); materials.add(haloMaterial);
  const colors = ['#a58cb6', '#d6bea2', '#a6b6a5', '#b8adc9'];
  const orb = geometry(new IcosahedronGeometry(.45, 2));
  for (let index = 0; index < count; index++) {
    const [x, z] = gardenPositions[index]!;
    add(cylinder, edge, [x, .3, z], [.6, .25, .6]);
    add(cylinder, cream, [x, .46, z], [.57, .09, .57]);
    const surface = material(colors[index]!); bodies.push(surface);
    const body = add(orb, surface, [x, .83, z], [.9, 1, .9]); body.userData.choiceIndex = index; targets.push(body);
    const halo = add(ring, haloMaterial, [x, .53, z], [.64, .64, .64]); halo.rotation.x = -Math.PI / 2; halo.visible = false; halos.push(halo);
  }
  let disposed = false;
  function orient(aspect: number, angle: number) {
    camera.aspect = aspect;
    const radius = aspect < 1 ? 12.2 : 10.5, theta = .23 + angle;
    camera.position.set(Math.sin(theta) * radius, 7.4, Math.cos(theta) * radius);
    camera.lookAt(0, .55, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); scene.updateMatrixWorld(true);
  }
  orient(1.35, 0);
  return { scene, camera, targets, orient,
    select(index: number) { bodies.forEach((surface, i) => { surface.emissive = new Color(i === index ? '#674c78' : '#000000'); surface.emissiveIntensity = i === index ? .3 : 0; halos[i]!.visible = i === index; }); },
    markers() { return targets.map(target => target.position.clone().add(new Vector3(0, .63, 0)).project(camera)); },
    pick(x: number, y: number, width: number, height: number) {
      const point = gardenPointer(x, y, width, height); if (!point || disposed) return null;
      raycaster.setFromCamera(new Vector2(point.x, point.y), camera);
      const hit = raycaster.intersectObjects(targets, false)[0];
      const index: unknown = hit?.object.userData.choiceIndex;
      return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < count ? index : null;
    },
    dispose() { if (disposed) return; disposed = true;
      for (const instance of instances) instance.dispose();
      for (const shape of geometries) shape.dispose(); for (const surface of materials) surface.dispose(); scene.clear();
    },
  };
}
