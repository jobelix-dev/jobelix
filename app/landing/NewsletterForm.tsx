/**
 * NewsletterForm Component
 * 
 * Client-side newsletter subscription form with loading states.
 * Submits to /api/newsletter endpoint.
 */

'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/client/http';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await apiFetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing!');
        setEmail('');
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to subscribe. Please try again.');
    }
  };

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-primary mb-4 shadow-sm">
          <Sparkles className="w-3 h-3" />
          Stay Updated
        </div>
        
        <h3 className="text-2xl font-bold text-default mb-2">
          Career Tips & Product Updates
        </h3>
        <p className="text-muted mb-6">
          Get notified when we launch new features.
        </p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-success py-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-white shadow-sm
                         focus:ring-2 focus:ring-primary/20 
                         outline-none transition-all card-shadow"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl
                         hover:bg-primary-hover transition-colors whitespace-nowrap
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 btn-glow"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-error text-sm mt-2">{message}</p>
        )}
      </div>
    </section>
  );
}
