/**
 * SimpleArrayInput Component
 * 
 * Generic array input for managing lists of items.
 * Handles add, remove, and update operations.
 */

'use client';

import { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SimpleArrayInputProps<T> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    updateItem: (value: T) => void
  ) => ReactNode;
  createItem: () => T;
  emptyMessage?: string;
  addButtonText?: string;
  bulletStyle?: 'number' | 'bullet' | 'check' | 'none';
  disabled?: boolean;
}

export default function SimpleArrayInput<T>({
  label,
  items,
  onChange,
  renderItem,
  createItem,
  emptyMessage = 'No items added yet',
  addButtonText = 'Add',
  bulletStyle = 'none',
  disabled = false,
}: SimpleArrayInputProps<T>) {
  const addItem = () => {
    onChange([...items, createItem()]);
  };

  const updateItem = (index: number, value: T) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const getBullet = (index: number) => {
    switch (bulletStyle) {
      case 'number':
        return <span className="text-muted mt-2 flex-shrink-0 w-5">{index + 1}.</span>;
      case 'bullet':
        return <span className="text-muted mt-2 flex-shrink-0 w-5">•</span>;
      case 'check':
        return <span className="text-muted mt-2 flex-shrink-0 w-5">✓</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">{label}</label>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {addButtonText}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-muted text-sm text-center py-4">{emptyMessage}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-start">
            {getBullet(index)}
            <div className="flex-1">
              {renderItem(item, index, (value) => updateItem(index, value))}
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
