/**
 * ProfileEditorSection Component
 * 
 * Editable form for talent profile data.
 * Always visible - allows manual entry or displays AI-extracted data.
 * Changes kept in local state until user clicks Save.
 * Note: Uses "student" internally for DB compatibility
 */

'use client';

import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { ExtractedResumeData } from '@/lib/shared/types';
import { ProfileValidationResult } from '@/lib/client/profileValidation';
import { SectionWithAddButton } from '@/app/components/shared';
import BasicInfoForm from './components/BasicInfoForm';
import EducationForm from './components/EducationForm';
import ExperienceForm from './components/ExperienceForm';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import SkillsInput from './components/SkillsInput';
import LanguagesInput from './components/LanguagesInput';
import PublicationForm from './components/PublicationForm';
import CertificationForm from './components/CertificationForm';
import SocialLinksInput from './components/SocialLinksInput';
import LoadingOverlay from '@/app/components/LoadingOverlay';
import { useProfileEditor } from './hooks';

interface ProfileEditorSectionProps {
  data: ExtractedResumeData;
  onChange: (data: ExtractedResumeData) => void;
  onSave: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  validation?: ProfileValidationResult;
  disabled?: boolean;
  loadingMessage?: string;
  loadingSubmessage?: string;
  loadingSteps?: string[];
  loadingEstimatedMs?: number;
  loadingProgress?: number;
  loadingStepIndex?: number;
  saveSuccess?: boolean;
  editingProjectIndex?: number | null;
  onEditingProjectIndexChange?: (index: number | null) => void;
  expandedEducationIndex?: number | null;
  expandedExperienceIndex?: number | null;
  expandedPublicationIndex?: number | null;
  expandedCertificationIndex?: number | null;
  onConfirmDelete?: (message: string) => Promise<boolean>;
}

