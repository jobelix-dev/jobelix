/**
 * Job Preferences Tab - Job Search Preferences Configuration
 * 
 * Focused on configuring job search criteria and preferences
 */

'use client';

import { useState } from 'react';
import { CheckCircle, ArrowDown } from 'lucide-react';
import WorkPreferencesSection from './sections/WorkPreferencesSection';
import { usePreferences } from './hooks';

export default function JobPreferencesTab() {
  // Custom hook for preferences
  const preferences = usePreferences();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Job Preferences
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Set your job preferences to receive better startup matches <br /> and enable the LinkedIn Auto-Apply bot.
            </p>
          </div>
          
          {/* Status Badge */}
          {!preferences.checking && (
            hasUnsavedChanges ? (
              <button
                onClick={() => {
                  const saveButton = document.getElementById('save-preferences-button');
                  saveButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Unsaved
                </span>
                <ArrowDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>
            ) : preferences.preferencesComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Saved
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const saveButton = document.getElementById('save-preferences-button');
                  saveButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Unsaved
                </span>
                <ArrowDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Work Preferences Section */}
      <WorkPreferencesSection 
        onSave={preferences.recheckPreferences}
        onUnsavedChanges={setHasUnsavedChanges}
      />
    </div>
  );
}
