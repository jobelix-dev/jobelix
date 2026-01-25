/**
 * Job Preferences Tab - Job Search Preferences Configuration
 * 
 * Focused on configuring job search criteria and preferences
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, ArrowDown } from 'lucide-react';
import WorkPreferencesSection from './sections/WorkPreferencesSection';
import { usePreferences } from './hooks';

interface JobPreferencesTabProps {
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

export default function JobPreferencesTab({ onUnsavedChanges }: JobPreferencesTabProps) {
  // Custom hook for preferences
  const preferences = usePreferences();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (onUnsavedChanges) {
      onUnsavedChanges(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChanges]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-default">
              Job Preferences
            </h2>
            <p className="text-sm text-muted mt-1">
              Set your job preferences to receive better startup matches <br /> and enable the LinkedIn Auto-Apply bot.
            </p>
          </div>
          
          {/* Status Badge */}
          {!preferences.checking && (
            hasUnsavedChanges ? ( // Changes exist, show Unsaved button
              <button
                onClick={() => {
                  const saveButton = document.getElementById('save-preferences-button');
                  saveButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-subtle/20 border border-warning hover:bg-warning-subtle transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="text-sm font-medium text-warning">
                  Unsaved
                </span>
                <ArrowDown className="w-4 h-4 text-warning" />
              </button>
            ) : preferences.preferencesComplete ? ( // no changes + complete preferences = show Saved badge
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-subtle/20 border border-success flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">
                  Saved
                </span>
              </div>
            ) : ( // Incomplete preferences, show Unsaved button
              <button
                onClick={() => {
                  const saveButton = document.getElementById('save-preferences-button');
                  saveButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-subtle/20 border border-warning hover:bg-warning-subtle transition-colors cursor-pointer flex-shrink-0"
              >
                <span className="text-sm font-medium text-warning">
                  Unsaved
                </span>
                <ArrowDown className="w-4 h-4 text-warning" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Work Preferences Section */}
      <WorkPreferencesSection 
        onSave={preferences.recheckPreferences}
        onUnsavedChanges={setHasUnsavedChanges} // when set to true Unsaved button shows up and when clicked scrolls to bottom save preferences button
      />
    </div>
  );
}
