/**
 * OffersManager Component
 * Main component for managing job offers
 */

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { OfferData } from '@/lib/types';
import CreateOfferForm from './components/CreateOfferForm';
import OffersList from './components/OffersList';

export default function OffersManager() {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch offers on mount
  useEffect(() => {
    fetchOffers();
  }, []);

  async function fetchOffers() {
    setLoading(true);
    try {
      const response = await api.getOffers();
      setOffers(response.offers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOffer(offerId: string) {
    try {
      await api.deleteOffer(offerId);
      
      // Remove from local state
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err: any) {
      console.error('Failed to delete offer:', err);
      alert(err.message || 'Failed to delete offer');
    }
  }

  return (
    <div className="space-y-6">
      <CreateOfferForm onSuccess={fetchOffers} />
      <OffersList 
        offers={offers} 
        loading={loading} 
        onDelete={handleDeleteOffer} 
      />
    </div>
  );
}
