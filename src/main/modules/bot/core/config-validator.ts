/**
 * Configuration Validator - Validates job search config from YAML
 * 
 * Mirrors the Python ConfigValidator class.
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import type { JobSearchConfig, ExperienceLevel, JobTypes, DateFilter } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('ConfigValidator');

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Resume config section from config.yaml
 * Contains personal details, legal authorization, work preferences, etc.
 */
export interface ResumeConfig {
  personal_details?: {
    date_of_birth?: string;
    pronouns?: string;
    gender?: string;
    veteran?: boolean;
    disability?: boolean;
    ethnicity?: string;
  };
  legal_authorization?: {
    eu_work_authorization?: boolean;
    us_work_authorization?: boolean;
    requires_us_visa?: boolean;
    requires_us_sponsorship?: boolean;
  };
  work_preferences?: {
    remote_work?: boolean;
    in_person_work?: boolean;
    open_to_relocation?: boolean;
    willing_to_complete_assessments?: boolean;
    willing_to_undergo_drug_tests?: boolean;
    willing_to_undergo_background_checks?: boolean;
  };
  availability?: {
    notice_period?: string;
  };
  salary_expectations?: {
    salary_expectation_usd?: string | number;
  };
}

/**
 * Full config data including resume_config section
 */
export interface FullConfigData {
  config: JobSearchConfig;
  resumeConfig: ResumeConfig | null;
}

/**
 * Load and validate configuration from YAML file
 */
export function loadAndValidateConfig(configPath: string): JobSearchConfig {
  const { config } = loadFullConfig(configPath);
  return config;
}

/**
 * Load full configuration including resume_config section
 */
