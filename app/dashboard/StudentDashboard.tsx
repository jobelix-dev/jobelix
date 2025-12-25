'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function StudentDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [resumeInfo, setResumeInfo] = useState<{ filename?: string; uploaded_at?: string } | null>(null);
  const supabase = createClient();

  // Load existing resume info on mount
  useEffect(() => {
    async function loadResumeInfo() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('resume')
        .select('file_name, created_at')
        .eq('student_id', session.user.id)
        .single();

      if (data) {
        setResumeInfo({
          filename: data.file_name,
          uploaded_at: data.created_at,
        });
      }
    }
    loadResumeInfo();
  }, [supabase]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      setFile(null);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setUploadError('File size must be less than 5MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadError('');
    setUploadSuccess(false);

    // Auto-upload immediately after validation
    await uploadFile(selectedFile);
  }

  async function uploadFile(fileToUpload: File) {
    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUploadError('You must be logged in to upload');
        return;
      }

      const userId = session.user.id;
      const filePath = `${userId}/resume.pdf`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, fileToUpload, {
          upsert: true, // Replace if exists
          contentType: 'application/pdf',
        });

      if (uploadError) {
        setUploadError(uploadError.message);
        return;
      }

      // Save metadata to database (upsert since student_id is primary key)
      const { error: dbError } = await supabase
        .from('resume')
        .upsert(
          {
            student_id: userId,
            file_name: fileToUpload.name,
          },
          {
            onConflict: 'student_id',
          }
        );

      if (dbError) {
        setUploadError(dbError.message);
        return;
      }

      setUploadSuccess(true);
      setResumeInfo({
        filename: fileToUpload.name,
        uploaded_at: new Date().toISOString(),
      });
      
      // Clear success message after 1.5 seconds
      setTimeout(() => setUploadSuccess(false), 1500);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const filePath = `${userId}/resume.pdf`;

    const { data, error } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (error) {
      setUploadError('Failed to download resume');
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = resumeInfo?.filename || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-6">Resume</h2>

      {uploadSuccess && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          Resume uploaded successfully!
        </div>
      )}

      {uploadError && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {resumeInfo ? (
        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm mb-1">{resumeInfo.filename}</p>
              <p className="text-xs text-zinc-500">
                Uploaded {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Upload your resume (PDF only, max 5MB)
        </p>
      )}

      <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded p-6">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-zinc-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-foreground file:text-background
            hover:file:opacity-90
            disabled:opacity-60 transition-opacity"
        />
        {uploading && (
          <p className="mt-2 text-sm text-zinc-500">Uploading...</p>
        )}
      </div>
    </div>
  );
}
