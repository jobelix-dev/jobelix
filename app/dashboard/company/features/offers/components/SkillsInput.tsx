/**
 * SkillsInput Component
 * 
 * Manages array of required skills for the offer
 */

'use client';

import { OfferSkillEntry } from '@/lib/types';
import { useState } from 'react';

interface SkillsInputProps {
  skills: OfferSkillEntry[];
  onChange: (skills: OfferSkillEntry[]) => void;
}

export default function SkillsInput({ skills, onChange }: SkillsInputProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const addSkill = () => {
    onChange([
      ...skills,
      {
        skill_slug: '',
        skill_text: '',
        importance: 'must',
        level: null,
        years: null,
      },
    ]);
    setEditIndex(skills.length);
  };

  const updateSkill = (index: number, field: keyof OfferSkillEntry, value: any) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Required Skills</h3>
        <button
          type="button"
          onClick={addSkill}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Skill
        </button>
      </div>

      {skills.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No skills added yet. Click "Add Skill" to start.</p>
      )}

      <div className="space-y-3">
        {skills.map((skill, index) => (
          <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Skill Name</label>
                <input
                  type="text"
                  value={skill.skill_text}
                  onChange={(e) => updateSkill(index, 'skill_text', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. React"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Slug (for search)</label>
                <input
                  type="text"
                  value={skill.skill_slug}
                  onChange={(e) => updateSkill(index, 'skill_slug', e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. react"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Importance</label>
                <select
                  value={skill.importance}
                  onChange={(e) => updateSkill(index, 'importance', e.target.value as 'must' | 'nice')}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="must">Required</option>
                  <option value="nice">Nice to Have</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Level</label>
                <select
                  value={skill.level || ''}
                  onChange={(e) => updateSkill(index, 'level', e.target.value || null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Any</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Years of Experience</label>
                <input
                  type="number"
                  value={skill.years || ''}
                  onChange={(e) => updateSkill(index, 'years', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. 3"
                  min={0}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
