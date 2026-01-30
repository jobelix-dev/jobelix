/**
 * QuestionsInput Component
 * 
 * Manages array of simple text screening questions
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferQuestionEntry } from '@/lib/shared/types';

interface QuestionsInputProps {
  questions: OfferQuestionEntry[];
  onChange: (questions: OfferQuestionEntry[]) => void;
}

export default function QuestionsInput({ questions, onChange }: QuestionsInputProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        question: '',
      },
    ]);
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = { question: value };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Screening Questions</label>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-muted text-sm text-center py-4">No questions added yet</p>
      )}

      <div className="space-y-2">
        {questions.map((question, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-muted mt-2 flex-shrink-0">{index + 1}.</span>
            <input
              type="text"
              value={question.question}
              onChange={(e) => updateQuestion(index, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              placeholder="e.g. What interests you about this role?"
            />
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
              title="Remove question"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
