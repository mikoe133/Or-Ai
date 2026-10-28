import { relationshipAtlasGraphics } from '@orai/contracts/experience';

export function atlasViewport(width: number, height: number, dpr: number) {
  if (![width, height, dpr].every(Number.isFinite) || width <= 0 || height <= 0 || dpr <= 0) return null;
  const w = Math.max(1, Math.min(1600, Math.round(width))), h = Math.max(1, Math.min(1000, Math.round(height)));
  return { width: w, height: h, pixelRatio: Math.min(dpr, relationshipAtlasGraphics.maxPixelRatio,
    Math.sqrt(relationshipAtlasGraphics.maxCanvasPixels / (w * h))) };
}

// Track the whole gesture: returning to the press point cannot turn a drag into a choice.
export function atlasGesture(x: number, y: number) {
  let dragged = false;
  const move = (nextX: number, nextY: number) => { if (Math.hypot(nextX - x, nextY - y) > 7) dragged = true; };
  return { move, finish(nextX: number, nextY: number) { move(nextX, nextY); return !dragged; } };
}
