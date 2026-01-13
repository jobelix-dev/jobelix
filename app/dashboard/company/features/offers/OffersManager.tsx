/**
 * OffersManager Component
 * Main component for managing job offers
 * 
 * Displays:
 * - Published offers from company_offer
 * - Unpublished drafts from company_offer_draft (where offer_id IS NULL)
 */

'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { CompanyOffer, CompanyOfferDraft } from '@/lib/shared/types';
import OfferEditor from './OfferEditor';
import OffersList from './components/OffersList';

type ViewState = 'list' | 'editor';

export default function OffersManager() {
  const [publishedOffers, setPublishedOffers] = useState<CompanyOffer[]>([]);
  const [unpublishedDrafts, setUnpublishedDrafts] = useState<CompanyOfferDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('list');
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>(undefined);

  // Fetch offers and drafts on mount and when returning to list view
  useEffect(() => {
    if (view === 'list') {
      fetchOffersAndDrafts();
    }
  }, [view]);

  async function fetchOffersAndDrafts() {
    setLoading(true);
    try {
      const res = await fetch('/api/company/offer');
      if (!res.ok) throw new Error('Failed to fetch offers');
      
      const data = await res.json();
      setPublishedOffers(data.publishedOffers || []);
      setUnpublishedDrafts(data.unpublishedDrafts || []);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOffer(offerId: string) {
    try {
      const res = await fetch(`/api/company/offer/${offerId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete offer');
      
      // Remove from local state
      setPublishedOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err: any) {
      console.error('Failed to delete offer:', err);
      alert(err.message || 'Failed to delete offer');
    }
  }

  async function handleDeleteDraft(draftId: string) {
    try {
      const res = await fetch(`/api/company/offer/draft/${draftId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete draft');
      
      // Remove from local state
      setUnpublishedDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err: any) {
      console.error('Failed to delete draft:', err);
      alert(err.message || 'Failed to delete draft');
    }
  }

  /**
   * Create a brand new unpublished draft
   */
  async function handleCreateNew() {
    try {
      const res = await fetch('/api/company/offer/draft/new', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to create new draft');
      
      const { draft } = await res.json();
      setEditingDraftId(draft.id);
      setView('editor');
    } catch (err: any) {
      console.error('Failed to create new draft:', err);
      alert(err.message || 'Failed to create new draft');
    }
  }

  /**
   * Edit an existing published offer
   * - Loads or creates a draft for that offer
   */
  async function handleEditOffer(offerId: string) {
    try {
      const res = await fetch(`/api/company/offer/draft/for-offer/${offerId}`);
      
      if (!res.ok) throw new Error('Failed to load draft for offer');
      
      const { draft } = await res.json();
      setEditingDraftId(draft.id);
      setView('editor');
    } catch (err: any) {
      console.error('Failed to load draft for offer:', err);
      alert(err.message || 'Failed to load draft for offer');
    }
  }

  /**
   * Edit an unpublished draft
   */
  function handleEditDraft(draftId: string) {
    setEditingDraftId(draftId);
    setView('editor');
  }

  function handleEditorClose() {
    setView('list');
    setEditingDraftId(undefined);
  }

  // Show editor
  if (view === 'editor' && editingDraftId) {
    return (
      <OfferEditor
        draftId={editingDraftId}
        onClose={handleEditorClose}
      />
    );
  }

  // Show list view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Job Offers</h1>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Create New Offer
        </button>
      </div>

      <OffersList 
        publishedOffers={publishedOffers}
        unpublishedDrafts={unpublishedDrafts}
        loading={loading} 
        onEditOffer={handleEditOffer}
        onEditDraft={handleEditDraft}
        onDeleteOffer={handleDeleteOffer}
        onDeleteDraft={handleDeleteDraft}
      />
    </div>
  );
}
