/**
 * RoleRequirementsForm Component
 * 
 * Groups all role-related requirements:
 * - Required Skills
 * - Key Responsibilities
 * - Desired Capabilities
 * - Screening Questions
 */

'use client';

import { OfferSkillEntry, OfferResponsibilityEntry, OfferCapabilityEntry, OfferQuestionEntry } from '@/lib/shared/types';
import SkillsInput from './SkillsInput';
import ResponsibilitiesInput from './ResponsibilitiesInput';
import CapabilitiesInput from './CapabilitiesInput';
import QuestionsInput from './QuestionsInput';

interface RoleRequirementsFormProps {
  skills: OfferSkillEntry[];
  onSkillsChange: (skills: OfferSkillEntry[]) => void;
  responsibilities: OfferResponsibilityEntry[];
  onResponsibilitiesChange: (responsibilities: OfferResponsibilityEntry[]) => void;
  capabilities: OfferCapabilityEntry[];
  onCapabilitiesChange: (capabilities: OfferCapabilityEntry[]) => void;
  questions: OfferQuestionEntry[];
  onQuestionsChange: (questions: OfferQuestionEntry[]) => void;
}

export default function RoleRequirementsForm({
  skills,
  onSkillsChange,
  responsibilities,
  onResponsibilitiesChange,
  capabilities,
  onCapabilitiesChange,
  questions,
  onQuestionsChange
}: RoleRequirementsFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-default">Role Requirements</h3>
      </div>

      {/* Required Skills */}
      <div>
        <SkillsInput
          skills={skills}
          onChange={onSkillsChange}
        />
      </div>

      {/* Key Responsibilities */}
      <div>
        <ResponsibilitiesInput
          responsibilities={responsibilities}
          onChange={onResponsibilitiesChange}
        />
      </div>

      {/* Desired Capabilities */}
      <div>
        <CapabilitiesInput
          capabilities={capabilities}
          onChange={onCapabilitiesChange}
        />
      </div>

      {/* Screening Questions */}
      <div>
        <QuestionsInput
          questions={questions}
          onChange={onQuestionsChange}
        />
      </div>
    </div>
  );
}
