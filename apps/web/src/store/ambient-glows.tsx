import greenFloor from '/assets/store/green-floor-glow.svg?raw';
import spectrum from '/assets/store/multicolor-corner-glow.svg?raw';

const layers = [{ name: 'green', svg: greenFloor }, { name: 'spectrum', svg: spectrum }] as const;

export function AmbientGlows() {
  // Inline the unchanged local vectors so their groups move inside fixed SVG viewports.
  return layers.map(({ name, svg }) => <div key={name} className={`store-glow-layer store-glow-${name}`} dangerouslySetInnerHTML={{ __html: svg }} />);
}
