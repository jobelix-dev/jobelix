/**
 * Job Preferences Tab - Job Search Preferences Configuration
 * 
 * Focused on configuring job search criteria and preferences
 */

'use client';

import WorkPreferencesSection from './sections/WorkPreferencesSection';
import { usePreferences } from './hooks';

export default function JobPreferencesTab() {
  // Custom hook for preferences
  const preferences = usePreferences();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Job Preferences
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set your job preferences to receive better startup matches and enable the LinkedIn Auto-Apply bot.
        </p>
      </div>

      {/* Work Preferences Section */}
      <WorkPreferencesSection onSave={preferences.recheckPreferences} />
    </div>
  );
}
