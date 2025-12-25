'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function CompanyDashboard() {
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
        <h2 className="text-xl font-semibold mb-4">Post a Position</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Create a new job listing to attract qualified candidates.
        </p>

        {createSuccess && (
          <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            Position posted successfully!
          </div>
        )}

        {createError && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {createError}
          </div>
        )}

        <form onSubmit={handleCreateOffer} className="space-y-4">
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

      {/* Offers List */}
      <div className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
        
        {loading ? (
          <p className="text-sm text-zinc-500">Loading positions...</p>
        ) : offers.length === 0 ? (
          <p className="text-sm text-zinc-500">No active positions. Post your first opening above.</p>
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
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 whitespace-pre-wrap">
                        {offer.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                      Posted {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="ml-4 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Remove
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
