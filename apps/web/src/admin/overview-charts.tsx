import { chartScale, type ChartDatum } from "./overview-model.js";

export const formatCount = (value: number) => value.toLocaleString("zh-CN");

export function HorizontalBars({ data, label, empty }: {
  data: ChartDatum[];
  label: string;
  empty: string;
}) {
  const scale = chartScale(data);
  if (!data.some(item => item.count > 0)) {
    return <div className="overview-chart-empty" role="status">
      <svg viewBox="0 0 48 40" fill="none" aria-hidden="true">
        <path d="M5 3v32h38M13 29V19m10 10V9m10 20V14" />
      </svg>
      <p>{empty}</p>
    </div>;
  }
  return <figure className="overview-bars" aria-label={label}>
    <figcaption className="admin-sr-only">{label}，柱长按数量比较。</figcaption>
    <div className="overview-bar-axis" aria-hidden="true"><span>0</span><span>{formatCount(scale)}</span></div>
    <ul>
      {data.map(item => <li className="overview-bar-row" key={item.key} title={`${item.label}：${formatCount(item.count)}`}>
        <span className="overview-bar-label">{item.label}</span>
        <span className="overview-bar-track" aria-hidden="true">
          <span className="overview-bar-fill" style={{ width: `${item.count / scale * 100}%`, backgroundColor: item.color }} />
        </span>
        <strong>{formatCount(item.count)}</strong>
      </li>)}
    </ul>
  </figure>;
}

export function RingChart({ data, label, unit }: {
  data: ChartDatum[];
  label: string;
  unit: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  return <figure className="overview-ring-chart" aria-label={label}>
    <figcaption className="admin-sr-only">{label}</figcaption>
    <div className="overview-ring-visual">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle className="overview-ring-track" cx="80" cy="80" r="65" />
        {total > 0 && data.filter(item => item.count > 0).map(item => {
          const share = item.count / total * 100;
          const start = offset;
          offset += share;
          return <circle key={item.key} cx="80" cy="80" r="65" pathLength="100"
            fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${share} ${100 - share}`}
            strokeDashoffset={-start} transform="rotate(-90 80 80)">
            <title>{item.label}：{formatCount(item.count)}，{share.toFixed(1)}%</title>
          </circle>;
        })}
      </svg>
      <div className="overview-ring-total"><strong>{formatCount(total)}</strong><span>{total === 0 ? "暂无记录" : unit}</span></div>
    </div>
    <ul className="overview-chart-legend">
      {data.map(item => <li key={item.key}>
        <span className="overview-chart-key" style={{ backgroundColor: item.color }} aria-hidden="true" />
        <span>{item.label}</span><strong>{formatCount(item.count)}</strong>
        <small>{total === 0 ? "—" : `${(item.count / total * 100).toFixed(1)}%`}</small>
      </li>)}
    </ul>
  </figure>;
}
