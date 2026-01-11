/**
 * Auto Apply Tab - Combined Bot Control and Job Preferences
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Zap, Rocket, AlertCircle, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import WorkPreferencesEditor from './components/WorkPreferencesEditor';
import { loadLinkedInCredentials, saveLinkedInCredentials } from '@/lib/secretsLoader';

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
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [showCredentialsWarning, setShowCredentialsWarning] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

  const handleBuyCredits = () => {
    setShowBuyWarning(true);
    setTimeout(() => setShowBuyWarning(false), 1500);
  };

  const handleSaveCredentials = async () => {
    if (!linkedinEmail || !linkedinPassword) return;

    // Validate email format
    if (!validateEmail(linkedinEmail)) {
      setEmailError('Invalid email format');
      setTimeout(() => setEmailError(null), 3000);
      return;
    }

    setSavingCredentials(true);
    setCredentialsSaved(false);
    setEmailError(null);
    try {
      // Save credentials locally using Electron IPC
      const success = await saveLinkedInCredentials(linkedinEmail, linkedinPassword);

      if (!success) {
        throw new Error('Failed to save credentials');
      }

      setCredentialsSaved(true);
      setTimeout(() => setCredentialsSaved(false), 3000);
    } catch (error) {
      console.error('Save credentials error:', error);
    } finally {
      setSavingCredentials(false);
    }
  };

  const handlePreferencesSaved = () => {
    checkPreferences();
  };

  const handleLaunchClick = async () => {
    // Check if credentials are missing
    if (!linkedinEmail || !linkedinPassword) {
      setShowCredentialsWarning(true);
      setTimeout(() => setShowCredentialsWarning(false), 3000);
      return;
    }

    if (!canLaunchBot) {
      setShowLaunchWarning(true);
      setTimeout(() => setShowLaunchWarning(false), 3000);
      return;
    }

    setLaunching(true);
    setLaunchError(null);

    try {
      // Fetch API token from api_tokens table (64-char hex token)
      const tokenResponse = await fetch('/api/student/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get API token');
      }
      const { token } = await tokenResponse.json();

      // Launch the bot via Electron IPC (client-side OS detection)
      if (window.electronAPI) {
        const result = await window.electronAPI.launchBot(token);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to launch bot');
        }
        
        console.log('Bot launched:', result);
        console.log('Platform:', result.platform, 'PID:', result.pid);
      } else {
        // Fallback to API route if not running in Electron
        const launchResponse = await fetch('/api/student/bot/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!launchResponse.ok) {
          const errorData = await launchResponse.json();
          throw new Error(errorData.error || 'Failed to launch bot');
        }

        const result = await launchResponse.json();
        console.log('Bot launched:', result);
      }

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

  // Load LinkedIn credentials from secrets.yaml on mount (client-side via Electron IPC)
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentials = await loadLinkedInCredentials();
        
        if (credentials.email) {
          setLinkedinEmail(credentials.email);
          if (credentials.password) {
            setLinkedinPassword(credentials.password);
          }
          console.log('LinkedIn credentials loaded from local file');
        }
      } catch (error) {
        console.error('Error loading credentials:', error);
      }
    };

    loadCredentials();
  }, []);

  const canLaunchBot = credits && credits.balance > 0 && preferencesComplete;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Jobelix Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Automate your Linkedin job applications with AI-powered tools
        </p>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <li className="flex items-start gap-2">
          <span>🎯</span>
          <span>Analyzes each job description to understand role requirements</span>
        </li>

        <li className="flex items-start gap-2">
          <span>✏️</span>
          <span>Tailors your resume to closely match the job posting</span>
        </li>

        <li className="flex items-start gap-2">
          <span>📄</span>
          <span>Generates a custom PDF resume for every application</span>
        </li>

        <li className="flex items-start gap-2">
          <span>🤖</span>
          <span>Fills application forms intelligently using GPT</span>
        </li>

        <li className="flex items-start gap-2">
          <span>💾</span>
          <span>
            Saves all tailored resumes locally in{" "}
            <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs">
              tailored_resumes/
            </code>
          </span>
        </li>
      </ul>


      <WorkPreferencesEditor onSave={handlePreferencesSaved} />

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        {/* Header inside container */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Rocket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Auto Apply Bot
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Redeem daily credits and launch your Linkedin auto-apply bot
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
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming ? 'Claiming...' : '🎁 Claim Daily 50'}
                  </button>
                  <button 
                    onClick={handleBuyCredits}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all"
                  >
                    💳 Buy Credits
                  </button>
                </div>
                {showBuyWarning && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                    Coming soon
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
                {/* Compact LinkedIn Credentials */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="email"
                        value={linkedinEmail}
                        onChange={(e) => setLinkedinEmail(e.target.value)}
                        placeholder="LinkedIn email"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={linkedinPassword}
                          onChange={(e) => setLinkedinPassword(e.target.value)}
                          placeholder="LinkedIn password"
                          className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveCredentials}
                      disabled={savingCredentials || !linkedinEmail || !linkedinPassword}
                      className="self-start px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap h-[38px]"
                    >
                      <Save className="w-4 h-4" />
                      {savingCredentials ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {emailError && (
                    <div className="p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                      {emailError}
                    </div>
                  )}
                  {credentialsSaved && (
                    <div className="p-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300 text-center">
                      ✓ Credentials saved successfully
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLaunchClick}
                  disabled={launching}
                  className="w-full px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-5 h-5" />
                  {launching ? 'Launching...' : 'Launch Bot'}
                </button>
                
                {launchError && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                    {launchError}
                  </div>
                )}
                
                {showCredentialsWarning && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                    Missing LinkedIn credentials
                  </div>
                )}
                
                {showLaunchWarning && !canLaunchBot && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                    {!credits || credits.balance <= 0 ? 'Missing credits' : 'Missing job search preferences'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-4">
        🔒 Your LinkedIn credentials are saved to your local machine only and are never sent to our servers.
      </div>
    </div>
  );
}
