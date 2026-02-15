/**
 * ResumeStep Component
 * 
 * Step 0 of the wizard — Resume Upload.
 * Upload a PDF resume for AI extraction. Shows extraction progress.
 * On extraction complete, signals parent to auto-advance to GitHub step.
 */

'use client';

import { useEffect, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { RESUME_EXTRACTION_STEPS } from '@/lib/shared/extractionSteps';
import StepHeader from '../components/StepHeader';
import StickyActionBar from '../components/StickyActionBar';
import type { StepNavProps } from '../components/StepHeader';

interface ResumeStepProps extends StepNavProps {
  /** Resume file info (if previously uploaded) */
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  /** Whether the file is currently uploading */
  uploading: boolean;
  /** Whether AI extraction is in progress */
  extracting: boolean;
  /** Upload error message */
  uploadError: string;
  /** SSE extraction progress */
  extractionProgress?: {
    stepIndex: number;
    step: string;
    progress: number;
    complete?: boolean;
    updatedAt: string;
  } | null;
  /** Handle file input change */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Download previously uploaded resume */
  handleDownload: () => void;
  /** Called when extraction completes — parent auto-advances to Profile step */
  onExtractionComplete: () => void;
}

export default function ResumeStep({
  resumeInfo,
  uploading,
  extracting,
  uploadError,
  extractionProgress,
  handleFileChange,
  handleDownload,
  onExtractionComplete,
  onNext,
  nextLabel,
  nextDisabled,
  stepsDisabled,
}: ResumeStepProps) {
  const isProcessing = uploading || extracting;

  // Track extraction completion: when extracting goes false → true → false, auto-advance
  const wasExtractingRef = useRef(false);

  useEffect(() => {
    if (extracting) {
      wasExtractingRef.current = true;
    } else if (wasExtractingRef.current && !uploadError) {
      // Extraction just finished successfully
      wasExtractingRef.current = false;
      onExtractionComplete();
    }
  }, [extracting, uploadError, onExtractionComplete]);

  const extractionStepIndex = extractionProgress?.stepIndex;
  const extractionPercent = extractionProgress?.progress;

  return (
    <div className="space-y-6">
      {/* Header with title only (nav is in the sticky bar) */}
      <StepHeader
        title={resumeInfo ? 'Upload a new resume' : "Let\u2019s build your profile"}
        subtitle="Upload your resume and we'll extract your information automatically using AI"
        showBack={false}
        hideNext
      />

      {/* Upload area */}
      <div className="relative">
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-10 bg-surface/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-default mb-1">
              {extracting ? 'AI is extracting your profile\u2026' : 'Uploading your resume\u2026'}
            </p>
            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>
                  {extracting
                    ? RESUME_EXTRACTION_STEPS[extractionStepIndex ?? 0]
                    : 'Uploading\u2026'}
                </span>
                <span>{extractionPercent ? `${Math.round(extractionPercent)}%` : ''}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-primary-subtle/50 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${extractionPercent ?? (uploading ? 30 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Drag and drop area */}
        <label
          htmlFor="wizard-resume-upload"
          className={`
            block border-2 border-dashed rounded-xl p-8 sm:p-12 text-center
            transition-all duration-200 cursor-pointer
            ${isProcessing
              ? 'border-primary/30 bg-primary-subtle/10 cursor-wait'
              : 'border-border/40 bg-surface hover:border-primary/40 hover:bg-primary-subtle/5'
            }
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isProcessing}
            id="wizard-resume-upload"
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              isProcessing ? 'bg-primary/10' : 'bg-primary-subtle'
            }`}>
              <Upload className={`w-7 h-7 ${isProcessing ? 'text-primary/40' : 'text-primary'}`} />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-default">
                Drop your PDF here or click to browse
              </p>
              <p className="text-xs text-muted mt-1">PDF format, max 5 MB</p>
            </div>
          </div>
        </label>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 bg-error-subtle/20 border border-error/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
          <p className="text-sm text-error">{uploadError}</p>
        </div>
      )}

      {/* Previously uploaded resume info */}
      {resumeInfo && !isProcessing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-subtle/10 border border-primary-subtle/20">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{resumeInfo.filename}</p>
            <p className="text-xs text-muted">
              Uploaded {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleDateString() : ''}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Download
          </button>
        </div>
      )}

      {/* Bottom spacer so sticky bar doesn't cover content */}
      <div className="h-20" aria-hidden="true" />

      {/* Sticky bottom action bar */}
      <StickyActionBar
        onAction={onNext ?? (() => {})}
        actionLabel={nextLabel}
        actionDisabled={nextDisabled}
        allDisabled={stepsDisabled}
      />
    </div>
  );
}
