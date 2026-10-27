import { useState } from 'react';
import { Link } from 'react-router-dom';
import QuietRoom from './quiet-room.js';
import FieldNotes from './field-notes.js';
import { SimpleChoice } from './simple-choice.js';
import { roomQuestions, roomReportExample, roomPreviewRelease, roomSampleTitle } from './room-sample.js';

export default function QuietRoomPreview() {
  const [current, setCurrent] = useState(0), [choice, setChoice] = useState(''), [confirmed, setConfirmed] = useState<Record<string, string>>({}),
    [report, setReport] = useState(false), [simple, setSimple] = useState(false);
  const question = roomQuestions[current]!;
  const props = { question, current, total: roomQuestions.length, choice, disabled: false, busy: false,
    dirty: choice !== (confirmed[question.id] ?? ''), onSelect: setChoice, onConfirm: () => setConfirmed(value => ({ ...value, [question.id]: choice })) };
  function move(index: number) { setCurrent(index); setChoice(confirmed[roomQuestions[index]!.id] ?? ''); }
  return <div className="room-design-preview">
    <header><span>meetmyworld / THE QUIET ROOM</span><Link to="/">返回商城</Link></header>
    <main><h1>{roomSampleTitle}</h1>
      <p className="room-design-disclosure">本地设计样例 · 可练习选择与确认，刷新会清空练习。报告是固定排版样本，与练习答案无关；不创建实际答卷或消费。</p>
      {report ? <FieldNotes content={roomReportExample} /> : simple ? <SimpleChoice {...props} /> : <QuietRoom {...props} release={roomPreviewRelease} images={[]} unavailable={() => setSimple(true)} />}
      <div className="room-preview-controls">
        {!report && <><button type="button" disabled={current === 0} onClick={() => move(current - 1)}>上一题</button>
          <button type="button" disabled={current === roomQuestions.length - 1 || !confirmed[question.id] || props.dirty} onClick={() => move(current + 1)}>下一题</button>
          <button type="button" onClick={() => setSimple(value => !value)}>{simple ? '返回房间' : '使用简化界面'}</button></>}
        <button type="button" onClick={() => setReport(value => !value)}>{report ? '返回题目样例' : '查看报告版式样例'}</button>
      </div>
      {!report && <p className="room-design-disclosure" role="status">练习中已确认 {Object.keys(confirmed).length}/{roomQuestions.length} 题。{props.dirty ? '当前选择还未确认。' : ''}</p>}
    </main>
  </div>;
}
