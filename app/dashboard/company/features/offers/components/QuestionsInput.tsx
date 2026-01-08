/**
 * QuestionsInput Component
 * 
 * Manages array of simple text screening questions
 */

'use client';

import { OfferQuestionEntry } from '@/lib/types';

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Screening Questions</h3>
        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No questions added yet. Click "Add Question" to start.</p>
      )}

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">{index + 1}.</span>
            <input
              type="text"
              value={question.question}
              onChange={(e) => updateQuestion(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              placeholder="e.g. What interests you about this role?"
            />
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm px-2 py-2 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
