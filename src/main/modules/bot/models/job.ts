/**
 * Job Model - Represents a LinkedIn job posting
 */

import type { Job } from '../types';

/**
 * Create a new Job object
 */
export function createJob(
  title: string,
  company: string,
  location: string,
  link: string,
  applyMethod: string
): Job {
  return {
    title,
    company,
    location,
    link,
    applyMethod,
  };
}

/**
 * Set the job description
 */
export function setJobDescription(job: Job, description: string): Job {
  return {
    ...job,
    description,
  };
}

/**
 * Set the summarized job description
 */
export function setSummarizedDescription(job: Job, summary: string): Job {
  return {
    ...job,
    summarizedDescription: summary,
  };
}

/**
 * Check if a job should be skipped based on blacklists
 */
export function isBlacklisted(
  job: Job,
  companyBlacklist: string[],
  titleBlacklist: string[],
  seenJobs: Set<string>
): boolean {
  // Check if already seen
  if (seenJobs.has(job.link)) {
    return true;
  }

  // Check company blacklist (case-insensitive)
  const companyLower = job.company.trim().toLowerCase();
  if (companyBlacklist.some(c => c.trim().toLowerCase() === companyLower)) {
    return true;
  }

  // Check title blacklist (word-level matching)
  const titleWords = job.title.toLowerCase().split(/\s+/);
  if (titleBlacklist.some(word => titleWords.includes(word.toLowerCase()))) {
    return true;
  }

  return false;
}
