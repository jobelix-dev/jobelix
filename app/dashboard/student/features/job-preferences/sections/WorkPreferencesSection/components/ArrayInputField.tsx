/**
 * ArrayInputField Component
 * 
 * Input field with tags for managing arrays of strings (positions, locations, blacklists)
 */

'use client';

import React, { useState } from 'react';

interface ArrayInputFieldProps {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  icon?: React.ReactNode;
  tagColorClass?: string;
}

export default function ArrayInputField({
  label,
  placeholder,
  value,
  onChange,
  icon,
  tagColorClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
}: ArrayInputFieldProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    onChange([...value, input.trim()]);
    setInput('');
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {icon && <span className="inline-flex items-center mr-1">{icon}</span>}
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium transition-colors shadow-sm"
          type="button"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${tagColorClass}`}
          >
            <span>{item}</span>
            <button
              onClick={() => handleRemove(idx)}
              className="hover:opacity-70 transition-opacity ml-1 font-semibold"
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
