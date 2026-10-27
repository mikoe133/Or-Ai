import type { ChoiceProps } from './types.js';

export function SimpleChoice({ question, current, total, choice, disabled, dirty, busy, onSelect, onConfirm }: ChoiceProps) {
  return <form className="consumer-choice" onSubmit={event => { event.preventDefault(); onConfirm(); }}>
    <fieldset disabled={disabled}>
      <legend>第 {current + 1}/{total} 题：{question.text}</legend>
      <div className="consumer-option-grid">{question.options.map((option, index) => <label className={`biz-option${choice === option.id ? ' is-selected' : ''}`} key={option.id}>
        <input type="radio" name="answer" value={option.id} checked={choice === option.id} onChange={() => onSelect(option.id)} />
        <span className="consumer-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
        <span>{option.label}{option.notApplicable ? '（不适用）' : ''}</span>
      </label>)}</div>
      <button type="submit" disabled={!choice || !dirty}>{busy ? '保存中…' : '保存答案'}</button>
    </fieldset>
  </form>;
}
