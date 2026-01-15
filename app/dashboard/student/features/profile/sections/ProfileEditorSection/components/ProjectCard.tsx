/**
 * ProjectCard Component
 * Compact card view for project in grid layout
 * Shows project name and tech stack preview
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ProjectEntry } from '@/lib/shared/types';

interface ProjectCardProps {
  data: ProjectEntry;
  onClick: () => void;
  fieldErrors?: Record<string, string>;
}

export default function ProjectCard({ data, onClick, fieldErrors = {} }: ProjectCardProps) {
  const projectName = data.project_name?.trim() || 'Untitled Project';
  const hasErrors = Object.keys(fieldErrors).length > 0;
  
  // Extract tech stack from description if available
  const techPreview = data.description 
    ? data.description.substring(0, 60) + (data.description.length > 60 ? '...' : '')
    : 'No description';

  // Safely parse URL
  let linkHostname: string | null = null;
  if (data.link) {
    try {
      linkHostname = new URL(data.link).hostname;
    } catch {
      // Invalid URL, show the raw link
      linkHostname = data.link.substring(0, 30) + (data.link.length > 30 ? '...' : '');
    }
  }

  return (
    <button
      onClick={onClick}
      className="group relative p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left w-full"
    >
      {/* Error indicator */}
      {hasErrors && (
        <div className="absolute top-2 right-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
        </div>
      )}
      
      {/* Project name */}
      <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate pr-6 mb-2">
        {projectName}
      </h4>
      
      {/* Tech/description preview */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
        {techPreview}
      </p>
      
      {/* Link indicator */}
      {linkHostname && (
        <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900">
          <span className="text-xs text-purple-600 dark:text-purple-400 truncate block">
            🔗 {linkHostname}
          </span>
        </div>
      )}
    </button>
  );
}
