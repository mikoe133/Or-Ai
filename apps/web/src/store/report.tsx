import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { Link, useNavigate } from './preview-router';
import { FlowShell } from './flow-shell';
import { Icon } from './icons';
import { DesignFragment, useFlowPage } from './primitives';
import { DimensionIcon, dimensions, InfoSymbol, reportSource, WideHero } from './flow-visuals';
import { newAssessmentPreview, saveAssessmentPreview } from './preview-state';
import './product-detail.css';
import './report.css';

const insights = [
  { title: '你的协作优势', items: [{ name: '主动分担', detail: '愿意把共同生活当成两个人的事。', color: '#e8dc8f', background: '#27333b' }, { name: '尊重空间', detail: '理解彼此需要独处和休息。', color: '#b5e9d7', background: '#263437' }] },
  { title: '值得留意', items: [{ name: '情绪回应', detail: '讨论解决办法前，先确认彼此的感受。', color: '#efaccf', background: '#342c38' }, { name: '提前告知', detail: '无法兑现约定时，及时说明变化。', color: '#eedba6', background: '#343133' }] },
];
const actions = [
  { title: '每周一次分工对齐', detail: '用十分钟确认下周的共同任务。' },
  { title: '冲突时先回应感受', detail: '先说我听见了，再一起找办法。' },
  { title: '给彼此留出休息时间', detail: '约定可以安心独处的时段。' },
];

