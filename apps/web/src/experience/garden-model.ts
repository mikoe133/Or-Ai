import { reflectionGardenGraphics } from '@orai/contracts/experience';

export const gardenPositions = [[-1.7, 1.35], [1.7, 1.35], [-1.7, -1.15], [1.7, -1.15]] as const;
export function gardenViewport(width: number, height: number, pixelRatio: number) {
  if (![width, height, pixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || pixelRatio <= 0) return null;
  const w = Math.max(1, Math.min(1600, Math.round(width))), h = Math.max(1, Math.min(1000, Math.round(height)));
  return { width: w, height: h, pixelRatio: Math.min(pixelRatio, reflectionGardenGraphics.maxPixelRatio,
    Math.sqrt(reflectionGardenGraphics.maxCanvasPixels / (w * h))) };
}
export function gardenPointer(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || x < 0 || y < 0 || x > width || y > height) return null;
  return { x: x / width * 2 - 1, y: 1 - y / height * 2 };
}
export function gardenTap(start: { x: number; y: number }, end: { x: number; y: number }) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= 7;
}

// A static garden has no idle animation. Coalesce invalidations and cancel work while hidden/unmounted.
export function gardenFrameLoop(request: (callback: (time: number) => void) => number, cancel: (id: number) => void,
  render: (time: number) => boolean) {
  let frame: number | null = null, visible = true, disposed = false;
  const invalidate = () => {
    if (disposed || !visible || frame !== null) return;
    frame = request(time => { frame = null; if (!disposed && visible && render(time)) invalidate(); });
  };
  return { invalidate, setVisible(value: boolean) { visible = value;
    if (!visible && frame !== null) { cancel(frame); frame = null; } else if (visible) invalidate();
  }, dispose() { disposed = true; if (frame !== null) cancel(frame); frame = null; } };
}
