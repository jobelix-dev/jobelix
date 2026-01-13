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
          className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No questions added yet</p>
      )}

      <div className="space-y-2">
        {questions.map((question, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">{index + 1}.</span>
            <input
              type="text"
              value={question.question}
              onChange={(e) => updateQuestion(index, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
              placeholder="e.g. What interests you about this role?"
            />
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
