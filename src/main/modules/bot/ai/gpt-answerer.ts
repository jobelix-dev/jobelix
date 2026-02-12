/**
 * GPT Answerer - AI-powered form response generator
 * 
 * Uses the backend API to generate contextually appropriate responses
 * to LinkedIn Easy Apply form questions.
 * 
 * Mirrors the Python GPTAnswerer class.
 */

import type { 
  Resume, 
  Job, 
  ChatMessage 
} from '../types';
import { getResumeSection, resumeToNarrative } from '../models/resume';
import { tailorResumePipeline } from './resume-tailoring';
import { createLogger } from '../utils/logger';
import { StatusReporter } from '../utils/status-reporter';
import { BackendAPIClient, InsufficientCreditsError } from './backend-client';
import { llmLogger } from '../utils/llm-logger';
import { stripMarkdownCodeBlock, findBestMatch, extractNumber } from '../utils/string-utils';
import { getLanguageName } from '../utils/language-detector';
import * as prompts from './prompts';

const log = createLogger('GPTAnswerer');

export class GPTAnswerer {
  // Public resume field - accessed by field handlers for smart matching
  public resume: Resume | null = null;
  private job: Job | null = null;
  private client: BackendAPIClient;


  constructor(
    private apiToken: string,
    private apiUrl: string,
    private reporter?: StatusReporter
  ) {
    this.client = new BackendAPIClient({
      token: apiToken,
      apiUrl: apiUrl,
      logRequests: true,
    });
    log.info('GPTAnswerer initialized with backend API client');
  }

  /**
   * Set the resume for context
   */
  setResume(resume: Resume): void {
    this.resume = resume;
    log.debug(`Resume set: ${resume.personalInformation.name} ${resume.personalInformation.surname}`);
  }

  /**
   * Set the current job being applied to
   */
  setJob(job: Job): void {
    this.job = job;
    log.debug(`Job set: ${job.title} at ${job.company}`);
  }

  /**
   * Get the current job description
   */
  get jobDescription(): string {
    return this.job?.description || '';
  }

  /**
   * Get the detected language of the current job description
   * Returns ISO 639-1 code (e.g., 'en', 'fr', 'de') or 'en' as default
   */
  get jobLanguage(): string {
    return this.job?.detectedLanguage || 'en';
  }

  /**
   * Get the human-readable name of the target language for prompts
   * e.g., 'en' → 'English', 'fr' → 'French'
   */
  get targetLanguageName(): string {
    return getLanguageName(this.jobLanguage);
  }

  /** Make a chat completion request with automatic retry */
  private async chatCompletion(messages: ChatMessage[], temperature = 0.8): Promise<string> {
    const maxRetries = 2;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chatCompletion(messages, 'gpt-4o-mini', temperature);
        
        llmLogger.logRequest(messages, response.content, response.usage, response.model, response.finish_reason);
        if (this.reporter) this.reporter.incrementCreditsUsed();

        return response.content;
      } catch (err) {
        lastErr = err;
        
        // Don't retry if it's an insufficient credits error - fail immediately
        if (err instanceof InsufficientCreditsError) {
          log.error('🛑 Out of credits - stopping GPT requests');
          throw err;
        }
        
        log.error(`Chat completion attempt ${attempt + 1} failed: ${String(err)}`);
        if (attempt === 0) log.error(`Backend URL: ${this.apiUrl}`);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    log.error(`All chat completion attempts failed. Verify backend at: ${this.apiUrl}`);
    throw lastErr;
  }

