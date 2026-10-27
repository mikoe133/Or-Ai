import type { ReportContentDto } from '@orai/contracts';
import FieldNotes from './field-notes.js';
import './reflection-garden.css';

export default function GardenNotes({ content }: { content: ReportContentDto }) {
  return <FieldNotes content={content} variant="garden" />;
}
