import type { ReportContentDto } from '@orai/contracts';
import { RoomArt } from './room-art.js';
import { GardenArt } from './garden-art.js';
import './quiet-room.css';

export default function FieldNotes({ content, variant = 'room' }: { content: ReportContentDto; variant?: 'room' | 'garden' }) {
  return <article className={'field-notes'+(variant==='garden'?' garden-notes':'')} data-report-template={variant==='garden'?'garden-notes@1':'field-notes@1'}>
    <header className="notes-heading">
      <div><p className="room-eyebrow">A NOTE TO YOURSELF</p><p className="notes-kicker">{content.productName} / 观察手记</p>
        <h2>给此刻的你，<br />留一页理解。</h2><p>这份手记记录你的回答，给下一次相处多一点空间。</p></div>
      <div className="notes-illustration">{variant==='garden'?<GardenArt />:<RoomArt />}</div>
    </header>
    <section className="notes-observation">
      <span className="notes-section-number">01 / 此刻的线索</span>
      <div className="notes-result"><h3>{content.resultLabel}</h3><p>{content.totalScore === null ? '信息不足，暂不提供总分' : <><strong>{content.totalScore}</strong><span> / 100 · 观察得分</span></>}</p></div>
      <p className="notes-explanation">{content.explanation}</p>
    </section>
    <section className="notes-dimensions" aria-label="观察维度">
      {content.dimensions.map((dimension, index) => <div className="notes-dimension" key={dimension.id}>
        <span className="notes-dimension-number">{String(index + 1).padStart(2, '0')}</span>
        <h3>{dimension.label}</h3><p>{dimension.score === null ? '信息不足' : `${dimension.score} / 100`}</p>
        {dimension.score !== null && <meter min={0} max={100} value={dimension.score} aria-label={dimension.label} />}
        {dimension.missingReason && <p>{dimension.missingReason}</p>}
        <small>适用回答 {dimension.applicableAnswers} · 最少需要 {dimension.requiredAnswers}</small>
      </div>)}
    </section>
    <section className="notes-next"><span className="notes-section-number">02 / 一个可以尝试的小行动</span><h3>把理解，带回生活。</h3><p>{content.suggestion}</p><span className="notes-signature">给自己一点余地。 / meetmyworld</span></section>
    <footer className="notes-footer"><p>{content.disclaimer}</p><span>此刻的记录，不是永远的定义。</span></footer>
  </article>;
}
