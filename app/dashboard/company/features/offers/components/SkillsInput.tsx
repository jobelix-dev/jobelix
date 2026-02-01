/**
 * SkillsInput Component
 * 
 * Manages array of required skills for the offer
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferSkillEntry } from '@/lib/shared/types';

interface SkillsInputProps {
  skills: OfferSkillEntry[];
  onChange: (skills: OfferSkillEntry[]) => void;
}

export default function SkillsInput({ skills, onChange }: SkillsInputProps) {
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
  };

  const updateSkill = (index: number, field: keyof OfferSkillEntry, value: OfferSkillEntry[keyof OfferSkillEntry]) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-generate slug from skill_text if slug is empty
    if (field === 'skill_text' && !updated[index].skill_slug && typeof value === 'string') {
      updated[index].skill_slug = value.toLowerCase().replace(/\s+/g, '-');
    }
    onChange(updated);
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Required Skills</label>
        <button
          type="button"
          onClick={addSkill}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {skills.length === 0 && (
        <p className="text-muted text-sm text-center py-4">No skills added yet</p>
      )}

      <div className="space-y-3">
        {skills.map((skill, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-0 bg-surface sm:bg-transparent rounded-lg sm:rounded-none">
            <input
              type="text"
              value={skill.skill_text}
              onChange={(e) => updateSkill(index, 'skill_text', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              placeholder="Skill name (e.g. React)"
            />
            <div className="flex gap-2">
              <select
                value={skill.importance}
                onChange={(e) => updateSkill(index, 'importance', e.target.value as 'must' | 'nice')}
                className="flex-1 sm:flex-none sm:w-28 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                <option value="must">Required</option>
                <option value="nice">Nice to Have</option>
              </select>
              <select
                value={skill.level || ''}
                onChange={(e) => updateSkill(index, 'level', e.target.value || null)}
                className="flex-1 sm:flex-none sm:w-28 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                <option value="">Any Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={skill.years || ''}
                onChange={(e) => updateSkill(index, 'years', e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 sm:flex-none sm:w-20 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                placeholder="Yrs"
                min={0}
              />
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
                title="Remove skill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
