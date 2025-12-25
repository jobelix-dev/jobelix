'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabaseClient';
import StudentDashboard from './StudentDashboard';
import CompanyDashboard from './CompanyDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      // Fetch user profile from database
      // First check if they're a student
      const { data: studentData } = await supabase
        .from('student')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (studentData) {
        setProfile({
          id: studentData.id,
          role: 'student',
          created_at: studentData.created_at,
        });
        setLoading(false);
        return;
      }

      // If not student, check if they're a company
      const { data: companyData } = await supabase
        .from('company')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (companyData) {
        setProfile({
          id: companyData.id,
          role: 'company',
          created_at: companyData.created_at,
        });
        setLoading(false);
        return;
      }

      // No profile found - redirect to home
      router.push('/');
    }

    loadProfile();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
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
