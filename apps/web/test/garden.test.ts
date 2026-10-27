import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InstancedMesh, Mesh, type BufferGeometry, type Material } from 'three';
import { reflectionGardenGraphics } from '@orai/contracts/experience';
import { gardenFrameLoop, gardenPointer, gardenTap, gardenViewport } from '../src/experience/garden-model.js';
import { buildGardenScene } from '../src/experience/garden-scene.js';

test('garden object picking stays on the same explicit slot after viewport and camera changes', () => {
  for (const count of [2, 3, 4]) {
    const garden = buildGardenScene(count);
    try {
      for (const aspect of [.65, 1, 1.5, 2]) for (const angle of [-.45, 0, .45]) {
        garden.orient(aspect, angle);
        garden.targets.forEach((target, index) => {
          const point = target.position.clone().project(garden.camera);
          assert.equal(garden.pick((point.x + 1) * 400, (1 - point.y) * 300, 800, 600), index);
        });
        for (const point of garden.markers()) assert.ok(Math.abs(point.x) < .96 && Math.abs(point.y) < .93 && point.z < 1);
      }
      assert.equal(garden.pick(-1, 20, 800, 600), null);
      assert.equal(garden.pick(10, 10, 0, 0), null);
      garden.select(2);
      assert.equal(garden.targets.length, count);
    } finally { garden.dispose(); }
    assert.equal(garden.pick(100, 100, 800, 600), null);
  }
  for (const invalid of [0, 1, 5, 2.5, NaN]) assert.throws(() => buildGardenScene(invalid));
});

test('the bundled scene respects geometry/draw budgets and disposes shared GPU resources exactly once', () => {
  const garden = buildGardenScene(4), shapes = new Set<BufferGeometry>(), surfaces = new Set<Material>();
  let triangles = 0, calls = 0, disposedShapes = 0, disposedSurfaces = 0, disposedInstances = 0;
  garden.select(0);
  garden.scene.traverse(node => {
    if (!(node instanceof Mesh)) return;
    shapes.add(node.geometry);
    for (const surface of Array.isArray(node.material) ? node.material : [node.material]) surfaces.add(surface);
    if (node.visible) {
      calls++;
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position!.count) / 3 * (node instanceof InstancedMesh ? node.count : 1);
    }
    if (node instanceof InstancedMesh) node.addEventListener('dispose', () => disposedInstances++);
  });
  for (const shape of shapes) shape.addEventListener('dispose', () => disposedShapes++);
  for (const surface of surfaces) surface.addEventListener('dispose', () => disposedSurfaces++);
  assert.ok(triangles <= reflectionGardenGraphics.maxTriangles, String(triangles));
  assert.ok(calls <= reflectionGardenGraphics.maxDrawCalls, String(calls));
  garden.dispose(); garden.dispose();
  assert.equal(disposedShapes, shapes.size); assert.equal(disposedSurfaces, surfaces.size); assert.equal(disposedInstances, 2);
  assert.equal(garden.scene.children.length, 0);
});

test('pixel budgets bound high DPR and oversized canvases; dragging and out-of-bounds taps do not select an option', () => {
  for (const [width, height] of [[390, 360], [1024, 700], [4000, 3000]]) {
    const value = gardenViewport(width!, height!, 4)!;
    assert.ok(value.width * value.height * value.pixelRatio ** 2 <= reflectionGardenGraphics.maxCanvasPixels + 1);
    assert.ok(value.pixelRatio <= reflectionGardenGraphics.maxPixelRatio);
  }
  for (const values of [[0, 100, 1], [100, -1, 1], [Infinity, 20, 1], [100, 100, 0]]) assert.equal(gardenViewport(values[0]!, values[1]!, values[2]!), null);
  assert.deepEqual(gardenPointer(50, 25, 100, 50), { x: 0, y: 0 });
  assert.equal(gardenPointer(101, 25, 100, 50), null);
  assert.equal(gardenTap({ x: 10, y: 10 }, { x: 13, y: 12 }), true);
  assert.equal(gardenTap({ x: 10, y: 10 }, { x: 40, y: 12 }), false);
});

test('on-demand frames coalesce, stop at rest/hidden state, and reject late work after disposal', () => {
  let next = 0, renders = 0, moving = false;
  const pending = new Map<number, (time: number) => void>();
  const loop = gardenFrameLoop(callback => { pending.set(++next, callback); return next; }, id => { pending.delete(id); }, () => { renders++; return moving; });
  const flush = () => { const [id, callback] = [...pending][0]!; pending.delete(id); callback(16); };
  loop.invalidate(); loop.invalidate(); assert.equal(pending.size, 1); flush(); assert.equal(renders, 1); assert.equal(pending.size, 0);
  moving = true; loop.invalidate(); flush(); assert.equal(pending.size, 1);
  loop.setVisible(false); assert.equal(pending.size, 0); loop.invalidate(); assert.equal(pending.size, 0);
  moving = false; loop.setVisible(true); assert.equal(pending.size, 1);
  const late = [...pending.values()][0]!; loop.dispose(); assert.equal(pending.size, 0);
  late(32); loop.invalidate(); loop.setVisible(true); assert.equal(renders, 2); assert.equal(pending.size, 0);
});
