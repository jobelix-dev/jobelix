/**
 * PreferenceCard Component
 * 
 * Wrapper component for preference sections with consistent styling.
 */

import React from 'react';

interface PreferenceCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PreferenceCard({ children, className = '' }: PreferenceCardProps) {
  return (
    <div className={`bg-background rounded-xl p-3 sm:p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
