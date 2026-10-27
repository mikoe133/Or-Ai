import type { ReportContentDto } from '@orai/contracts';
import { ReportContents } from './report-content.js';
export default function LegacyReport({ content, enhanced = false }: { content: ReportContentDto; enhanced?: boolean }) {
  return <div style={{ display: 'contents' }} data-report-template="legacy-text@1"><ReportContents content={content} enhanced={enhanced} /></div>;
}
