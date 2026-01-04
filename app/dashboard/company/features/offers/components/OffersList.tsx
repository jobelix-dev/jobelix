/**
 * OffersList Component
 * Displays and manages active job offers
 */

'use client';
import React from 'react';
import { OfferData } from '@/lib/types';

interface OffersListProps {
  offers: OfferData[];
  loading: boolean;
  onDelete: (offerId: string) => void;
}

export default function OffersList({ offers, loading, onDelete }: OffersListProps) {
  return (
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
                  onClick={() => onDelete(offer.id)}
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
  );
}
