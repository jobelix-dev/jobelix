/**
 * Feedback Modal Component
 * Allows users to submit bug reports and feature requests
 */

'use client';

import { useState } from 'react';
import { X, Bug, Lightbulb, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject, description }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          // Reset form
          setSubject('');
          setDescription('');
          setSuccess(false);
          setType('bug');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-default">
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-subtle rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">
              What type of feedback?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  type === 'bug'
                    ? 'border-error bg-error-subtle/20'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Bug className={`w-5 h-5 ${type === 'bug' ? 'text-error' : 'text-muted'}`} />
                <span className={`font-medium ${type === 'bug' ? 'text-error' : 'text-muted'}`}>
                  Bug Report
                </span>
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  type === 'feature'
                    ? 'border-primary bg-primary-subtle/20'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Lightbulb className={`w-5 h-5 ${type === 'feature' ? 'text-primary' : 'text-muted'}`} />
                <span className={`font-medium ${type === 'feature' ? 'text-primary-hover' : 'text-muted'}`}>
                  Feature Request
                </span>
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label htmlFor="subject" className="block text-sm font-medium text-muted">
              Subject <span className="text-error">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type === 'bug' ? 'e.g., Login button not working' : 'e.g., Add dark mode toggle'}
              maxLength={200}
              required
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-default focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted text-right">
              {subject.length}/200
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-muted">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'Please describe what happened, what you expected, and steps to reproduce...'
                  : 'Please describe the feature you\'d like to see and why it would be useful...'
              }
              rows={8}
              maxLength={5000}
              required
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-default focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted text-right">
              {description.length}/5000
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-error-subtle/20 border border-error rounded-lg text-sm text-error">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-success-subtle/20 border border-success rounded-lg text-sm text-success">
              ✓ Thank you for your feedback! We'll review it soon.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
