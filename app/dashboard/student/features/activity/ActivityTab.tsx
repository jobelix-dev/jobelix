/**
 * Activity Tab Content
 * 
 * Job application tracking.
 * Shows applications sent and their current status.
 */

'use client';

import { Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function ActivityTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Activity
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track your job applications and their status
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">0</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Sent</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">0</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Viewed</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">0</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Interviews</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">0</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Clock className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No applications yet
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Start applying to jobs to track your applications here.
        </p>
      </div>

      {/* Placeholder for future applications list */}
      {/* 
      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                  {app.position}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {app.company} • Applied {app.appliedDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  app.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  app.status === 'viewed' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {app.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      */}
    </div>
  );
}
