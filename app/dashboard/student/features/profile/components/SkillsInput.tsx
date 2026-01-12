/**
 * SkillsInput Component
 * Compact two-column skill containers
 */

import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { SkillEntry } from '@/lib/types';

interface SkillsInputProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
  fieldErrors?: Record<number, { skill_name?: string; skill_slug?: string }>;
  disabled?: boolean;
}

export default function SkillsInput({ skills, onChange, fieldErrors = {}, disabled = false }: SkillsInputProps) {
  const updateSkill = (index: number, name: string) => {
    const updated = [...skills];
    updated[index] = {
      skill_name: name,
      skill_slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };
    onChange(updated);
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {skills.map((skill, index) => {
        const errorMessage = fieldErrors[index]?.skill_name;
        
        return (
          <div key={index} className="space-y-1">
            <div className="h-4">
              {errorMessage && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 px-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                errorMessage
                  ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50'
                  : 'border-purple-200 dark:border-purple-800'
              } bg-purple-50/30 dark:bg-purple-900/10`}
            >
              <input
                type="text"
                value={skill.skill_name}
                onChange={(e) => updateSkill(index, e.target.value)}
                placeholder="e.g., JavaScript"
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => removeSkill(index)}
                disabled={disabled}
                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Remove skill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
