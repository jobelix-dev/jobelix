/**
 * SkillsInput Component
 * Tag-based skill input with add/remove functionality
 */

import React, { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { SkillEntry } from '@/lib/shared/types';

interface SkillsInputProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
  fieldErrors?: Record<number, { skill_name?: string; skill_slug?: string }>;
  disabled?: boolean;
  inputId?: string;
  addButtonId?: string;
}

export default function SkillsInput({
  skills,
  onChange,
  fieldErrors = {},
  disabled = false,
  inputId = 'profile-skills-input',
  addButtonId = 'profile-skills-add'
}: SkillsInputProps) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    if (!input.trim()) return;
    
    const skillName = input.trim();
    const newSkill: SkillEntry = {
      skill_name: skillName,
      skill_slug: skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };
    
    onChange([...skills, newSkill]);
    setInput('');
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="space-y-3">
      {/* Error messages */}
      {hasErrors && (
        <div className="flex items-center gap-1 text-xs text-warning">
          <AlertCircle className="w-3 h-3" />
          <span>Some skills have validation errors</span>
        </div>
      )}

      {/* Skills tags */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {skills.map((skill, index) => {
            const errorMessage = fieldErrors[index]?.skill_name;
            
            return (
              <div
                key={index}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  errorMessage
                    ? 'bg-warning/30 text-warning ring-1 ring-warning/50'
                    : 'bg-primary-subtle/30 text-primary-hover'
                }`}
              >
                <span className="font-medium">{skill.skill_name}</span>
                <button
                  onClick={() => removeSkill(index)}
                  disabled={disabled}
                  className="p-0.5 hover:bg-primary-subtle rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title={`Remove ${skill.skill_name}`}
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input field with Add button - at the bottom */}
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={skills.length === 0 ? "Add your first skill..." : "Add another skill..."}
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-sm rounded border ${
            hasErrors
              ? 'border-warning ring-1 ring-warning/50/50'
              : 'border-border'
          } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
        />
        <button
          id={addButtonId}
          onClick={addSkill}
          disabled={disabled || !input.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

    </div>
  );
}
