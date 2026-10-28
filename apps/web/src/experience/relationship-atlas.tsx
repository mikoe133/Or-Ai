import { useEffect, useId, useRef, useState } from 'react';
import { supportsExperience, type ExperienceRelease } from '@orai/contracts/experience';
import type { ChoiceProps } from './types.js';
import type { mountAtlas } from './atlas-renderer.js';
import { sceneSelection } from './model.js';
import './relationship-atlas.css';

export default function RelationshipAtlas(props: ChoiceProps & {
  release?: ExperienceRelease; images: { url: string; label: string }[]; unavailable: () => void;
}) {
  const { question, current, total, choice, disabled, dirty, busy, release, images, unavailable } = props;
  const canvas = useRef<HTMLCanvasElement>(null), markers = useRef<HTMLButtonElement[]>([]);
  const controller = useRef<ReturnType<typeof mountAtlas> | null>(null), latest = useRef(props); latest.current = props;
  const [ready, setReady] = useState(false), hint = useId();
  function select(index: number) {
    const value = latest.current, option = value.question.options[index];
    if (value.disabled || !option || !value.release) return;
    const scene = value.release.manifest.scenes.find(item => item.questionId === value.question.id);
    const object = scene?.choices.find(item => item.optionId === option.id);
    const answer = scene && object ? sceneSelection(value.release.manifest, scene.sceneId, object.objectId) : null;
    if (!answer || answer.questionId !== value.question.id) { value.unavailable(); return; }
    value.onSelect(answer.optionId);
  }
  useEffect(() => {
    let stopped = false; setReady(false);
    if (!release || release.manifest.renderer.key !== 'relationship-atlas-prototype' || !supportsExperience(release.manifest)) { unavailable(); return; }
    void import('./atlas-renderer.js').then(module => {
      if (stopped || !canvas.current) return;
      controller.current = module.mountAtlas(canvas.current, markers.current.slice(0, question.options.length), {
        onPick: select, onReady: () => { if (!stopped) setReady(true); },
        onFailure: () => { if (!stopped) latest.current.unavailable(); },
      });
      const value = latest.current;
      controller.current.update(value.question.options.findIndex(option => option.id === value.choice), value.disabled);
    }).catch(() => { if (!stopped) latest.current.unavailable(); });
    return () => { stopped = true; controller.current?.dispose(); controller.current = null; };
  }, [release?.id, question.options.length, unavailable]);
  useEffect(() => { controller.current?.update(question.options.findIndex(option => option.id === choice), disabled); }, [question.id, choice, disabled]);
  return <form className="relationship-atlas" data-experience-template="relationship-atlas-prototype@1" data-graphics-state={ready ? 'ready' : 'loading'}
    onSubmit={event => { event.preventDefault(); if (!disabled && choice && dirty) props.onConfirm(); }}>
    <header className="atlas-heading"><p className="atlas-eyebrow">RELATIONSHIP ATLAS <span>关系观察台</span></p>
      <p className="atlas-count">第 {String(current + 1).padStart(2, '0')} 个观察 <span>/ {String(total).padStart(2, '0')}</span></p>
      <h2>{question.text}</h2><p>从自己的感受出发，留意一次相处中的细节。</p></header>
    <div className="atlas-layout"><figure className="atlas-figure">
      <div className="atlas-stage"><canvas ref={canvas} aria-hidden="true" />
        <div className="atlas-markers" aria-label="观察台中的回答">{question.options.map((option, index) => <button key={'slot-' + index}
          ref={node => { if (node) markers.current[index] = node; }} type="button" disabled={disabled || !ready}
          aria-label={`选择选项 ${index + 1}：${option.label}`} aria-pressed={choice === option.id}
          className={choice === option.id ? 'is-selected' : ''} onClick={() => select(index)}>{String(index + 1).padStart(2, '0')}</button>)}</div>
        {!ready && <p className="atlas-loading" role="status">正在展开观察台…<small>文字回答已经可以使用。</small></p>}
      </div>
      <figcaption><span>一张观察台，几种不同的回答。</span><span>固定视角 / 选择后确认</span></figcaption>
      <p className="atlas-map-note">编号对应右侧回答；所在位置不代表分数或关系好坏。</p>
      {images.map(image => <img className="atlas-reference" src={image.url} alt={image.label} key={image.url} onError={unavailable} />)}
    </figure><fieldset className="atlas-answers" disabled={disabled} aria-describedby={hint}>
      <legend>哪一个更接近此刻的你？</legend><p id={hint}>选择一个回答，再确认记下。这里没有标准答案。</p>
      {question.options.map((option, index) => <label className={`atlas-answer${choice === option.id ? ' is-selected' : ''}`} key={option.id}>
        <input type="radio" name="answer" value={option.id} checked={choice === option.id} onChange={() => select(index)} />
        <span className="atlas-answer-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span>{option.label}{option.notApplicable ? '（不适用）' : ''}</span><span className="atlas-answer-check" aria-hidden="true">{choice === option.id ? '✓' : '○'}</span>
      </label>)}
      <div className="atlas-confirmation"><p role="status">{choice ? dirty ? '尚未保存，确认后再继续。' : '这个回答已记下。' : '按最近的真实感受来选择。'}</p>
        <button type="submit" disabled={disabled || !choice || !dirty}>{busy ? '保存中…' : '保存答案'}<span aria-hidden="true">↗</span></button></div>
    </fieldset></div>
  </form>;
}
