import { useId, type ReactNode } from 'react';
import { DesignFragment } from './primitives';

const productSource = '/assets/flow/product-detail-wide-hero-content.svg';
export const reportSource = '/assets/flow/full-report-wide-hero-content.svg';
export const dimensions = [
  { name: '家务主动性', description: ['日常事务中', '谁更主动承担'], score: 82, color: '#e8ecc0', detail: '愿意主动分担，也能看见日常任务。' },
  { name: '承诺兑现', description: ['说到的事', '是否愿意做到'], score: 76, color: '#d8b4f4', detail: '大多数约定会跟进，变化时可以更早告知。' },
  { name: '共同决策', description: ['一起面对选择', '时的协作方式'], score: 80, color: '#b3c8ff', detail: '倾向一起讨论，让双方都参与选择。' },
  { name: '沟通修复', description: ['遇到分歧后', '如何沟通与修复'], score: 68, color: '#b2ecdd', detail: '争执后需要缓冲，也需要明确的回应。' },
  { name: '边界尊重', description: ['尊重彼此的空间', '与个人节奏'], score: 88, color: '#efc2de', detail: '能为彼此保留独处与休息的空间。' },
] as const;

export function DimensionIcon({ index, report = false, size = 30 }: { index: number; report?: boolean; size?: number }) {
  const dimension = dimensions[index]!;
  const cardWidth = (1011 - 64) / 5;
  return <DesignFragment source={report ? reportSource : productSource} id={report ? `${dimension.name} · 展开解析` : `Dimension · ${dimension.name}`}
    viewBox={report ? `28 ${128 + index * 67} 26 26` : `${index * (cardWidth + 16) + cardWidth / 2 - 15} 149 30 30`} size={size} />;
}

export function InfoSymbol({ size = 22 }: { size?: number }) {
  return <DesignFragment source={productSource} id="Entertainment info" viewBox="20 17 22 22" size={size} />;
}

export function WideHero({ children, report = false }: { children: ReactNode; report?: boolean }) {
  return <section className={`wide-hero${report ? ' report-hero' : ' product-hero'}`}>
    <img className="wide-hero-art" src="/assets/store/featured-lavender.png" width="1161" height="1355" alt="" />
    <div className="wide-hero-shade" aria-hidden="true" />
    <div className="wide-hero-copy">{children}</div>
    {report && <span className="report-hero-demo">数据为设计示意</span>}
  </section>;
}

export function RadarChart({ scores }: { scores: readonly number[] }) {
  const gradient = useId();
  const center = [256, 184], radius = 105;
  const points = (values: readonly number[]) => values.map((value, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    return `${center[0]! + Math.cos(angle) * radius * value / 100},${center[1]! + Math.sin(angle) * radius * value / 100}`;
  }).join(' ');
  const labels = [[256, 42], [434, 161], [358, 313], [142, 313], [78, 161]];
  return <svg className="product-radar" width="500" height="342" viewBox="0 0 500 342" role="img" aria-label={`报告样例五维雷达图，分值范围 0 到 100：${dimensions.map((dimension, i) => `${dimension.name} ${scores[i]}`).join('，')}`}>
    <defs><linearGradient id={gradient} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#aa72d3" stopOpacity=".28" /><stop offset="1" stopColor="#d6a1ef" stopOpacity=".7" /></linearGradient></defs>
    {[20, 40, 60, 80, 100].map(level => <polygon key={level} points={points(dimensions.map(() => level))} fill="none" stroke="#92869e" strokeOpacity=".27" />)}
    {dimensions.map((dimension, index) => {
      const [x, y] = points(dimensions.map(() => 100)).split(' ')[index]!.split(',');
      return <path key={dimension.name} d={`M256 184L${x} ${y}`} stroke="#92869e" strokeOpacity=".25" />;
    })}
    <polygon points={points(scores)} fill={`url(#${gradient})`} stroke="#d9acf1" strokeWidth="2" />
    {points(scores).split(' ').map((point, i) => <circle key={i} cx={point.split(',')[0]} cy={point.split(',')[1]} r="4" fill="#f2dbfe" />)}
    {dimensions.map((dimension, index) => <g key={dimension.name}><text x={labels[index]![0]} y={labels[index]![1]} textAnchor="middle" fill="#d3cada" fontSize="13">{dimension.name}</text><text className="radar-number" x={labels[index]![0]} y={labels[index]![1]! + 22} textAnchor="middle" fill="#d9acf1" fontSize="17" fontWeight="700">{scores[index]}</text></g>)}
    <text x="256" y="333" textAnchor="middle" fill="#908898" fontSize="11">分值范围 0–100</text>
  </svg>;
}
