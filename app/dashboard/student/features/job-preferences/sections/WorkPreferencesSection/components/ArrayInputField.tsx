/**
 * ArrayInputField Component
 * 
 * Input field with tags for managing arrays of strings (positions, locations, blacklists)
 */

'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { AlertCircle } from 'lucide-react';

interface ArrayInputFieldProps {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  icon?: React.ReactNode;
  tagColorClass?: string;
  hasError?: boolean;
  inputId?: string;
  addButtonId?: string;
}

export interface ArrayInputFieldRef {
  flushPendingInput: () => void;
  getPendingInput: () => string;
}

const ArrayInputField = forwardRef<ArrayInputFieldRef, ArrayInputFieldProps>((
  {
    label,
    placeholder,
    value,
    onChange,
    icon,
    tagColorClass = 'bg-primary-subtle/30 text-primary-hover',
    hasError = false,
    inputId,
    addButtonId,
  },
  ref
) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    onChange([...value, input.trim()]);
    setInput('');
  };

  // Expose flush and get methods to parent via ref
  useImperativeHandle(ref, () => ({
    flushPendingInput: () => {
      handleAdd();
    },
    getPendingInput: () => {
      return input;
    },
  }));

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
      <label className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        {icon}
        {label}
        {hasError && <AlertCircle className="w-4 h-4 text-warning" />}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 text-sm bg-white border rounded-lg text-default focus:ring-2 focus:outline-none transition-colors ${
            hasError
              ? 'border-warning focus:border-warning focus:ring-warning/30'
              : 'border-border focus:border-primary focus:ring-primary/30'
          }`}
        />
        <button
          id={addButtonId}
          onClick={handleAdd}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
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
});

ArrayInputField.displayName = 'ArrayInputField';

export default ArrayInputField;