async function exportShareCard() {
  await document.fonts.ready;
  const artwork = new Image();
  artwork.src = '/assets/store/featured-blush.png';
  await artwork.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1192; canvas.height = 336;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建分享卡');
  context.scale(2, 2);
  context.beginPath(); context.roundRect(0, 0, 596, 168, 20); context.clip();
  const gradient = context.createLinearGradient(0, 0, 596, 168);
  gradient.addColorStop(0, '#eddffa'); gradient.addColorStop(1, '#c5c0f3');
  context.fillStyle = gradient; context.fillRect(0, 0, 596, 168);
  const imageScale = Math.min(211 / artwork.naturalWidth, 244 / artwork.naturalHeight);
  const artWidth = artwork.naturalWidth * imageScale, artHeight = artwork.naturalHeight * imageScale;
  context.drawImage(artwork, -6 + (211 - artWidth) / 2, -23 + (244 - artHeight) / 2, artWidth, artHeight);
  context.fillStyle = '#24202f'; context.font = '700 30px "Noto Sans SC"';
  context.fillText('协作型队友', 195, 54);
  context.fillStyle = '#443653'; context.font = '500 18px "Noto Sans SC"';
  context.fillText('你们擅长一起扛事，', 195, 97);
  context.fillText('也值得给彼此多一点回应。', 195, 129);
  context.font = '400 10px "Noto Sans SC"'; context.textAlign = 'right';
  context.fillText('MeetMyWorld · 示例报告', 578, 156);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('无法生成图片')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'MeetMyWorld-协作型队友-示例分享卡.png';
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ScoreTrack({ score, color }: { score: number; color: string }) {
  return <div className="report-score-track" aria-hidden="true"><i style={{ width: `${score}%`, background: color }} /></div>;
}

export default function ReportPage() {
  const navigate = useNavigate();
  const heading = useFlowPage('伴侣协作体检 · 完整报告');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [restartOpen, setRestartOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [expandedDimensions, setExpandedDimensions] = useState(() => dimensions.map(() => true));

  function toggleDimension(index: number) {
    setExpandedDimensions(current => current.map((expanded, position) => position === index ? !expanded : expanded));
  }

  async function saveCard() {
    setSaving(true); setNotice('');
    try { await exportShareCard(); setNotice('示例分享卡已生成，请在浏览器下载中查看。'); }
    catch { setNotice('暂时无法保存分享卡，请稍后重试。'); }
    finally { setSaving(false); }
  }
  function restart() {
    if (!saveAssessmentPreview(newAssessmentPreview())) { setNotice('浏览器无法重置本机预览进度，请允许本站使用本地存储后重试。'); setRestartOpen(false); return; }
    navigate('/assessment/partner');
  }

  return <div className="report-page"><FlowShell section="reports" greeting long>
    <div className="report-navigation"><button type="button" className="flow-text-link" onClick={() => setListOpen(true)}><DesignFragment source={reportSource} id="Back arrow" viewBox="0 16 22 22" size={22} />返回我的报告</button><h1 ref={heading} tabIndex={-1} className="flow-heading">伴侣协作体检 · 完整报告</h1></div>
    <WideHero report>
      <span className="flow-tag report-result-tag">测评结果</span>
      <div className="report-result-heading"><h2>协作型队友</h2><span className="flow-tag">示例报告</span></div>
      <p className="report-hero-message">你们擅长一起扛事，<br />也值得给彼此多一点回应。</p>
      <div className="report-overall-score"><div><strong>78.80</strong><span>/ 100</span></div><p>协作倾向评分</p></div>
    </WideHero>
    <section className="flow-card report-interpretation" aria-labelledby="report-interpretation-title"><h2 id="report-interpretation-title" className="flow-section-title">结果解读</h2><p>你们在分工与边界上较有默契。意见不合时，可以先回应感受，再讨论方案。</p><div className="report-group-notice"><DesignFragment source={reportSource} id="Group reference info" viewBox="45 129 24 24" />群体参考：样本不足，暂不展示比例</div></section>
    <section className="flow-card report-overview" aria-labelledby="report-overview-title"><h2 id="report-overview-title" className="flow-section-title">五个协作维度</h2><p className="flow-subtitle">从不同角度看见你们的协作特点</p><div className="report-dimension-grid">{dimensions.map((dimension, index) => <article className="report-dimension" key={dimension.name} style={{ '--dimension-color': dimension.color } as React.CSSProperties}><DimensionIcon index={index} report size={29} /><h3>{dimension.name}</h3><div className="report-dimension-value"><strong>{dimension.score.toFixed(2)}</strong><span>/ 100</span></div><ScoreTrack score={dimension.score} color={dimension.color} /></article>)}</div></section>
    <section className="flow-card report-analysis" aria-labelledby="report-analysis-title"><h2 id="report-analysis-title" className="flow-section-title">维度解析</h2><p className="flow-subtitle">更详细地了解每个维度的表现与含义</p><div className="report-analysis-rows">{dimensions.map((dimension, index) => <article className="report-analysis-row" key={dimension.name} style={{ '--dimension-color': dimension.color } as React.CSSProperties}>
      <button type="button" className="report-analysis-toggle" aria-label={`${dimension.name}维度解析`} aria-expanded={expandedDimensions[index]} aria-controls={`report-dimension-detail-${index}`} title={expandedDimensions[index] ? '收起解析' : '展开解析'} onClick={() => toggleDimension(index)}>
        <DimensionIcon index={index} report size={26} /><span className="report-analysis-label">{dimension.name}</span><ScoreTrack score={dimension.score} color={dimension.color} /><span className="report-analysis-value"><strong>{dimension.score.toFixed(2)}</strong><span>/ 100</span></span>
      </button><p id={`report-dimension-detail-${index}`} hidden={!expandedDimensions[index]}>{dimension.detail}</p>
    </article>)}</div></section>
    <div className="report-insights">{insights.map((column, index) => <section className="flow-card report-insight-panel" key={column.title} aria-labelledby={`report-insight-${index}`}><h2 id={`report-insight-${index}`} className="flow-section-title">{column.title}</h2><div className="report-insight-list">{column.items.map((item, row) => <article className="report-insight" key={item.name} style={{ background: item.background, '--insight-color': item.color } as React.CSSProperties}><DesignFragment source={reportSource} id={column.title} viewBox={`${index * 515.5 + 40} ${95 + row * 88} 50 50`} size={50} /><div><h3>{item.name}</h3><p>{item.detail}</p></div></article>)}</div></section>)}</div>
    <section className="flow-card report-actions" aria-labelledby="report-actions-title"><h2 id="report-actions-title" className="flow-section-title">给你们的行动建议</h2><p className="flow-subtitle">从小的改变开始，让协作更轻松、更长久。</p><div className="report-action-grid">{actions.map((action, index) => <article key={action.title} className="report-action"><div><span>{String(index + 1).padStart(2, '0')}</span><DesignFragment source={reportSource} id={`行动 ${String(index + 1).padStart(2, '0')} · ${action.title}`} viewBox={`${28 + index * ((1011 - 88) / 3 + 16) + (1011 - 88) / 3 - 50} 123 28 28`} size={28} /></div><h3>{action.title}</h3><p>{action.detail}</p></article>)}</div></section>
    <section className="flow-card report-share" aria-labelledby="report-share-title"><h2 id="report-share-title" className="flow-section-title">分享你的发现</h2><p className="flow-subtitle">把这份发现分享给对方，一起聊聊你们的协作方式。</p><div className="report-share-layout"><div className="report-share-card"><img src="/assets/store/featured-blush.png" width="1161" height="1355" alt="" /><div><h3>协作型队友</h3><p>你们擅长一起扛事，<br />也值得给彼此多一点回应。</p></div><span>示例报告</span></div><div className="report-share-controls"><button type="button" className="store-button store-button-primary flow-button" onClick={() => void saveCard()} disabled={saving} aria-busy={saving} aria-describedby="report-share-privacy"><DesignFragment source={reportSource} id="Save share card icon" viewBox="729 125 22 22" size={22} />{saving ? '正在生成…' : '保存分享卡'}</button><Link className="store-button store-button-secondary flow-button" to="/">返回商城</Link><p id="report-share-privacy">分享卡仅包含结果摘要</p></div></div><p className="report-share-status" role="status">{notice}</p></section>
    <div className="flow-note report-disclaimer"><InfoSymbol /><p>趣味自测，仅供娱乐与自我观察。</p><button type="button" className="flow-text-link" onClick={() => setRestartOpen(true)}>重新体验示例</button></div>
    <Dialog.Root open={restartOpen} onOpenChange={setRestartOpen}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog"><Dialog.Close className="store-dialog-close" aria-label="关闭重新体验提示">×</Dialog.Close><div className="store-dialog-body"><Dialog.Title>重新体验示例作答</Dialog.Title><Dialog.Description>这会清空本机已保存的示例选择，从第 1 题开始。此报告为固定的设计示例，分数不会随作答改变。</Dialog.Description><div className="store-dialog-actions"><button className="store-button store-button-primary" type="button" onClick={restart}>从第 1 题开始</button><Dialog.Close className="store-button store-button-secondary">保留当前进度</Dialog.Close></div></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={listOpen} onOpenChange={setListOpen}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog"><Dialog.Close className="store-dialog-close" aria-label="关闭报告列表">×</Dialog.Close><div className="store-dialog-body"><span className="store-preview-label">我的报告 · 设计预览</span><Dialog.Title>我的报告</Dialog.Title><Dialog.Description>当前展示一份公开示例报告。真实报告会在正式测评完成后保存到这里。</Dialog.Description><Dialog.Close className="store-button store-button-secondary">伴侣协作体检 · 查看示例报告<Icon name="arrow" size={18} /></Dialog.Close><Link className="store-button store-button-primary" to="/">返回商城</Link></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </FlowShell></div>;
}
