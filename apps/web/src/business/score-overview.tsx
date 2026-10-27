import {useId} from 'react';

type ScoreItem = {label: string; score: number | null};

/** Display already-scored server results; never derive or fill a missing score. */
export function ScoreOverview({items}: {items: readonly ScoreItem[]}) {
  const gradient = useId();
  const radar = items.length >= 3 && items.length <= 8 && items.every(item => item.score !== null);
  const point = (index: number, score: number) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / items.length;
    return [170 + Math.cos(angle) * 105 * score / 100, 165 + Math.sin(angle) * 105 * score / 100];
  };
  const ring = (score: number) => items.map((_, index) => point(index, score).join(',')).join(' ');
  return <section className={'biz-card consumer-score-overview' + (radar ? ' has-radar' : '')} aria-label="报告维度概览">
    <div className="consumer-score-heading"><span className="consumer-eyebrow">关于你的观察</span><h2>从不同角度，看看自己</h2><p>每一项分数，都对应这份报告中的一个维度。</p></div>
    {radar && <svg className="consumer-radar" viewBox="0 0 340 330" role="img" aria-label={items.map(item => item.label + '：' + item.score).join('；')}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b78cda" stopOpacity=".2"/><stop offset="1" stopColor="#dbb4f4" stopOpacity=".65"/></linearGradient></defs>
      {[20,40,60,80,100].map(level => <polygon key={level} points={ring(level)} fill="none" stroke="#8d7e9a" strokeOpacity=".35"/>)}
      {items.map((item,index) => {
        const end = point(index,100), label = point(index,125);
        return <g key={index}><path d={'M170 165L'+end.join(' ')} fill="none" stroke="#8d7e9a" strokeOpacity=".35"/><text x={label[0]} y={label[1]} textAnchor="middle" fill="#d9c9e5" fontSize="12">{index+1}</text></g>;
      })}
      <polygon points={items.map((item,index) => point(index,item.score as number).join(',')).join(' ')} fill={'url(#'+gradient+')'} stroke="#dfb9fa" strokeWidth="2"/>
      {items.map((item,index) => {const p=point(index,item.score as number);return <circle key={index} cx={p[0]} cy={p[1]} r="3.5" fill="#f2dcff"/>;})}
      <text x="170" y="320" textAnchor="middle" fill="#bdb5cc" fontSize="11">分值范围 0–100</text>
    </svg>}
    <dl className="consumer-score-legend">{items.map((item,index) => <div key={index}>
      <dt>{radar && <span aria-hidden="true">{index+1}. </span>}{item.label}</dt>
      <dd><span>{item.score === null ? '信息不足' : item.score}</span>{item.score !== null && <meter min={0} max={100} value={item.score} aria-label={item.label} />}</dd>
    </div>)}</dl>
  </section>;
}