export function loadFullConfig(configPath: string): FullConfigData {
  log.info(`Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  
  let data: Record<string, unknown>;
  try {
    data = yaml.load(content) as Record<string, unknown>;
  } catch (e) {
    throw new ConfigError(`Error parsing config YAML: ${e}`);
  }

  const config = validateConfig(data);
  const resumeConfig = (data.resume_config as ResumeConfig) || null;
  
  if (resumeConfig) {
    log.info('Found resume_config section in config.yaml');
  }

  return { config, resumeConfig };
}

/**
 * Validate configuration object
 */
export function validateConfig(data: Record<string, unknown>): JobSearchConfig {
  // Validate 'remote' parameter
  if (typeof data.remote !== 'boolean') {
    throw new ConfigError("'remote' must be a boolean value");
  }

  // Validate 'experienceLevel' parameters
  const experienceLevel = validateExperienceLevel(data.experienceLevel);

  // Validate 'jobTypes' parameters
  const jobTypes = validateJobTypes(data.jobTypes);

  // Validate 'date' filter parameters
  const dateFilter = validateDateFilter(data.date);

  // Validate 'positions' list
  const positions = validateStringArray(data.positions, 'positions');

  // Validate 'locations' list
  const locations = validateStringArray(data.locations, 'locations');

  // Validate 'distance' parameter
  const distance = validateDistance(data.distance);

  // Validate and sanitize blacklists
  const companyBlacklist = sanitizeStringArray(data.companyBlacklist);
  const titleBlacklist = sanitizeStringArray(data.titleBlacklist);

  // Validate job languages (optional, defaults to English)
  const jobLanguages = sanitizeStringArray(data.jobLanguages);
  const validatedJobLanguages = jobLanguages.length > 0 ? jobLanguages : ['en'];

  const config: JobSearchConfig = {
    remote: data.remote,
    experienceLevel,
    jobTypes,
    date: dateFilter,
    positions,
    locations,
    distance,
    companyBlacklist,
    titleBlacklist,
    jobLanguages: validatedJobLanguages,
  };

  log.info(`Config validated: ${positions.length} positions, ${locations.length} locations`);
  return config;
}

function validateExperienceLevel(data: unknown): ExperienceLevel {
  const levels = data as Record<string, unknown> || {};
  const validLevels = ['internship', 'entry', 'associate', 'mid-senior level', 'director', 'executive'];

  const result: ExperienceLevel = {
    internship: false,
    entry: false,
    associate: false,
    'mid-senior level': false,
    director: false,
    executive: false,
  };

  for (const level of validLevels) {
    if (typeof levels[level] !== 'boolean') {
      throw new ConfigError(`Experience level '${level}' must be a boolean value`);
    }
    result[level as keyof ExperienceLevel] = levels[level] as boolean;
  }

  return result;
}

function validateJobTypes(data: unknown): JobTypes {
  const types = data as Record<string, unknown> || {};
  const validTypes = ['full-time', 'contract', 'part-time', 'temporary', 'internship', 'other', 'volunteer'];

  const result: JobTypes = {
    'full-time': false,
    contract: false,
    'part-time': false,
    temporary: false,
    internship: false,
    other: false,
    volunteer: false,
  };

  for (const jobType of validTypes) {
    if (typeof types[jobType] !== 'boolean') {
      throw new ConfigError(`Job type '${jobType}' must be a boolean value`);
    }
    result[jobType as keyof JobTypes] = types[jobType] as boolean;
  }

  return result;
}

function validateDateFilter(data: unknown): DateFilter {
  const dates = data as Record<string, unknown> || {};
  const validDates = ['all time', 'month', 'week', '24 hours'];

  const result: DateFilter = {
    'all time': false,
    month: false,
    week: false,
    '24 hours': false,
  };

  for (const dateFilter of validDates) {
    if (typeof dates[dateFilter] !== 'boolean') {
      throw new ConfigError(`Date filter '${dateFilter}' must be a boolean value`);
    }
    result[dateFilter as keyof DateFilter] = dates[dateFilter] as boolean;
  }

  return result;
}

function validateStringArray(data: unknown, name: string): string[] {
  if (!Array.isArray(data)) {
    throw new ConfigError(`'${name}' must be an array`);
  }

  for (const item of data) {
    if (typeof item !== 'string') {
      throw new ConfigError(`'${name}' must contain only strings`);
    }
  }

  return data as string[];
}

function sanitizeStringArray(data: unknown): string[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(item => typeof item === 'string') as string[];
}

function validateDistance(data: unknown): number {
  const approvedDistances = new Set([0, 5, 10, 25, 50, 100]);
  
  if (typeof data !== 'number' || !approvedDistances.has(data)) {
    throw new ConfigError(`Invalid distance value. Must be one of: ${[...approvedDistances].join(', ')}`);
  }

  return data;
}

/**
 * Build the base search URL query string from config
 * 
 * LinkedIn URL parameters:
 * - f_AL=true: Easy Apply filter (new format, more reliable)
 * - f_E: Experience level (1=internship, 2=entry, 3=associate, etc.)
 * - f_JT: Job type (F=full-time, C=contract, P=part-time, etc.)
 * - f_TPR: Time posted (r86400=24h, r604800=week, r2592000=month)
 * - f_WT: Workplace type (1=on-site, 2=remote, 3=hybrid)
 * - distance: Distance in miles (omit for broader search)
 * - sortBy: Sort order (R=relevance, DD=date)
 */
export function buildSearchUrl(config: JobSearchConfig): string {
  const parts: string[] = [];

  // Remote filter (workplace type)
  if (config.remote) {
    parts.push('f_WT=2');  // 2 = Remote
  }

  // Experience level filter
  const expLevelMap: Record<string, number> = {
    internship: 1,
    entry: 2,
    associate: 3,
    'mid-senior level': 4,
    director: 5,
    executive: 6,
  };
  
  const selectedLevels = Object.entries(config.experienceLevel)
    .filter(([_, enabled]) => enabled)
    .map(([level]) => expLevelMap[level]);
  
  if (selectedLevels.length > 0) {
    parts.push(`f_E=${selectedLevels.join(',')}`);
  }

  // Distance filter - only add if > 0 (0 is too restrictive)
  // Note: When location is a country like "France", distance should be omitted
  // to search the entire country rather than exact location match
  if (config.distance > 0) {
    parts.push(`distance=${config.distance}`);
  }

  // Job type filter
  const jobTypeMap: Record<string, string> = {
    'full-time': 'F',
    contract: 'C',
    'part-time': 'P',
    temporary: 'T',
    internship: 'I',
    other: 'O',
    volunteer: 'V',
  };

  const selectedTypes = Object.entries(config.jobTypes)
    .filter(([_, enabled]) => enabled)
    .map(([type]) => jobTypeMap[type]);

  if (selectedTypes.length > 0) {
    parts.push(`f_JT=${selectedTypes.join(',')}`);
  }

  // Date filter
  const dateMap: Record<string, string> = {
    'all time': '',
    month: '&f_TPR=r2592000',
    week: '&f_TPR=r604800',
    '24 hours': '&f_TPR=r86400',
  };

  const selectedDate = Object.entries(config.date).find(([_, enabled]) => enabled);
  const dateParam = selectedDate ? dateMap[selectedDate[0]] : '';

  // Easy Apply filter (new format - more reliable than f_LF=f_AL)
  parts.push('f_AL=true');

  // Sort by relevance for better results
  parts.push('sortBy=R');

  return `?${parts.join('&')}${dateParam}`;
}
