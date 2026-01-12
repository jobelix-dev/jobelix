/**
 * Auto Apply Tab - Combined Bot Control and Job Preferences
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Zap, Rocket, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import WorkPreferencesEditor from './components/WorkPreferencesEditor';

interface CreditBalance {
  balance: number;
  total_earned: number;
  total_purchased: number;
  total_used: number;
  last_updated: string | null;
}

interface ClaimStatus {
  can_claim: boolean;
  claimed_today: boolean;
  last_claim: string | null;
  next_claim_available: string | null;
}

export default function AutoApplyTab() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferencesComplete, setPreferencesComplete] = useState(false);
  const [checkingPreferences, setCheckingPreferences] = useState(true);
  const [showLaunchWarning, setShowLaunchWarning] = useState(false);
  const [showClaimWarning, setShowClaimWarning] = useState(false);
  const [showBuyWarning, setShowBuyWarning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/student/work-preferences');
      const data = await response.json();
      
      if (data.preferences) {
        const prefs = data.preferences;
        const hasPositions = prefs.positions && prefs.positions.length > 0;
        const hasLocations = prefs.locations && prefs.locations.length > 0;
        const hasExperience = prefs.exp_internship || prefs.exp_entry || prefs.exp_associate ||
          prefs.exp_mid_senior || prefs.exp_director || prefs.exp_executive;
        const hasJobTypes = prefs.job_full_time || prefs.job_part_time || prefs.job_contract ||
          prefs.job_temporary || prefs.job_internship || prefs.job_volunteer || prefs.job_other;
        const hasDateFilters = prefs.date_24_hours || prefs.date_week || 
          prefs.date_month || prefs.date_all_time;
        const hasPersonalInfo = prefs.date_of_birth && prefs.notice_period && prefs.salary_expectation_usd && prefs.salary_expectation_usd > 0;
        
        setPreferencesComplete(hasPositions && hasLocations && hasExperience && 
          hasJobTypes && hasDateFilters && hasPersonalInfo);
      } else {
        setPreferencesComplete(false);
      }
    } catch (err) {
      setPreferencesComplete(false);
    } finally {
      setCheckingPreferences(false);
    }
  }, []);

  const fetchCredits = async () => {
    try {
      setError(null);
      const response = await fetch('/api/student/credits/balance', { credentials: 'include' });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to view credits');
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        setCredits(data);
      } else {
        setError(data.error || 'Failed to load credits');
      }
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load credits');
      setLoading(false);
    }
  };

  const fetchClaimStatus = async () => {
    try {
      const response = await fetch('/api/student/credits/can-claim', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) setClaimStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch claim status');
    }
  };

  const handleClaimCredits = async () => {
    if (claimStatus?.claimed_today) {
      setShowClaimWarning(true);
      setTimeout(() => setShowClaimWarning(false), 1500);
      return;
    }

    try {
      setClaiming(true);
      setError(null);
      const response = await fetch('/api/student/credits/claim', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to claim credits');
        return;
      }
      
      if (response.ok) {
        await fetchCredits();
        await fetchClaimStatus();
      } else {
        setError(data.error || 'Failed to claim credits');
      }
    } catch (err: any) {
      setError('Failed to claim credits');
    } finally {
      setClaiming(false);
    }
  };

  const handleRefreshCredits = async () => {
    setRefreshing(true);
    await Promise.all([fetchCredits(), fetchClaimStatus()]);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleBuyCredits = async () => {
    try {
      // Send plan name instead of price ID
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'credits_1000' }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session:', data.error);
        setShowBuyWarning(true);
        setTimeout(() => setShowBuyWarning(false), 1500);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setShowBuyWarning(true);
      setTimeout(() => setShowBuyWarning(false), 1500);
    }
  };

  const handlePreferencesSaved = () => {
    checkPreferences();
  };

  const handleLaunchClick = async () => {
    if (!canLaunchBot) {
      setShowLaunchWarning(true);
      setTimeout(() => setShowLaunchWarning(false), 3000);
      return;
    }

    setLaunching(true);
    setLaunchError(null);

    try {
      // First check if running in Electron app
      if (!window.electronAPI) {
        setLaunchError('Please download and use the Jobelix desktop app to launch the bot.');
        setLaunching(false);
        setTimeout(() => setLaunchError(null), 5000);
        return;
      }

      // Check if profile is published by fetching published profile data
      const profileCheckResponse = await fetch('/api/student/profile/published');
      if (!profileCheckResponse.ok) {
        setLaunchError('Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.');
        setLaunching(false);
        setTimeout(() => setLaunchError(null), 5000);
        return;
      }
      const profileData = await profileCheckResponse.json();
      
      // Verify that essential profile data exists
      if (!profileData.student || !profileData.student.first_name || !profileData.student.last_name) {
        setLaunchError('Profile not published. Go to Profile tab and click "Publish Profile" to generate your resume.');
        setLaunching(false);
        setTimeout(() => setLaunchError(null), 5000);
        return;
      }

      // Fetch API token from api_tokens table (64-char hex token)
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Launch the bot via Electron IPC
      const result = await window.electronAPI.launchBot(token);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch bot');
      }
      
      console.log('Bot launched:', result);
      console.log('Platform:', result.platform, 'PID:', result.pid);

    } catch (error) {
      console.error('Launch error:', error);
      setLaunchError(error instanceof Error ? error.message : 'Failed to launch bot');
      setTimeout(() => setLaunchError(null), 5000);
    } finally {
      setLaunching(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    fetchClaimStatus();
    checkPreferences();
  }, [checkPreferences]);

  const canLaunchBot = credits && credits.balance > 0 && preferencesComplete;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Jobelix Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Automate your LinkedIn job applications with AI-powered tools
        </p>
      </div>

      {/* How Auto Apply Works Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            How Auto Apply Works
          </h3>
        </div>
        
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex gap-3">
            <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 1</span>
            <span>Fill in your job preferences below</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 2</span>
            <span>Claim your 50 daily credits</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 3</span>
            <span>Launch the bot and log in to your LinkedIn account</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 4</span>
            <span>Move the browser window to the side and let it apply automatically</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-700">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            ✨ Features
          </h4>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <span>🎯</span>
              <span>Analyzes job descriptions to understand requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✏️</span>
              <span>Tailors your resume to match each posting and bypass ATS</span>
            </li>
            <li className="flex items-start gap-2">
              <span>📄</span>
              <span>Generates custom cover letters when needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🤖</span>
              <span>Fills application forms intelligently using AI</span>
            </li>
            <li className="flex items-start gap-2">
              <span>💾</span>
              <span>Saves all resumes locally <span className="text-xs text-zinc-500 dark:text-zinc-400">(coming soon)</span></span>
            </li>
          </ul>
        </div>
      </div>

      <WorkPreferencesEditor onSave={handlePreferencesSaved} />

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        {/* Header inside container */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <Rocket className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Auto Apply Bot
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
            This auto-apply bot is currently in beta and provided on an experimental basis.
            Use is at your own discretion. We are not responsible for any account restrictions,
            suspensions, or other consequences resulting from its use.
          </p>

          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {loading ? (
              <div className="text-sm text-zinc-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Available Credits</span>
                    <button
                      onClick={handleRefreshCredits}
                      disabled={refreshing}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:cursor-not-allowed"
                      title="Refresh credits"
                    >
                      <RefreshCw className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {credits?.balance.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleClaimCredits}
                    disabled={claiming}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming ? 'Claiming...' : '🎁 Claim Daily 50'}
                  </button>
                  <button 
                    onClick={handleBuyCredits}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all"
                  >
                    💳 Buy Credits
                  </button>
                </div>
                {showBuyWarning && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                    Failed to create checkout. Please try again.
                  </div>
                )}
                {showClaimWarning && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                    Already claimed today
                  </div>
                )}
                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {checkingPreferences ? (
              <p className="text-sm text-zinc-500">Checking preferences...</p>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleLaunchClick}
                  disabled={launching}
                  className="w-full px-6 py-3 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-5 h-5" />
                  {launching ? 'Launching...' : 'Launch Bot'}
                </button>
                
                {launchError && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                    {launchError}
                  </div>
                )}
                
                {showLaunchWarning && !canLaunchBot && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                    {!credits || credits.balance <= 0 ? 'Missing credits' : 'You forgot to save your job search preferences'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
