/**
 * Custom hook for checking work preferences completion status
 */

import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/lib/client/http';

export function usePreferences() {
  const [preferencesComplete, setPreferencesComplete] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkPreferences = useCallback(async () => {
    try {
      const response = await apiFetch('/api/student/work-preferences');
      const data = await response.json();
      
      if (data.preferences) {
        const prefs = data.preferences;
        const hasPositions = prefs.positions && prefs.positions.length > 0;
        const hasLocations = prefs.locations && prefs.locations.length > 0;
        const hasExperience = prefs.exp_internship || prefs.exp_entry || prefs.exp_associate ||
          prefs.exp_mid_senior || prefs.exp_director || prefs.exp_executive;
        const hasJobTypes = prefs.job_full_time || prefs.job_part_time || prefs.job_contract ||
          prefs.job_temporary || prefs.job_internship || prefs.job_volunteer || prefs.job_other;
        const hasDateFilters = prefs.date_24_hours || prefs.date_week || 
          prefs.date_month || prefs.date_all_time;
        const hasPersonalInfo = prefs.date_of_birth && prefs.notice_period && 
          prefs.salary_expectation_usd && prefs.salary_expectation_usd > 0;
        
        setPreferencesComplete(hasPositions && hasLocations && hasExperience && 
          hasJobTypes && hasDateFilters && hasPersonalInfo);
      } else {
        setPreferencesComplete(false);
      }
    } catch (_err) {
      setPreferencesComplete(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPreferences();
  }, [checkPreferences]);

  return {
    preferencesComplete,
    checking,
    recheckPreferences: checkPreferences,
  };
}
