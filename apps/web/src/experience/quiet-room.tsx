import { useId } from 'react';
import type { ExperienceRelease } from '@orai/contracts/experience';
import type { ChoiceProps } from './types.js';
import { sceneSelection } from './model.js';
import { RoomArt } from './room-art.js';
import './quiet-room.css';

export default function QuietRoom(props: ChoiceProps & {
  release?: ExperienceRelease; images: { url: string; label: string }[]; unavailable: () => void;
}) {
  const { question, current, total, choice, disabled, dirty, busy, release, images, onSelect, onConfirm, unavailable } = props;
  const hintId = useId();
  function select(optionId: string) {
    const scene = release?.manifest.scenes.find(item => item.questionId === question.id);
    const objectId = scene?.choices.find(item => item.optionId === optionId)?.objectId;
    const answer = scene && objectId && release ? sceneSelection(release.manifest, scene.sceneId, objectId) : null;
    if (!answer || answer.questionId !== question.id) { unavailable(); return; }
    onSelect(answer.optionId);
  }
  return <form className="quiet-room" data-experience-template="quiet-room@1" onSubmit={event => {
    event.preventDefault(); if (!disabled && choice && dirty) onConfirm();
  }}>
    <header className="room-heading">
      <span className="room-eyebrow">THE QUIET ROOM <span>一间留给自己的小屋</span></span>
      <p className="room-chapter">观察 {String(current + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span></p>
      <h2 className="room-question">{question.text}</h2>
    </header>
    <div className="room-layout">
      <figure className="room-figure">
        <div className="room-model">
          <RoomArt />
          {question.options.map((option, index) => <button type="button" key={option.id}
            className={`room-object room-object-${index + 1}${choice === option.id ? ' is-selected' : ''}`}
            aria-label={`选择选项 ${index + 1}：${option.label}`} aria-pressed={choice === option.id} disabled={disabled}
            onClick={() => select(option.id)}><span>{String(index + 1).padStart(2, '0')}</span></button>)}
        </div>
        <figcaption><span className="room-caption-line" />慢一点，也可以。<span className="room-caption-line" /></figcaption>
        {images.map(image => <img className="room-reference" src={image.url} alt={image.label} key={image.url} onError={unavailable} />)}
      </figure>
      <fieldset className="room-answers" disabled={disabled} aria-describedby={hintId}>
        <legend className="room-sr-only">第 {current + 1}/{total} 题：{question.text}</legend>
        <p className="room-answer-intro">此刻，哪一个回答更接近你？</p>
        <p className="room-hint" id={hintId}>点房间里的编号，或直接选择下面的回答。</p>
        {question.options.map((option, index) => <label key={option.id} className={`room-answer${choice === option.id ? ' is-selected' : ''}`}>
          <input type="radio" name="answer" value={option.id} checked={choice === option.id} onChange={() => select(option.id)} />
          <span className="room-answer-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{option.label}{option.notApplicable ? '（不适用）' : ''}</span>
          <span className="room-answer-check" aria-hidden="true">{choice === option.id ? '✓' : '↗'}</span>
        </label>)}
        <div className="room-confirmation">
          <p>{choice ? dirty ? '选好了，就把这一刻记下来。' : '这一刻已记下，你可以继续了。' : '没有标准答案，按最近的感受选就好。'}</p>
          <button type="submit" disabled={!choice || !dirty} className="room-confirm">{busy ? '保存中…' : '保存答案'}<span aria-hidden="true">↗</span></button>
        </div>
      </fieldset>
    </div>
  </form>;
}
