/**
 * Welcome Notice Component
 * Displays a beta notice to first-time users explaining the app status
 * and where to report bugs/provide feedback
 */

'use client';

import { X, MessageSquare, Bug, Lightbulb, Info } from 'lucide-react';

interface WelcomeNoticeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeNotice({ isOpen, onClose }: WelcomeNoticeProps) {
  if (!isOpen) return null;

  const handleGetStarted = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-surface rounded-xl shadow-xl border border-border/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-subtle rounded-lg">
              <Info size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-default">Welcome to Jobelix! 🚀</h2>
              <p className="text-sm text-muted mt-1">Thanks for being an early user</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Beta Notice */}
          <div className="bg-info-subtle/50 border border-info-subtle rounded-lg p-4">
            <h3 className="font-semibold text-default mb-2 flex items-center gap-2">
              <span className="text-info">ℹ️</span>
              Beta Version
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Jobelix is currently in <strong className="text-default">beta</strong>. 
              We&apos;re working hard to improve the platform and your feedback is incredibly valuable to us!
            </p>
          </div>

          {/* Feedback Section */}
          <div>
            <h3 className="font-semibold text-default mb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              We&apos;d Love Your Feedback
            </h3>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Your insights help us build a better product. You can reach us anytime through:
            </p>
            
            <div className="space-y-3">
              {/* Bug Report */}
              <div className="flex items-start gap-3 p-3 bg-surface border border-border/20 rounded-lg hover:border-primary-subtle/50 transition-colors">
                <div className="p-2 bg-error-subtle/50 rounded-lg">
                  <Bug size={18} className="text-error" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-default text-sm">Report Bugs</h4>
                  <p className="text-xs text-muted mt-1">
                    Found something broken? Let us know so we can fix it!
                  </p>
                </div>
              </div>

              {/* Feature Request */}
              <div className="flex items-start gap-3 p-3 bg-surface border border-border/20 rounded-lg hover:border-primary-subtle/50 transition-colors">
                <div className="p-2 bg-warning-subtle/50 rounded-lg">
                  <Lightbulb size={18} className="text-warning" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-default text-sm">Suggest Features</h4>
                  <p className="text-xs text-muted mt-1">
                    Have ideas for improvements? We&apos;re all ears!
                  </p>
                </div>
              </div>
            </div>

            {/* How to Access Feedback */}
            <div className="mt-4 p-3 bg-primary-subtle/30 rounded-lg">
              <p className="text-xs text-muted leading-relaxed">
                💡 <strong className="text-default">Quick tip:</strong> Click the{' '}
                <MessageSquare size={14} className="inline text-primary" /> icon in the top right 
                corner anytime to send feedback or report issues.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border/20">
          <button
            onClick={handleGetStarted}
            className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
