import type { ExperienceManifest, ExperienceResource } from '@orai/contracts/experience';

export function sceneSelection(manifest: ExperienceManifest, sceneId: string, objectId: string) {
  const scene = manifest.scenes.find(s => s.sceneId === sceneId), choice = scene?.choices.find(c => c.objectId === objectId);
  return scene && choice ? { questionId: scene.questionId, optionId: choice.optionId } : null;
}

export function confirmedCheckpoint(questions: { id: string }[], answers: { questionId: string }[], revision: number, last: string | null) {
  return { schemaVersion: 1 as const, revision,
    lastConfirmedQuestionId: last && answers.some(a => a.questionId === last) ? last : null,
    nextQuestionId: questions.find(q => !answers.some(a => a.questionId === q.id))?.id ?? null };
}

export async function resourceImage(attemptId: string, resource: ExperienceResource, signal: AbortSignal) {
  const response = await fetch(`/api/attempts/${attemptId}/resources/${resource.resourceId}`, {
    credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!response.ok || !response.body || response.headers.get('content-type')?.split(';')[0] !== resource.mimeType)
    throw new Error('Resource unavailable');
  const reader = response.body.getReader(), parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > resource.byteSize || length > 4 * 1024 * 1024) throw new Error('Resource exceeds its declared size');
      parts.push(next.value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (length !== resource.byteSize || digest !== resource.checksum || signal.aborted) throw new Error('Resource integrity mismatch');
  return new Blob([bytes], { type: resource.mimeType });
}
