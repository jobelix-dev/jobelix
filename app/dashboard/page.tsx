'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In mock mode: read profile from localStorage
    // In real mode: fetch from getProfile() API
    const mockProfileStr = localStorage.getItem('mockProfile');
    if (mockProfileStr) {
      try {
        const parsed = JSON.parse(mockProfileStr);
        setProfile(parsed);
      } catch {
        // invalid profile, redirect to login
        router.push('/login');
      }
    } else {
      // no profile found, redirect to login
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('mockProfile');
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
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const result = await fetch('/api/mock/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await result.json();

      if (result.ok) {
        setUploadSuccess(true);
        setResumeInfo({ filename: data.filename, uploaded_at: data.uploaded_at });
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError('Network error. Please try again.');
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

  // Fetch offers on mount
  useEffect(() => {
    fetchOffers();
  }, []);

  async function fetchOffers() {
    setLoading(true);
    try {
      const result = await fetch('/api/mock/offers');
      if (result.ok) {
        const data = await result.json();
        setOffers(data);
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
      const result = await fetch('/api/mock/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      const data = await result.json();

      if (result.ok) {
        setCreateSuccess(true);
        setTitle('');
        setDescription('');
        // Refresh offers list
        await fetchOffers();
        // Clear success message after 3 seconds
        setTimeout(() => setCreateSuccess(false), 3000);
      } else {
        setCreateError(data.error || 'Failed to create offer');
      }
    } catch (err) {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteOffer(offerId: string) {
    // In mock mode, just remove from local state
    // In real mode, this would call DELETE /api/offers/:id
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
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
                    <h3 className="font-semibold text-lg">{offer.title}</h3>
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
