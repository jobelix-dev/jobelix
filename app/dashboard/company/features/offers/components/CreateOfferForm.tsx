/**
 * CreateOfferForm Component
 * Form for creating new job offers
 */

'use client';
import React, { useState } from 'react';

interface CreateOfferFormProps {
  onSuccess: () => void;
}

export default function CreateOfferForm({ onSuccess }: CreateOfferFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_name: title,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create offer');
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      
      // Notify parent to refresh list
      onSuccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Post a Position</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Create a new job listing to attract qualified candidates.
      </p>

      {success && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          Position posted successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Position Title *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 rounded border px-3 py-2"
            placeholder="e.g. Senior Frontend Developer"
            required
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Job Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 rounded border px-3 py-2"
            rows={4}
            placeholder="Describe the role, responsibilities, and requirements..."
          />
        </label>

        <button
          type="submit"
          disabled={creating}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
        >
          {creating ? 'Posting...' : 'Post Position'}
        </button>
      </form>
    </div>
  );
}
