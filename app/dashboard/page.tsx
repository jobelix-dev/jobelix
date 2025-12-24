'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/'); // Redirect to home page if not logged in
        return;
      }

      // Fetch user profile from database
      // First check if they're a student
      const { data: studentData } = await supabase
        .from('student')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (studentData) {
        setProfile({
          id: studentData.id,
          role: 'student',
          created_at: studentData.created_at,
        });
        setLoading(false);
        return;
      }

      // If not student, check if they're a company
      const { data: companyData } = await supabase
        .from('company')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (companyData) {
        setProfile({
          id: companyData.id,
          role: 'company',
          created_at: companyData.created_at,
        });
        setLoading(false);
        return;
      }

      // No profile found - redirect to home
      router.push('/');
    }

    loadProfile();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return null; // will redirect
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as <strong>{profile.role}</strong>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </header>

        {profile.role === 'student' && <StudentDashboard />}
        {profile.role === 'company' && <CompanyDashboard />}
      </div>
    </div>
  );
}

function StudentDashboard() {
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
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Your Resume</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Upload your resume (PDF only, max 5MB). You can replace it anytime.
      </p>

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

      {resumeInfo && (
        <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded">
          <p className="text-sm font-medium">Current Resume:</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{resumeInfo.filename}</p>
          <p className="text-xs text-zinc-500">
            Uploaded: {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleString() : 'N/A'}
          </p>
        </div>
      )}

      <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded p-8">
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-zinc-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-zinc-100 file:text-zinc-700
              hover:file:bg-zinc-200
              dark:file:bg-zinc-800 dark:file:text-zinc-300
              disabled:opacity-60"
          />
          {uploading && (
            <span className="text-sm text-zinc-500">Uploading...</span>
          )}
        </div>

        {file && !uploading && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>
    </div>
  );
}

function CompanyDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Fetch offers on mount
  useEffect(() => {
    fetchOffers();
  }, []);

  async function fetchOffers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // company_id in company_offer table references company.id (which equals auth.user.id)
      const { data, error } = await supabase
        .from('company_offer')
        .select('*')
        .eq('company_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch offers:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        setOffers(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError('Title is required');
      return;
    }

    setCreating(true);
    setCreateError('');
    setCreateSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCreateError('You must be logged in');
        return;
      }

      // Insert new offer into database
      const { error } = await supabase
        .from('company_offer')
        .insert({
          company_id: session.user.id,
          position_name: title,
          description: description || null,
        });

      if (error) {
        setCreateError(error.message);
      } else {
        setCreateSuccess(true);
        setTitle('');
        setDescription('');
        // Refresh offers list
        await fetchOffers();
        // Clear success message after 3 seconds
        setTimeout(() => setCreateSuccess(false), 3000);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteOffer(offerId: string) {
    try {
      const { error } = await supabase
        .from('company_offer')
        .delete()
        .eq('id', offerId);

      if (error) {
        console.error('Failed to delete offer:', error);
        alert('Failed to delete offer');
      } else {
        // Remove from local state
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
      }
    } catch (err) {
      console.error('Failed to delete offer:', err);
      alert('Failed to delete offer');
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Offer Form */}
      <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Create Job Offer</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Post a simple job offer (title + description).
        </p>

        {createSuccess && (
          <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            Job offer created successfully!
          </div>
        )}

        {createError && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {createError}
          </div>
        )}

        <form onSubmit={handleCreateOffer} className="space-y-4">
          <label className="flex flex-col">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
              placeholder="e.g. Frontend Intern"
              required
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
              rows={4}
              placeholder="Job description, requirements, etc."
            />
          </label>

          <button
            type="submit"
            disabled={creating}
            className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Offer'}
          </button>
        </form>
      </div>

      {/* Offers List */}
      <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Your Job Offers</h2>
        
        {loading ? (
          <p className="text-sm text-zinc-500">Loading offers...</p>
        ) : offers.length === 0 ? (
          <p className="text-sm text-zinc-500">No job offers yet. Create your first one above!</p>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{offer.position_name}</h3>
                    {offer.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                        {offer.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                      Created: {new Date(offer.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="ml-4 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
