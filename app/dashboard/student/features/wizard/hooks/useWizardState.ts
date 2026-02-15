/**
 * useWizardState Hook
 *
 * Central state management for the student wizard (the entire student app).
 *
 * 5 steps: Resume(0) → GitHub(1) → Profile(2) → Preferences(3) → Auto Apply(4)
 *
 * Derives initial step from server state (profile draft, preferences).
 * Returning users who have completed setup land on step 4 (Auto Apply).
 *
 * Supports `beforeLeaveRef` — when set, `goToStep`/`goNext`/`goBack` will call
 * the ref before navigating. If it returns false, navigation is blocked and the
 * target step is stored as `pendingStep`. The parent can call `commitPendingStep()`
 * to complete the deferred navigation (e.g. after an async save finishes).
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef, MutableRefObject } from 'react';
import { apiFetch } from '@/lib/client/http';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Step indices — exported for use across wizard components */
export const STEP = {
  RESUME: 0,
  GITHUB: 1,
  PROFILE: 2,
  PREFERENCES: 3,
  AUTO_APPLY: 4,
} as const;

export const TOTAL_STEPS = 5;

/** Map URL ?tab= values to step indices for deep-linking (e.g. Stripe redirect) */
const TAB_TO_STEP: Record<string, number> = {
  'resume': STEP.RESUME,
  'github': STEP.GITHUB,
  'profile': STEP.PROFILE,
  'preferences': STEP.PREFERENCES,
  'auto-apply': STEP.AUTO_APPLY,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Called before leaving the current step.
 * @param targetStep - The step the user wants to navigate to
 * @returns `true` to allow immediate navigation, `false` to block (and store as pending)
 */
export type BeforeLeaveHandler = (targetStep: number) => boolean;

export interface WizardState {
  /** Current active step index (0–4) */
  currentStep: number;
  /** Set of step indices that have been completed */
  completedSteps: Set<number>;
  /** Whether initial state is still being loaded from server */
  loading: boolean;
  /** Whether the profile has data (draft exists with a name) */
  profileHasData: boolean;
  /** Whether the profile draft has been published */
  profilePublished: boolean;
  /** Whether work preferences are saved and complete */
  preferencesComplete: boolean;
}

export interface WizardActions {
  /** Navigate to the next step */
  goNext: () => void;
  /** Navigate to the previous step */
  goBack: () => void;
  /** Jump to a specific step (used by stepper clicks) */
  goToStep: (step: number) => void;
  /** Mark a step as completed */
  markCompleted: (step: number) => void;
  /** Update profile data presence flag */
  setProfileHasData: (hasData: boolean) => void;
  /** Update profile published flag */
  setProfilePublished: (published: boolean) => void;
  /** Update preferences complete flag */
  setPreferencesComplete: (complete: boolean) => void;
  /**
   * Ref for the beforeLeave handler. Parent sets this to a function that
   * returns false to block navigation (e.g. to trigger a tour or save).
   */
  beforeLeaveRef: MutableRefObject<BeforeLeaveHandler | null>;
  /**
   * Complete the deferred navigation after beforeLeave blocked it.
   * If no pending step exists, falls back to goNext().
   */
  commitPendingStep: () => void;
  /** Clear pending step without navigating (e.g. user cancelled) */
  clearPendingStep: () => void;
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

/**
 * Derive the initial step from server state.
 *
 * Priority order:
 *   - No profile data at all → step 0 (resume upload)
 *   - Has data but not published → step 2 (profile editor)
 *   - Published but prefs incomplete → step 3 (preferences)
 *   - Everything complete → step 4 (auto apply — the "home" screen)
 */
function deriveInitialStep(
  profileHasData: boolean,
  profilePublished: boolean,
  preferencesComplete: boolean,
): number {
  if (!profileHasData) return STEP.RESUME;
  if (!profilePublished) return STEP.PROFILE;
  if (!preferencesComplete) return STEP.PREFERENCES;
  return STEP.AUTO_APPLY;
}

/**
 * Derive which steps are already completed from server state.
 */
function deriveCompletedSteps(
  profileHasData: boolean,
  profilePublished: boolean,
  preferencesComplete: boolean,
): Set<number> {
  const completed = new Set<number>();

  if (profileHasData) completed.add(STEP.RESUME);

  // GitHub is optional — mark complete if we have profile data (past that point)
  if (profileHasData) completed.add(STEP.GITHUB);

  if (profilePublished) completed.add(STEP.PROFILE);

  if (preferencesComplete) completed.add(STEP.PREFERENCES);

  // Auto apply is "reachable" when required steps are done
  if (profilePublished && preferencesComplete) completed.add(STEP.AUTO_APPLY);

  return completed;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWizardState(): WizardState & WizardActions {
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(STEP.RESUME);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [profileHasData, setProfileHasData] = useState(false);
  const [profilePublished, setProfilePublished] = useState(false);
  const [preferencesComplete, setPreferencesComplete] = useState(false);

  // Before-leave guard and pending navigation
  const beforeLeaveRef = useRef<BeforeLeaveHandler | null>(null);
  const pendingStepRef = useRef<number | null>(null);

  // ---- Load initial state from server ----
  useEffect(() => {
    async function loadState() {
      try {
        const [draftRes, prefsRes] = await Promise.all([
          apiFetch('/api/student/profile/draft'),
          apiFetch('/api/student/work-preferences'),
        ]);

        let hasData = false;
        let published = false;
        let prefsComplete = false;

        if (draftRes.ok) {
          const draftData = await draftRes.json();
          if (draftData.draft) {
            hasData = !!(draftData.draft.student_name && draftData.draft.student_name.trim());
            published = draftData.draft.status === 'published';
          }
        }

        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          if (prefsData.preferences) {
            const p = prefsData.preferences;
            const hasPositions = p.positions && p.positions.length > 0;
            const hasLocations = p.locations && p.locations.length > 0;
            const hasExperience = p.exp_internship || p.exp_entry || p.exp_associate ||
              p.exp_mid_senior || p.exp_director || p.exp_executive;
            const hasJobTypes = p.job_full_time || p.job_part_time || p.job_contract ||
              p.job_temporary || p.job_internship || p.job_volunteer || p.job_other;
            const hasDateFilters = p.date_24_hours || p.date_week || p.date_month || p.date_all_time;
            const hasPersonalInfo = p.date_of_birth && p.notice_period &&
              p.salary_expectation_usd && p.salary_expectation_usd > 0;
            const hasDemographics = p.pronouns?.trim() && p.gender?.trim() && p.ethnicity?.trim();
            const hasWorkAuth = p.eu_work_authorization || p.us_work_authorization;
            prefsComplete = !!(hasPositions && hasLocations && hasExperience &&
              hasJobTypes && hasDateFilters && hasPersonalInfo &&
              hasDemographics && hasWorkAuth);
          }
        }

        setProfileHasData(hasData);
        setProfilePublished(published);
        setPreferencesComplete(prefsComplete);

        const initial = deriveInitialStep(hasData, published, prefsComplete);
        const completed = deriveCompletedSteps(hasData, published, prefsComplete);

        // Allow URL ?tab= to override the derived step (e.g. Stripe redirect
        // sends ?tab=auto-apply&success=true). Navigate directly to that step
        // so the user returns where they left off.
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const tabStep = tabParam != null ? TAB_TO_STEP[tabParam] : undefined;

        setCurrentStep(tabStep !== undefined ? tabStep : initial);
        setCompletedSteps(completed);
      } catch (error) {
        console.error('[Wizard] Failed to load initial state:', error);
        setCurrentStep(STEP.RESUME);
      } finally {
        setLoading(false);
      }
    }

    loadState();
  }, []);

  // ---- Internal navigation (bypasses beforeLeave — used by commitPendingStep) ----

  const navigateToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  // ---- Guarded navigation — checks beforeLeaveRef before moving ----

  const tryNavigate = useCallback((targetStep: number) => {
    if (targetStep < 0 || targetStep >= TOTAL_STEPS) return;

    const handler = beforeLeaveRef.current;
    if (handler) {
      const allowed = handler(targetStep);
      if (!allowed) {
        // Navigation blocked — store target for later
        pendingStepRef.current = targetStep;
        return;
      }
    }

    // Clear any stale pending step and navigate
    pendingStepRef.current = null;
    navigateToStep(targetStep);
  }, [navigateToStep]);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const target = Math.min(prev + 1, TOTAL_STEPS - 1);
      const handler = beforeLeaveRef.current;
      if (handler) {
        const allowed = handler(target);
        if (!allowed) {
          pendingStepRef.current = target;
          return prev; // stay
        }
      }
      pendingStepRef.current = null;
      return target;
    });
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => {
      const target = Math.max(prev - 1, 0);
      const handler = beforeLeaveRef.current;
      if (handler) {
        const allowed = handler(target);
        if (!allowed) {
          pendingStepRef.current = target;
          return prev;
        }
      }
      pendingStepRef.current = null;
      return target;
    });
  }, []);

  const goToStep = useCallback((step: number) => {
    tryNavigate(step);
  }, [tryNavigate]);

  const markCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  // ---- Pending step management ----

  const commitPendingStep = useCallback(() => {
    const pending = pendingStepRef.current;
    pendingStepRef.current = null;
    if (pending !== null) {
      navigateToStep(pending);
    } else {
      // Fallback: advance to next step
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }
  }, [navigateToStep]);

  const clearPendingStep = useCallback(() => {
    pendingStepRef.current = null;
  }, []);

  // ---- Memoized state ----

  const state = useMemo<WizardState>(() => ({
    currentStep,
    completedSteps,
    loading,
    profileHasData,
    profilePublished,
    preferencesComplete,
  }), [currentStep, completedSteps, loading, profileHasData, profilePublished, preferencesComplete]);

  return {
    ...state,
    goNext,
    goBack,
    goToStep,
    markCompleted,
    setProfileHasData,
    setProfilePublished,
    setPreferencesComplete,
    beforeLeaveRef,
    commitPendingStep,
    clearPendingStep,
  };
}
