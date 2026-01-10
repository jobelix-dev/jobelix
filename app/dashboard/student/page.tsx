/**
 * Student Dashboard Component
 * 
 * Main interface for students to manage their profile.
 * Features: Manual profile editing, PDF upload with AI extraction, optional AI assistant.
 * ProfileEditor always visible - allows manual entry or displays AI-extracted data.
 * AIAssistant appears optionally when PDF uploaded or user requests help.
 */

'use client';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { validateProfile } from '@/lib/profileValidation';
import DashboardNav from './components/DashboardNav';
import { ProfileTab } from './features/profile';
import { MatchesTab } from './features/matches';
import { AutoApplyTab } from './features/auto-apply';
import { ActivityTab } from './features/activity';
import type { ExtractDataResponse, ExtractedResumeData } from '@/lib/types';

type DashboardTab = 'profile' | 'matches' | 'auto-apply' | 'activity';

export default function StudentDashboard() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  // Single source of truth for profile data (manual + AI extracted)
  const [profileData, setProfileData] = useState<ExtractedResumeData>({
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
    social_links: [],
  });

  // AI assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Resume upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [resumeInfo, setResumeInfo] = useState<{ filename?: string; uploaded_at?: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showValidationMessage, setShowValidationMessage] = useState(false);

  // Validate profile data - recalculates whenever profileData changes
  // useMemo runs only when profileData changes
  // see lib/profileValidation.ts for details on validation
  const validation = useMemo(() => {
    return validateProfile(profileData);
  }, [profileData]);
  const canSave = validation.isValid;

  /////////////////RESUME SECTION/////////////////
  // Load existing resume METADATA info on mount (after function is rendered)
  useEffect(() => { // existing resume metadata is fetched from db, not profile data
    async function loadResumeInfo() {
      try {
        const response = await api.getResume();
        
        if (response.data) {
          setResumeInfo({
            filename: response.data.file_name,
            uploaded_at: response.data.created_at,
          });
        }
      } catch (error) {
        // No resume found, that's okay
        console.log('No resume found');
      }
    }
    loadResumeInfo();
  }, []); // [] = "no dependencies" only runs on first mount


  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    // this function is called when user selects a  to upload
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      setFile(null);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setUploadError('File size must be less than 5MB');
      setFile(null);
      e.target.value = ''; // Reset input
      return;
    }

    setFile(selectedFile); // on new file upload if pdf update file variable
    setUploadError(''); // clears old errors
    setUploadSuccess(false); // clears old success

    // Auto-upload immediately after validation
    await uploadFile(selectedFile);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }

  async function uploadFile(fileToUpload: File) {
    // only called by previous function on file upload
    setUploading(true);
    setUploadError(''); // clear previous errors
    setUploadSuccess(false); // clear previous success

    try {
      await api.uploadResume(fileToUpload);

      setUploadSuccess(true);
      setResumeInfo({ // changes resumeInfo state
        filename: fileToUpload.name,
        uploaded_at: new Date().toISOString(),
      });
      
      // Clear success message after 1.5 seconds
      setTimeout(() => setUploadSuccess(false), 1500);

      // Auto-trigger extraction after successful upload
      await extractResumeData();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function extractResumeData() {
    // called by previous function after resume upload
    setExtracting(true);
    setUploadError('');

    try {
      const response = await api.extractResumeData();
      
      // Replace profile data with freshly extracted data (no merging)
      setProfileData({
        ...response.extracted,
      });
      
      setDraftId(response.draftId);
      setIsDataLoaded(true); // Mark data as loaded to enable validation
      setShowAIAssistant(false); // Do not show AI assistant
    } catch (err: any) {
      setUploadError(err.message || 'Failed to extract resume data');
    } finally {
      setExtracting(false);
    }
  }

  /////////////////PROFILE DATA SECTION/////////////////
  // Load existing draft data on mount (or create new empty draft)
  useEffect(() => {
    async function loadDraftData() {
      try {
        const response = await api.getDraft();
        if (response.draft) {
          setDraftId(response.draft.id);
          
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
        console.log('Draft auto-saved');
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 1000); // Wait 1 second after last change before saving

    return () => clearTimeout(timeoutId);
  }, [profileData, draftId]);


  async function handleFinalize() {
    // gets executed when user clicks Save Profile button
    
    // If profile is not valid, show errors and don't save
    if (!validation.isValid) {
      setShowValidationErrors(true); // Keep field errors visible permanently
      setShowValidationMessage(true); // Show error message temporarily
      // Hide validation error message after 1.5 seconds (but keep field errors visible)
      setTimeout(() => {
        setShowValidationMessage(false);
      }, 1500);
      return;
    }
    
    setFinalizing(true);
    setUploadError('');
    setSaveSuccess(false);

    try {
      if (!draftId) {
        setUploadError('No draft to save');
        return;
      }

      // Finalize the draft - moves data from draft to permanent tables
      await api.finalizeProfile(draftId);
      setShowAIAssistant(false);
      
      // Create new empty draft for next time
      const response = await api.getDraft();
      setDraftId(response.draft.id);
      
      setSaveSuccess(true);
      
      // Hide validation errors after successful save
      setShowValidationErrors(false);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save profile');
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDownload() {
    // called when user clicks Download button in resume info card
    try {
      const blob = await api.downloadResume();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resumeInfo?.filename || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to download resume');
    }
  }

  const handleLaunchPython = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/start-chromium', { method: 'POST' });
      const json = await res.json();
      alert(json.message);
    } catch (err) {
      alert("Cette fonctionnalité nécessite l'application de bureau Jobelix.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Dashboard Navigation */}
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'profile' && (
            <ProfileTab
              profileData={profileData}
              setProfileData={setProfileData}
              validation={validation}
              showValidationErrors={showValidationErrors}
              showValidationMessage={showValidationMessage}
              draftId={draftId}
              showAIAssistant={showAIAssistant}
              resumeInfo={resumeInfo}
              uploading={uploading}
              extracting={extracting}
              uploadSuccess={uploadSuccess}
              uploadError={uploadError}
              finalizing={finalizing}
              saveSuccess={saveSuccess}
              handleFileChange={handleFileChange}
              handleDownload={handleDownload}
              handleFinalize={handleFinalize}
            />
          )}

          {activeTab === 'matches' && <MatchesTab />}

          {activeTab === 'auto-apply' && (
            <AutoApplyTab onLaunchPython={handleLaunchPython} />
          )}

          {activeTab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}
