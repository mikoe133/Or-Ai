import type { ReportContentDto } from '@orai/contracts';
import './relationship-atlas.css';

/** Present the server's report verbatim; layout positions never derive a new score. */
export default function AtlasNotes({ content }: { content: ReportContentDto }) {
  return <article className="atlas-notes" data-report-template="atlas-notes-prototype@1">
    <header className="atlas-notes-heading"><p className="atlas-eyebrow">A RECORD OF THIS MOMENT <span>关系观察记录</span></p>
      <p>{content.productName}</p><h2>看见自己的感受，<br />也给关系留些空间。</h2>
      <p>以下记录来自你的回答。它是一份观察的起点。</p></header>
    <section className="atlas-summary"><span className="atlas-section-label">01 / 当前观察</span>
      <div><h3>{content.resultLabel}</h3><p className="atlas-score">{content.totalScore === null ? '信息不足，暂不提供总分' : <><strong>{content.totalScore}</strong><span> / 100</span></>}</p>
        <p>{content.explanation}</p></div></section>
    <section className="atlas-records" aria-label="观察维度"><span className="atlas-section-label">02 / 逐项看见</span>
      {content.dimensions.map((dimension, index) => <div className="atlas-record" key={dimension.id}>
        <span className="atlas-record-number">{String(index + 1).padStart(2, '0')}</span><h3>{dimension.label}</h3>
        <p>{dimension.score === null ? '信息不足' : `${dimension.score} / 100`}</p>
        {dimension.score !== null && <meter min={0} max={100} value={dimension.score} aria-label={dimension.label} />}
        <div className="atlas-record-detail">{dimension.missingReason && <p>{dimension.missingReason}</p>}
          <small>适用回答 {dimension.applicableAnswers} · 最少需要 {dimension.requiredAnswers}</small></div>
      </div>)}
    </section>
    <section className="atlas-next"><span className="atlas-section-label">03 / 带回生活</span><div><h3>下一次相处，可以试着…</h3><p>{content.suggestion}</p></div></section>
    <footer className="atlas-notes-footer"><p>{content.disclaimer}</p><span>此刻的记录 / meetmyworld</span></footer>
  </article>;
}
