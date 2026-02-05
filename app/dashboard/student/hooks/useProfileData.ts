/**
 * Profile Data Management Hook
 * 
 * Manages profile/draft data state and operations:
 * - Loading existing draft data
 * - Auto-saving changes (debounced)
 * - Profile validation
 * - Draft finalization
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { api } from '@/lib/client/api';
import { validateProfile } from '@/lib/client/profileValidation';
import { generateResumeYaml } from '@/lib/client/resumeYamlGenerator';
import type { ExtractedResumeData } from '@/lib/shared/types';

const EMPTY_PROFILE: ExtractedResumeData = {
  student_name: null,
  phone_number: null,
  phone_country_code: null,
  email: null,
  address: null,
  education: [],
  experience: [],
  projects: [],
  skills: [],
  languages: [],
  publications: [],
  certifications: [],
  social_links: {
    github: null,
    linkedin: null,
    stackoverflow: null,
    kaggle: null,
    leetcode: null,
  },
};

export function useProfileData() {
  // State
  const [profileData, setProfileData] = useState<ExtractedResumeData>(EMPTY_PROFILE);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'editing' | 'published'>('editing');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Use a ref to track the last saved data - prevents auto-save on initial load
  const lastSavedDataRef = useRef<string | null>(null);
  const hasUserEditedRef = useRef(false);

  // Validation (recalculates when profileData changes)
  const validation = useMemo(() => {
    return validateProfile(profileData);
  }, [profileData]);

  const canSave = validation.isValid;

  // Load existing draft data on mount and auto-generate YAML if published
  useEffect(() => {
    async function loadDraftData() {
      try {
        const response = await api.getDraft();
        if (response.draft) {
          setDraftId(response.draft.id);
          const loadedStatus = response.draft.status || 'editing';
          setDraftStatus(loadedStatus);
          
          const loadedData = {
            student_name: response.draft.student_name,
            phone_number: response.draft.phone_number,
            phone_country_code: response.draft.phone_country_code || null,
            email: response.draft.email,
            address: response.draft.address,
            education: response.draft.education || [],
            experience: response.draft.experience || [],
            projects: response.draft.projects || [],
            skills: response.draft.skills || [],
            languages: response.draft.languages || [],
            publications: response.draft.publications || [],
            certifications: response.draft.certifications || [],
            social_links: response.draft.social_links || [],
          };
          
          // Store the initial data hash to compare later
          lastSavedDataRef.current = JSON.stringify(loadedData);
          
          // Set profile data from draft
          setProfileData(loadedData);
          
          // If status is published, try to auto-generate YAML on load
          // This ensures the local resume.yaml is always in sync
          const electronWindow = window as Window & { electronAPI?: { writeResumeFile: (content: string) => Promise<{ success: boolean; path?: string; error?: string }> } };
          if (loadedStatus === 'published' && typeof window !== 'undefined' && electronWindow.electronAPI) {
            try {
              const publishedResponse = await fetch('/api/student/profile/published');
              if (publishedResponse.ok) {
                const publishedProfileData = await publishedResponse.json();
                const yamlContent = generateResumeYaml(publishedProfileData);
                const result = await electronWindow.electronAPI.writeResumeFile(yamlContent);
                if (result.success) {
                  console.log('✅ Resume YAML auto-synced on load:', result.path);
                } else {
                  console.warn('⚠️ Failed to sync resume.yaml, marking as unpublished');
                  setDraftStatus('editing');
                }
              } else {
                console.warn('⚠️ No published profile found, marking as unpublished');
                setDraftStatus('editing');
              }
            } catch (yamlError) {
              console.warn('⚠️ Failed to auto-sync YAML on load, marking as unpublished:', yamlError);
              setDraftStatus('editing');
            }
          }
        }
      } catch (_error) {
        console.log('Failed to load draft, starting fresh');
      } finally {
        // Mark data as loaded to enable validation
        setIsDataLoaded(true);
      }
    }
    loadDraftData();
  }, []);

  // Auto-save draft when profileData changes (debounced)
  // Only saves if data actually changed from what was loaded/saved
  useEffect(() => {
    if (!draftId) return; // No draft ID yet, can't save
    if (!isDataLoaded) return; // Don't trigger before initial load completes
    
    const currentDataString = JSON.stringify(profileData);
    
    // Skip if data hasn't actually changed from last saved state
    if (currentDataString === lastSavedDataRef.current) {
      return;
    }
    
    // Data has changed - mark as user edit and set to editing
    hasUserEditedRef.current = true;
    setDraftStatus('editing');
    
    const timeoutId = setTimeout(async () => {
      try {
        await api.updateDraft(draftId, {
          student_name: profileData.student_name,
          phone_number: profileData.phone_number,
          phone_country_code: profileData.phone_country_code,
          email: profileData.email,
          address: profileData.address,
          education: profileData.education,
          experience: profileData.experience,
          projects: profileData.projects,
          skills: profileData.skills,
          languages: profileData.languages,
          publications: profileData.publications,
          certifications: profileData.certifications,
          social_links: profileData.social_links,
        });
        // Update the last saved data ref
        lastSavedDataRef.current = currentDataString;
        console.log('Draft auto-saved with status: editing');
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 300); // 0.3 second debounce

    return () => clearTimeout(timeoutId);
  }, [profileData, draftId, isDataLoaded]);

  // Finalize profile (publish to main tables)
  const handleFinalize = useCallback(async () => {
    if (!canSave) {
      return;
    }

    if (!draftId) {
      console.error('No draft ID available');
      return;
    }

    setFinalizing(true);

    try {
      // Finalize the draft - moves data from draft to permanent tables
      await api.finalizeProfile(draftId);
      
      // Wait a moment to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate resume.yaml file locally (for Electron app)
      try {
        // Fetch published profile data
        const response = await fetch('/api/student/profile/published');
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        
        const publishedProfileData = await response.json();
        
        // Generate YAML content
        const yamlContent = generateResumeYaml(publishedProfileData);
        
        // Write to local file via Electron IPC
        const electronWindow = window as Window & { electronAPI?: { writeResumeFile: (content: string) => Promise<{ success: boolean; path?: string; error?: string }> } };
        if (typeof window !== 'undefined' && electronWindow.electronAPI) {
          const result = await electronWindow.electronAPI.writeResumeFile(yamlContent);
          if (result.success) {
            console.log('✅ Resume YAML saved to:', result.path);
          } else {
            console.error('❌ Failed to write resume.yaml:', result.error);
          }
        } else {
          console.log('ℹ️ Running in browser mode, skipping local resume.yaml generation');
        }
      } catch (yamlError: unknown) {
        console.error('Error generating resume.yaml:', yamlError);
        // Don't block the main flow if YAML generation fails
      }
      
      setSaveSuccess(true);
      setDraftStatus('published'); // Mark as published
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Failed to finalize profile:', err);
      // Error will be handled by calling component
      throw err;
    } finally {
      setFinalizing(false);
    }
  }, [draftId, canSave]);

  return {
    // State
    profileData,
    setProfileData,
    draftId,
    setDraftId,
    draftStatus,
    isDataLoaded,
    setIsDataLoaded,
    
    // Validation
    validation,
    canSave,
    // Save state
    finalizing,
    saveSuccess,
    
    // Actions
    handleFinalize,
  };
}
