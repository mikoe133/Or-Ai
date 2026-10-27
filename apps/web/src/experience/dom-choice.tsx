import type { ExperienceRelease } from '@orai/contracts/experience';
import type { ChoiceProps } from './types.js';
import { SimpleChoice } from './simple-choice.js';
import { sceneSelection } from './model.js';

export default function DomChoice(props: ChoiceProps & { release?: ExperienceRelease; images: { url: string; label: string }[]; unavailable: () => void }) {
  const { release, unavailable, onSelect, images } = props;
  function select(optionId: string) {
    if (!release) { onSelect(optionId); return; }
    const scene = release.manifest.scenes.find(s => s.questionId === props.question.id);
    const objectId = scene?.choices.find(c => c.optionId === optionId)?.objectId;
    const normalized = scene && objectId ? sceneSelection(release.manifest, scene.sceneId, objectId) : null;
    if (!normalized || normalized.questionId !== props.question.id) { unavailable(); return; }
    onSelect(normalized.optionId);
  }
  return <div data-experience-template="dom-choice@1">
    {images.map(image => <img key={image.url} src={image.url} alt={image.label} style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} onError={unavailable} />)}
    <SimpleChoice {...props} onSelect={select} />
  </div>;
}
