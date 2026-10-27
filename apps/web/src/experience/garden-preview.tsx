import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExperienceReleaseSchema } from '@orai/contracts/experience';
import { ChoiceScene, ExperienceHost } from './host.js';
import { ReportHost } from './report-host.js';
import { roomPreviewRelease, roomQuestions, roomReportExample } from './room-sample.js';
import './quiet-room.css';
import './reflection-garden.css';

const release = ExperienceReleaseSchema.parse({ ...roomPreviewRelease, id: '00000000-0000-4000-8000-000000000116', manifest: {
  ...roomPreviewRelease.manifest, renderer: { key: 'reflection-garden', version: 1 },
  report: { contentSchema: 'report_content_v1', renderer: { key: 'garden-notes', version: 1 } }, theme: { key: 'reflection-garden', revision: 1 },
} });
export default function GardenPreview() {
  const [current, setCurrent] = useState(0), [choice, setChoice] = useState(''), [confirmed, setConfirmed] = useState<Record<string, string>>({}), [report, setReport] = useState(false);
  const question = roomQuestions[current]!, dirty = choice !== (confirmed[question.id] ?? '');
  function move(index: number) { setCurrent(index); setChoice(confirmed[roomQuestions[index]!.id] ?? ''); }
  return <div className="room-design-preview garden-design-preview">
    <header><span>meetmyworld / THE REFLECTION GARDEN</span><Link to="/">返回商城</Link></header>
    <main><h1>静心花园 · 3D 选择体验</h1>
      <p className="room-design-disclosure">本地技术样例，沿用已有的社交电量示例题。选择与确认只在本页练习，刷新会清空练习；报告为固定排版样本，与练习答案无关。不创建用户答卷或消耗次数。</p>
      {report ? <ReportHost content={roomReportExample} presentation={{ schemaVersion: 1, releaseId: null, ...release.manifest.report, theme: release.manifest.theme }} /> :
        <div className="garden-preview-host"><ExperienceHost release={release} attemptId={release.id}>
          <ChoiceScene question={question} current={current} total={roomQuestions.length} choice={choice} disabled={false} busy={false} dirty={dirty}
            onSelect={setChoice} onConfirm={() => { if (choice) setConfirmed(value => ({ ...value, [question.id]: choice })); }} />
        </ExperienceHost></div>}
      <div className="room-preview-controls">
        {!report && <><button type="button" disabled={current === 0} onClick={() => move(current - 1)}>上一题</button>
          <button type="button" disabled={current === roomQuestions.length - 1 || !confirmed[question.id] || dirty} onClick={() => move(current + 1)}>下一题</button></>}
        <button type="button" onClick={() => setReport(value => !value)}>{report ? '返回题目样例' : '查看报告版式样例'}</button>
      </div>
      {!report && <div className="garden-practice-progress"><progress aria-label="练习已确认进度" value={Object.keys(confirmed).length} max={roomQuestions.length} />
        <p role="status">练习中已确认 {Object.keys(confirmed).length}/{roomQuestions.length} 题。{dirty ? '当前选择还未确认。' : ''}</p></div>}
    </main>
  </div>;
}
