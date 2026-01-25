/**
 * ProjectCard Component
 * Compact card view for project in grid layout
 * Shows project name and tech stack preview
 */

import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { ProjectEntry } from '@/lib/shared/types';

interface ProjectCardProps {
  data: ProjectEntry;
  onClick: () => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  onConfirmDelete?: (message: string) => Promise<boolean>;
}

export default function ProjectCard({ data, onClick, onRemove, fieldErrors = {}, onConfirmDelete }: ProjectCardProps) {
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onConfirmDelete) {
      const confirmed = await onConfirmDelete(`Delete "${projectName}"?`);
      if (confirmed) {
        onRemove();
      }
    } else {
      // Fallback to immediate removal if no confirm dialog provided
      onRemove();
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative p-4 rounded-lg border border-border bg-primary-subtle/10 hover:bg-primary-subtle/30 hover:border-primary transition-all cursor-pointer"
    >
      {/* Delete button - shows on hover */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-surface hover:bg-error-subtle text-muted hover:text-error rounded transition-all shadow-sm z-10"
        title="Delete project"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Error indicator */}
      {hasErrors && (
        <div className="absolute top-2 right-10">
          <AlertCircle className="w-4 h-4 text-warning" />
        </div>
      )}
      
      {/* Project name */}
      <h4 className="font-medium text-sm text-default truncate pr-6 mb-2">
        {projectName}
      </h4>
      
      {/* Tech/description preview */}
      <p className="text-xs text-muted line-clamp-2">
        {techPreview}
      </p>
      
      {/* Link indicator */}
      {linkHostname && (
        <div className="mt-2 pt-2 border-t border-primary-subtle">
          <span className="text-xs text-primary truncate block">
            🔗 {linkHostname}
          </span>
        </div>
      )}
    </div>
  );
}
