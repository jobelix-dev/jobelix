'use client';

import { X, Shield } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function PrivacyModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-10 sm:pt-20 px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl p-6 max-w-lg w-full relative animate-scale-in my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        <div className="pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center mb-4">
            <Shield size={20} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-4">Data & Privacy</h2>

          <div className="space-y-4 text-sm text-muted">
            <div>
              <h3 className="font-medium text-default mb-1">What we collect</h3>
              <p>Profile info (name, email, phone), resume/CV data, job preferences, and payment info (processed securely via Stripe).</p>
            </div>

            <div>
              <h3 className="font-medium text-default mb-1">How we use it</h3>
              <p>Resume tailoring, LinkedIn question answering, and auto-apply functionality. We use your data only to provide these services.</p>
            </div>

            <div>
              <h3 className="font-medium text-default mb-1">Where it&apos;s stored</h3>
              <p>Your data is stored in Supabase (PostgreSQL) with Row Level Security. This means you can only access your own data and no other user can see yours.</p>
            </div>

            <div>
              <h3 className="font-medium text-default mb-1">Third-party services</h3>
              <p><strong className="text-default">Mistral:</strong> Used for resume parsing. They operate under a zero-retention API policy - they do not train on your data.</p>
              <p className="mt-1"><strong className="text-default">Stripe:</strong> Handles payment processing only.</p>
              <p className="mt-1 text-default font-medium">We do not sell your data to recruiters, data brokers, or anyone else.</p>
            </div>

            <div>
              <h3 className="font-medium text-default mb-1">Your rights (GDPR)</h3>
              <p>You can access, rectify, or delete your data at any time. Use the Settings menu to delete your account and all associated data permanently.</p>
            </div>

            <div>
              <h3 className="font-medium text-default mb-1">Data retention</h3>
              <p>Your data is retained while your account is active. When you delete your account, all data is permanently removed immediately.</p>
              <p className="mt-1">If we ever shut down the service, we will wipe the entire database.</p>
            </div>

            <div className="pt-3 border-t border-border/20">
              <p>
                <strong className="text-default">Contact:</strong>{' '}
                <a href="mailto:jobelix.contact@gmail.com" className="text-info hover:underline">
                  jobelix.contact@gmail.com
                </a>
              </p>
              <p className="text-xs mt-2">We respond within 30 days &bull; Updated January 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
