import { SRGBColorSpace, WebGLRenderer } from 'three';
import { relationshipAtlasGraphics } from '@orai/contracts/experience';
import { atlasGesture, atlasViewport } from './atlas-model.js';
import { buildAtlasScene } from './atlas-scene.js';

export function mountAtlas(canvas: HTMLCanvasElement, markers: HTMLButtonElement[], options: {
  onPick: (index: number) => void; onReady: () => void; onFailure: () => void;
}) {
  const atlas = buildAtlasScene(markers.length);
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { atlas.dispose(); throw error; }
  renderer.outputColorSpace = SRGBColorSpace;
  let disposed = false, failed = false, ready = false, disabled = false, frame: number | null = null, renders = 0;
  let pressed: { id: number; gesture: ReturnType<typeof atlasGesture> } | null = null;
  const stopFrame = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };
  const fail = () => { if (disposed || failed) return; failed = true; pressed = null; stopFrame(); options.onFailure(); };
  const invalidate = () => {
    if (disposed || failed || document.hidden || frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null; if (disposed || failed || document.hidden) return;
      try {
        if (renderer.getContext().isContextLost()) { fail(); return; }
        renderer.render(atlas.scene, atlas.camera);
        if (renderer.info.render.calls > relationshipAtlasGraphics.maxDrawCalls || renderer.info.render.triangles > relationshipAtlasGraphics.maxTriangles) { fail(); return; }
        const points = atlas.markers();
        markers.forEach((marker, index) => { const point = points[index]!;
          marker.style.left = `${(point.x + 1) * 50}%`; marker.style.top = `${(1 - point.y) * 50}%`;
        });
        Object.assign(canvas.dataset, { drawCalls: String(renderer.info.render.calls), triangles: String(renderer.info.render.triangles),
          pixelWidth: String(canvas.width), pixelHeight: String(canvas.height), frames: String(++renders), camera: 'orthographic-fixed' });
        if (!ready) { ready = true; options.onReady(); }
      } catch { fail(); }
    });
  };
  const resize = () => {
    if (disposed || failed) return;
    const box = canvas.getBoundingClientRect(), size = atlasViewport(box.width, box.height, devicePixelRatio || 1);
    if (!size) return;
    try { atlas.resize(box.width / box.height); renderer.setPixelRatio(size.pixelRatio); renderer.setSize(size.width, size.height, false); invalidate(); }
    catch { fail(); }
  };
  const visibility = () => { if (document.hidden) stopFrame(); else resize(); };
  const lost = (event: Event) => { event.preventDefault(); fail(); };
  const down = (event: PointerEvent) => {
    if (disabled || failed || !event.isPrimary || event.button !== 0) return;
    pressed = { id: event.pointerId, gesture: atlasGesture(event.clientX, event.clientY) }; canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => { if (pressed?.id === event.pointerId) pressed.gesture.move(event.clientX, event.clientY); };
  const up = (event: PointerEvent) => {
    const start = pressed; pressed = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!start || start.id !== event.pointerId || disabled || failed || !start.gesture.finish(event.clientX, event.clientY)) return;
    const box = canvas.getBoundingClientRect(), index = atlas.pick(event.clientX - box.left, event.clientY - box.top, box.width, box.height);
    if (index !== null) options.onPick(index);
  };
  const cancel = () => { pressed = null; };
  let observer: ResizeObserver | null = null;
  const dispose = () => { if (disposed) return; disposed = true; pressed = null; stopFrame(); observer?.disconnect();
    canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
    document.removeEventListener('visibilitychange', visibility); atlas.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
  try {
    observer = new ResizeObserver(resize); observer.observe(canvas);
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel);
    document.addEventListener('visibilitychange', visibility); resize();
  } catch (error) { dispose(); throw error; }
  return { update(selected: number, value: boolean) { disabled = value; if (disabled) pressed = null; atlas.select(selected); invalidate(); }, dispose };
}
