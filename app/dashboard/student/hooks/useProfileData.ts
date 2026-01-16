/**
 * Profile Data Management Hook
 * 
 * Manages profile/draft data state and operations:
 * - Loading existing draft data
 * - Auto-saving changes (debounced)
 * - Profile validation
 * - Draft finalization
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/client/api';
import { validateProfile } from '@/lib/client/profileValidation';
import { generateResumeYaml } from '@/lib/client/resumeYamlGenerator';
import type { ExtractedResumeData } from '@/lib/shared/types';

const EMPTY_PROFILE: ExtractedResumeData = {
  student_name: null,
  phone_number: null,
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
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showValidationMessage, setShowValidationMessage] = useState(false);

  // Validation (recalculates when profileData changes)
  const validation = useMemo(() => {
    return validateProfile(profileData);
  }, [profileData]);

  const canSave = validation.isValid;

  // Load existing draft data on mount
  useEffect(() => {
    async function loadDraftData() {
      try {
        const response = await api.getDraft();
        if (response.draft) {
          setDraftId(response.draft.id);
          setDraftStatus(response.draft.status || 'editing');
          
          // Set profile data from draft
          setProfileData({
            student_name: response.draft.student_name,
            phone_number: response.draft.phone_number,
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
          });
        }
      } catch (error) {
        console.log('Failed to load draft, starting fresh');
      } finally {
        // Mark data as loaded to enable validation
        setIsDataLoaded(true);
      }
    }
    loadDraftData();
  }, []);

  // Auto-save draft when profileData changes (debounced)
  useEffect(() => {
    if (!draftId) return; // No draft ID yet, can't save
    if (!isDataLoaded) return; // Don't trigger on initial load
    
    // Set status to 'editing' when data changes
    setDraftStatus('editing');
    
    const timeoutId = setTimeout(async () => {
      try {
        await api.updateDraft(draftId, {
          student_name: profileData.student_name,
          phone_number: profileData.phone_number,
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
      setShowValidationErrors(true);
      setShowValidationMessage(true);
      setTimeout(() => setShowValidationMessage(false), 3000);
      return;
    }

    if (!draftId) {
      console.error('No draft ID available');
      return;
    }

    setFinalizing(true);
    setShowValidationErrors(false);
    setShowValidationMessage(false);

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
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          const result = await (window as any).electronAPI.writeResumeFile(yamlContent);
          if (result.success) {
            console.log('✅ Resume YAML saved to:', result.path);
          } else {
            console.error('❌ Failed to write resume.yaml:', result.error);
          }
        } else {
          console.log('ℹ️ Running in browser mode, skipping local resume.yaml generation');
        }
      } catch (yamlError: any) {
        console.error('Error generating resume.yaml:', yamlError);
        // Don't block the main flow if YAML generation fails
      }
      
      setSaveSuccess(true);
      setShowValidationErrors(false);
      setDraftStatus('published'); // Mark as published
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to finalize profile:', err);
      alert(err.message || 'Failed to save profile. Please try again.');
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
    showValidationErrors,
    showValidationMessage,
    
    // Save state
    finalizing,
    saveSuccess,
    
    // Actions
    handleFinalize,
  };
}
