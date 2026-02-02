/**
 * Resume Tailoring Pipeline
 * 
 * Implements the 4-stage resume tailoring pipeline that matches the Python bot.
 * Extracted from gpt-answerer.ts for better modularity.
 * 
 * Pipeline stages:
 * 1. Extract keywords from job description
 * 2. Score all resume items by relevance  
 * 3. Filter top items with dynamic thresholds
 * 4. Optimize keywords in filtered resume
 */

import { createLogger } from '../utils/logger';
import { ResumeSectionScorer } from '../models/resume-scorer';
import type { GPTAnswerer } from './gpt-answerer';

const log = createLogger('ResumeTailoring');

export interface TailoringResult {
  success: boolean;
  tailoredYaml: string;
  metrics?: {
    stage1Duration: number;
    stage2Duration: number;
    stage3Duration: number;
    stage4Duration: number;
    totalDuration: number;
    itemsSelected: number;
    scoreRange: string;
  };
  error?: string;
}

export interface KeywordsDict {
  technical_skills: string[];
  soft_skills: string[];
  domain_terms: string[];
  action_verbs: string[];
}

/**
 * Execute the 4-stage resume tailoring pipeline
 * 
 * @param gptAnswerer - GPT answerer instance for LLM calls
 * @param jobDescription - Job description text
 * @param baseResumeYaml - Base resume in YAML format
 * @returns Tailored resume YAML or original on failure
 */
export async function tailorResumePipeline(
  gptAnswerer: GPTAnswerer,
  jobDescription: string,
  baseResumeYaml: string
): Promise<TailoringResult> {
  log.info('=== Starting 4-Stage Resume Tailoring Pipeline ===');
  log.debug(`Job description length: ${jobDescription.length} chars`);
  log.debug(`Base resume YAML size: ${baseResumeYaml.length} bytes`);

  try {
    // === STAGE 1: Extract keywords from job description ===
    const stage1Start = Date.now();
    log.info('🔍 Stage 1: Extracting keywords from job description');
    
    const keywordsJson = await gptAnswerer.extractJobKeywords(jobDescription);
    const keywordsDict = JSON.parse(keywordsJson) as KeywordsDict;
    
    const stage1Duration = (Date.now() - stage1Start) / 1000;
    log.info(`✓ Stage 1 completed in ${stage1Duration.toFixed(2)}s`);
    
    const totalKeywords = Object.values(keywordsDict).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
    );
    log.info(`Extracted ${totalKeywords} keywords: ${keywordsDict.technical_skills?.length || 0} technical, ${keywordsDict.soft_skills?.length || 0} soft skills`);

    // === STAGE 2: Score all resume items ===
    const stage2Start = Date.now();
    log.info('🎯 Stage 2: Scoring resume items by relevance');
    
    const scoresJson = await gptAnswerer.scoreResumeForJob(jobDescription, baseResumeYaml);
    
    const stage2Duration = (Date.now() - stage2Start) / 1000;
    log.info(`✓ Stage 2 completed in ${stage2Duration.toFixed(2)}s`);

    // === STAGE 3: Filter top items ===
    const stage3Start = Date.now();
    log.info('📊 Stage 3: Filtering top items with special rules');
    
    const scorer = new ResumeSectionScorer(baseResumeYaml, jobDescription);
    scorer.parseScoresJson(scoresJson);
    scorer.convertToScoredItems(scorer.scoresDict!);
    
    // Apply enhanced filtering (matches Python's settings)
    const { items: selectedItems, metrics } = scorer.filterTopItems({
      minScore: 40,
      minItems: 10,
      maxItems: 15,
      minWorkItems: 2,
      maxEducationItems: 5,
      educationMinScore: 50,
    });
    
    // Select top skills
    const selectedSkills = scorer.getTopSkills(20);
    
    // Build filtered YAML
    const filteredConfig = scorer.filterResumeYaml(selectedItems, selectedSkills);
    
    const stage3Duration = (Date.now() - stage3Start) / 1000;
    log.info(`✓ Stage 3 completed in ${stage3Duration.toFixed(2)}s`);
    log.info(`Selected: ${metrics.itemsSelected} items (scores: ${metrics.minScore}-${metrics.maxScore}, avg: ${metrics.avgScore.toFixed(1)})`);
    log.info(`By category: ${JSON.stringify(metrics.selectionByCategory)}`);

    // === STAGE 4: Optimize keywords ===
    const stage4Start = Date.now();
    log.info('✍️  Stage 4: Optimizing keywords and descriptions with target terms');
    
    const keywordsFormatted = formatKeywords(keywordsDict);
    const optimizedConfig = await gptAnswerer.optimizeResumeKeywords(
      jobDescription,
      filteredConfig,
      keywordsFormatted
    );
    
    const stage4Duration = (Date.now() - stage4Start) / 1000;
    log.info(`✓ Stage 4 completed in ${stage4Duration.toFixed(2)}s`);
    
    const totalDuration = stage1Duration + stage2Duration + stage3Duration + stage4Duration;
    log.info(`=== Pipeline completed in ${totalDuration.toFixed(2)}s (S1: ${stage1Duration.toFixed(1)}s | S2: ${stage2Duration.toFixed(1)}s | S3: ${stage3Duration.toFixed(1)}s | S4: ${stage4Duration.toFixed(1)}s) ===`);
    
    return {
      success: true,
      tailoredYaml: optimizedConfig,
      metrics: {
        stage1Duration,
        stage2Duration,
        stage3Duration,
        stage4Duration,
        totalDuration,
        itemsSelected: metrics.itemsSelected,
        scoreRange: `${metrics.minScore}-${metrics.maxScore}`,
      },
    };
    
  } catch (error) {
    log.warn(`Pipeline failed: ${error}`);
    return {
      success: false,
      tailoredYaml: baseResumeYaml,
      error: String(error),
    };
  }
}

/**
 * Format keywords dictionary for prompt
 */
function formatKeywords(keywordsDict: KeywordsDict): string {
  return `Technical Skills: ${keywordsDict.technical_skills?.join(', ') || ''}
Soft Skills: ${keywordsDict.soft_skills?.join(', ') || ''}
Domain Terms: ${keywordsDict.domain_terms?.join(', ') || ''}
Action Verbs: ${keywordsDict.action_verbs?.join(', ') || ''}`;
}
