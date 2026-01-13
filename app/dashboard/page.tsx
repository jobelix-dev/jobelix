/**
 * Dashboard Router Page
 * 
 * Main dashboard that routes to student or company views based on user role.
 * Route: /dashboard
 * Requires: Authentication (redirects to /login if not authenticated)
 * Renders: StudentDashboard or CompanyDashboard based on user profile.
 */

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/shared/types';
import { api } from '@/lib/client/api';
import { Shield, X, MessageSquare } from 'lucide-react';
import FeedbackModal from '@/app/components/FeedbackModal';
import StudentDashboard from './student/page';
import CompanyDashboard from './company/page';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.getProfile();
        
        if (!response.profile) {
          router.push('/');
          return;
        }

        setProfile(response.profile);
      } catch (error) {
        console.error('Failed to load profile:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    try {
      await api.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return null; // will redirect
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as <strong>{profile.role}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-4 py-2 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 flex items-center gap-2"
            >
              <MessageSquare size={18} />
              Feedback
            </button>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="px-4 py-2 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 flex items-center gap-2"
            >
              <Shield size={18} />
              Privacy
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Log out
            </button>
          </div>
        </header>

        {profile.role === 'student' && <StudentDashboard />}
        {profile.role === 'company' && <CompanyDashboard />}
      </div>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-50 pt-20"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-3 right-3 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              <X size={20} />
            </button>
            
            <div className="pr-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Shield size={20} />
                Data & Privacy
              </h2>
              
              <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                <p>
                  We process your personal data (profile, resume, applications) in accordance with GDPR.
                </p>
                
                <p>
                  <strong>Your rights:</strong> Access, rectify, erase, or export your data at any time.
                </p>

                <p>
                  <strong>Contact:</strong>{' '}
                  <a 
                    href="mailto:jobelix.contact@gmail.com" 
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    jobelix.contact@gmail.com
                  </a>
                </p>
                
                <p className="text-xs text-zinc-500 dark:text-zinc-500 pt-2">
                  We respond within 30 days • Updated January 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
}
