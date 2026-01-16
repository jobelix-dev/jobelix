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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-purple-200 dark:border-purple-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-4">
            {projectName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
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
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
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
                className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Auto-save indicator */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center pt-2">
            Changes are saved automatically
          </div>
        </div>
      </div>
    </div>
  );
}
