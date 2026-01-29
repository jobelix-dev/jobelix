import * as yaml from "js-yaml";
import { createLogger } from "../utils/logger.js";
const log = createLogger("ResumeScorer");
class ResumeSectionScorer {
  constructor(resumeYaml, jobDescription) {
    this.scoredItems = [];
    this.scoresDict = null;
    this.resumeYaml = resumeYaml;
    this.jobDescription = jobDescription;
    this.resumeData = yaml.load(resumeYaml);
    log.debug("ResumeScorer initialized");
  }
  /**
   * Parse LLM's JSON scores response
   */
  parseScoresJson(scoresJson) {
    try {
      let cleaned = scoresJson.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.split("```json")[1];
      }
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.split("```")[1];
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.split("```")[0];
      }
      cleaned = cleaned.trim();
      const scoresDict = JSON.parse(cleaned);
      const expectedCategories = ["work", "projects", "education", "certificates", "skills"];
      for (const category of expectedCategories) {
        if (!scoresDict[category]) {
          log.warn(`Category '${category}' missing from scores, using empty array`);
          scoresDict[category] = [];
        }
        for (const item of scoresDict[category]) {
          if (typeof item.index !== "number" || typeof item.score !== "number") {
            throw new Error(`Item in '${category}' missing 'index' or 'score' field: ${JSON.stringify(item)}`);
          }
        }
      }
      this.scoresDict = scoresDict;
      return scoresDict;
    } catch (error) {
      if (error instanceof SyntaxError) {
        log.error(`Failed to parse scores JSON: ${error.message}`);
        log.debug(`Raw JSON: ${scoresJson.substring(0, 500)}...`);
      } else {
        log.error(`Error processing scores: ${error}`);
      }
      throw error;
    }
  }
  /**
   * Convert raw scores dictionary to ScoredItem objects
   */
  convertToScoredItems(scoresDict) {
    const scoredItems = [];
    for (const [category, items] of Object.entries(scoresDict)) {
      let originalItems;
      if (category === "skills") {
        originalItems = [];
        const skillSections = this.resumeData.skills || [];
        for (const skillSection of skillSections) {
          if (skillSection.name === "Languages") {
            continue;
          }
          originalItems.push(...skillSection.keywords || []);
        }
      } else {
        originalItems = this.resumeData[category] || [];
      }
      for (const scoreItem of items) {
        const idx = scoreItem.index;
        if (idx >= originalItems.length) {
          log.warn(`Index ${idx} out of range for '${category}' (max: ${originalItems.length - 1}), skipping`);
          continue;
        }
        const originalData = originalItems[idx];
        scoredItems.push({
          category,
          index: idx,
          score: scoreItem.score,
          reasoning: scoreItem.reasoning || "No reasoning provided",
          originalData: typeof originalData === "object" ? originalData : { value: originalData },
          name: scoreItem.name
        });
      }
    }
    this.scoredItems = scoredItems;
    return scoredItems;
  }
  /**
   * Select top resume items using dynamic thresholds and proportional allocation
   */
  filterTopItems(options = {}) {
    const {
      minScore = 40,
      minItems = 10,
      maxItems = 15,
      proportions = { work: 0.65, projects: 0.3, certificates: 0.05 },
      minWorkItems = 2,
      maxEducationItems = 5,
      educationMinScore = 50
    } = options;
    log.info(`Filtering items: minScore=${minScore}, min=${minItems}, max=${maxItems}`);
    log.info(`Special rules: minWork=${minWorkItems}, maxEducation=${maxEducationItems}, educationThreshold=${educationMinScore}`);
    const nonSkillItems = this.scoredItems.filter((item) => item.category !== "skills");
    const educationItems = nonSkillItems.filter((item) => item.category === "education");
    const otherItems = nonSkillItems.filter((item) => item.category !== "education");
    const selectedEducation = this.filterEducationChronological(
      educationItems,
      maxEducationItems,
      educationMinScore
    );
    log.info(`Selected ${selectedEducation.length} education items (chronological + score-based)`);
    const otherItemsSorted = [...otherItems].sort((a, b) => b.score - a.score);
    let aboveThreshold = otherItemsSorted.filter((item) => item.score >= minScore);
    let belowThreshold = otherItemsSorted.filter((item) => item.score < minScore);
    log.debug(`Non-education items above threshold (${minScore}): ${aboveThreshold.length}`);
    log.debug(`Non-education items below threshold: ${belowThreshold.length}`);
    const workItemsAbove = aboveThreshold.filter((item) => item.category === "work");
    const workItemsBelow = belowThreshold.filter((item) => item.category === "work");
    const workItemsTotal = [...workItemsAbove, ...workItemsBelow];
    if (workItemsAbove.length < minWorkItems && workItemsTotal.length >= minWorkItems) {
      const deficit = minWorkItems - workItemsAbove.length;
      log.info(`Enforcing min ${minWorkItems} work items: adding ${deficit} below-threshold items`);
      const forcedWork = workItemsBelow.slice(0, deficit);
      aboveThreshold.push(...forcedWork);
      belowThreshold = belowThreshold.filter((item) => !forcedWork.includes(item));
    } else if (workItemsTotal.length < minWorkItems) {
      log.warn(`Only ${workItemsTotal.length} work items available, cannot reach min ${minWorkItems} - using all available`);
    }
    const targetMin = minItems - selectedEducation.length;
    let selectedItems;
    if (aboveThreshold.length < targetMin) {
      const deficit = targetMin - aboveThreshold.length;
      log.info(`Need ${deficit} more items to reach minimum of ${minItems} total`);
      selectedItems = [...aboveThreshold, ...belowThreshold.slice(0, deficit)];
    } else {
      selectedItems = aboveThreshold;
    }
    const targetMax = maxItems - selectedEducation.length;
    if (selectedItems.length > targetMax) {
      log.info(`Applying proportional allocation to limit to ${targetMax} non-education items`);
      selectedItems = this.applyProportionalAllocation(selectedItems, targetMax, proportions);
    }
    const allSelected = [...selectedItems, ...selectedEducation];
    const scores = allSelected.map((item) => item.score);
    const categoryCount = {};
    for (const item of allSelected) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }
    const metrics = {
      totalItemsScored: nonSkillItems.length,
      itemsSelected: allSelected.length,
      itemsRejected: nonSkillItems.length - allSelected.length,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      selectionByCategory: categoryCount
    };
    log.info(`Selected ${allSelected.length} items total: ${JSON.stringify(categoryCount)}`);
    log.info(`Score range: ${metrics.minScore}-${metrics.maxScore} (avg: ${metrics.avgScore.toFixed(1)})`);
    return { items: allSelected, metrics };
  }
  /**
   * Filter education items chronologically with score threshold
   */
  filterEducationChronological(educationItems, maxItems, minScore) {
    if (educationItems.length === 0) {
      log.debug("No education items to filter");
      return [];
    }
    let sortedItems = [...educationItems].sort((a, b) => b.score - a.score);
    try {
      const getEndDate = (item) => {
        const data = item.originalData;
        const endDate = data.endDate || "";
        if (!endDate || ["present", "current", "ongoing"].includes(endDate.toLowerCase())) {
          return "9999-12";
        }
        return endDate;
      };
      sortedItems = [...educationItems].sort((a, b) => {
        const dateA = getEndDate(a);
        const dateB = getEndDate(b);
        return dateB.localeCompare(dateA);
      });
      log.debug("Education sorted chronologically (newest first)");
    } catch (error) {
      log.debug(`Could not sort education by date (${error}), using score-based order`);
    }
    const selected = [];
    for (const item of sortedItems) {
      if (selected.length >= maxItems) {
        log.debug(`Reached max ${maxItems} education items`);
        break;
      }
      if (item.score < minScore && selected.length > 0) {
        log.debug(`Education item score ${item.score} below threshold ${minScore}, stopping`);
        break;
      }
      selected.push(item);
      log.debug(`Keeping education item (index=${item.index}, score=${item.score})`);
    }
    if (selected.length === 0 && educationItems.length > 0) {
      selected.push(sortedItems[0]);
      log.info(`All education below threshold, keeping highest-scored item (score=${selected[0].score})`);
    }
    return selected;
  }
  /**
   * Apply proportional allocation to limit items
   */
  applyProportionalAllocation(items, maxItems, proportions) {
    const byCategory = {};
    for (const item of items) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }
    for (const category in byCategory) {
      byCategory[category].sort((a, b) => b.score - a.score);
    }
    const allocations = {};
    let remainingSlots = maxItems;
    for (const [category, proportion] of Object.entries(proportions)) {
      if (!byCategory[category]) continue;
      let allocatedSlots = Math.floor(maxItems * proportion);
      allocatedSlots = Math.min(allocatedSlots, byCategory[category].length);
      allocations[category] = allocatedSlots;
      remainingSlots -= allocatedSlots;
    }
    while (remainingSlots > 0) {
      let bestCategory = null;
      let bestScore = -1;
      for (const [category, itemsInCat] of Object.entries(byCategory)) {
        const currentAllocation = allocations[category] || 0;
        if (currentAllocation < itemsInCat.length) {
          const nextItemScore = itemsInCat[currentAllocation].score;
          if (nextItemScore > bestScore) {
            bestScore = nextItemScore;
            bestCategory = category;
          }
        }
      }
      if (!bestCategory) break;
      allocations[bestCategory] = (allocations[bestCategory] || 0) + 1;
      remainingSlots--;
    }
    const selected = [];
    for (const [category, allocation] of Object.entries(allocations)) {
      selected.push(...byCategory[category].slice(0, allocation));
    }
    log.debug(`Proportional allocation: ${JSON.stringify(allocations)}`);
    return selected;
  }
  /**
   * Select top N skills based on scores
   */
  getTopSkills(limit = 20) {
    const skillItems = this.scoredItems.filter((item) => item.category === "skills");
    const sorted = [...skillItems].sort((a, b) => b.score - a.score);
    const selected = sorted.slice(0, limit);
    log.info(`Selected top ${selected.length} skills (limit: ${limit})`);
    if (selected.length > 0) {
      const scoreRange = `${selected[selected.length - 1].score}-${selected[0].score}`;
      log.debug(`Skill score range: ${scoreRange}`);
    }
    return selected;
  }
  /**
   * Construct filtered YAML with only selected items
   */
  filterResumeYaml(selectedItems, selectedSkills) {
    log.info("Building filtered resume YAML");
    const filteredData = yaml.load(this.resumeYaml);
    const byCategory = {};
    for (const item of selectedItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }
    for (const category of ["work", "projects", "education", "certificates"]) {
      if (byCategory[category]) {
        const itemsInCat = byCategory[category].sort((a, b) => a.index - b.index);
        const selectedIndices = new Set(itemsInCat.map((item) => item.index));
        const originalItems = filteredData[category] || [];
        const filtered = originalItems.filter((_, i) => selectedIndices.has(i));
        filteredData[category] = filtered;
        log.debug(`Filtered '${category}': ${originalItems.length} \u2192 ${filtered.length} items`);
      } else {
        filteredData[category] = [];
        log.debug(`No items selected from '${category}'`);
      }
    }
    if (selectedSkills.length > 0) {
      const selectedSkillNames = selectedSkills.map(
        (item) => item.name || item.originalData.value || ""
      );
      if (filteredData.skills) {
        for (const skillSection of filteredData.skills) {
          if (skillSection.name === "Languages") {
            continue;
          }
          const originalKeywords = skillSection.keywords || [];
          const filtered = originalKeywords.filter((kw) => selectedSkillNames.includes(kw));
          skillSection.keywords = filtered;
        }
        log.debug(`Filtered skills: ${selectedSkillNames.length} keywords`);
      }
    }
    const filteredYaml = yaml.dump(filteredData, { noRefs: true, sortKeys: false });
    log.info(`Filtered YAML generated: ${filteredYaml.length} bytes`);
    return filteredYaml;
  }
}
export {
  ResumeSectionScorer
};
//# sourceMappingURL=resume-scorer.js.map
