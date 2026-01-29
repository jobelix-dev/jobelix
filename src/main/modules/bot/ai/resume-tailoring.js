import { createLogger } from "../utils/logger.js";
import { ResumeSectionScorer } from "../models/resume-scorer.js";
const log = createLogger("ResumeTailoring");
async function tailorResumePipeline(gptAnswerer, jobDescription, baseResumeYaml) {
  log.info("=== Starting 4-Stage Resume Tailoring Pipeline ===");
  log.debug(`Job description length: ${jobDescription.length} chars`);
  log.debug(`Base resume YAML size: ${baseResumeYaml.length} bytes`);
  try {
    const stage1Start = Date.now();
    log.info("\u{1F50D} Stage 1: Extracting keywords from job description");
    const keywordsJson = await gptAnswerer.extractJobKeywords(jobDescription);
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
    const scoresJson = await gptAnswerer.scoreResumeForJob(jobDescription, baseResumeYaml);
    const stage2Duration = (Date.now() - stage2Start) / 1e3;
    log.info(`\u2713 Stage 2 completed in ${stage2Duration.toFixed(2)}s`);
    const stage3Start = Date.now();
    log.info("\u{1F4CA} Stage 3: Filtering top items with special rules");
    const scorer = new ResumeSectionScorer(baseResumeYaml, jobDescription);
    scorer.parseScoresJson(scoresJson);
    scorer.convertToScoredItems(scorer.scoresDict);
    const { items: selectedItems, metrics } = scorer.filterTopItems({
      minScore: 40,
      minItems: 10,
      maxItems: 15,
      minWorkItems: 2,
      maxEducationItems: 5,
      educationMinScore: 50
    });
    const selectedSkills = scorer.getTopSkills(20);
    const filteredConfig = scorer.filterResumeYaml(selectedItems, selectedSkills);
    const stage3Duration = (Date.now() - stage3Start) / 1e3;
    log.info(`\u2713 Stage 3 completed in ${stage3Duration.toFixed(2)}s`);
    log.info(`Selected: ${metrics.itemsSelected} items (scores: ${metrics.minScore}-${metrics.maxScore}, avg: ${metrics.avgScore.toFixed(1)})`);
    log.info(`By category: ${JSON.stringify(metrics.selectionByCategory)}`);
    const stage4Start = Date.now();
    log.info("\u270D\uFE0F  Stage 4: Optimizing keywords and descriptions with target terms");
    const keywordsFormatted = formatKeywords(keywordsDict);
    const optimizedConfig = await gptAnswerer.optimizeResumeKeywords(
      jobDescription,
      filteredConfig,
      keywordsFormatted
    );
    const stage4Duration = (Date.now() - stage4Start) / 1e3;
    log.info(`\u2713 Stage 4 completed in ${stage4Duration.toFixed(2)}s`);
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
        scoreRange: `${metrics.minScore}-${metrics.maxScore}`
      }
    };
  } catch (error) {
    log.warn(`Pipeline failed: ${error}`);
    return {
      success: false,
      tailoredYaml: baseResumeYaml,
      error: String(error)
    };
  }
}
function formatKeywords(keywordsDict) {
  return `Technical Skills: ${keywordsDict.technical_skills?.join(", ") || ""}
Soft Skills: ${keywordsDict.soft_skills?.join(", ") || ""}
Domain Terms: ${keywordsDict.domain_terms?.join(", ") || ""}
Action Verbs: ${keywordsDict.action_verbs?.join(", ") || ""}`;
}
export {
  tailorResumePipeline
};
//# sourceMappingURL=resume-tailoring.js.map
