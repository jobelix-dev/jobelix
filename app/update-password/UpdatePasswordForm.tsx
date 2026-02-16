/**
 * Update Password Form Component
 * 
 * Client-side form for setting new password after reset.
 * Verifies a valid recovery session exists before showing the form.
 */

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { createClient } from '@/lib/client/supabaseClient';

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [noSession, setNoSession] = useState(false);

  // Verify that the user has a valid recovery session before showing the form.
  // Without this, users who navigate here directly get a confusing error after submitting.
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setNoSession(true);
        }
      } catch {
        setNoSession(true);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await api.updatePassword(password);
      
      // Show success and redirect to dashboard
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {checking && (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Verifying your reset link...</p>
        </div>
      )}

      {noSession && !checking && (
        <div className="space-y-4">
          <div className="rounded-lg bg-error-subtle/30 border border-error px-4 py-3 text-sm text-error">
            This password reset link has expired or is invalid. Please request a new one.
          </div>
          <button
            onClick={() => router.push('/reset-password')}
            className="w-full rounded-lg bg-primary hover:bg-primary-hover px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Request new reset link
          </button>
        </div>
      )}

      {!checking && !noSession && (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="rounded-lg bg-success-subtle/30 border border-success px-4 py-3 text-sm text-success">
          Password updated successfully.
        </div>
      )}
      
      {error && (
        <div className="rounded-lg bg-error-subtle/30 border border-error px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted mb-2">
          New Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Enter new password"
          minLength={8}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Confirm new password"
          minLength={8}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary hover:bg-primary-hover px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
      )}
    </>
  );
}
