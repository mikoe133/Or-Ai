import { lazy, Suspense, useState } from 'react';
import type { ReportContentDto } from '@orai/contracts';
import { legacyReportPresentation, type ReportPresentation } from '@orai/contracts/experience';
import { RendererBoundary } from './host.js';
import { ReportContents } from './report-content.js';

const LegacyReport = lazy(() => import('./legacy-report.js'));
const FieldNotes = lazy(() => import('./field-notes.js'));
const GardenNotes = lazy(() => import('./garden-notes.js'));
const AtlasNotes = lazy(() => import('./atlas-notes.js'));
const templates = { 'legacy-text@1': LegacyReport, 'field-notes@1': FieldNotes, 'garden-notes@1': GardenNotes,
  'atlas-notes-prototype@1': AtlasNotes };
export function ReportHost({ content, presentation = legacyReportPresentation, enhanced = false }: { content: ReportContentDto; presentation?: ReportPresentation; enhanced?: boolean }) {
  const [simple, setSimple] = useState(false), Template = templates[`${presentation.renderer.key}@${presentation.renderer.version}` as keyof typeof templates];
  const fallback = <div style={{ display: 'contents' }} data-report-template="simplified"><ReportContents content={content} enhanced={enhanced} /></div>;
  return <div style={{ display: 'contents' }} data-report-theme={presentation.theme.key} data-report-release={presentation.releaseId ?? 'legacy'}>
    {simple && <p role="status">已用简化排版展示同一份报告。</p>}
    {simple || !Template ? fallback : <RendererBoundary fallback={fallback} unavailable={() => setSimple(true)}>
      <Suspense fallback={fallback}><Template content={content} enhanced={enhanced} /></Suspense>
    </RendererBoundary>}
  </div>;
}
