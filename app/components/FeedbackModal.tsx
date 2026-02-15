/**
 * Feedback Modal Component
 * Allows users to submit bug reports and feature requests
 */

'use client';

import { useState } from 'react';
import { X, Bug, Lightbulb, Send, MessageSquare } from 'lucide-react';
import { apiFetch } from '@/lib/client/http';

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
      const response = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_type: type, subject, description }),
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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-subtle flex items-center justify-center">
              <MessageSquare size={18} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-default">
              Send Feedback
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-subtle/50 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Type Selection - Segmented Control */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-default">
              Type
            </label>
            <div className="flex p-1 bg-primary-subtle/30 rounded-xl">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  type === 'bug'
                    ? 'bg-white text-default shadow-sm'
                    : 'text-muted hover:text-default'
                }`}
              >
                <Bug className="w-4 h-4" />
                Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  type === 'feature'
                    ? 'bg-white text-default shadow-sm'
                    : 'text-muted hover:text-default'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Feature Request
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label htmlFor="feedback-subject" className="block text-sm font-medium text-default">
              Subject
            </label>
            <input
              id="feedback-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type === 'bug' ? 'What went wrong?' : 'What would you like to see?'}
              maxLength={200}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-white text-default placeholder:text-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="feedback-description" className="block text-sm font-medium text-default">
                Description
              </label>
              <span className="text-xs text-muted">
                {description.length}/5000
              </span>
            </div>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'Please describe what happened and steps to reproduce...'
                  : 'Please describe the feature and why it would be useful...'
              }
              rows={5}
              maxLength={5000}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-white text-default placeholder:text-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all"
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-error-subtle rounded-xl text-sm text-error flex items-center gap-2">
              <span className="flex-shrink-0">!</span>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-success-subtle rounded-xl text-sm text-success flex items-center gap-2">
              <span className="flex-shrink-0">✓</span>
              Thank you for your feedback! We&apos;ll review it soon.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
