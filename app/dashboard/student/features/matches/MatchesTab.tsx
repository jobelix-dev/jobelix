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
      {/* Page Header */}
      <div className="max-w-2xl mx-auto">
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-default">
            Job Matches
          </h2>
          <p className="text-sm text-muted mt-1">
            Startups looking for talent like you
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-primary-subtle/10 border border-border rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-info/30 mb-4">
          <Briefcase className="w-8 h-8 text-info" />
        </div>
        <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-info/30 text-info rounded-full">
          Coming Soon
        </div>
        <h3 className="text-lg font-semibold text-default mb-2">
          Job Matches
        </h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          We're building a smart matching system to connect you with startups looking for talent like you.
        </p>
        </div>
      </div>

      {/* Placeholder for future matches */}
      {/* 
      <div className="space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="bg-surface/50 border border-border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-default mb-1">
                  {match.position}
                </h3>
                <p className="text-sm text-muted mb-3">
                  {match.company}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted">
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
