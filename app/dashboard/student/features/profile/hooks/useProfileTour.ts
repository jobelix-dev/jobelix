/**
 * Hook for managing profile validation tour
 * 
 * Uses the generic useValidationTour hook with profile-specific
 * step building logic.
 */

import { useCallback, Dispatch, SetStateAction } from 'react';
import { ValidationTourStep } from '@/app/dashboard/student/components/ValidationTour';
import { ProfileValidationResult } from '@/lib/client/profileValidation';
import { useValidationTour } from '@/app/hooks';

const COMPLETION_STEP: ValidationTourStep = {
  id: 'complete',
  targetId: 'publish-profile-button',
  title: 'Save now',
  message: 'All set - you can save now.',
};

/**
 * Builds tour steps from profile validation errors
 */
function buildProfileTourSteps(
  validation: ProfileValidationResult,
  setExpandedEducationIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedExperienceIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedPublicationIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedCertificationIndex: Dispatch<SetStateAction<number | null>>,
  setEditingProjectIndex: Dispatch<SetStateAction<number | null>>
): ValidationTourStep[] {
  const steps: ValidationTourStep[] = [];
  const fieldErrors = validation?.fieldErrors;
  if (!fieldErrors) return steps;

  const startDateCopy = {
    title: 'Add a start date',
    message: 'Select the start month and year.',
  };
  const endDateCopy = (error?: string) => {
    if (error && error.toLowerCase().includes('before')) {
      return {
        title: 'Fix the end date',
        message: 'Choose an end date after the start date.',
      };
    }
    return {
      title: 'Add an end date',
      message: 'Select the end month and year.',
    };
  };

  // Basic info fields
  if (fieldErrors.student_name) {
    steps.push({
      id: 'student_name',
      targetId: 'profile-student-name',
      title: 'Add your name',
      message: 'Enter your full name.',
    });
  }

  if (fieldErrors.email) {
    steps.push({
      id: 'email',
      targetId: 'profile-email',
      title: 'Enter your email',
      message: 'Type a valid email address.',
    });
  }

  if (fieldErrors.phone_number) {
    steps.push({
      id: 'phone_number',
      targetId: 'profile-phone-number',
      title: 'Enter your phone',
      message: 'Required for job applications. Recruiters may call you.',
    });
  }

  if (fieldErrors.address) {
    const addressTooLong = fieldErrors.address.toLowerCase().includes('too long');
    steps.push({
      id: 'address',
      targetId: 'profile-address',
      title: addressTooLong ? 'Shorten your address' : 'Enter your location',
      message: addressTooLong
        ? 'Shorten your address or clear it.'
        : 'Required for job applications (e.g., "New York, NY").',
    });
  }

  // Education
  const educationIndexes = Object.keys(fieldErrors.education || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  educationIndexes.forEach((index) => {
    const errors = fieldErrors.education[index];
    if (!errors || Object.keys(errors).length === 0) return;
    const onBefore = () => setExpandedEducationIndex(index);
    
    if (errors.school_name) {
      steps.push({
        id: `education-${index}-school_name`,
        targetId: `profile-education-${index}-school_name`,
        title: 'Add a school',
        message: 'Enter the school name.',
        onBefore,
      });
    }
    if (errors.degree) {
      steps.push({
        id: `education-${index}-degree`,
        targetId: `profile-education-${index}-degree`,
        title: 'Add a degree',
        message: 'Enter the degree or program.',
        onBefore,
      });
    }
    if (errors.start_month || errors.start_year) {
      steps.push({
        id: `education-${index}-start_month`,
        targetId: `profile-education-${index}-start_month`,
        targetIds: [
          `profile-education-${index}-start_month`,
          `profile-education-${index}-start_year`,
        ],
        title: startDateCopy.title,
        message: startDateCopy.message,
        onBefore,
      });
    }
    if (errors.end_month || errors.end_year) {
      const endCopy = endDateCopy(errors.end_year || errors.end_month);
      steps.push({
        id: `education-${index}-end_month`,
        targetId: `profile-education-${index}-end_month`,
        targetIds: [
          `profile-education-${index}-end_month`,
          `profile-education-${index}-end_year`,
        ],
        title: endCopy.title,
        message: endCopy.message,
        onBefore,
      });
    }
  });

  // Experience
  const experienceIndexes = Object.keys(fieldErrors.experience || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  experienceIndexes.forEach((index) => {
    const errors = fieldErrors.experience[index];
    if (!errors || Object.keys(errors).length === 0) return;
    const onBefore = () => setExpandedExperienceIndex(index);
    
    if (errors.organisation_name) {
      steps.push({
        id: `experience-${index}-organisation_name`,
        targetId: `profile-experience-${index}-organisation_name`,
        title: 'Add an employer',
        message: 'Enter the organization name.',
        onBefore,
      });
    }
    if (errors.position_name) {
      steps.push({
        id: `experience-${index}-position_name`,
        targetId: `profile-experience-${index}-position_name`,
        title: 'Add a role',
        message: 'Enter your job title.',
        onBefore,
      });
    }
    if (errors.start_month || errors.start_year) {
      steps.push({
        id: `experience-${index}-start_month`,
        targetId: `profile-experience-${index}-start_month`,
        targetIds: [
          `profile-experience-${index}-start_month`,
          `profile-experience-${index}-start_year`,
        ],
        title: startDateCopy.title,
        message: startDateCopy.message,
        onBefore,
      });
    }
    if (errors.end_month || errors.end_year) {
      const endCopy = endDateCopy(errors.end_year || errors.end_month);
      steps.push({
        id: `experience-${index}-end_month`,
        targetId: `profile-experience-${index}-end_month`,
        targetIds: [
          `profile-experience-${index}-end_month`,
          `profile-experience-${index}-end_year`,
        ],
        title: endCopy.title,
        message: endCopy.message,
        onBefore,
      });
    }
  });

  // Projects
  const projectIndexes = Object.keys(fieldErrors.projects || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  projectIndexes.forEach((index) => {
    const errors = fieldErrors.projects?.[index];
    if (!errors?.project_name) return;
    steps.push({
      id: `project-${index}-project_name`,
      targetId: `profile-project-${index}-project_name`,
      title: 'Add a project',
      message: 'Enter the project title.',
      onBefore: () => setEditingProjectIndex(index),
    });
  });

  // Skills
  const skillIndexes = Object.keys(fieldErrors.skills || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  skillIndexes.forEach((index) => {
    const errors = fieldErrors.skills?.[index];
    if (!errors?.skill_name) return;
    steps.push({
      id: `skill-${index}-skill_name`,
      targetId: 'profile-skills-input',
      targetIds: ['profile-skills-input', 'profile-skills-add'],
      title: 'Add a skill',
      message: 'Type a skill name and click Add.',
    });
  });

  // Languages
  const languageIndexes = Object.keys(fieldErrors.languages || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  languageIndexes.forEach((index) => {
    const errors = fieldErrors.languages?.[index];
    if (!errors?.language_name) return;
    steps.push({
      id: `language-${index}-language_name`,
      targetId: `profile-language-${index}-language_name`,
      title: 'Add a language',
      message: 'Enter a language name.',
    });
  });

  // Publications
  const publicationIndexes = Object.keys(fieldErrors.publications || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  publicationIndexes.forEach((index) => {
    const errors = fieldErrors.publications?.[index];
    if (!errors?.title) return;
    steps.push({
      id: `publication-${index}-title`,
      targetId: `profile-publication-${index}-title`,
      title: 'Add a publication',
      message: 'Enter the publication title.',
      onBefore: () => setExpandedPublicationIndex(index),
    });
  });

  // Certifications
  const certificationIndexes = Object.keys(fieldErrors.certifications || {})
    .map((key) => parseInt(key, 10))
    .filter((index) => !Number.isNaN(index))
    .sort((a, b) => a - b);

  certificationIndexes.forEach((index) => {
    const errors = fieldErrors.certifications?.[index];
    if (!errors?.name) return;
    steps.push({
      id: `certification-${index}-name`,
      targetId: `profile-certification-${index}-name`,
      title: 'Add a certification',
      message: 'Enter the certification name.',
      onBefore: () => setExpandedCertificationIndex(index),
    });
  });

  // Social links
  const socialLabels: Record<string, string> = {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    stackoverflow: 'Stack Overflow',
    kaggle: 'Kaggle',
    leetcode: 'LeetCode',
  };

  Object.entries(fieldErrors.social_links || {}).forEach(([platform, error]) => {
    if (!error) return;
    const label = socialLabels[platform] || 'social';
    steps.push({
      id: `social-${platform}`,
      targetId: `profile-social-${platform}`,
      title: `Fix your ${label} link`,
      message: `Enter a valid URL for your ${label} profile.`,
    });
  });

  return steps;
}

export function useProfileTour(
  validation: ProfileValidationResult,
  setExpandedEducationIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedExperienceIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedPublicationIndex: Dispatch<SetStateAction<number | null>>,
  setExpandedCertificationIndex: Dispatch<SetStateAction<number | null>>,
  setEditingProjectIndex: Dispatch<SetStateAction<number | null>>
) {
  const getActiveSteps = useCallback(() => {
    return buildProfileTourSteps(
      validation,
      setExpandedEducationIndex,
      setExpandedExperienceIndex,
      setExpandedPublicationIndex,
      setExpandedCertificationIndex,
      setEditingProjectIndex
    );
  }, [
    validation,
    setExpandedEducationIndex,
    setExpandedExperienceIndex,
    setExpandedPublicationIndex,
    setExpandedCertificationIndex,
    setEditingProjectIndex,
  ]);

  const handleStepChange = useCallback(
    (step: ValidationTourStep | undefined, prevStep: ValidationTourStep | undefined) => {
      // Close project modal when navigating away from project steps
      if (prevStep?.id.startsWith('project-') && !step?.id.startsWith('project-')) {
        setEditingProjectIndex(null);
      }
    },
    [setEditingProjectIndex]
  );

  const handleExit = useCallback(() => {
    setEditingProjectIndex(null);
    setExpandedEducationIndex(null);
    setExpandedExperienceIndex(null);
    setExpandedPublicationIndex(null);
    setExpandedCertificationIndex(null);
  }, [
    setEditingProjectIndex,
    setExpandedEducationIndex,
    setExpandedExperienceIndex,
    setExpandedPublicationIndex,
    setExpandedCertificationIndex,
  ]);

  const tour = useValidationTour({
    getActiveSteps,
    completionStep: COMPLETION_STEP,
    onExit: handleExit,
    onStepChange: handleStepChange,
  });

  // Return backward-compatible API
  return {
    profileTourOpen: tour.isOpen,
    profileTourSteps: tour.steps,
    profileTourIndex: tour.currentIndex,
    startProfileTour: tour.start,
    handleProfileTourNext: tour.next,
    handleProfileTourBack: tour.back,
    handleProfileTourExit: tour.exit,
  };
}
