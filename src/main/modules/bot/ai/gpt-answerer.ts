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
  ChatMessage, 
  ChatCompletionRequest, 
  ChatCompletionResponse 
} from '../types';
import { getResumeSection, resumeToNarrative } from '../models/resume';
import { createLogger } from '../utils/logger';
import { StatusReporter } from '../utils/status-reporter';
import * as prompts from './prompts/templates';

const log = createLogger('GPTAnswerer');

export class GPTAnswerer {
  private resume: Resume | null = null;
  private job: Job | null = null;

  constructor(
    private apiToken: string,
    private apiUrl: string,
    private reporter?: StatusReporter
  ) {
    log.info('GPTAnswerer initialized with backend API');
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
   * Make a chat completion request to the backend API
   */
  private async chatCompletion(messages: ChatMessage[], temperature = 0.8): Promise<string> {
     // Build two possible request shapes depending on backend endpoint
     // - Next.js route (/api/autoapply/gpt4) expects { token, messages, temperature }
     // - Generic backend proxy expects { messages, model, temperature } and Authorization header
 
     // Use global fetch if available. Runtime (Electron main) must provide a fetch implementation
     // (Node 18+ includes fetch, or install 'undici' and polyfill). If not present, fail early with clear error.
     const fetchFn: any = (globalThis as any).fetch;
     if (!fetchFn) {
      const msg = 'Global fetch is not available in this runtime. Run on Node 18+ or install & polyfill undici.';
      log.error(msg);
      throw new Error(msg);
     }
 
     const isNextJsApi = this.apiUrl.includes('/api/autoapply/gpt4') || this.apiUrl.endsWith('/gpt4');
 
     const maxRetries = 2;
     let lastErr: any = null;
 
     for (let attempt = 0; attempt <= maxRetries; attempt++) {
       try {
         const headers: Record<string, string> = { 'Content-Type': 'application/json' };
         let body: any;
 
         if (isNextJsApi) {
           // Server route expects token in body
           body = { token: this.apiToken, messages, temperature };
         } else {
           body = { messages, model: 'gpt-4o-mini', temperature };
           headers['Authorization'] = `Bearer ${this.apiToken}`;
         }
 
        const resp = await fetchFn(this.apiUrl, {
           method: 'POST',
           headers,
           body: JSON.stringify(body),
           // keep a longer timeout controlled by environment if needed
         } as any);
 
         if (!resp.ok) {
           const text = await resp.text().catch(() => '<failed to read body>');
           const errMsg = `API request failed: ${resp.status} - ${text}`;
           throw new Error(errMsg);
         }
 
         const data = await resp.json() as ChatCompletionResponse;
 
         // Track credit usage
         if (this.reporter) this.reporter.incrementCreditsUsed();
 
         // Expect response shape: { content: '...' } from our backend route
         if (typeof data.content === 'string') return data.content;
 
         // Fallback: if backend returns raw string
         if (typeof (data as any) === 'string') return (data as any);
 
         // If unexpected shape, stringify for debugging
         return JSON.stringify(data);
       } catch (err) {
         lastErr = err;
        log.error(`Chat completion attempt ${attempt + 1} failed: ${String(err)}`);
         // small backoff before retry
         if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
       }
     }
 
     log.error('All chat completion attempts failed');
     throw lastErr;
   }

  /**
   * Answer a question by selecting from multiple choice options (MATCHES PYTHON)
   */
  async answerFromOptions(question: string, options: string[]): Promise<string> {
    log.debug(`Answering from options: ${question}`);
    log.debug(`Options: ${options.join(', ')}`);

    // Use the proper options template that matches Python
    const prompt = prompts.optionsTemplate
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{question}', question)
      .replace('{options}', options.join('\n'));

    const response = await this.chatCompletion([{ role: 'user', content: prompt }]);
    const answer = response.trim();

    // Find best match from options (handles slight variations)
    const bestMatch = this.findBestMatch(answer, options);
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

    return this.findBestMatch(answer, options);
  }

  /**
   * Answer a textual/open-ended question
   */
  async answerTextual(question: string): Promise<string> {
    log.debug(`Answering textual: ${question.substring(0, 50)}...`);

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
    
    // Extract number from response
    const match = response.match(/\d+/);
    const result = match ? parseInt(match[0], 10) : defaultValue;
    
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
    log.info('=== Starting 4-Stage Resume Tailoring Pipeline ===');
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Base resume YAML size: ${baseResumeYaml.length} bytes`);

    try {
      const stage1Start = Date.now();
      
      // === STAGE 1: Extract keywords from job description ===
      log.info('🔍 Stage 1: Extracting keywords from job description');
      const keywordsJson = await this.extractJobKeywords(jobDescription);
      const keywordsDict = JSON.parse(keywordsJson);
      
      const stage1Duration = (Date.now() - stage1Start) / 1000;
      log.info(`✓ Stage 1 completed in ${stage1Duration.toFixed(2)}s`);
      
      const totalKeywords = Object.values(keywordsDict).reduce(
        (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
      );
      log.info(`Extracted ${totalKeywords} keywords: ${keywordsDict.technical_skills?.length || 0} technical, ${keywordsDict.soft_skills?.length || 0} soft skills`);

      const stage2Start = Date.now();
      
      // === STAGE 2: Score all resume items ===
      log.info('🎯 Stage 2: Scoring resume items by relevance');
      const scoresJson = await this.scoreResumeForJob(jobDescription, baseResumeYaml);
      
      const stage2Duration = (Date.now() - stage2Start) / 1000;
      log.info(`✓ Stage 2 completed in ${stage2Duration.toFixed(2)}s`);

      const stage4Start = Date.now();
      
      // === STAGE 4: Optimize keywords using extracted terms ===
      // (Stage 3 filtering is simplified in Node.js version - we optimize the full resume)
      log.info('✍️  Stage 4: Optimizing keywords and descriptions with target terms');
      
      const keywordsFormatted = `Technical Skills: ${keywordsDict.technical_skills?.join(', ') || ''}
Soft Skills: ${keywordsDict.soft_skills?.join(', ') || ''}
Domain Terms: ${keywordsDict.domain_terms?.join(', ') || ''}
Action Verbs: ${keywordsDict.action_verbs?.join(', ') || ''}`;

      const optimizedConfig = await this.optimizeResumeKeywords(
        jobDescription,
        baseResumeYaml,
        keywordsFormatted
      );
      
      const stage4Duration = (Date.now() - stage4Start) / 1000;
      log.info(`✓ Stage 4 completed in ${stage4Duration.toFixed(2)}s`);
      
      const totalDuration = stage1Duration + stage2Duration + stage4Duration;
      log.info(`=== Pipeline completed in ${totalDuration.toFixed(2)}s ===`);
      
      return optimizedConfig;
      
    } catch (e) {
      log.warn(`New pipeline failed: ${e}`);
      log.info('⚠️  Falling back to old single-prompt tailoring method');
      
      return this.tailorResumeOldMethod(jobDescription, baseResumeYaml);
    }
  }

  /**
   * Legacy single-prompt resume tailoring (fallback only)
   */
  private async tailorResumeOldMethod(jobDescription: string, baseConfig: string): Promise<string> {
    log.info('Using legacy single-prompt tailoring');

    const prompt = prompts.resumeTailoringTemplate
      .replace('{job_description}', jobDescription)
      .replace('{base_config}', baseConfig);

    try {
      let tailoredConfig = await this.chatCompletion([{ role: 'user', content: prompt }], 0.5);
      
      // Clean up markdown code blocks if present
      if (tailoredConfig.trim().startsWith('```yaml')) {
        const lines = tailoredConfig.split('\n');
        let startIdx = 0;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('```yaml')) {
            startIdx = i + 1;
          } else if (lines[i].trim() === '```' && i > startIdx) {
            endIdx = i;
            break;
          }
        }
        tailoredConfig = lines.slice(startIdx, endIdx).join('\n');
      } else if (tailoredConfig.trim().startsWith('```')) {
        const lines = tailoredConfig.split('\n');
        let startIdx = 0;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('```')) {
            if (startIdx === 0) {
              startIdx = i + 1;
            } else {
              endIdx = i;
              break;
            }
          }
        }
        tailoredConfig = lines.slice(startIdx, endIdx).join('\n');
      }
      
      log.info('Resume tailoring completed successfully');
      return tailoredConfig;
      
    } catch (e) {
      log.warn(`Failed to tailor resume config: ${e}`);
      log.debug('Returning original config as fallback');
      return baseConfig;
    }
  }

  /**
   * Extract key terms from job description for resume optimization (Stage 1)
   * 
   * Identifies technical skills, soft skills, domain terms, and action verbs
   * for ATS optimization.
   */
  async extractJobKeywords(jobDescription: string, maxRetries = 2): Promise<string> {
    log.info('Extracting keywords from job description');
    log.debug(`Job description length: ${jobDescription.length} chars`);

    const prompt = prompts.jobKeywordExtractionTemplate
      .replace('{job_description}', jobDescription);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.info(`Keyword extraction attempt ${attempt + 1}/${maxRetries + 1}`);
        }

        const keywordsJson = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
        
        // Validate it's parseable JSON and has expected structure
        const keywordsDict = JSON.parse(keywordsJson);
        
        const requiredKeys = ['technical_skills', 'soft_skills', 'domain_terms', 'action_verbs'];
        for (const key of requiredKeys) {
          if (!(key in keywordsDict)) {
            throw new Error(`Missing required key: ${key}`);
          }
        }
        
        // Deduplicate keywords within each category
        for (const key of Object.keys(keywordsDict)) {
          if (Array.isArray(keywordsDict[key])) {
            keywordsDict[key] = [...new Set(keywordsDict[key])];
          }
        }
        
        log.info('Keyword extraction completed successfully');
        return JSON.stringify(keywordsDict, null, 2);
        
      } catch (e) {
        log.warn(`Attempt ${attempt + 1}: Invalid JSON in keyword response: ${e}`);
        
        if (attempt < maxRetries) {
          log.info(`Retrying keyword extraction (attempt ${attempt + 2}/${maxRetries + 1})`);
          continue;
        } else {
          log.error('All keyword extraction retry attempts failed');
          throw new Error(`Failed to extract valid keywords after ${maxRetries + 1} attempts: ${e}`);
        }
      }
    }
    
    throw new Error('Keyword extraction failed unexpectedly');
  }

  /**
   * Score all resume items by relevance to job description (Stage 2)
   * 
   * Uses lower temperature (0.3) for consistent scoring.
   * Returns JSON string with scores for all categories.
   */
  async scoreResumeForJob(jobDescription: string, resumeYaml: string, maxRetries = 2): Promise<string> {
    log.info('Scoring resume items for job relevance');
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Resume YAML size: ${resumeYaml.length} bytes`);

    const prompt = prompts.resumeScoringTemplate
      .replace('{job_description}', jobDescription)
      .replace('{resume_yaml}', resumeYaml);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.info(`Scoring attempt ${attempt + 1}/${maxRetries + 1}`);
        }

        const scoresJson = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
        
        // Validate it's parseable JSON
        JSON.parse(scoresJson);
        
        log.info('Resume scoring completed successfully');
        return scoresJson;
        
      } catch (e) {
        log.warn(`Attempt ${attempt + 1}: Invalid JSON in scoring response: ${e}`);
        
        if (attempt < maxRetries) {
          log.info(`Retrying scoring (attempt ${attempt + 2}/${maxRetries + 1})`);
          continue;
        } else {
          log.error('All scoring retry attempts failed');
          throw new Error(`Failed to get valid JSON scores after ${maxRetries + 1} attempts: ${e}`);
        }
      }
    }
    
    throw new Error('Resume scoring failed unexpectedly');
  }

  /**
   * Optimize resume keywords and descriptions to match job description (Stage 4)
   * 
   * Adapts filtered resume to use job-specific terminology without changing
   * structure or facts. Integrates extracted keywords from Stage 1.
   */
  async optimizeResumeKeywords(
    jobDescription: string,
    filteredConfig: string,
    extractedKeywords: string = ''
  ): Promise<string> {
    log.info('Optimizing resume keywords for job');
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Filtered config size: ${filteredConfig.length} bytes`);

    const prompt = prompts.resumeKeywordOptimizationTemplate
      .replace('{job_description}', jobDescription)
      .replace('{filtered_config}', filteredConfig)
      .replace('{extracted_keywords}', extractedKeywords || '(No extracted keywords provided)');

    try {
      let optimizedConfig = await this.chatCompletion([{ role: 'user', content: prompt }], 0.5);
      
      // Clean up markdown code blocks if present
      if (optimizedConfig.trim().startsWith('```yaml')) {
        const lines = optimizedConfig.split('\n');
        let startIdx = 0;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('```yaml')) {
            startIdx = i + 1;
          } else if (lines[i].trim() === '```' && i > startIdx) {
            endIdx = i;
            break;
          }
        }
        optimizedConfig = lines.slice(startIdx, endIdx).join('\n');
      } else if (optimizedConfig.trim().startsWith('```')) {
        const lines = optimizedConfig.split('\n');
        let startIdx = 0;
        let endIdx = lines.length;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('```')) {
            if (startIdx === 0) {
              startIdx = i + 1;
            } else {
              endIdx = i;
              break;
            }
          }
        }
        optimizedConfig = lines.slice(startIdx, endIdx).join('\n');
      }
      
      log.info('Keyword optimization completed successfully');
      return optimizedConfig;
      
    } catch (e) {
      log.warn(`Failed to optimize resume keywords: ${e}`);
      log.debug('Returning filtered config as fallback');
      return filteredConfig;
    }
  }

  /**
   * Determine which resume section is relevant for a question
   */
  private async determineResumeSection(question: string): Promise<string> {
    const prompt = `For the following question: "${question}", which section of the resume is relevant?

Section Descriptions:
- Personal information: Name, location, contact details, professional title/headline
- Self Identification: Gender, pronouns, veteran status, disability status
- Legal Authorization: Work authorization, visa requirements, citizenship
- Work Preferences: Remote vs in-person, relocation willingness
- Education Details: Degrees, universities, academic background
- Experience Details: Work history, job titles, responsibilities, achievements
- Projects: Personal or professional projects, portfolio items
- Availability: Start date, notice period
- Salary Expectations: Expected compensation
- Certifications: Professional certifications, licenses
- Languages: Spoken/written languages and proficiency
- Interests: Career motivations, why interested in roles/companies
- Cover letter: Full narrative introduction for a job application

Special Routing Rules:
- Questions about 'why interested in this position/role/company' → Interests
- Questions about specific technical experience → Experience Details
- Questions about 'tell us about yourself' → Personal information
- Questions about remote work or office location → Work Preferences

Respond with ONLY ONE of these exact options (no markdown, no explanation):
Personal information
Self Identification
Legal Authorization
Work Preferences
Education Details
Experience Details
Projects
Availability
Salary Expectations
Certifications
Languages
Interests
Cover letter`;

    const response = await this.chatCompletion([{ role: 'user', content: prompt }], 0.3);
    
    // Clean up and normalize the response
    let section = response.trim().toLowerCase()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/ /g, '_');

    // Validate section name
    const validSections = [
      'personal_information', 'self_identification', 'legal_authorization',
      'work_preferences', 'education_details', 'experience_details',
      'projects', 'availability', 'salary_expectations', 'certifications',
      'languages', 'interests', 'cover_letter'
    ];

    if (!validSections.includes(section)) {
      // Try to find a partial match
      const match = validSections.find(s => section.includes(s) || s.includes(section));
      section = match || 'personal_information';
    }

    return section;
  }

  /**
   * Get the prompt template for a resume section
   */
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

  /**
   * Generate a cover letter
   */
  private async generateCoverLetter(): Promise<string> {
    const prompt = prompts.coverLetterTemplate
      .replace('{resume}', resumeToNarrative(this.resume!))
      .replace('{job_description}', this.jobDescription);

    return this.chatCompletion([{ role: 'user', content: prompt }]);
  }

  /**
   * Get a brief experience summary
   */
  private getExperienceSummary(): string {
    if (!this.resume?.experienceDetails?.length) {
      return '';
    }
    const recent = this.resume.experienceDetails[0];
    return `${recent.position} at ${recent.company}`;
  }

  /**
   * Find the best matching option using string similarity
   */
  private findBestMatch(text: string, options: string[]): string {
    const textLower = text.toLowerCase().trim();
    
    // Exact match
    const exact = options.find(o => o.toLowerCase() === textLower);
    if (exact) return exact;

    // Contains match
    const contains = options.find(o => 
      textLower.includes(o.toLowerCase()) || o.toLowerCase().includes(textLower)
    );
    if (contains) return contains;

    // Levenshtein distance (simple implementation)
    let bestOption = options[0];
    let bestDistance = Infinity;

    for (const option of options) {
      const distance = this.levenshteinDistance(textLower, option.toLowerCase());
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOption = option;
      }
    }

    return bestOption;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
