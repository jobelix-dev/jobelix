/**
 * Company Dashboard Page
 * 
 * Main interface for companies to create and manage job offers.
 */

'use client';
import { OffersManager } from './features/offers';

export default function CompanyDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <OffersManager />
      </div>
    </div>
  );
}
