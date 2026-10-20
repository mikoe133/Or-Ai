import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react';

const RADIUS = 500;
const CENTER = 520;
const TILT = -Math.PI / 6;
const SAMPLES = 144;
const LOOP_MS = 120_000;
const FRAME_MS = 1000 / 30;
const FIELD_BOTTOM = 40;
const FEATURED_GAP = 10;
const radians = (degrees: number) => degrees * Math.PI / 180;
type Point = readonly [number, number, number];

function surfaceLine(pointAt: (progress: number) => [number, number]): Point[] {
  return Array.from({ length: SAMPLES + 1 }, (_, sample) => {
    const [latitude, longitude] = pointAt(sample / SAMPLES);
    return [Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude), Math.cos(latitude) * Math.cos(longitude)];
  });
}

/** Cull the back surface and project the rotating sphere into a fixed SVG lens. */
function projectLine(points: Point[], angle: number) {
  let path = '', visible = false;
  const sine = Math.sin(angle), cosine = Math.cos(angle);
  for (const [x, y, z] of points) {
    const depth = y * sine + z * cosine;
    if (depth < 0) { visible = false; continue; }
    const projectedY = -(y * cosine - z * sine);
    path += `${visible ? 'L' : 'M'}${(CENTER + x * RADIUS).toFixed(2)},${(CENTER + projectedY * RADIUS).toFixed(2)}`;
    visible = true;
  }
  return path;
}

// Sample one surface once; its lower reflection rolls toward the same horizontal axis.
const grid = [
  ...Array.from({ length: 17 }, (_, index) => surfaceLine(progress => [radians(-80 + index * 10), progress * Math.PI * 2])),
  ...Array.from({ length: 24 }, (_, index) => surfaceLine(progress => [radians((progress - .5) * 168), radians(index * 15)])),
];
const restingPaths = grid.map(points => projectLine(points, TILT));

export function PerspectiveWireframes({ animated }: { animated: boolean }) {
  const field = useRef<HTMLDivElement>(null);
  const upper = useRef<SVGSVGElement>(null), lower = useRef<SVGSVGElement>(null);
  const phase = useRef(0);

  useLayoutEffect(() => {
    const element = field.current;
    const panel = element?.parentElement;
    const featured = panel?.querySelector<HTMLElement>('.store-featured');
    const toolbar = panel?.querySelector<HTMLElement>('.store-toolbar');
    if (!element || !panel || !featured) return;
    const update = () => {
      const availableBottom = Math.max(0, panel.clientHeight - FIELD_BOTTOM);
      const featuredBottom = featured.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
      element.style.top = `${Math.min(availableBottom, Math.max(0, featuredBottom + FEATURED_GAP))}px`;
      element.style.bottom = `${FIELD_BOTTOM}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(featured);
    if (toolbar) observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const upperPaths = upper.current?.querySelectorAll('path');
    const lowerPaths = lower.current?.querySelectorAll('path');
    if (!upperPaths || !lowerPaths) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileLayout = window.matchMedia('(max-width: 767px), (max-width: 1023px) and (max-height: 500px) and (orientation: landscape)');
    let frame = 0, lastTick: number | null = null, lastPaint = 0;
    const paint = (progress: number) => grid.forEach((points, index) => {
      const path = projectLine(points, TILT + progress);
      upperPaths.item(index).setAttribute('d', path);
      lowerPaths.item(index).setAttribute('d', path);
    });
    const tick = (now: number) => {
      if (lastTick !== null) phase.current = (phase.current + (now - lastTick) * Math.PI * 2 / LOOP_MS) % (Math.PI * 2);
      lastTick = now;
      if (now - lastPaint >= FRAME_MS) { paint(phase.current); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      lastTick = null;
      if (reducedMotion.matches) paint(0);
      if (animated && !reducedMotion.matches && !mobileLayout.matches && !document.hidden) frame = requestAnimationFrame(tick);
      else if (!reducedMotion.matches) paint(phase.current);
    };
    sync();
    reducedMotion.addEventListener('change', sync);
    mobileLayout.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(frame);
      reducedMotion.removeEventListener('change', sync);
      mobileLayout.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [animated]);

  return <div ref={field} className="store-wireframes" aria-hidden="true">
    <WireframeLens position="upper" svgRef={upper} />
    <WireframeLens position="lower" svgRef={lower} />
  </div>;
}

/** The fixed viewport/mask never rotates, keeping the mesh inside its own boundary. */
function WireframeLens({ position, svgRef }: { position: 'upper' | 'lower'; svgRef: RefObject<SVGSVGElement | null> }) {
  const id = useId();
  return <div className={`store-wireframe store-wireframe-${position}`} aria-hidden="true">
    <svg ref={svgRef} viewBox="0 0 1040 1040" preserveAspectRatio="none" fill="none" focusable="false">
      <defs>
        <radialGradient id={`${id}-fade`}>
          <stop offset="0" stopColor="white" stopOpacity=".6" />
          <stop offset=".52" stopColor="white" />
          <stop offset=".8" stopColor="white" stopOpacity=".6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`} x="0" y="0" width="1040" height="1040" maskUnits="userSpaceOnUse">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`}>{restingPaths.map((path, index) => <path key={index} d={path} vectorEffect="non-scaling-stroke" />)}</g>
    </svg>
  </div>;
}
