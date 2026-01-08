/**
 * OffersList Component
 * 
 * Displays:
 * - Published job offers from company_offer
 * - Unpublished drafts from company_offer_draft (where offer_id IS NULL)
 */

'use client';

import { CompanyOffer, CompanyOfferDraft } from '@/lib/types';
import { Trash2, Edit3 } from 'lucide-react';

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
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading offers...</div>
      </div>
    );
  }

  const hasAnyContent = publishedOffers.length > 0 || unpublishedDrafts.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-12 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700">
        <p className="text-zinc-500 dark:text-zinc-400 mb-2">No offers created yet</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Click "Create New Offer" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unpublished Drafts Section */}
      {unpublishedDrafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Draft Offers
          </h3>

          {unpublishedDrafts.map((draft, index) => (
            <div key={draft.id}>
              {/* Divider between items */}
              {index > 0 && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 my-4"></div>
              )}
              
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 overflow-hidden">
                <div className="relative">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {draft.basic_info?.position_name || 'Untitled Draft'}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                        DRAFT
                      </span>
                    </div>
                    
                    {draft.basic_info?.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                        {draft.basic_info.description}
                      </p>
                    )}

                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => onEditDraft(draft.id)}
                      className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Edit draft"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this draft?')) {
                          onDeleteDraft(draft.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Divider between sections */}
      {unpublishedDrafts.length > 0 && publishedOffers.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 my-8"></div>
      )}

      {/* Published Offers Section */}
      {publishedOffers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Published Offers
          </h3>

          {publishedOffers.map((offer, index) => (
            <div key={offer.id}>
              {/* Divider between items */}
              {index > 0 && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 my-4"></div>
              )}
              
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 overflow-hidden">
                <div className="relative">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {offer.position_name}
                      </h4>
                      {offer.status === 'published' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                          PUBLISHED
                        </span>
                      )}
                      {offer.status === 'closed' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 rounded">
                          CLOSED
                        </span>
                      )}
                    </div>
                    
                    {offer.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                        {offer.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
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
                    </div>

                    {offer.created_at && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Created: {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => onEditOffer(offer.id)}
                      className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      title="Edit offer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this offer?')) {
                          onDeleteOffer(offer.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
