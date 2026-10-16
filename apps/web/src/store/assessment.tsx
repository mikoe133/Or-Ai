import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from './preview-router';
import { FlowShell } from './flow-shell';
import { Icon } from './icons';
import { DesignFragment, useFlowPage } from './primitives';
import { assessmentQuestions, readAssessmentPreview, saveAssessmentPreview } from './preview-state';
import { assessmentReducer, assessmentView, designAssessmentView } from './assessment-state';
import './assessment.css';

const letters = ['A', 'B', 'C', 'D'];
const examplePercentages = [34, 41, 18, 7];
const exampleResults = [
  { label: '仍在探索', percentage: 30, tone: 'blue' },
  { label: '逐步平衡', percentage: 45, tone: 'lilac' },
  { label: '相对稳定', percentage: 25, tone: 'mint' },
];

function ExitIcon() {
  return <DesignFragment source="/assets/flow/option-grid-answer-content.svg" id="退出图标" viewBox="905 6 18 18" size={18} />;
}

function AnswerProgress({ answers }: { answers: readonly (number | null)[] }) {
  const completed = answers.filter(answer => answer !== null).length;
  const percentage = Math.round(completed / answers.length * 100);
  return <div className="assessment-progress" role="progressbar" aria-label="作答进度" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={answers.length} aria-valuetext={`已完成 ${completed} / ${answers.length} 题，${percentage}%`}>
    <span>已完成 {completed} / {answers.length}</span>
    <div className="assessment-progress-segments" aria-hidden="true">{answers.map((answer, index) => <i key={index} className={answer !== null ? 'is-complete' : ''} />)}</div>
    <span className="assessment-number">{percentage}%</span>
  </div>;
}

function DistributionBars({ items }: { items: { label: string; percentage: number; tone: string }[] }) {
  return <ul className="assessment-distribution">{items.map(item => <li key={item.label} className={`distribution-${item.tone}`}>
    <div><span>{item.label}</span><span className="assessment-number">{item.percentage}%</span></div>
    <div className="assessment-distribution-track" aria-hidden="true"><i style={{ width: `${item.percentage}%` }} /></div>
  </li>)}</ul>;
}

function FeedbackPanel({ current, answer, onClose }: { current: number; answer: number; onClose: () => void }) {
  const question = assessmentQuestions[current]!;
  const labels = current === 4 ? ['我来安排', '分工后各自完成', '彼此补位', '临时再说'] : question.options;
  return <aside id="assessment-feedback" className="assessment-feedback" aria-labelledby="assessment-feedback-title">
    <div className="assessment-feedback-heading"><h2 id="assessment-feedback-title">群体反馈</h2><span className="flow-tag">示例数据</span><button type="button" onClick={onClose} aria-label="收起群体反馈">收起</button></div>
    <p className="assessment-feedback-note">以下为 UI 演示数据</p>
    <div className="assessment-your-answer"><span>你的选择</span><p>{letters[answer]} · {question.options[answer]}</p></div>
    <section className="assessment-answer-distribution" aria-labelledby="assessment-answer-distribution-title"><h3 id="assessment-answer-distribution-title">其他人怎么选</h3><p>本题：120 份其他有效回答</p><DistributionBars items={labels.map((label, index) => ({ label: `${letters[index]} · ${label}`, percentage: examplePercentages[index]!, tone: index === answer ? 'lilac' : 'blue' }))} /></section>
    <section className="assessment-result-distribution" aria-labelledby="assessment-result-distribution-title"><h3 id="assessment-result-distribution-title">已完成答卷的结论</h3><p>80 份其他有效答卷</p><DistributionBars items={exampleResults} /></section>
    <div className="assessment-feedback-footer"><p>两类样本分别统计，均不含当前答卷</p><p>完成示例作答后，可查看示例报告</p></div>
  </aside>;
}

export default function AssessmentPage() {
  const [params] = useSearchParams();
  const example = params.get('preview');
  return <AssessmentScreen key={example ?? 'resume'} example={example} />;
}