  /** Generic JSON retry helper for GPT responses */
  private async chatCompletionWithJsonValidation<T>(
    prompt: string,
    validator: (json: T) => boolean,
    temperature = 0.3,
    maxRetries = 2
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.chatCompletion([{ role: 'user', content: prompt }], temperature);
        const parsed = JSON.parse(response) as T;
        if (validator(parsed)) return parsed;
        throw new Error('Validation failed');
      } catch (e) {
        log.warn(`JSON attempt ${attempt + 1}/${maxRetries + 1} failed: ${e}`);
        if (attempt >= maxRetries) throw new Error(`Failed after ${maxRetries + 1} attempts: ${e}`);
      }
    }
    throw new Error('Unexpected failure');
  }

  /** Answer from multiple choice options */
  async answerFromOptions(question: string, options: string[]): Promise<string> {
    log.debug(`Answering from options: ${question}`);

    const prompt = prompts.optionsTemplate
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{question}', question)
      .replace('{options}', options.join('\n'));

    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    const answer = response.trim();

    // Find best match from options (handles slight variations)
    const bestMatch = findBestMatch(answer, options);
    log.info(`Answer: ${bestMatch}`);
    return bestMatch;
  }

  /**
   * Answer a question from options with retry after error (MATCHES PYTHON)
   */
  async answerFromOptionsWithRetry(
    question: string,
    options: string[],
    previousAnswer: string,
    errorMessage: string
  ): Promise<string> {
    log.debug(`Retrying answer: previous="${previousAnswer}", error="${errorMessage}"`);

    // Enhanced prompt with error context - matches Python
    const prompt = `You previously answered a job application question incorrectly.

Question: ${question}

Your previous answer: ${previousAnswer}
Error received: ${errorMessage}

Available options:
${options.join('\n')}

Based on my resume:
${resumeToNarrative(this.resume!)}

Please select a DIFFERENT option that addresses the error. Respond with ONLY the exact text of the chosen option.`;

    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    const answer = response.trim();

    return findBestMatch(answer, options);
  }

  /**
   * Answer a checkbox/multiple-choice question directly (no section routing)
   * 
   * Used for questions like "How did you hear about us?" where the answer
   * is NOT based on resume content but rather a simple selection.
   * 
   * MATCHES PYTHON: answer_question_textual_wide_range with direct prompt
   */
  async answerCheckboxQuestion(prompt: string): Promise<string> {
    log.debug(`Answering checkbox question: ${prompt.substring(0, 50)}...`);
    
    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    log.info(`Checkbox answer: ${response.trim()}`);
    return response.trim();
  }

  /**
   * Answer a textual/open-ended question
   */
  async answerTextual(question: string): Promise<string> {
    log.debug(`Answering textual: ${question.substring(0, 50)}...`);
    log.debug(`Target language: ${this.targetLanguageName} (${this.jobLanguage})`);

    // Determine which resume section is relevant
    const section = await this.determineResumeSection(question);
    log.debug(`Selected section: ${section}`);

    // Handle cover letter specially
    if (section === 'cover_letter') {
      return this.generateCoverLetter();
    }

    const resumeSection = getResumeSection(this.resume!, section);
    const template = this.getTemplateForSection(section);

    const prompt = template
      .replace(/{target_language}/g, this.targetLanguageName)
      .replace('{resume_section}', resumeSection)
      .replace('{question}', question)
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{job_description}', this.jobDescription)
      .replace('{pronouns}', this.resume!.selfIdentification.pronouns)
      .replace('{experience_summary}', this.getExperienceSummary());

    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    log.info(`Textual answer length: ${response.length} chars`);
    return response.trim();
  }

  /**
   * Answer a textual question with retry after error
   */
  async answerTextualWithRetry(
    question: string,
    previousAnswer: string,
    errorMessage: string
  ): Promise<string> {
    log.debug(`Retrying textual: previous answer failed with "${errorMessage}"`);

    const prompt = `I previously answered a job application question incorrectly.

Question: "${question}"

My previous answer: "${previousAnswer}"
Error received: "${errorMessage}"

Based on my resume:
${resumeToNarrative(this.resume!)}

Your previous answer was REJECTED. Please provide a corrected answer that addresses the error.
Respond with only the answer (no explanation, just the text).`;

    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    return response.trim();
  }

  /**
   * Answer a numeric question (e.g., years of experience)
   */
  async answerNumeric(question: string, defaultValue = 3): Promise<number> {
    log.debug(`Answering numeric: ${question}`);

    const prompt = prompts.numericQuestionTemplate
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{question}', question)
      .replace('{default_experience}', String(defaultValue));

    const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
    
    const result = extractNumber(response) ?? defaultValue;
    log.info(`Numeric answer: ${result}`);
    return result;
  }

  /**
   * Answer a numeric question with retry after error (MATCHES PYTHON)
   */
  async answerNumericWithRetry(
    question: string,
    previousAnswer: string,
    errorMessage: string,
    defaultValue = 3
  ): Promise<number> {
    log.debug(`Retrying numeric: previous="${previousAnswer}", error="${errorMessage}"`);

    const prompt = `You previously answered a numeric job application question incorrectly.

Question: ${question}

Your previous answer: ${previousAnswer}
Error received: ${errorMessage}

Based on my resume:
${resumeToNarrative(this.resume!)}

Your previous answer was REJECTED. Please provide a corrected numeric answer that addresses the error message.
Respond with ONLY a number (no explanation, no text, just the number).`;

    const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
    
    const match = response.match(/\d+/);
    const result = match ? parseInt(match[0], 10) : defaultValue;
    
    log.info(`Numeric retry answer: ${result}`);
    return result;
  }

  /**
   * Tailor resume to a specific job using 4-stage pipeline (MATCHES PYTHON)
   * 
   * Pipeline stages:
   * 1. Extract keywords from job description
   * 2. Score all resume items by relevance
   * 3. Filter top items with dynamic thresholds
   * 4. Optimize keywords in filtered resume
   * 
   * Falls back to old single-prompt method if any stage fails.
   */
  async tailorResumeToJob(jobDescription: string, baseResumeYaml: string): Promise<string> {
    const result = await tailorResumePipeline(this, jobDescription, baseResumeYaml);
    
    if (result.success) {
      return result.tailoredYaml;
    }
    
    // Pipeline failed - use fallback
    log.info('⚠️  Falling back to old single-prompt tailoring method');
    return this.tailorResumeOldMethod(jobDescription, baseResumeYaml);
  }

  /**
   * Legacy single-prompt resume tailoring (fallback only)
   */
  private async tailorResumeOldMethod(jobDescription: string, baseConfig: string): Promise<string> {
    log.info(`Using legacy single-prompt tailoring (target language: ${this.targetLanguageName})`);

    const prompt = prompts.resumeTailoringTemplate
      .replace(/{target_language}/g, this.targetLanguageName)
      .replace('{job_description}', jobDescription)
      .replace('{base_config}', baseConfig);

    try {
      const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.5);
      const tailoredConfig = stripMarkdownCodeBlock(response);
      
      log.info('Resume tailoring completed successfully');
      return tailoredConfig;
      
    } catch (e) {
      log.warn(`Failed to tailor resume config: ${e}`);
      log.debug('Returning original config as fallback');
      return baseConfig;
    }
  }

  /** Extract key terms from job description (Stage 1) */
  async extractJobKeywords(jobDescription: string): Promise<string> {
    log.info('Extracting keywords from job description');

    const prompt = prompts.jobKeywordExtractionTemplate.replace('{job_description}', jobDescription);
    const requiredKeys = ['technical_skills', 'soft_skills', 'domain_terms', 'action_verbs'];

    const result = await this.chatCompletionWithJsonValidation<Record<string, string[]>>(
      prompt,
      (dict) => requiredKeys.every(key => key in dict),
      0.3
    );

    // Deduplicate keywords
    for (const key of Object.keys(result)) {
      if (Array.isArray(result[key])) result[key] = [...new Set(result[key])];
    }

    log.info('Keyword extraction completed');
    return JSON.stringify(result, null, 2);
  }

  /** Score resume items by job relevance (Stage 2) */
  async scoreResumeForJob(jobDescription: string, resumeYaml: string): Promise<string> {
    log.info('Scoring resume items for job relevance');

    const prompt = prompts.resumeScoringTemplate
      .replace('{job_description}', jobDescription)
      .replace('{resume_yaml}', resumeYaml);

    const result = await this.chatCompletionWithJsonValidation<Record<string, unknown>>(
      prompt,
      () => true,  // Any valid JSON is acceptable
      0.3
    );

    log.info('Resume scoring completed');
    return JSON.stringify(result);
  }

  /** Optimize resume keywords for job (Stage 4) */
  async optimizeResumeKeywords(
    jobDescription: string,
    filteredConfig: string,
    extractedKeywords = ''
  ): Promise<string> {
    log.info(`Optimizing resume keywords (target language: ${this.targetLanguageName})`);

    const prompt = prompts.resumeKeywordOptimizationTemplate
      .replace(/{target_language}/g, this.targetLanguageName)
      .replace('{job_description}', jobDescription)
      .replace('{filtered_config}', filteredConfig)
      .replace('{extracted_keywords}', extractedKeywords || '(none)');

    try {
      // Temperature 0.8 matches Python for creative rewriting
      const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.8);
      return stripMarkdownCodeBlock(response);
    } catch (e) {
      log.warn(`Keyword optimization failed: ${e}`);
      return filteredConfig;
    }
  }

  /** Determine which resume section is relevant for a question */
  private async determineResumeSection(question: string): Promise<string> {
    const prompt = `For the question: "${question}", which resume section is relevant?

Sections: Personal information, Self Identification, Legal Authorization, Work Preferences,
Education Details, Experience Details, Projects, Availability, Salary Expectations,
Certifications, Languages, Interests, Cover letter

Routing: 'why interested' → Interests | technical experience → Experience Details | 
'about yourself' → Personal information | remote/office → Work Preferences

Respond with ONLY the section name.`;

    const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
    let section = response.trim().toLowerCase().replace(/\*\*/g, '').replace(/ /g, '_');

    const validSections = [
      'personal_information', 'self_identification', 'legal_authorization',
      'work_preferences', 'education_details', 'experience_details',
      'projects', 'availability', 'salary_expectations', 'certifications',
      'languages', 'interests', 'cover_letter'
    ];

    if (!validSections.includes(section)) {
      section = validSections.find(s => section.includes(s) || s.includes(section)) || 'personal_information';
    }
    return section;
  }

  /** Get prompt template for a resume section */
  private getTemplateForSection(section: string): string {
    const templates: Record<string, string> = {
      personal_information: prompts.personalInformationTemplate,
      self_identification: prompts.selfIdentificationTemplate,
      legal_authorization: prompts.legalAuthorizationTemplate,
      work_preferences: prompts.workPreferencesTemplate,
      education_details: prompts.educationDetailsTemplate,
      experience_details: prompts.experienceDetailsTemplate,
      projects: prompts.projectsTemplate,
      availability: prompts.availabilityTemplate,
      salary_expectations: prompts.salaryExpectationsTemplate,
      certifications: prompts.certificationsTemplate,
      languages: prompts.languagesTemplate,
      interests: prompts.interestsTemplate,
    };
    return templates[section] || prompts.personalInformationTemplate;
  }

  /** Generate a cover letter */
  private async generateCoverLetter(): Promise<string> {
    log.debug(`Generating cover letter in ${this.targetLanguageName}`);
    const prompt = prompts.coverLetterTemplate
      .replace(/{target_language}/g, this.targetLanguageName)
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{job_description}', this.jobDescription);
    return this.chatCompletion([{ role: 'user', content: prompt }]);
  }

  /** Get brief experience summary */
  private getExperienceSummary(): string {
    if (!this.resume?.experienceDetails?.length) return '';
    const recent = this.resume.experienceDetails[0];
    return `${recent.position} at ${recent.company}`;
  }
}
