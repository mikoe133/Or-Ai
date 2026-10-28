import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Mesh, OrthographicCamera, type BufferGeometry, type Material } from 'three';
import { relationshipAtlasGraphics, experienceTemplate } from '@orai/contracts/experience';
import { atlasViewport, atlasGesture } from '../src/experience/atlas-model.js';
import { buildAtlasScene } from '../src/experience/atlas-scene.js';

test('atlas uses an independent registered pair and the smaller fixed graphics budget', () => {
  const template = experienceTemplate({ renderer: { key: 'relationship-atlas-prototype', version: 1 },
    report: { renderer: { key: 'atlas-notes-prototype', version: 1 } } });
  assert.equal(template?.presentation, 'webgl_3d');
  assert.equal(template?.limits.maxTotalResourceBytes, 512 * 1024);
  assert.equal(experienceTemplate({ renderer: { key: 'relationship-atlas-prototype', version: 1 },
    report: { renderer: { key: 'garden-notes', version: 1 } } }), undefined);
});

test('atlas has a fixed orthographic camera, bounded geometry and stable 2–4 semantic picks at every viewport', () => {
  for (const count of [2, 3, 4]) {
    const atlas = buildAtlasScene(count);
    try {
      assert.ok(atlas.camera instanceof OrthographicCamera);
      const position = atlas.camera.position.clone(), quaternion = atlas.camera.quaternion.clone();
      for (const aspect of [.55, 1, 1.5, 2.4]) {
        atlas.resize(aspect);
        assert.deepEqual(atlas.camera.position, position);
        assert.deepEqual(atlas.camera.quaternion.toArray(), quaternion.toArray());
        for (const [index, target] of atlas.targets.entries()) {
          const point = target.position.clone().project(atlas.camera);
          assert.equal(atlas.pick((point.x + 1) * 400, (1 - point.y) * 300, 800, 600), index);
        }
        for (const point of atlas.markers()) assert.ok(Math.abs(point.x) < .95 && Math.abs(point.y) < .9 && point.z < 1);
      }
      atlas.select(count - 1);
      let triangles = 0, calls = 0;
      atlas.scene.traverse(node => {
        if (node instanceof Mesh && node.visible) { calls++;
          triangles += (node.geometry.index?.count ?? node.geometry.attributes.position!.count) / 3; }
      });
      assert.ok(triangles <= relationshipAtlasGraphics.maxTriangles);
      assert.ok(calls <= relationshipAtlasGraphics.maxDrawCalls);
      assert.equal(atlas.pick(-1, 2, 800, 600), null);
      assert.equal(atlas.pick(1, 2, 0, 0), null);
    } finally { atlas.dispose(); }
    assert.equal(atlas.pick(100, 100, 800, 600), null);
  }
  for (const invalid of [0, 1, 5, 2.5, NaN]) assert.throws(() => buildAtlasScene(invalid));
});

test('atlas releases its own shared resources once and limits real canvas pixels', () => {
  const atlas = buildAtlasScene(4), geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  atlas.scene.traverse(node => { if (node instanceof Mesh) { geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material); } });
  let shapes = 0, surfaces = 0;
  for (const geometry of geometries) geometry.addEventListener('dispose', () => shapes++);
  for (const material of materials) material.addEventListener('dispose', () => surfaces++);
  atlas.dispose(); atlas.dispose();
  assert.equal(shapes, geometries.size); assert.equal(surfaces, materials.size);
  assert.equal(atlas.scene.children.length, 0);
  for (const [width, height] of [[390, 360], [1024, 700], [4000, 3000]]) {
    const size = atlasViewport(width!, height!, 4)!;
    assert.ok(size.width * size.height * size.pixelRatio ** 2 <= relationshipAtlasGraphics.maxCanvasPixels + 1);
    assert.ok(size.pixelRatio <= relationshipAtlasGraphics.maxPixelRatio);
  }
  for (const [width, height, dpr] of [[0, 100, 1], [100, -1, 1], [Infinity, 20, 1], [100, 100, 0]])
    assert.equal(atlasViewport(width!, height!, dpr!), null);
});

test('a drag that returns to its origin is never interpreted as a semantic choice', () => {
  const gesture = atlasGesture(10, 10);
  gesture.move(50, 10); gesture.move(10, 10);
  assert.equal(gesture.finish(10, 10), false);
  assert.equal(atlasGesture(10, 10).finish(13, 12), true);
  assert.equal(atlasGesture(10, 10).finish(40, 12), false);
});