export default function ProfileEditorSection({ 
  data, 
  onChange, 
  onSave, 
  isSaving = false,
  canSave = true,
  validation,
  disabled = false,
  loadingMessage,
  loadingSubmessage,
  loadingSteps,
  loadingEstimatedMs,
  loadingProgress,
  loadingStepIndex,
  saveSuccess = false,
  editingProjectIndex,
  onEditingProjectIndexChange,
  expandedEducationIndex,
  expandedExperienceIndex,
  expandedPublicationIndex,
  expandedCertificationIndex,
  onConfirmDelete
}: ProfileEditorSectionProps) {
  
  // Use the custom hook for all data manipulation logic
  const handlers = useProfileEditor({ data, onChange });
  
  const [internalProjectIndex, setInternalProjectIndex] = useState<number | null>(null);
  const activeProjectIndex = editingProjectIndex ?? internalProjectIndex;
  const setActiveProjectIndex = onEditingProjectIndexChange ?? setInternalProjectIndex;

  return (
    <div className="max-w-2xl mx-auto relative px-1 sm:px-0">
      {/* Loading Overlay */}
      {disabled && (
        <LoadingOverlay 
          message={loadingMessage} 
          submessage={loadingSubmessage}
          steps={loadingSteps}
          estimatedDurationMs={loadingEstimatedMs}
          progressPercent={loadingProgress}
          currentStepIndex={loadingStepIndex}
        />
      )}
      
      <div className="space-y-6 sm:space-y-8">
        {/* Basic Information */}
        <BasicInfoForm
          data={data}
          onUpdateField={handlers.updateField}
          fieldErrors={validation?.fieldErrors}
          disabled={disabled}
        />

        {/* Education */}
        <SectionWithAddButton
          title="Education"
          onAdd={handlers.addEducation}
          addLabel="Add Education"
          disabled={disabled}
          isEmpty={data.education.length === 0}
          emptyMessage="No education added yet"
        >
          <div className="space-y-6">
            {data.education.map((edu, index) => (
              <EducationForm
                key={index}
                data={edu}
                onChange={(field, value) => handlers.updateEducation(index, field, value)}
                onRemove={() => handlers.removeEducation(index)}
                fieldErrors={validation?.fieldErrors?.education?.[index]}
                disabled={disabled}
                forceExpanded={expandedEducationIndex === index}
                idPrefix={`profile-education-${index}`}
              />
            ))}
          </div>
        </SectionWithAddButton>


        {/* Experience */}
        <SectionWithAddButton
          title="Experience"
          onAdd={handlers.addExperience}
          addLabel="Add Experience"
          disabled={disabled}
          isEmpty={data.experience.length === 0}
          emptyMessage="No work experience added yet"
        >
          <div className="space-y-6">
            {data.experience.map((exp, index) => (
              <ExperienceForm
                key={index}
                data={exp}
                onChange={(field, value) => handlers.updateExperience(index, field, value)}
                onRemove={() => handlers.removeExperience(index)}
                fieldErrors={validation?.fieldErrors?.experience?.[index]}
                disabled={disabled}
                forceExpanded={expandedExperienceIndex === index}
                idPrefix={`profile-experience-${index}`}
              />
            ))}
          </div>
        </SectionWithAddButton>


        {/* Projects */}
        <SectionWithAddButton
          title="Projects"
          count={data.projects.length}
          showCount
          onAdd={handlers.addProject}
          addLabel="Add Project"
          disabled={disabled}
          isEmpty={data.projects.length === 0}
          emptyMessage="No projects added yet"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.projects.map((project, index) => (
              <ProjectCard
                key={index}
                data={project}
                onClick={() => setActiveProjectIndex(index)}
                onRemove={() => handlers.removeProject(index)}
                fieldErrors={validation?.fieldErrors?.projects?.[index]}
                onConfirmDelete={onConfirmDelete}
              />
            ))}
          </div>
        </SectionWithAddButton>

        {/* Project Edit Modal */}
        {activeProjectIndex !== null && (
          <ProjectModal
            data={data.projects[activeProjectIndex]}
            onChange={(field, value) => handlers.updateProject(activeProjectIndex, field, value)}
            onClose={() => setActiveProjectIndex(null)}
            fieldErrors={validation?.fieldErrors?.projects?.[activeProjectIndex]}
            disabled={disabled}
            idPrefix={`profile-project-${activeProjectIndex}`}
          />
        )}


        {/* Skills */}
        <SectionWithAddButton title="Skills">
          <SkillsInput
            skills={data.skills}
            onChange={handlers.updateSkills}
            fieldErrors={validation?.fieldErrors.skills}
            disabled={disabled}
            inputId="profile-skills-input"
            addButtonId="profile-skills-add"
          />
        </SectionWithAddButton>


        {/* Languages */}
        <SectionWithAddButton
          title="Languages"
          onAdd={handlers.addLanguage}
          addLabel="Add Language"
          disabled={disabled}
          isEmpty={data.languages.length === 0}
          emptyMessage="No languages added yet"
        >
          <LanguagesInput
            languages={data.languages}
            onChange={handlers.updateLanguages}
            fieldErrors={validation?.fieldErrors.languages}
            disabled={disabled}
            idPrefix="profile-language"
          />
        </SectionWithAddButton>


        {/* Publications */}
        <SectionWithAddButton
          title="Publications"
          onAdd={handlers.addPublication}
          addLabel="Add Publication"
          disabled={disabled}
          isEmpty={data.publications.length === 0}
          emptyMessage="No publications added yet"
        >
          <div className="space-y-4">
            {data.publications.map((publication, index) => (
              <PublicationForm
                key={index}
                data={publication}
                onChange={(field, value) => handlers.updatePublication(index, field, value)}
                onRemove={() => handlers.removePublication(index)}
                fieldErrors={validation?.fieldErrors?.publications?.[index]}
                disabled={disabled}
                forceExpanded={expandedPublicationIndex === index}
                idPrefix={`profile-publication-${index}`}
              />
            ))}
          </div>
        </SectionWithAddButton>


        {/* Certifications */}
        <SectionWithAddButton
          title="Certifications & Awards"
          onAdd={handlers.addCertification}
          addLabel="Add Certification"
          disabled={disabled}
          isEmpty={data.certifications.length === 0}
          emptyMessage="No certifications added yet"
        >
          <div className="space-y-4">
            {data.certifications.map((certification, index) => (
              <CertificationForm
                key={index}
                data={certification}
                onChange={(field, value) => handlers.updateCertification(index, field, value)}
                onRemove={() => handlers.removeCertification(index)}
                fieldErrors={validation?.fieldErrors?.certifications?.[index]}
                disabled={disabled}
                forceExpanded={expandedCertificationIndex === index}
                idPrefix={`profile-certification-${index}`}
              />
            ))}
          </div>
        </SectionWithAddButton>


        {/* Social Links */}
        <SectionWithAddButton title="Social Links">
          <SocialLinksInput
            social_links={data.social_links}
            onChange={handlers.updateSocialLinks}
            fieldErrors={validation?.fieldErrors.social_links}
            disabled={disabled}
            idPrefix="profile-social"
          />
        </SectionWithAddButton>

        {/* Save Button */}
        <button
          id="publish-profile-button"
          onClick={onSave}
          disabled={isSaving || disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded bg-primary hover:bg-primary-hover text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </>
          )}
        </button>

      </div>
    </div>
  );
}
