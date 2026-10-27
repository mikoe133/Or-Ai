import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ExperienceRelease } from '@orai/contracts/experience';
import type { ChoiceProps } from './types.js';
import { SimpleChoice } from './simple-choice.js';
import { resourceImage } from './model.js';
import './host.css';

const DomChoice = lazy(() => import('./dom-choice.js'));
const QuietRoom = lazy(() => import('./quiet-room.js'));
const ReflectionGarden = lazy(() => import('./reflection-garden.js'));
const templates = { 'dom-choice@1': DomChoice, 'quiet-room@1': QuietRoom, 'reflection-garden@1': ReflectionGarden };
const Context = createContext<{ release?: ExperienceRelease; simple: boolean; images: { url: string; label: string }[]; unavailable: () => void } | null>(null);
class RendererBoundary extends Component<{ children: ReactNode; fallback: ReactNode; unavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.unavailable(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function ExperienceHost({ release, attemptId, children }: { release?: ExperienceRelease; attemptId: string; children: ReactNode }) {
  const [simple, setSimple] = useState(false), client = useQueryClient();
  const [images, setImages] = useState<{ url: string; label: string }[]>([]);
  const unavailable = useCallback(() => {
    setSimple(true);
    // A missing resource can also mean access was withdrawn. Recheck the owning attempt.
    void client.invalidateQueries({ queryKey: ['private', 'attempt', attemptId] });
  }, [client, attemptId]);
  useEffect(() => {
    if (simple) return;
    const abort = new AbortController(), urls: string[] = [];
    void (async () => {
      try {
        const loaded = [];
        for (const resource of release?.manifest.resources ?? []) {
          const blob = await resourceImage(attemptId, resource, abort.signal);
          const url = URL.createObjectURL(blob); urls.push(url); loaded.push({ url, label: resource.label });
        }
        if (!abort.signal.aborted) setImages(loaded);
      } catch { if (!abort.signal.aborted) unavailable(); }
    })();
    return () => { abort.abort(); for (const url of urls) URL.revokeObjectURL(url); };
  }, [release?.id, attemptId, unavailable, simple]);
  return <Context.Provider value={{ release, simple, images, unavailable }}>
    <div style={{ display: 'contents' }} data-experience-release={release?.id ?? 'legacy'} data-experience-theme={release?.manifest.theme.key ?? 'legacy'} data-experience-renderer={release?`${release.manifest.renderer.key}@${release.manifest.renderer.version}`:'dom-choice@1'}>
      {simple ? <><p role="status">已切换到简化界面，已保存进度保留。</p>{release?.manifest.renderer.key==='reflection-garden'&&<button type="button" onClick={()=>setSimple(false)}>重试花园画面</button>}</> : <button type="button" onClick={() => setSimple(true)}>使用简化界面</button>}
      {children}
    </div>
  </Context.Provider>;
}
export function ChoiceScene(props: ChoiceProps) {
  const context = useContext(Context);
  if (!context) return <SimpleChoice {...props} />;
  const key = context.release ? `${context.release.manifest.renderer.key}@${context.release.manifest.renderer.version}` : 'dom-choice@1';
  const Template = templates[key as keyof typeof templates];
  const fallback = <div data-experience-template="simplified"><SimpleChoice {...props} /></div>;
  if (context.simple || !Template) return fallback;
  return <RendererBoundary fallback={fallback} unavailable={context.unavailable}>
    <Suspense fallback={fallback}><Template {...props} release={context.release} images={context.images} unavailable={context.unavailable} /></Suspense>
  </RendererBoundary>;
}

export { RendererBoundary };
