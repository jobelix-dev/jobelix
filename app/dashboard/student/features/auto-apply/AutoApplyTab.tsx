/**
 * Auto Apply Tab - Combined Bot Control and Job Preferences
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Zap, Rocket, AlertCircle } from 'lucide-react';
import WorkPreferencesEditor from './components/WorkPreferencesEditor';

interface AutoApplyTabProps {
  onLaunchPython: () => void;
}

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

export default function AutoApplyTab({ onLaunchPython }: AutoApplyTabProps) {
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

  const handleBuyCredits = () => {
    setShowBuyWarning(true);
    setTimeout(() => setShowBuyWarning(false), 1500);
  };

  const handlePreferencesSaved = () => {
    checkPreferences();
  };

  const handleLaunchClick = () => {
    if (canLaunchBot) {
      onLaunchPython();
    } else {
      setShowLaunchWarning(true);
      setTimeout(() => setShowLaunchWarning(false), 3000);
    }
  };

  useEffect(() => {
    fetchCredits();
    fetchClaimStatus();
    checkPreferences();
  }, [checkPreferences]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCredits();
      fetchClaimStatus();
      checkPreferences();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkPreferences]);

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
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Available Credits</span>
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
                <button
                  onClick={handleLaunchClick}
                  className="w-full px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  Launch Bot
                </button>
                
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
    </div>
  );
}
