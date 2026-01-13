/**
 * ProfileEditorSection Component
 * 
 * Editable form for student profile data.
 * Always visible - allows manual entry or displays AI-extracted data.
 * Changes kept in local state until user clicks Save.
 */

'use client';

import React from 'react';
import { Plus, Save, AlertCircle, Check } from 'lucide-react';
import { ExtractedResumeData } from '@/lib/shared/types';
import { ProfileValidationResult } from '@/lib/client/profileValidation';
import EducationForm from './components/EducationForm';
import ExperienceForm from './components/ExperienceForm';
import ProjectForm from './components/ProjectForm';
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
  saveSuccess?: boolean;
  showValidationErrors?: boolean;
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
  saveSuccess = false,
  showValidationErrors = false
}: ProfileEditorSectionProps) {
  
  // Use the custom hook for all data manipulation logic
  const handlers = useProfileEditor({ data, onChange });

  return (
    <div className="max-w-2xl mx-auto relative">
      {/* Loading Overlay */}
      {disabled && (
        <LoadingOverlay 
          message={loadingMessage} 
          submessage={loadingSubmessage}
        />
      )}
      
      <div className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Full Name</label>
                {validation?.fieldErrors?.student_name && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validation.fieldErrors.student_name}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.student_name || ''}
                onChange={(e) => handlers.updateField('student_name', e.target.value)}
                placeholder="Enter your name"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.student_name 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Email</label>
                {validation?.fieldErrors?.email && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validation.fieldErrors.email}</span>
                  </span>
                )}
              </div>
              <input
                type="email"
                value={data.email || ''}
                onChange={(e) => handlers.updateField('email', e.target.value)}
                placeholder="your.email@example.com"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.email 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                {validation?.fieldErrors?.phone_number && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validation.fieldErrors.phone_number}</span>
                  </span>
                )}
              </div>
              <input
                type="tel"
                value={data.phone_number || ''}
                onChange={(e) => handlers.updateField('phone_number', e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.phone_number 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Address</label>
                {validation?.fieldErrors?.address && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validation.fieldErrors.address}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.address || ''}
                onChange={(e) => handlers.updateField('address', e.target.value)}
                placeholder="City, Country"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.address 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Education */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Education</h3>
            <button
              onClick={handlers.addEducation}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>

          {data.education.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No education added yet</p>
          ) : (
            <div className="space-y-6">
              {data.education.map((edu, index) => (
                <EducationForm
                  key={index}
                  data={edu}
                  onChange={(field, value) => handlers.updateEducation(index, field, value)}
                  onRemove={() => handlers.removeEducation(index)}
                  fieldErrors={validation?.fieldErrors?.education?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Experience */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Experience</h3>
            <button
              onClick={handlers.addExperience}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>

          {data.experience.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No work experience added yet</p>
          ) : (
            <div className="space-y-6">
              {data.experience.map((exp, index) => (
                <ExperienceForm
                  key={index}
                  data={exp}
                  onChange={(field, value) => handlers.updateExperience(index, field, value)}
                  onRemove={() => handlers.removeExperience(index)}
                  fieldErrors={validation?.fieldErrors?.experience?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Projects</h3>
            <button
              onClick={handlers.addProject}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          </div>

          {data.projects.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No projects added yet</p>
          ) : (
            <div className="space-y-4">
              {data.projects.map((project, index) => (
                <ProjectForm
                  key={index}
                  data={project}
                  onChange={(field, value) => handlers.updateProject(index, field, value)}
                  onRemove={() => handlers.removeProject(index)}
                  fieldErrors={validation?.fieldErrors?.projects?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Skills */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Skills</h3>
            <button
              onClick={handlers.addSkill}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          </div>

          {data.skills.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No skills added yet</p>
          ) : (
            <SkillsInput
              skills={data.skills}
              onChange={handlers.updateSkills}
              fieldErrors={validation?.fieldErrors.skills}
              disabled={disabled}
            />
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Languages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Languages</h3>
            <button
              onClick={handlers.addLanguage}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Language
            </button>
          </div>

          {data.languages.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No languages added yet</p>
          ) : (
            <LanguagesInput
              languages={data.languages}
              onChange={handlers.updateLanguages}
              fieldErrors={validation?.fieldErrors.languages}
              disabled={disabled}
            />
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Publications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Publications</h3>
            <button
              onClick={handlers.addPublication}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Publication
            </button>
          </div>

          {data.publications.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No publications added yet</p>
          ) : (
            <div className="space-y-4">
              {data.publications.map((publication, index) => (
                <PublicationForm
                  key={index}
                  data={publication}
                  onChange={(field, value) => handlers.updatePublication(index, field, value)}
                  onRemove={() => handlers.removePublication(index)}
                  fieldErrors={validation?.fieldErrors?.publications?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Certifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Certifications & Awards</h3>
            <button
              onClick={handlers.addCertification}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Certification
            </button>
          </div>

          {data.certifications.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No certifications added yet</p>
          ) : (
            <div className="space-y-4">
              {data.certifications.map((certification, index) => (
                <CertificationForm
                  key={index}
                  data={certification}
                  onChange={(field, value) => handlers.updateCertification(index, field, value)}
                  onRemove={() => handlers.removeCertification(index)}
                  fieldErrors={validation?.fieldErrors?.certifications?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Social Links</h3>

          <SocialLinksInput
            social_links={data.social_links}
            onChange={handlers.updateSocialLinks}
            fieldErrors={validation?.fieldErrors.social_links}
            disabled={disabled}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving || disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Publish Profile'}
            </>
          )}
        </button>

        {/* Validation Error Message */}
        {showValidationErrors && validation && !validation.isValid && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Please fix all required fields before saving
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
