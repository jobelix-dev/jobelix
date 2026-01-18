/**
 * ProjectModal Component
 * Centered modal for editing project details
 * Same form fields as ProjectForm, but in a modal overlay
 */

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ProjectEntry } from '@/lib/shared/types';

interface ProjectModalProps {
  data: ProjectEntry;
  onChange: (field: keyof ProjectEntry, value: any) => void;
  onClose: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function ProjectModal({ 
  data, 
  onChange, 
  onClose, 
  fieldErrors = {}, 
  disabled = false 
}: ProjectModalProps) {
  const projectName = data.project_name?.trim() || 'New Project';

  return (
    <div 
      className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-surface border-b border-primary-subtle px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-default truncate pr-4">
            {projectName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-subtle rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Two column layout for name and link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Project Name</label>
                {fieldErrors.project_name && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.project_name}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.project_name}
                onChange={(e) => onChange('project_name', e.target.value)}
                placeholder="e.g., E-commerce Platform"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.project_name 
                    ? 'border-warning ring-1 ring-warning/50/50' 
                    : 'border-border'
                } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Project Link (optional)</label>
              <input
                type="url"
                value={data.link || ''}
                onChange={(e) => onChange('link', e.target.value || null)}
                placeholder="https://github.com/username/project"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Full width description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value || null)}
              placeholder="Brief description of the project and technologies used..."
              rows={6}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Auto-save indicator */}
          <div className="text-xs text-muted text-center pt-2">
            Changes are saved automatically
          </div>
        </div>
      </div>
    </div>
  );
}
