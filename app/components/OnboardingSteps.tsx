/**
 * Onboarding Steps Component
 * Displays a 3-step guide for new users after welcome notice
 */

'use client';

import { X, Upload, Settings, Rocket } from 'lucide-react';

interface OnboardingStepsProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'student' | 'company';
}

export default function OnboardingSteps({ isOpen, onClose, userRole }: OnboardingStepsProps) {
  if (!isOpen) return null;

  // Show different steps based on user role
  const isStudent = userRole === 'student';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-surface rounded-xl shadow-xl border border-border/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border/20">
          <div>
            <h2 className="text-xl font-semibold text-default">Let&apos;s Get You Started! 🎯</h2>
            <p className="text-sm text-muted mt-1">Follow these simple steps to launch your job search</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isStudent ? (
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 bg-primary-subtle/20 border border-primary-subtle rounded-lg hover:border-primary-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload size={20} className="text-primary" />
                    <h3 className="font-semibold text-default">Import Your Profile</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Upload your resume (PDF) for AI-powered extraction or add your information manually. 
                    You can also import projects from GitHub!
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="px-2 py-1 bg-surface rounded">📄 Resume Upload</span>
                    <span className="px-2 py-1 bg-surface rounded">✏️ Manual Entry</span>
                    <span className="px-2 py-1 bg-surface rounded">🔗 GitHub Import</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 bg-info-subtle/20 border border-info-subtle rounded-lg hover:border-info-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-info text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings size={20} className="text-info" />
                    <h3 className="font-semibold text-default">Set Up Job Preferences</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Tell us what you&apos;re looking for: job titles, locations, remote work preferences, 
                    salary expectations, and more. This helps the bot find perfect matches.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="px-2 py-1 bg-surface rounded">💼 Job Type</span>
                    <span className="px-2 py-1 bg-surface rounded">📍 Location</span>
                    <span className="px-2 py-1 bg-surface rounded">💰 Salary</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 bg-success-subtle/20 border border-success-subtle rounded-lg hover:border-success-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket size={20} className="text-success" />
                    <h3 className="font-semibold text-default">Launch the Auto-Apply Bot!</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Once your profile and preferences are set, activate the bot to start auto-applying 
                    to jobs. Monitor progress, review matches, and watch the applications roll in!
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="px-2 py-1 bg-surface rounded">🤖 Auto Apply</span>
                    <span className="px-2 py-1 bg-surface rounded">📊 Track Progress</span>
                    <span className="px-2 py-1 bg-surface rounded">✅ Review Matches</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Company onboarding steps
            <div className="space-y-6">
              {/* Step 1 - Company */}
              <div className="flex gap-4 p-4 bg-primary-subtle/20 border border-primary-subtle rounded-lg hover:border-primary-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload size={20} className="text-primary" />
                    <h3 className="font-semibold text-default">Create Your Company Profile</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Add your company information, description, and branding to make your job offers 
                    stand out to top talent.
                  </p>
                </div>
              </div>

              {/* Step 2 - Company */}
              <div className="flex gap-4 p-4 bg-info-subtle/20 border border-info-subtle rounded-lg hover:border-info-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-info text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings size={20} className="text-info" />
                    <h3 className="font-semibold text-default">Post Job Offers</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Create detailed job offers with requirements, benefits, and salary ranges to 
                    attract the right candidates.
                  </p>
                </div>
              </div>

              {/* Step 3 - Company */}
              <div className="flex gap-4 p-4 bg-success-subtle/20 border border-success-subtle rounded-lg hover:border-success-subtle/70 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket size={20} className="text-success" />
                    <h3 className="font-semibold text-default">Review Applications</h3>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Receive applications from qualified candidates and manage your hiring process 
                    all in one place.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-warning-subtle/20 border border-warning-subtle rounded-lg">
            <p className="text-sm text-default">
              <strong>💡 Pro tip:</strong> Complete all steps for the best results! 
              {isStudent ? ' The more detailed your profile, the better job matches you\'ll get.' : ' Detailed job offers attract higher quality candidates.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors text-sm font-medium"
          >
            Got It, Let&apos;s Go!
          </button>
        </div>
      </div>
    </div>
  );
}
