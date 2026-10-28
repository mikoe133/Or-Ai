import { WebGLRenderer, SRGBColorSpace } from 'three';
import { reflectionGardenGraphics } from '@orai/contracts/experience';
import { gardenFrameLoop, gardenTap, gardenViewport } from './garden-model.js';
import { buildGardenScene } from './garden-scene.js';

export function mountGarden(canvas: HTMLCanvasElement, markers: HTMLButtonElement[], options: {
  onPick: (index: number) => void; onReady: () => void; onFailure: () => void;
}) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const garden = buildGardenScene(markers.length);
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (error) { garden.dispose(); throw error; }
  renderer.outputColorSpace = SRGBColorSpace; renderer.setClearColor('#ede6ef', 0);
  let disposed = false, failed = false, ready = false, disabled = false, angle = 0, targetAngle = 0, aspect = 1.35;
  let start: { x: number; y: number; angle: number; id: number; dragged: boolean } | null = null;
  const fail = () => { if (disposed || failed) return; failed = true; loop.dispose(); options.onFailure(); };
  const loop = gardenFrameLoop(callback => requestAnimationFrame(callback), id => cancelAnimationFrame(id), () => {
    if (failed || renderer.getContext().isContextLost()) { fail(); return false; }
    try {
      angle = motion.matches ? targetAngle : angle + (targetAngle - angle) * .24;
      if (Math.abs(targetAngle - angle) < .001) angle = targetAngle;
      garden.orient(aspect, angle); renderer.render(garden.scene, garden.camera);
      if (renderer.info.render.calls > reflectionGardenGraphics.maxDrawCalls || renderer.info.render.triangles > reflectionGardenGraphics.maxTriangles) { fail(); return false; }
      const points = garden.markers();
      markers.forEach((marker, index) => { const point = points[index]!;
        marker.style.left = `${(point.x + 1) * 50}%`; marker.style.top = `${(1 - point.y) * 50}%`;
        marker.style.visibility = Math.abs(point.x) > .96 || Math.abs(point.y) > .93 || point.z > 1 ? 'hidden' : 'visible';
      });
      canvas.dataset.drawCalls = String(renderer.info.render.calls); canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.pixelWidth = String(canvas.width); canvas.dataset.pixelHeight = String(canvas.height);
      if (!ready) { ready = true; options.onReady(); }
      return angle !== targetAngle;
    } catch { fail(); return false; }
  });
  const resize = () => {
    if (disposed || failed) return;
    const box = canvas.getBoundingClientRect(), size = gardenViewport(box.width, box.height, devicePixelRatio || 1);
    if (!size) return;
    try { aspect = box.width / box.height; renderer.setPixelRatio(size.pixelRatio); renderer.setSize(size.width, size.height, false); loop.invalidate(); }
    catch { fail(); }
  };
  const lost = (event: Event) => { event.preventDefault(); fail(); };
  const visibility = () => { loop.setVisible(!document.hidden); if (!document.hidden) resize(); };
  const down = (event: PointerEvent) => {
    if (disabled || failed || !event.isPrimary || event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, angle: targetAngle, id: event.pointerId, dragged: false }; canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.id || disabled) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) start.dragged = true;
    if (Math.abs(event.clientX - start.x) > 7) { targetAngle = Math.max(-.45, Math.min(.45, start.angle - (event.clientX - start.x) * .003)); loop.invalidate(); }
  };
  const up = (event: PointerEvent) => {
    const began = start; start = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!began || began.id !== event.pointerId || disabled || failed || !gardenTap(began, { x: event.clientX, y: event.clientY })) return;
    const box = canvas.getBoundingClientRect(), index = garden.pick(event.clientX - box.left, event.clientY - box.top, box.width, box.height);
    if (index !== null) options.onPick(index);
  };
  const cancel = () => { start = null; };
  let observer: ResizeObserver | null = null;
  const dispose = () => { if (disposed) return; disposed = true; loop.dispose(); observer?.disconnect();
    canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
    document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', resize);
    garden.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
  try {
    observer = new ResizeObserver(resize); observer.observe(canvas);
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel);
    document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', resize);
    visibility(); resize();
  } catch (error) { dispose(); throw error; }
  return { update(selected: number, value: boolean) { disabled = value; if (disabled) start = null; garden.select(selected); loop.invalidate(); },
    turn(direction: number) { if (disabled || failed) return; targetAngle = Math.max(-.45, Math.min(.45, targetAngle + direction * .18)); loop.invalidate(); },
    dispose,
  };
}
