import { useEffect, useRef } from 'react';
import { coverFor, type PreviewProduct } from './catalog';
import { Icon } from './icons';

export function StoreGreeting({ compact = false, headingLevel = 'h1' }: { compact?: boolean; headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel;
  return <section className={`store-intro${compact ? ' flow-intro-compact' : ''}`} aria-label="探索者问候">
    <div className="store-greeting"><span className="store-greeting-avatar"><Icon name="user" size={16} /></span><span><span>你好，探索者</span><small>今天，也多了解自己一点</small></span></div>
    {!compact && <div className="store-intro-copy"><Heading id="store-title">发现有趣的自己</Heading><p>从一个问题开始，看看你的生活倾向。</p></div>}
  </section>;
}

export function ProductCard({ product, onOpen, compact = false, horizontal = false }: {
  product: PreviewProduct; onOpen: (product: PreviewProduct) => void; compact?: boolean; horizontal?: boolean;
}) {
  return <button type="button" className={`store-product${compact ? ' store-product-compact' : ''}${horizontal ? ' store-product-related' : ''} tone-${product.tone}`} onClick={() => onOpen(product)} aria-label={`查看${product.name}`}>
    {compact ? <span className={`store-mini-cover tone-${product.tone}`}><span><img src={`/assets/store/mini-${product.tone}.svg`} alt="" width="242" height="190" loading="lazy" draggable="false" /></span></span>
      : <img className="store-product-art" src={coverFor(product)} width="1161" height="1355" alt="" loading="eager" draggable="false" />}
    <span className="store-product-copy">
      <span className="store-product-title">{product.name}</span>
      <span className="store-product-hook">{compact ? product.details : product.hook}</span>
      <span className="store-product-cta"><Icon name="bag" size={17} /><span className="store-price">¥ {product.price}</span>{!compact && <><span className="store-view-label">查看测试</span><Icon name="arrow" size={12} /></>}</span>
    </span>
  </button>;
}

export function useFlowPage(title: string) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · MeetMyWorld`;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { document.title = 'MeetMyWorld · 发现有趣的自己'; };
  }, [title]);
  return heading;
}

// Use original named SVG groups; source files and their paths remain intact.
export function DesignFragment({ source, id, viewBox, size = 24 }: {
  source: string; id: string; viewBox: string; size?: number;
}) {
  return <svg className="flow-design-icon" width={size} height={size} viewBox={viewBox} aria-hidden="true"><use href={`${source}#${encodeURIComponent(id)}`} /></svg>;
}
