'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { api } from '@/lib/api';
import StudentDashboard from './StudentDashboard';
import CompanyDashboard from './CompanyDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </header>

        {profile.role === 'student' && <StudentDashboard />}
        {profile.role === 'company' && <CompanyDashboard />}
      </div>
    </div>
  );
}
