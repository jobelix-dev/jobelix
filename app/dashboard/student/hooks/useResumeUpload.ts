/**
 * Resume Upload Hook
 * 
 * Manages resume upload and AI extraction:
 * - File validation (PDF only, max 5MB)
 * - Upload to storage
 * - AI data extraction
 * - Resume metadata loading
 * - Download functionality
 */

import { useEffect, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { api } from '@/lib/client/api';
import type { ExtractedResumeData } from '@/lib/shared/types';

interface ResumeInfo {
  filename?: string;
  uploaded_at?: string;
}

interface UseResumeUploadProps {
  setProfileData: Dispatch<SetStateAction<ExtractedResumeData>>;
  setDraftId: (id: string) => void;
  setIsDataLoaded: (loaded: boolean) => void;
}

export function useResumeUpload({ setProfileData, setDraftId, setIsDataLoaded }: UseResumeUploadProps) {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Load existing resume metadata on mount
  useEffect(() => {
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
  }, []);

  // Upload file to storage
  const uploadFile = useCallback(async (fileToUpload: File) => {
    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      await api.uploadResume(fileToUpload);

      setUploadSuccess(true);
      setResumeInfo({
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
  }, []);

  // Extract data from uploaded resume using AI
  const extractResumeData = useCallback(async () => {
    setExtracting(true);
    setUploadError('');

    try {
      const response = await api.extractResumeData();
      
      // Replace profile data with freshly extracted data (no merging)
      setProfileData({
        ...response.extracted,
      });
      
      setDraftId(response.draftId);
      setIsDataLoaded(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to extract resume data');
    } finally {
      setExtracting(false);
    }
  }, [setProfileData, setDraftId, setIsDataLoaded]);

  // Handle file selection and validation
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setFile(selectedFile);
    setUploadError('');
    setUploadSuccess(false);

    // Auto-upload immediately after validation
    await uploadFile(selectedFile);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [uploadFile]);

  // Download resume
  const handleDownload = useCallback(async () => {
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
  }, [resumeInfo?.filename]);

  return {
    // State
    file,
    resumeInfo,
    uploading,
    extracting,
    uploadSuccess,
    uploadError,
    
    // Actions
    handleFileChange,
    handleDownload,
    extractResumeData,
  };
}
