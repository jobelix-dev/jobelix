/**
 * OffersList Component
 * 
 * Displays:
 * - Published job offers from company_offer
 * - Unpublished drafts from company_offer_draft (where offer_id IS NULL)
 */

'use client';

import { CompanyOffer, CompanyOfferDraft } from '@/lib/shared/types';
import { Trash2, Edit3 } from 'lucide-react';

interface OffersListProps {
  publishedOffers: CompanyOffer[];
  unpublishedDrafts: CompanyOfferDraft[];
  loading: boolean;
  onEditOffer: (offerId: string) => void;
  onEditDraft: (draftId: string) => void;
  onDeleteOffer: (offerId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onConfirm?: (message: string) => Promise<boolean>;
}

export default function OffersList({ 
  publishedOffers, 
  unpublishedDrafts,
  loading, 
  onEditOffer,
  onEditDraft,
  onDeleteOffer,
  onDeleteDraft,
  onConfirm
}: OffersListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-muted">Loading offers...</div>
      </div>
    );
  }

  const hasAnyContent = publishedOffers.length > 0 || unpublishedDrafts.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-12 bg-background/50/30 rounded-lg border-2 border-dashed border-border">
        <p className="text-muted mb-2">No offers created yet</p>
        <p className="text-sm text-muted">Click &quot;Create New Offer&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Unpublished Drafts Section */}
      {unpublishedDrafts.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-muted">
            Draft Offers
          </h3>

          {unpublishedDrafts.map((draft, index) => (
            <div key={draft.id}>
              {/* Divider between items */}
              {index > 0 && (
                <div className="border-t border-border my-3 sm:my-4"></div>
              )}
              
              <div className="rounded-lg border border-border bg-surface/50 overflow-hidden">
                <div className="relative">
                  <div className="px-3 sm:px-4 py-3 pr-20 sm:pr-24">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-default">
                        {draft.basic_info?.position_name || 'Untitled Draft'}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-warning/30 text-warning rounded">
                        DRAFT
                      </span>
                    </div>
                    
                    {draft.basic_info?.description && (
                      <p className="text-xs text-muted line-clamp-2 mb-2">
                        {draft.basic_info.description}
                      </p>
                    )}

                    <p className="text-xs text-muted">
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => onEditDraft(draft.id)}
                      className="p-2 sm:p-1.5 text-muted hover:bg-primary-subtle rounded transition-colors"
                      title="Edit draft"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (onConfirm) {
                          const confirmed = await onConfirm('Are you sure you want to delete this draft?');
                          if (confirmed) {
                            onDeleteDraft(draft.id);
                          }
                        } else {
                          onDeleteDraft(draft.id);
                        }
                      }}
                      className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
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
        <div className="border-t border-border my-6 sm:my-8"></div>
      )}

      {/* Published Offers Section */}
      {publishedOffers.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-muted">
            Published Offers
          </h3>

          {publishedOffers.map((offer, index) => (
            <div key={offer.id}>
              {/* Divider between items */}
              {index > 0 && (
                <div className="border-t border-border my-3 sm:my-4"></div>
              )}
              
              <div className="rounded-lg border border-border bg-surface/50 overflow-hidden">
                <div className="relative">
                  <div className="px-3 sm:px-4 py-3 pr-20 sm:pr-24">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-default">
                        {offer.position_name}
                      </h4>
                      {offer.status === 'published' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-success/30 text-success rounded">
                          PUBLISHED
                        </span>
                      )}
                      {offer.status === 'closed' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-surface/30 text-default rounded">
                          CLOSED
                        </span>
                      )}
                    </div>
                    
                    {offer.description && (
                      <p className="text-xs text-muted line-clamp-2 mb-2">
                        {offer.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted mb-2">
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
                      <p className="text-xs text-muted">
                        Created: {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => onEditOffer(offer.id)}
                      className="p-2 sm:p-1.5 text-muted hover:bg-primary-subtle rounded transition-colors"
                      title="Edit offer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (onConfirm) {
                          const confirmed = await onConfirm('Are you sure you want to delete this offer?');
                          if (confirmed) {
                            onDeleteOffer(offer.id);
                          }
                        } else {
                          onDeleteOffer(offer.id);
                        }
                      }}
                      className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
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
