/**
 * Matches Tab Content
 * 
 * Displays job matches from startups.
 * Shows available positions that match the student's profile.
 */

'use client';

import { Briefcase, MapPin, DollarSign } from 'lucide-react';

export default function MatchesTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Job Matches
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Startups looking for talent like you
        </p>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
          Coming Soon
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Job Matches
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          We're building a smart matching system to connect you with startups looking for talent like you.
        </p>
      </div>

      {/* Placeholder for future matches */}
      {/* 
      <div className="space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  {match.position}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                  {match.company}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {match.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {match.salary}
                  </span>
                </div>
              </div>
              <button className="px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
      */}
    </div>
  );
}
