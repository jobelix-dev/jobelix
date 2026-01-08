/**
 * OffersList Component
 * 
 * Displays:
 * - Published job offers from company_offer
 * - Unpublished drafts from company_offer_draft (where offer_id IS NULL)
 */

'use client';

import { CompanyOffer, CompanyOfferDraft } from '@/lib/types';

interface OffersListProps {
  publishedOffers: CompanyOffer[];
  unpublishedDrafts: CompanyOfferDraft[];
  loading: boolean;
  onEditOffer: (offerId: string) => void;
  onEditDraft: (draftId: string) => void;
  onDeleteOffer: (offerId: string) => void;
  onDeleteDraft: (draftId: string) => void;
}

export default function OffersList({ 
  publishedOffers, 
  unpublishedDrafts,
  loading, 
  onEditOffer,
  onEditDraft,
  onDeleteOffer,
  onDeleteDraft
}: OffersListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-500 dark:text-zinc-400">Loading offers...</div>
      </div>
    );
  }

  const hasAnyContent = publishedOffers.length > 0 || unpublishedDrafts.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-12 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">No offers created yet</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Click "Create New Offer" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unpublished Drafts Section */}
      {unpublishedDrafts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Draft Offers ({unpublishedDrafts.length})
          </h2>
          <div className="space-y-4">
            {unpublishedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-zinc-800/50 transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {draft.basic_info?.position_name || 'Untitled Draft'}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                        DRAFT
                      </span>
                    </div>
                    
                    {draft.basic_info?.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                        {draft.basic_info.description}
                      </p>
                    )}

                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onEditDraft(draft.id)}
                      className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Continue Editing
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this draft?')) {
                          onDeleteDraft(draft.id);
                        }
                      }}
                      className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published Offers Section */}
      {publishedOffers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Published Offers ({publishedOffers.length})
          </h2>
          <div className="space-y-4">
            {publishedOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-zinc-800/50 transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {offer.position_name}
                      </h3>
                      {offer.status === 'published' && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                          PUBLISHED
                        </span>
                      )}
                      {offer.status === 'closed' && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 rounded">
                          CLOSED
                        </span>
                      )}
                    </div>
                    
                    {offer.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">{offer.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {offer.salary_min && offer.salary_max && (
                        <span>
                          💰 {offer.salary_currency || 'EUR'} {offer.salary_min.toLocaleString()} - {offer.salary_max.toLocaleString()}
                          {offer.salary_period === 'year' && '/year'}
                        </span>
                      )}
                      {offer.remote_mode && (
                        <span>
                          📍 {offer.remote_mode === 'remote' ? 'Remote' : offer.remote_mode === 'hybrid' ? 'Hybrid' : 'On-site'}
                        </span>
                      )}
                      {offer.employment_type && (
                        <span>
                          ⏰ {offer.employment_type.replace('_', ' ')}
                        </span>
                      )}
                      {offer.stage && (
                        <span>
                          🚀 {offer.stage.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {offer.created_at && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                        Created: {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onEditOffer(offer.id)}
                      className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this offer?')) {
                          onDeleteOffer(offer.id);
                        }
                      }}
                      className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
