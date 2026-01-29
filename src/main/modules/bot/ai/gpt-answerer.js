import { getResumeSection, resumeToNarrative } from "../models/resume.js";
import { tailorResumePipeline } from "./resume-tailoring.js";
import { createLogger } from "../utils/logger.js";
import { BackendAPIClient } from "./backend-client.js";
import { llmLogger } from "../utils/llm-logger.js";
import * as prompts from "./prompts/templates.js";
const log = createLogger("GPTAnswerer");
function stripMarkdownCodeBlock(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return text;
  const lines = trimmed.split("\n");
  let startIdx = 0, endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("```")) {
      if (startIdx === 0) startIdx = i + 1;
      else {
        endIdx = i;
        break;
      }
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}
class GPTAnswerer {
  constructor(apiToken, apiUrl, reporter) {
    this.apiToken = apiToken;
    this.apiUrl = apiUrl;
    this.reporter = reporter;
    // Public resume field - accessed by field handlers for smart matching
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
  /** Make a chat completion request with automatic retry */
  async chatCompletion(messages, temperature = 0.8) {
    const maxRetries = 2;
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chatCompletion(messages, "gpt-4o-mini", temperature);
        llmLogger.logRequest(messages, response.content, response.usage, response.model, response.finish_reason);
        if (this.reporter) this.reporter.incrementCreditsUsed();
        return response.content;
      } catch (err) {
        lastErr = err;
        log.error(`Chat completion attempt ${attempt + 1} failed: ${String(err)}`);
        if (attempt === 0) log.error(`Backend URL: ${this.apiUrl}`);
        if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    log.error(`All chat completion attempts failed. Verify backend at: ${this.apiUrl}`);
    throw lastErr;
  }
  /** Generic JSON retry helper for GPT responses */
  async chatCompletionWithJsonValidation(prompt, validator, temperature = 0.3, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.chatCompletion([{ role: "user", content: prompt }], temperature);
        const parsed = JSON.parse(response);
        if (validator(parsed)) return parsed;
        throw new Error("Validation failed");
      } catch (e) {
        log.warn(`JSON attempt ${attempt + 1}/${maxRetries + 1} failed: ${e}`);
        if (attempt >= maxRetries) throw new Error(`Failed after ${maxRetries + 1} attempts: ${e}`);
      }
    }
    throw new Error("Unexpected failure");
  }
  /** Answer from multiple choice options */
  async answerFromOptions(question, options) {
    log.debug(`Answering from options: ${question}`);
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
   * Answer a checkbox/multiple-choice question directly (no section routing)
   * 
   * Used for questions like "How did you hear about us?" where the answer
   * is NOT based on resume content but rather a simple selection.
   * 
   * MATCHES PYTHON: answer_question_textual_wide_range with direct prompt
   */
  async answerCheckboxQuestion(prompt) {
    log.debug(`Answering checkbox question: ${prompt.substring(0, 50)}...`);
    const response = await this.chatCompletion([{ role: "user", content: prompt }]);
    log.info(`Checkbox answer: ${response.trim()}`);
    return response.trim();
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
    const result = await tailorResumePipeline(this, jobDescription, baseResumeYaml);
    if (result.success) {
      return result.tailoredYaml;
    }
    log.info("\u26A0\uFE0F  Falling back to old single-prompt tailoring method");
    return this.tailorResumeOldMethod(jobDescription, baseResumeYaml);
  }
  /**
   * Legacy single-prompt resume tailoring (fallback only)
   */
  async tailorResumeOldMethod(jobDescription, baseConfig) {
    log.info("Using legacy single-prompt tailoring");
    const prompt = prompts.resumeTailoringTemplate.replace("{job_description}", jobDescription).replace("{base_config}", baseConfig);
    try {
      const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.5);
      const tailoredConfig = stripMarkdownCodeBlock(response);
      log.info("Resume tailoring completed successfully");
      return tailoredConfig;
    } catch (e) {
      log.warn(`Failed to tailor resume config: ${e}`);
      log.debug("Returning original config as fallback");
      return baseConfig;
    }
  }
  /** Extract key terms from job description (Stage 1) */
  async extractJobKeywords(jobDescription) {
    log.info("Extracting keywords from job description");
    const prompt = prompts.jobKeywordExtractionTemplate.replace("{job_description}", jobDescription);
    const requiredKeys = ["technical_skills", "soft_skills", "domain_terms", "action_verbs"];
    const result = await this.chatCompletionWithJsonValidation(
      prompt,
      (dict) => requiredKeys.every((key) => key in dict),
      0.3
    );
    for (const key of Object.keys(result)) {
      if (Array.isArray(result[key])) result[key] = [...new Set(result[key])];
    }
    log.info("Keyword extraction completed");
    return JSON.stringify(result, null, 2);
  }
  /** Score resume items by job relevance (Stage 2) */
  async scoreResumeForJob(jobDescription, resumeYaml) {
    log.info("Scoring resume items for job relevance");
    const prompt = prompts.resumeScoringTemplate.replace("{job_description}", jobDescription).replace("{resume_yaml}", resumeYaml);
    const result = await this.chatCompletionWithJsonValidation(
      prompt,
      () => true,
      // Any valid JSON is acceptable
      0.3
    );
    log.info("Resume scoring completed");
    return JSON.stringify(result);
  }
  /** Optimize resume keywords for job (Stage 4) */
  async optimizeResumeKeywords(jobDescription, filteredConfig, extractedKeywords = "") {
    log.info("Optimizing resume keywords");
    const prompt = prompts.resumeKeywordOptimizationTemplate.replace("{job_description}", jobDescription).replace("{filtered_config}", filteredConfig).replace("{extracted_keywords}", extractedKeywords || "(none)");
    try {
      const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.8);
      return stripMarkdownCodeBlock(response);
    } catch (e) {
      log.warn(`Keyword optimization failed: ${e}`);
      return filteredConfig;
    }
  }
  /** Determine which resume section is relevant for a question */
  async determineResumeSection(question) {
    const prompt = `For the question: "${question}", which resume section is relevant?

Sections: Personal information, Self Identification, Legal Authorization, Work Preferences,
Education Details, Experience Details, Projects, Availability, Salary Expectations,
Certifications, Languages, Interests, Cover letter

Routing: 'why interested' \u2192 Interests | technical experience \u2192 Experience Details | 
'about yourself' \u2192 Personal information | remote/office \u2192 Work Preferences

Respond with ONLY the section name.`;
    const response = await this.chatCompletion([{ role: "user", content: prompt }], 0.3);
    let section = response.trim().toLowerCase().replace(/\*\*/g, "").replace(/ /g, "_");
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
      section = validSections.find((s) => section.includes(s) || s.includes(section)) || "personal_information";
    }
    return section;
  }
  /** Get prompt template for a resume section */
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
  /** Generate a cover letter */
  async generateCoverLetter() {
    const prompt = prompts.coverLetterTemplate.replace("{resume}", resumeToNarrative(this.resume)).replace("{job_description}", this.jobDescription);
    return this.chatCompletion([{ role: "user", content: prompt }]);
  }
  /** Get brief experience summary */
  getExperienceSummary() {
    if (!this.resume?.experienceDetails?.length) return "";
    const recent = this.resume.experienceDetails[0];
    return `${recent.position} at ${recent.company}`;
  }
  /** Find best matching option using string similarity */
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
