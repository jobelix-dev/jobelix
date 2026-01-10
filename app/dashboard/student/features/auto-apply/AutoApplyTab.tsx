/**
 * Auto Apply Tab Content
 * 
 * Mass application tools and automation features.
 * Includes development/testing tools for Python integration.
 */

'use client';

import { useEffect, useState } from 'react';
import { Zap, Rocket, Settings, Key, AlertCircle, CheckCircle } from 'lucide-react';

interface AutoApplyTabProps {
  onLaunchPython: () => void;
}

interface TokenInfo {
  id: string;
  token: string;
  uses_remaining: number;
  max_uses: number;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function AutoApplyTab({ onLaunchPython }: AutoApplyTabProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current token status
  const fetchTokenStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/student/tokens/current', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to generate tokens');
        setLoading(false);
        return;
      }
      
      if (data.hasToken) {
        setHasToken(true);
        setTokenInfo(data.token);
      } else {
        setHasToken(false);
        setTokenInfo(null);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch token status:', err);
      setError('Failed to load token status');
      setLoading(false);
    }
  };

  // Generate new daily token
  const handleGenerateToken = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await fetch('/api/student/tokens/generate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to generate tokens');
        return;
      }
      
      if (response.ok) {
        setHasToken(true);
        setTokenInfo(data.token);
      } else {
        setError(data.message || data.error || 'Failed to generate token');
      }
    } catch (err: any) {
      console.error('Failed to generate token:', err);
      setError('Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTokenStatus();
  }, []);

  // Fast polling every 2 seconds when token exists
  useEffect(() => {
    if (!hasToken) return;

    const interval = setInterval(() => {
      fetchTokenStatus();
    }, 2000); // 2 seconds for near-instant updates

    return () => clearInterval(interval);
  }, [hasToken]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Automate your job applications with AI-powered tools
        </p>
      </div>

      {/* Token Status Section */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Daily API Token
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Generate one token per day for the compiled app
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-500">Loading...</div>
        ) : hasToken && tokenInfo ? (
          <div className="space-y-4">
            {/* Usage Stats */}
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Remaining Uses Today
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {tokenInfo.uses_remaining} / {tokenInfo.max_uses}
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(tokenInfo.uses_remaining / tokenInfo.max_uses) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-zinc-600 dark:text-zinc-400">
                Token active until midnight
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <AlertCircle className="w-5 h-5 text-zinc-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                  No token generated today
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Generate a daily token to use with the compiled application. You can generate one token per day with 100 API calls.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateToken}
              disabled={generating}
              className="w-full px-4 py-3 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Daily Token'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Development Testing Section */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Test Python Integration
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Development testing only
            </p>
          </div>
        </div>
        
        <button
          onClick={onLaunchPython}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Launch Chromium Test
        </button>
      </div>

      {/* Mass Apply Feature (Coming Soon) */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Rocket className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Mass Apply Coming Soon
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-4">
          Apply to multiple positions with a single click. Our AI will customize your application for each role.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full">
          <Zap className="w-3 h-3" />
          In Development
        </div>
      </div>
    </div>
  );
}