function AssessmentScreen({ example }: { example: string | null }) {
  const navigate = useNavigate();
  const isDesignPreview = example === 'answer' || example === 'feedback';
  const [view, dispatch] = useReducer(assessmentReducer, undefined, () => isDesignPreview
    ? designAssessmentView(example === 'feedback') : assessmentView(readAssessmentPreview()));
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [exitOpen, setExitOpen] = useState(false);
  const productHeading = useFlowPage('伴侣协作体检 · 答题');
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const options = useRef<HTMLDivElement>(null);
  const feedbackTrigger = useRef<HTMLButtonElement>(null);
  const previousQuestion = useRef(view.preview.current);
  const { preview, draft, editing, feedbackOpen } = view;
  const question = assessmentQuestions[preview.current]!;
  const saved = preview.answers[preview.current] ?? null;
  const confirmed = saved !== null && !editing;
  const titleParts = question.title.match(/^(.+?，)(.+)$/);

  useEffect(() => {
    if (!isDesignPreview) setStorageError(saveAssessmentPreview(preview) ? '' : '浏览器无法保存进度，当前选择仅在本页有效。');
    if (preview.completed) navigate('/reports/partner');
    if (previousQuestion.current !== preview.current) {
      questionHeading.current?.focus({ preventScroll: true });
      previousQuestion.current = preview.current;
    }
  }, [preview, isDesignPreview, navigate]);

  useEffect(() => {
    if (editing) options.current?.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
  }, [editing]);

  function confirm() {
    dispatch({ type: 'confirm' });
    setNotice('选择已确认。以下统计为 UI 演示数据。');
  }

  function closeFeedback() {
    dispatch({ type: 'feedback', open: false });
    requestAnimationFrame(() => feedbackTrigger.current?.focus({ preventScroll: true }));
  }

  return <FlowShell section="apps" greeting="compact" variant="assessment">
    <div className={`assessment-layout${feedbackOpen ? ' has-feedback' : ''}`}>
      <div className="assessment-main">
        <div className="assessment-navigation"><nav aria-label="测评位置">我的应用 / 伴侣协作体检</nav><button type="button" className="flow-text-link" onClick={() => setExitOpen(true)}><ExitIcon /><span>退出测评</span></button></div>
        <div className="assessment-product"><img src="/assets/store/featured-lavender.png" alt="伴侣协作体检，淡紫色玻璃插图" width="1161" height="1355" /><div><div className="assessment-product-heading"><h1 ref={productHeading} className="flow-heading" tabIndex={-1}>伴侣协作体检</h1><span className="flow-tag">UI 预览</span></div><p>关系情感 / 发现隐藏的协作模式</p></div></div>
        <AnswerProgress answers={preview.answers} />
        <section className={`assessment-question${confirmed ? ' is-confirmed' : ''}`} aria-labelledby="assessment-question-title">
          <div className="assessment-question-header"><p>第 <span className="assessment-number">{String(preview.current + 1).padStart(2, '0')} / {preview.answers.length}</span> 题 / {question.topic}</p><span className={`flow-tag assessment-answer-status${confirmed ? ' is-saved' : ''}`}>{confirmed ? '回答已保存' : '选择尚未确认'}</span></div>
          <h2 id="assessment-question-title" ref={questionHeading} tabIndex={-1}>{titleParts ? <><span className="assessment-question-clause">{titleParts[1]}</span>{titleParts[2]}</> : question.title}</h2>
          <p id="assessment-option-hint" className="assessment-option-hint">选择最贴近真实情况的一项</p>
          <div ref={options} className="assessment-options" role="radiogroup" aria-labelledby="assessment-question-title" aria-describedby="assessment-option-hint">{question.options.map((label, index) => <label key={`${preview.current}-${index}`} className={`assessment-option${draft === index ? ' is-selected' : ''}`}>
            <input type="radio" name={`assessment-question-${preview.current}`} value={index} aria-label={`${letters[index]} · ${label}`} checked={draft === index} disabled={confirmed} onChange={() => dispatch({ type: 'select', option: index })} />
            <span className="assessment-option-radio" aria-hidden="true" /><span className="assessment-option-letter" aria-hidden="true">{letters[index]}</span><span>{preview.current === 4 && index === 0 ? <><span className="assessment-option-clause">我先发现，也常常是</span>我来安排</> : preview.current === 4 && index === 2 ? <><span className="assessment-option-clause">谁看见谁处理，</span>彼此补位</> : label}</span>
          </label>)}</div>
          <div className="assessment-question-actions">
            <button type="button" className="store-button store-button-secondary flow-button assessment-previous" disabled={preview.current === 0} onClick={() => dispatch({ type: 'previous' })}><Icon name="arrow" /><span>上一题</span></button>
            {confirmed ? <button type="button" className="flow-text-link assessment-edit" onClick={() => dispatch({ type: 'edit' })}>修改本题</button> : editing && <button type="button" className="flow-text-link assessment-edit" onClick={() => dispatch({ type: 'cancel-edit' })}>取消修改</button>}
            {confirmed ? <button type="button" className="store-button store-button-primary flow-button assessment-next" onClick={() => dispatch({ type: 'next' })}>{preview.current === preview.answers.length - 1 ? '查看完整报告' : '下一题'}<Icon name="arrow" /></button>
              : <button type="button" className="store-button store-button-primary flow-button assessment-confirm" disabled={draft === null} onClick={confirm}>确认选择<Icon name="arrow" /></button>}
          </div>
          {!confirmed && <p className="assessment-confirm-hint">确认后查看其他参与者的回答</p>}
        </section>
        <div className="assessment-disclaimer"><p>趣味自测，仅供娱乐与自我观察。</p>{confirmed && !feedbackOpen && <button ref={feedbackTrigger} type="button" className="flow-text-link" aria-controls="assessment-feedback" aria-expanded={false} onClick={() => dispatch({ type: 'feedback', open: true })}>展开群体反馈<Icon name="arrow" size={16} /></button>}</div>
      </div>
      {feedbackOpen && saved !== null && <FeedbackPanel current={preview.current} answer={saved} onClose={closeFeedback} />}
    </div>
    {storageError && <p className="assessment-notice" role="alert">{storageError}</p>}
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <Dialog.Root open={exitOpen} onOpenChange={setExitOpen}><Dialog.Portal><Dialog.Overlay className="store-dialog-overlay" /><Dialog.Content className="store-dialog"><Dialog.Close className="store-dialog-close" aria-label="关闭退出提示">×</Dialog.Close><div className="store-dialog-body"><span className="store-preview-label">伴侣协作体检 · UI 预览</span><Dialog.Title>先休息一下？</Dialog.Title><Dialog.Description>{isDesignPreview ? '这是独立的设计展示状态，不会覆盖本机已保存的进度。' : storageError ? '浏览器无法保存进度，退出后无法恢复这次作答。' : `已确认的 ${preview.answers.filter(answer => answer !== null).length} 道题已保存在本机预览中，下次可从“我的应用”或“继续上次测试”继续。`}{!confirmed && draft !== null ? '当前尚未确认的选择不会保存。' : ''}</Dialog.Description><div className="store-dialog-actions"><Dialog.Close className="store-button store-button-primary">继续作答</Dialog.Close><button type="button" className="store-button store-button-secondary" onClick={() => navigate('/')}>{isDesignPreview || storageError ? '退出测评' : '保存进度并退出'}</button></div></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </FlowShell>;
}
