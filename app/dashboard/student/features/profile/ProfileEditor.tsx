/**
 * ProfileEditor Component
 * 
 * Editable form for student profile data.
 * Always visible - allows manual entry or displays AI-extracted data.
 * Changes kept in local state until user clicks Save.
 */

'use client';

import React from 'react';
import { Plus, Save, AlertCircle, Check } from 'lucide-react';
import { ExtractedResumeData, EducationEntry, ExperienceEntry } from '@/lib/types';
import { ProfileValidationResult } from '@/lib/profileValidation';
import EducationForm from './components/EducationForm';
import ExperienceForm from './components/ExperienceForm';
import LoadingOverlay from '@/app/components/LoadingOverlay';

interface ProfileEditorProps {
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
}

export default function ProfileEditor({ 
  data, 
  onChange, 
  onSave, 
  isSaving = false,
  canSave = true,
  validation,
  disabled = false,
  loadingMessage,
  loadingSubmessage,
  saveSuccess = false
}: ProfileEditorProps) {
  
  // Update a top-level field (name, phone, email, address)
  const updateField = (field: keyof ExtractedResumeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Add new education entry
  const addEducation = () => {
    onChange({
      ...data,
      education: [
        ...data.education,
        {
          school_name: '',
          degree: '',
          description: null,
          start_year: null,
          start_month: null,
          end_year: null,
          end_month: null,
          confidence: 'high' as const,
        }
      ]
    });
  };

  // Update education entry
  const updateEducation = (index: number, field: keyof EducationEntry, value: any) => {
    const updated = [...data.education];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, education: updated });
  };

  // Remove education entry
  const removeEducation = (index: number) => {
    onChange({
      ...data,
      education: data.education.filter((_, i) => i !== index)
    });
  };

  // Add new experience entry
  const addExperience = () => {
    onChange({
      ...data,
      experience: [
        ...data.experience,
        {
          organisation_name: '',
          position_name: '',
          description: null,
          start_year: null,
          start_month: null,
          end_year: null,
          end_month: null,
          confidence: 'high' as const,
        }
      ]
    });
  };

  // Update experience entry
  const updateExperience = (index: number, field: keyof ExperienceEntry, value: any) => {
    const updated = [...data.experience];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, experience: updated });
  };

  // Remove experience entry
  const removeExperience = (index: number) => {
    onChange({
      ...data,
      experience: data.experience.filter((_, i) => i !== index)
    });
  };

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
                onChange={(e) => updateField('student_name', e.target.value)}
                placeholder="Enter your name"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.student_name 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
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
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="your.email@example.com"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.email 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
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
                onChange={(e) => updateField('phone_number', e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.phone_number 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
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
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="City, State/Country"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  validation?.fieldErrors?.address 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
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
              onClick={addEducation}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-zinc-100 dark:disabled:hover:bg-zinc-800"
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
                  onChange={(field: keyof EducationEntry, value: any) => updateEducation(index, field, value)}
                  onRemove={() => removeEducation(index)}
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
            <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Work Experience</h3>
            <button
              onClick={addExperience}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-zinc-100 dark:disabled:hover:bg-zinc-800"
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
                  onChange={(field: keyof ExperienceEntry, value: any) => updateExperience(index, field, value)}
                  onRemove={() => removeExperience(index)}
                  fieldErrors={validation?.fieldErrors?.experience?.[index]}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving || !canSave || disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : canSave ? 'Save Profile' : 'Complete Required Fields'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
