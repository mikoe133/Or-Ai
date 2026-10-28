import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, DirectionalLight, Float32BufferAttribute,
  HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshLambertMaterial, OctahedronGeometry, OrthographicCamera,
  Raycaster, Scene, Vector2, Vector3, type Material } from 'three';

const slots = [[-1.65, 1.1], [1.65, 1.1], [-1.65, -1.1], [1.65, -1.1]] as const;

/** A fixed drafting table with real depth; positions identify options, never scores. */
export function buildAtlasScene(count: number) {
  if (!Number.isInteger(count) || count < 2 || count > 4) throw new Error('Atlas supports two to four explicit options');
  const scene = new Scene(), camera = new OrthographicCamera(-5, 5, 4, -4, .1, 40), raycaster = new Raycaster();
  camera.position.set(5.8, 8.6, 9.5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  const geometry = <T extends BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const material = (color: string) => { const value = new MeshLambertMaterial({ color, flatShading: true }); materials.add(value); return value; };
  const paper = material('#ece7de'), edge = material('#c9c1b7'), white = material('#faf8f3'), purple = material('#79618d');
  const cube = geometry(new BoxGeometry(1, 1, 1)), pin = geometry(new OctahedronGeometry(.43)), disk = geometry(new CylinderGeometry(.6, .6, .045, 24));
  function add(shape: BufferGeometry, surface: Material, position: [number, number, number], scale: [number, number, number]) {
    const mesh = new Mesh(shape, surface); mesh.position.set(...position); mesh.scale.set(...scale); scene.add(mesh); return mesh;
  }
  scene.add(new HemisphereLight('#fffaf2', '#8c8093', 2.4));
  const light = new DirectionalLight('#fff7e9', 2.5); light.position.set(-4, 9, 4); scene.add(light);
  add(cube, edge, [0, -.18, 0], [6.8, .2, 4.85]);
  add(cube, paper, [0, -.04, 0], [6.65, .1, 4.7]);
  const lines: number[] = [];
  for (let x = -3; x <= 3; x += .5) lines.push(x, .02, -2.1, x, .02, 2.1);
  for (let z = -2; z <= 2; z += .5) lines.push(-3.1, .02, z, 3.1, .02, z);
  const grid = geometry(new BufferGeometry()); grid.setAttribute('position', new Float32BufferAttribute(lines, 3));
  const ink = new LineBasicMaterial({ color: '#d2c9d5' }); materials.add(ink); scene.add(new LineSegments(grid, ink));
  add(cube, purple, [0, .045, 0], [6.15, .015, .025]);
  add(cube, purple, [0, .045, 0], [.025, .015, 4.1]);
  const targets: Mesh[] = [], surfaces: MeshLambertMaterial[] = [], halos: Mesh[] = [];
  for (let index = 0; index < count; index++) {
    const [x, z] = slots[index]!;
    add(cube, edge, [x, .13, z], [1.55, .16, 1.45]);
    add(cube, white, [x, .24, z], [1.5, .055, 1.4]);
    const surface = material(['#8b739e', '#bca585', '#8eaaa2', '#a095af'][index]!); surfaces.push(surface);
    const target = add(pin, surface, [x, .73, z], [1, 1.2, 1]); targets.push(target);
    const halo = add(disk, purple, [x, .29, z], [1, 1, 1]); halo.visible = false; halos.push(halo);
  }
  let disposed = false;
  const resize = (aspect: number) => {
    if (!Number.isFinite(aspect) || aspect <= 0 || disposed) return;
    const halfHeight = Math.max(3.35, 4.5 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
  };
  resize(1.35);
  return { scene, camera, targets, resize,
    select(index: number) { if (disposed) return;
      surfaces.forEach((surface, slot) => { surface.emissive = new Color(slot === index ? '#574265' : '#000000');
        surface.emissiveIntensity = slot === index ? .25 : 0; halos[slot]!.visible = slot === index; });
    },
    markers() { return targets.map(target => target.position.clone().add(new Vector3(0, .74, 0)).project(camera)); },
    pick(x: number, y: number, width: number, height: number) {
      if (disposed || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || x < 0 || y < 0 || x > width || y > height) return null;
      raycaster.setFromCamera(new Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
      const hit = raycaster.intersectObjects(targets, false)[0];
      return hit ? targets.indexOf(hit.object as Mesh) : null;
    },
    dispose() { if (disposed) return; disposed = true;
      for (const shape of geometries) shape.dispose(); for (const surface of materials) surface.dispose(); scene.clear();
    },
  };
}
