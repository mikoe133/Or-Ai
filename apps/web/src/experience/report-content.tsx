import type { ReportContentDto } from '@orai/contracts';
import { ScoreOverview } from '../business/score-overview.js';

export function ReportContents({ content, enhanced = false }: { content: ReportContentDto; enhanced?: boolean }) {
  return <>
    <section className="biz-card consumer-report-result"><h2>{content.resultLabel}</h2><p className="consumer-report-total">{content.totalScore === null ? '信息不足，暂不提供总分' : `${content.totalScore} / 100`}</p><p>{content.explanation}</p></section>
    {enhanced && <ScoreOverview items={content.dimensions} />}
    <div className="biz-grid consumer-report-dimensions">{content.dimensions.map(value => <section key={value.id} className="biz-card">
      <h3>{value.label}</h3><p className="consumer-dimension-score">{value.score === null ? '信息不足' : value.score}</p>{value.missingReason && <p className="consumer-dimension-reason">{value.missingReason}</p>}
      <small>适用回答 {value.applicableAnswers}，最少需要 {value.requiredAnswers}</small>
    </section>)}</div>
    <section className="biz-card consumer-report-next"><h2>给自己的下一步</h2><p>{content.suggestion}</p></section>
    <p>{content.disclaimer}</p>
  </>;
}
