import { useLayoutEffect, useRef } from 'react';

const contour = '/assets/store/adopted-left-strip-seamless.svg';
const topContour = '/assets/store/adopted-inner-connected-top.svg';

function Slice({ className, x, y, width, height, top = false, guided = false, study = false }: {
  className: string; x: number; y: number; width: number; height: number; top?: boolean; guided?: boolean; study?: boolean;
}) {
  return <div className={`store-glass-slice ${className}`}>
    <div style={{ width, height }}>
      {study ? <svg width="1440" height="1024" style={{ left: -x, top: -y }} aria-hidden="true">{['Pale-multicolor-bottom-reflection', 'Tinted-glass-border-band', 'Outer-open-contour', 'Inner-connected-contour'].map(id => <use key={id} href={`/assets/flow/option-grid-double-contours.svg#${encodeURIComponent(id)}`} />)}</svg> : guided ? <svg width="1440" height="1024" style={{ left: -x, top: -y }} aria-hidden="true"><use href={`/assets/redemption/guided-redemption-atmosphere.svg#${encodeURIComponent('玻璃面板双描边')}`} /></svg>
        : <img src={top ? topContour : contour} alt="" width="1440" height={top ? 210 : 1024} style={{ left: -x, top: -y }} />}
    </div>
  </div>;
}

/** Keep the original Figma vectors intact; stretch straight spans between fixed corners. */
export function GlassFrame({ variant = 'store' }: { variant?: 'store' | 'guided' | 'study' }) {
  const frame = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = frame.current?.parentElement;
    const sidebar = panel?.querySelector<HTMLElement>('.store-sidebar');
    if (!panel || !sidebar) return;
    const update = () => {
      const width = panel.clientWidth, height = panel.clientHeight;
      const sidebarWidth = sidebar.clientWidth;
      panel.style.setProperty('--panel-x', String(width / 1296));
      panel.style.setProperty('--panel-y', String(height / 800));
      panel.style.setProperty('--glass-wall-y', String(Math.max(0, height - 68) / 732));
      panel.style.setProperty('--glass-top-x', String(Math.max(0, width - 64) / 1232));
      panel.style.setProperty('--glass-base-x', String(Math.max(0, width - sidebarWidth - 92) / 960));
      panel.style.setProperty('--glass-sidebar-base-x', String(Math.max(0, sidebarWidth - 48) / 196));
      panel.style.setProperty('--sidebar-x', String(sidebarWidth / 244));
      panel.style.setProperty('--store-sidebar-rendered-width', `${sidebarWidth}px`);
      panel.style.setProperty('--guided-wall-y', String(Math.max(0, height - 93.4) / 814));
      panel.style.setProperty('--guided-band-x', String(Math.max(0, width - 106) / 1190));
      panel.style.setProperty('--guided-sidebar-y', String(height / 907.4));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(sidebar);
    return () => observer.disconnect();
  }, []);

  if (variant === 'guided') return <div ref={frame} className="guided-glass-frame" aria-hidden="true"><div className="guided-glass-surface">
    <Slice className="guided-top-left" x={0} y={0} width={120} height={130} guided />
    <Slice className="guided-top-band" x={120} y={0} width={1190} height={130} guided />
    <Slice className="guided-top-right" x={1310} y={0} width={130} height={130} guided />
    <Slice className="guided-left-wall" x={0} y={130} width={120} height={814} guided />
    <Slice className="guided-right-wall" x={1310} y={130} width={130} height={814} guided />
    <Slice className="guided-bottom-left" x={0} y={944} width={120} height={80} guided />
    <Slice className="guided-bottom-band" x={120} y={944} width={1190} height={80} guided />
    <Slice className="guided-bottom-right" x={1310} y={944} width={130} height={80} guided />
  </div></div>;

  return <div ref={frame} className="store-glass-frame" aria-hidden="true"><div className="store-glass-surface">
    <Slice study={variant === 'study'} className="glass-top-left" x={0} y={0} width={100} height={210} top />
    <Slice study={variant === 'study'} className="glass-top-band" x={100} y={0} width={1232} height={210} top />
    <Slice study={variant === 'study'} className="glass-top-right" x={1332} y={0} width={108} height={210} top />
    {([
      ['glass-left', 0, 120],
      ['glass-divider', 316, 34],
      ['glass-right', 1310, 130],
    ] as const).map(([side, x, width]) => <div key={side} className="store-glass-side">
      <Slice study={variant === 'study'} className={`${side} glass-cap-top`} x={x} y={180} width={width} height={32} />
      <Slice study={variant === 'study'} className={`${side} glass-wall`} x={x} y={212} width={width} height={732} />
      <Slice study={variant === 'study'} className={`${side} glass-cap-bottom`} x={x} y={944} width={width} height={80} />
    </div>)}
    <Slice study={variant === 'study'} className="glass-sidebar-base" x={120} y={944} width={196} height={80} />
    <Slice study={variant === 'study'} className="glass-main-base" x={350} y={944} width={960} height={80} />
  </div></div>;
}
