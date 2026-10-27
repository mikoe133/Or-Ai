import { useEffect, useId, useRef, useState } from 'react';
import { supportsExperience, type ExperienceRelease } from '@orai/contracts/experience';
import type { ChoiceProps } from './types.js';
import { sceneSelection } from './model.js';
import type { mountGarden } from './garden-renderer.js';
import './reflection-garden.css';

type Controller = ReturnType<typeof mountGarden>;
export default function ReflectionGarden(props: ChoiceProps & {
  release?: ExperienceRelease; images: { url: string; label: string }[]; unavailable: () => void;
}) {
  const { question, current, total, choice, disabled, dirty, busy, images, release, unavailable, onConfirm } = props;
  const canvas = useRef<HTMLCanvasElement>(null), markerNodes = useRef<HTMLButtonElement[]>([]), controller = useRef<Controller | null>(null);
  const latest = useRef(props); latest.current = props;
  const [phase, setPhase] = useState<'loading' | 'starting' | 'ready'>('loading'), hintId = useId();
  function select(index: number) {
    const value = latest.current, option = value.question.options[index];
    if (value.disabled || !option) return;
    const scene = value.release?.manifest.scenes.find(item => item.questionId === value.question.id);
    const objectId = scene?.choices.find(item => item.optionId === option.id)?.objectId;
    const answer = scene && objectId && value.release ? sceneSelection(value.release.manifest, scene.sceneId, objectId) : null;
    if (!answer || answer.questionId !== value.question.id) { value.unavailable(); return; }
    value.onSelect(answer.optionId);
  }
  useEffect(() => {
    let stopped = false; setPhase('loading');
    if (!release || release.manifest.renderer.key !== 'reflection-garden' || !supportsExperience(release.manifest) || question.options.length > 4) { unavailable(); return; }
    void import('./garden-renderer.js').then(module => {
      if (stopped || !canvas.current) return;
      setPhase('starting');
      controller.current = module.mountGarden(canvas.current, markerNodes.current.slice(0, question.options.length), {
        onPick: select, onReady: () => { if (!stopped) setPhase('ready'); }, onFailure: () => { if (!stopped) latest.current.unavailable(); },
      });
      controller.current.update(latest.current.question.options.findIndex(option => option.id === latest.current.choice), latest.current.disabled);
    }).catch(() => { if (!stopped) latest.current.unavailable(); });
    return () => { stopped = true; controller.current?.dispose(); controller.current = null; };
  }, [release?.id, question.options.length, unavailable]);
  useEffect(() => { controller.current?.update(question.options.findIndex(option => option.id === choice), disabled); }, [choice, question.id, disabled]);
  return <form className="reflection-garden" data-experience-template="reflection-garden@1" data-graphics-state={phase} onSubmit={event => {
    event.preventDefault(); if (!disabled && choice && dirty) onConfirm();
  }}>
    <header className="garden-heading"><span className="garden-kicker">THE REFLECTION GARDEN <span>一处留给自己的花园</span></span>
      <p className="garden-chapter">观察 {String(current + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span></p>
      <h2>{question.text}</h2></header>
    <div className="garden-layout">
      <figure className="garden-figure">
        <div className="garden-stage">
          <canvas ref={canvas} className="garden-canvas" aria-hidden="true" />
          <div className="garden-markers" aria-label="花园中的选项">{question.options.map((option, index) => <button
            ref={node => { if (node) markerNodes.current[index] = node; }} key={'slot-'+index} type="button"
            aria-label={`选择选项 ${index + 1}：${option.label}`} aria-pressed={choice === option.id}
            className={choice === option.id ? 'is-selected' : ''} disabled={disabled || phase !== 'ready'} onClick={() => select(index)}>
            {String(index + 1).padStart(2, '0')}</button>)}</div>
          {phase !== 'ready' && <div className="garden-loading" role="status"><span>{phase === 'loading' ? '正在载入花园画面…' : '正在准备场景…'}</span>
            <progress aria-label="花园加载阶段" value={phase === 'loading' ? 0 : 1} max={2} /><small>你也可以先从右侧的回答开始。</small></div>}
        </div>
        <figcaption><span>把注意力，轻轻放回自己。</span><div className="garden-camera-controls" aria-label="观察花园">
          <button type="button" aria-label="向左观察花园" disabled={disabled || phase !== 'ready'} onClick={() => controller.current?.turn(-1)}>←</button>
          <button type="button" aria-label="向右观察花园" disabled={disabled || phase !== 'ready'} onClick={() => controller.current?.turn(1)}>→</button>
        </div></figcaption>
        <p className="garden-stage-hint">横向轻拖可以换个角度；选择编号后，再确认保存。</p>
        {images.map(image => <img className="garden-reference" src={image.url} alt={image.label} key={image.url} onError={unavailable} />)}
      </figure>
      <fieldset className="garden-answers" disabled={disabled} aria-describedby={hintId}>
        <legend className="garden-sr-only">第 {current + 1}/{total} 题：{question.text}</legend>
        <p className="garden-answer-intro">此刻，哪个回答更接近你？</p><p id={hintId} className="garden-answer-hint">选择花园中的编号，或直接选择回答。没有标准答案。</p>
        {question.options.map((option, index) => <label key={option.id} className={`garden-answer${choice === option.id ? ' is-selected' : ''}`}>
          <input type="radio" name="answer" checked={choice === option.id} onChange={() => select(index)} value={option.id} />
          <span aria-hidden="true" className="garden-answer-number">{String(index + 1).padStart(2, '0')}</span>
          <span>{option.label}{option.notApplicable ? '（不适用）' : ''}</span><span className="garden-answer-check" aria-hidden="true">{choice === option.id ? '✓' : '+'}</span>
        </label>)}
        <div className="garden-confirmation"><p>{choice ? dirty ? '当前选择尚未记下。准备好了，再确认。' : '这一刻已记下，可以继续了。' : '慢一点，按最近的感受来选择。'}</p>
          <button type="submit" disabled={!choice || !dirty || disabled}>{busy ? '保存中…' : '保存答案'}<span aria-hidden="true">↗</span></button></div>
      </fieldset>
    </div>
  </form>;
}
