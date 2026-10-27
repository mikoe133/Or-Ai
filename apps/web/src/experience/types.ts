import type { QuestionDto } from '@orai/contracts';

export type PublicQuestion = QuestionDto;
export interface ChoiceProps {
  question: PublicQuestion; current: number; total: number; choice: string;
  disabled: boolean; dirty: boolean; busy: boolean;
  onSelect: (optionId: string) => void; onConfirm: () => void;
}
