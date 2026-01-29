import { getResumeSection, resumeToNarrative } from "../models/resume.js";
import { createLogger } from "../utils/logger.js";
import { BackendAPIClient } from "./backend-client.js";
import { llmLogger } from "../utils/llm-logger.js";
import * as prompts from "./prompts/templates.js";
const log = createLogger("GPTAnswerer");
class GPTAnswerer {
  constructor(apiToken, apiUrl, reporter) {
    this.apiToken = apiToken;
    this.apiUrl = apiUrl;
    this.reporter = reporter;
    this.resume = null;
    this.job = null;
    this.client = new BackendAPIClient({
      token: apiToken,
      apiUrl,
      logRequests: true
    });
    log.info("GPTAnswerer initialized with backend API client");
  }
  /**
   * Set the resume for context
   */
  setResume(resume) {
    this.resume = resume;
    log.debug(`Resume set: ${resume.personalInformation.name} ${resume.personalInformation.surname}`);
  }
  /**
   * Set the current job being applied to
   */
  setJob(job) {
    this.job = job;
    log.debug(`Job set: ${job.title} at ${job.company}`);
  }
  /**
   * Get the current job description
   */
  get jobDescription() {
    return this.job?.description || "";
  }
  /**
   * Make a chat completion request to the backend API
   */
  async chatCompletion(messages, temperature = 0.8) {
    const maxRetries = 2;
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chatCompletion(messages, "gpt-4o-mini", temperature);
        llmLogger.logRequest(
          messages,
          response.content,
          response.usage,
          response.model,
          response.finish_reason
        );
        if (this.reporter) this.reporter.incrementCreditsUsed();
        return response.content;
      } catch (err) {
        lastErr = err;
        log.error(`Chat completion attempt ${attempt + 1} failed: ${String(err)}`);
        if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    log.error("All chat completion attempts failed");
    throw lastErr;
  }
  /**
   * Answer a question by selecting from multiple choice options (MATCHES PYTHON)
   */
  async answerFromOptions(question, options) {
    log.debug(`Answering from options: ${question}`);
    log.debug(`Options: ${options.join(", ")}`);
    const prompt = prompts.optionsTemplate.replace("{resume}", resumeToNarrative(this.resume)).replace("{question}", question).replace("{options}", options.join("\n"));
    const response = await this.chatCompletion([{ role: "user", content: prompt }]);
    const answer = response.trim();
    const bestMatch = this.findBestMatch(answer, options);
    log.info(`Answer: ${bestMatch}`);
    return bestMatch;
  }
  /**
   * Answer a question from options with retry after error (MATCHES PYTHON)
   */
  async answerFromOptionsWithRetry(question, options, previousAnswer, errorMessage) {
    log.debug(`Retrying answer: previous="${previousAnswer}", error="${errorMessage}"`);
    const prompt = `You previously answered a job application question incorrectly.

Question: ${question}

Your previous answer: ${previousAnswer}
Error received: ${errorMessage}

Available options:
${options.join("\n")}

Based on my resume:
${resumeToNarrative(this.resume)}

Please select a DIFFERENT option that addresses the error. Respond with ONLY the exact text of the chosen option.`;
    const response = await this.chatCompletion([{ role: "user", content: prompt }]);
    const answer = response.trim();
    return this.findBestMatch(answer, options);
  }
  /**
   * Answer a textual/open-ended question
   */
  async answerTextual(question) {
    log.debug(`Answering textual: ${question.substring(0, 50)}...`);
    const section = await this.determineResumeSection(question);
    log.debug(`Selected section: ${section}`);
    if (section === "cover_letter") {
      return this.generateCoverLetter();
    }
    const resumeSection = getResumeSection(this.resume, section);
    const template = this.getTemplateForSection(section);
    const prompt = template.replace("{resume_section}", resumeSection).replace("{question}", question).replace("{resume}", resumeToNarrative(this.resume)).replace("{job_description}", this.jobDescription).replace("{pronouns}", this.resume.selfIdentification.pronouns).replace("{experience_summary}", this.getExperienceSummary());
    const response = await this.chatCompletion([{ role: "user", content: prompt }]);
    log.info(`Textual answer length: ${response.length} chars`);
    return response.trim();
  }
  /**
   * Answer a textual question with retry after error
   */
  async answerTextualWithRetry(question, previousAnswer, errorMessage) {
    log.debug(`Retrying textual: previous answer failed with "${errorMessage}"`);
    const prompt = `I previously answered a job application question incorrectly.

Question: "${question}"

My previous answer: "${previousAnswer}"
Error received: "${errorMessage}"

Based on my resume:
${resumeToNarrative(this.resume)}

Your previous answer was REJECTED. Please provide a corrected answer that addresses the error.
Respond with only the answer (no explanation, just the text).`;
    const response = await this.chatCompletion([{ role: "user", content: prompt }]);
    return response.trim();
  }
  /**
   * Answer a numeric question (e.g., years of experience)
   */
  async answerNumeric(question, defaultValue = 3) {
    log.debug(`Answering numeric: ${question}`);
    const prompt = prompts.numericQuestionTemplate.replace("{resume}", resumeToNarrative(this.resume)).replace("{question}", question).replace("{default_experience}", String(defaultValue));
    const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
    const match = response.match(/\d+/);
    const result = match ? parseInt(match[0], 10) : defaultValue;
    log.info(`Numeric answer: ${result}`);
    return result;
  }
  /**
   * Answer a numeric question with retry after error (MATCHES PYTHON)
   */
  async answerNumericWithRetry(question, previousAnswer, errorMessage, defaultValue = 3) {
    log.debug(`Retrying numeric: previous="${previousAnswer}", error="${errorMessage}"`);
    const prompt = `You previously answered a numeric job application question incorrectly.

Question: ${question}

Your previous answer: ${previousAnswer}
Error received: ${errorMessage}

Based on my resume:
${resumeToNarrative(this.resume)}

Your previous answer was REJECTED. Please provide a corrected numeric answer that addresses the error message.
Respond with ONLY a number (no explanation, no text, just the number).`;
    const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
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
  async tailorResumeToJob(jobDescription, baseResumeYaml) {
    log.info("=== Starting 4-Stage Resume Tailoring Pipeline ===");
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Base resume YAML size: ${baseResumeYaml.length} bytes`);
    try {
      const stage1Start = Date.now();
      log.info("\u{1F50D} Stage 1: Extracting keywords from job description");
      const keywordsJson = await this.extractJobKeywords(jobDescription);
      const keywordsDict = JSON.parse(keywordsJson);
      const stage1Duration = (Date.now() - stage1Start) / 1e3;
      log.info(`\u2713 Stage 1 completed in ${stage1Duration.toFixed(2)}s`);
      const totalKeywords = Object.values(keywordsDict).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      log.info(`Extracted ${totalKeywords} keywords: ${keywordsDict.technical_skills?.length || 0} technical, ${keywordsDict.soft_skills?.length || 0} soft skills`);
      const stage2Start = Date.now();
      log.info("\u{1F3AF} Stage 2: Scoring resume items by relevance");
      const scoresJson = await this.scoreResumeForJob(jobDescription, baseResumeYaml);
      const stage2Duration = (Date.now() - stage2Start) / 1e3;
      log.info(`\u2713 Stage 2 completed in ${stage2Duration.toFixed(2)}s`);
      const stage4Start = Date.now();
      log.info("\u270D\uFE0F  Stage 4: Optimizing keywords and descriptions with target terms");
      const keywordsFormatted = `Technical Skills: ${keywordsDict.technical_skills?.join(", ") || ""}
Soft Skills: ${keywordsDict.soft_skills?.join(", ") || ""}
Domain Terms: ${keywordsDict.domain_terms?.join(", ") || ""}
Action Verbs: ${keywordsDict.action_verbs?.join(", ") || ""}`;
      const optimizedConfig = await this.optimizeResumeKeywords(
        jobDescription,
        baseResumeYaml,
        keywordsFormatted
      );
      const stage4Duration = (Date.now() - stage4Start) / 1e3;
      log.info(`\u2713 Stage 4 completed in ${stage4Duration.toFixed(2)}s`);
      const totalDuration = stage1Duration + stage2Duration + stage4Duration;
      log.info(`=== Pipeline completed in ${totalDuration.toFixed(2)}s ===`);
      return optimizedConfig;
    } catch (e) {
      log.warn(`New pipeline failed: ${e}`);
      log.info("\u26A0\uFE0F  Falling back to old single-prompt tailoring method");
      return this.tailorResumeOldMethod(jobDescription, baseResumeYaml);
    }
  }
  /**
   * Legacy single-prompt resume tailoring (fallback only)
   */
  async tailorResumeOldMethod(jobDescription, baseConfig) {
    log.info("Using legacy single-prompt tailoring");
    const prompt = prompts.resumeTailoringTemplate.replace("{job_description}", jobDescription).replace("{base_config}", baseConfig);
    try {
      let tailoredConfig = await this.chatCompletion([{ role: "user", content: prompt }], 0.5);
      if (tailoredConfig.trim().startsWith("```yaml")) {
        const lines = tailoredConfig.split("\n");
        let startIdx = 0;
        let endIdx = lines.length;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("```yaml")) {
            startIdx = i + 1;
          } else if (lines[i].trim() === "```" && i > startIdx) {
            endIdx = i;
            break;
          }
        }
        tailoredConfig = lines.slice(startIdx, endIdx).join("\n");
      } else if (tailoredConfig.trim().startsWith("```")) {
        const lines = tailoredConfig.split("\n");
        let startIdx = 0;
        let endIdx = lines.length;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("```")) {
            if (startIdx === 0) {
              startIdx = i + 1;
            } else {
              endIdx = i;
              break;
            }
          }
        }
        tailoredConfig = lines.slice(startIdx, endIdx).join("\n");
      }
      log.info("Resume tailoring completed successfully");
      return tailoredConfig;
    } catch (e) {
      log.warn(`Failed to tailor resume config: ${e}`);
      log.debug("Returning original config as fallback");
      return baseConfig;
    }
  }
  /**
   * Extract key terms from job description for resume optimization (Stage 1)
   * 
   * Identifies technical skills, soft skills, domain terms, and action verbs
   * for ATS optimization.
   */
  async extractJobKeywords(jobDescription, maxRetries = 2) {
    log.info("Extracting keywords from job description");
    log.debug(`Job description length: ${jobDescription.length} chars`);
    const prompt = prompts.jobKeywordExtractionTemplate.replace("{job_description}", jobDescription);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.info(`Keyword extraction attempt ${attempt + 1}/${maxRetries + 1}`);
        }
        const keywordsJson = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
        const keywordsDict = JSON.parse(keywordsJson);
        const requiredKeys = ["technical_skills", "soft_skills", "domain_terms", "action_verbs"];
        for (const key of requiredKeys) {
          if (!(key in keywordsDict)) {
            throw new Error(`Missing required key: ${key}`);
          }
        }
        for (const key of Object.keys(keywordsDict)) {
          if (Array.isArray(keywordsDict[key])) {
            keywordsDict[key] = [...new Set(keywordsDict[key])];
          }
        }
        log.info("Keyword extraction completed successfully");
        return JSON.stringify(keywordsDict, null, 2);
      } catch (e) {
        log.warn(`Attempt ${attempt + 1}: Invalid JSON in keyword response: ${e}`);
        if (attempt < maxRetries) {
          log.info(`Retrying keyword extraction (attempt ${attempt + 2}/${maxRetries + 1})`);
          continue;
        } else {
          log.error("All keyword extraction retry attempts failed");
          throw new Error(`Failed to extract valid keywords after ${maxRetries + 1} attempts: ${e}`);
        }
      }
    }
    throw new Error("Keyword extraction failed unexpectedly");
  }
  /**
   * Score all resume items by relevance to job description (Stage 2)
   * 
   * Uses lower temperature (0.3) for consistent scoring.
   * Returns JSON string with scores for all categories.
   */
  async scoreResumeForJob(jobDescription, resumeYaml, maxRetries = 2) {
    log.info("Scoring resume items for job relevance");
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Resume YAML size: ${resumeYaml.length} bytes`);
    const prompt = prompts.resumeScoringTemplate.replace("{job_description}", jobDescription).replace("{resume_yaml}", resumeYaml);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.info(`Scoring attempt ${attempt + 1}/${maxRetries + 1}`);
        }
        const scoresJson = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
        JSON.parse(scoresJson);
        log.info("Resume scoring completed successfully");
        return scoresJson;
      } catch (e) {
        log.warn(`Attempt ${attempt + 1}: Invalid JSON in scoring response: ${e}`);
        if (attempt < maxRetries) {
          log.info(`Retrying scoring (attempt ${attempt + 2}/${maxRetries + 1})`);
          continue;
        } else {
          log.error("All scoring retry attempts failed");
          throw new Error(`Failed to get valid JSON scores after ${maxRetries + 1} attempts: ${e}`);
        }
      }
    }
    throw new Error("Resume scoring failed unexpectedly");
  }
  /**
   * Optimize resume keywords and descriptions to match job description (Stage 4)
   * 
   * Adapts filtered resume to use job-specific terminology without changing
   * structure or facts. Integrates extracted keywords from Stage 1.
   */
  async optimizeResumeKeywords(jobDescription, filteredConfig, extractedKeywords = "") {
    log.info("Optimizing resume keywords for job");
    log.debug(`Job description length: ${jobDescription.length} chars`);
    log.debug(`Filtered config size: ${filteredConfig.length} bytes`);
    const prompt = prompts.resumeKeywordOptimizationTemplate.replace("{job_description}", jobDescription).replace("{filtered_config}", filteredConfig).replace("{extracted_keywords}", extractedKeywords || "(No extracted keywords provided)");
    try {
      let optimizedConfig = await this.chatCompletion([{ role: "user", content: prompt }], 0.5);
      if (optimizedConfig.trim().startsWith("```yaml")) {
        const lines = optimizedConfig.split("\n");
        let startIdx = 0;
        let endIdx = lines.length;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("```yaml")) {
            startIdx = i + 1;
          } else if (lines[i].trim() === "```" && i > startIdx) {
            endIdx = i;
            break;
          }
        }
        optimizedConfig = lines.slice(startIdx, endIdx).join("\n");
      } else if (optimizedConfig.trim().startsWith("```")) {
        const lines = optimizedConfig.split("\n");
        let startIdx = 0;
        let endIdx = lines.length;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith("```")) {
            if (startIdx === 0) {
              startIdx = i + 1;
            } else {
              endIdx = i;
              break;
            }
          }
        }
        optimizedConfig = lines.slice(startIdx, endIdx).join("\n");
      }
      log.info("Keyword optimization completed successfully");
      return optimizedConfig;
    } catch (e) {
      log.warn(`Failed to optimize resume keywords: ${e}`);
      log.debug("Returning filtered config as fallback");
      return filteredConfig;
    }
  }
  /**
   * Determine which resume section is relevant for a question
   */
  async determineResumeSection(question) {
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
- Questions about 'why interested in this position/role/company' \u2192 Interests
- Questions about specific technical experience \u2192 Experience Details
- Questions about 'tell us about yourself' \u2192 Personal information
- Questions about remote work or office location \u2192 Work Preferences

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
    const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
    let section = response.trim().toLowerCase().replace(/\*\*/g, "").replace(/\*/g, "").replace(/ /g, "_");
    const validSections = [
      "personal_information",
      "self_identification",
      "legal_authorization",
      "work_preferences",
      "education_details",
      "experience_details",
      "projects",
      "availability",
      "salary_expectations",
      "certifications",
      "languages",
      "interests",
      "cover_letter"
    ];
    if (!validSections.includes(section)) {
      const match = validSections.find((s) => section.includes(s) || s.includes(section));
      section = match || "personal_information";
    }
    return section;
  }
  /**
   * Get the prompt template for a resume section
   */
  getTemplateForSection(section) {
    const templates = {
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
      interests: prompts.interestsTemplate
    };
    return templates[section] || prompts.personalInformationTemplate;
  }
  /**
   * Generate a cover letter
   */
  async generateCoverLetter() {
    const prompt = prompts.coverLetterTemplate.replace("{resume}", resumeToNarrative(this.resume)).replace("{job_description}", this.jobDescription);
    return this.chatCompletion([{ role: "user", content: prompt }]);
  }
  /**
   * Get a brief experience summary
   */
  getExperienceSummary() {
    if (!this.resume?.experienceDetails?.length) {
      return "";
    }
    const recent = this.resume.experienceDetails[0];
    return `${recent.position} at ${recent.company}`;
  }
  /**
   * Find the best matching option using string similarity
   */
  findBestMatch(text, options) {
    const textLower = text.toLowerCase().trim();
    const exact = options.find((o) => o.toLowerCase() === textLower);
    if (exact) return exact;
    const contains = options.find(
      (o) => textLower.includes(o.toLowerCase()) || o.toLowerCase().includes(textLower)
    );
    if (contains) return contains;
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
  levenshteinDistance(a, b) {
    const matrix = [];
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
export {
  GPTAnswerer
};
//# sourceMappingURL=gpt-answerer.js.map
