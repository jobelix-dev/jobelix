/**
 * QuestionsInput Component
 * 
 * Manages array of screening questions using SimpleArrayInput.
 */

'use client';

import { SimpleArrayInput } from '@/app/components/shared';
import { OfferQuestionEntry } from '@/lib/shared/types';

interface QuestionsInputProps {
  questions: OfferQuestionEntry[];
  onChange: (questions: OfferQuestionEntry[]) => void;
}

export default function QuestionsInput({ questions, onChange }: QuestionsInputProps) {
  return (
    <SimpleArrayInput
      label="Screening Questions"
      items={questions}
      onChange={onChange}
      createItem={() => ({ question: '' })}
      emptyMessage="No questions added yet"
      addButtonText="Add Question"
      bulletStyle="number"
      renderItem={(item, _index, updateItem) => (
        <input
          type="text"
          value={item.question}
          onChange={(e) => updateItem({ question: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          placeholder="e.g. What interests you about this role?"
        />
      )}
    />
  );
}
