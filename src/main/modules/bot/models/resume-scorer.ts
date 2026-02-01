/**
 * Resume Scoring and Filtering Module
 * 
 * Implements intelligent resume item scoring and selection based on
 * job description relevance. Uses LLM-powered analysis to rank resume items.
 * 
 * Port of Python's src/resume/scorer.py
 */

import * as yaml from 'js-yaml';
import { createLogger } from '../utils/logger';

const log = createLogger('ResumeScorer');

/**
 * Container for a scored resume item
 */
export interface ScoredItem {
  category: 'work' | 'projects' | 'education' | 'certificates' | 'skills';
  index: number;
  score: number;
  reasoning: string;
  originalData: Record<string, unknown>;
  name?: string; // For skills only
}

/**
 * Metrics for resume selection process
 */
export interface SelectionMetrics {
  totalItemsScored: number;
  itemsSelected: number;
  itemsRejected: number;
  minScore: number;
  maxScore: number;
  avgScore: number;
  selectionByCategory: Record<string, number>;
}

/**
 * Raw scores from LLM
 */
export interface RawScores {
  work: RawScoreItem[];
  projects: RawScoreItem[];
  education: RawScoreItem[];
  certificates: RawScoreItem[];
  skills: RawScoreItem[];
}

export interface RawScoreItem {
  index: number;
  score: number;
  reasoning?: string;
  name?: string; // For skills
}

/**
 * Scores and filters resume items based on job description relevance
 */
export class ResumeSectionScorer {
  private resumeYaml: string;
  private jobDescription: string;
  private resumeData: Record<string, unknown>;
  public scoredItems: ScoredItem[] = [];
  public scoresDict: RawScores | null = null;

  constructor(resumeYaml: string, jobDescription: string) {
    this.resumeYaml = resumeYaml;
    this.jobDescription = jobDescription;
    this.resumeData = yaml.load(resumeYaml) as Record<string, unknown>;
    log.debug('ResumeScorer initialized');
  }

  /**
   * Parse LLM's JSON scores response
   */
  parseScoresJson(scoresJson: string): RawScores {
    try {
      // Clean up potential markdown wrappers
      let cleaned = scoresJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.split('```json')[1];
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('```')[1];
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.split('```')[0];
      }
      cleaned = cleaned.trim();

      const scoresDict = JSON.parse(cleaned) as RawScores;

      // Validate structure
      const expectedCategories: (keyof RawScores)[] = ['work', 'projects', 'education', 'certificates', 'skills'];
      for (const category of expectedCategories) {
        if (!scoresDict[category]) {
          log.warn(`Category '${category}' missing from scores, using empty array`);
          scoresDict[category] = [];
        }

        // Validate each item has required fields
        for (const item of scoresDict[category]) {
          if (typeof item.index !== 'number' || typeof item.score !== 'number') {
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
  convertToScoredItems(scoresDict: RawScores): ScoredItem[] {
    const scoredItems: ScoredItem[] = [];

    for (const [category, items] of Object.entries(scoresDict)) {
      // Get original data from resume
      let originalItems: unknown[];
      
      if (category === 'skills') {
        // Skills are nested in resume structure
        originalItems = [];
        const skillSections = (this.resumeData.skills || []) as Array<{ name?: string; keywords?: string[] }>;
        for (const skillSection of skillSections) {
          if (skillSection.name === 'Languages') {
            // Skip languages section
            continue;
          }
          originalItems.push(...(skillSection.keywords || []));
        }
      } else {
        originalItems = (this.resumeData[category] || []) as unknown[];
      }

      for (const scoreItem of items) {
        const idx = scoreItem.index;

        // Validate index
        if (idx >= originalItems.length) {
          log.warn(`Index ${idx} out of range for '${category}' (max: ${originalItems.length - 1}), skipping`);
          continue;
        }

        const originalData = originalItems[idx];

        scoredItems.push({
          category: category as ScoredItem['category'],
          index: idx,
          score: scoreItem.score,
          reasoning: scoreItem.reasoning || 'No reasoning provided',
          originalData: typeof originalData === 'object' && originalData !== null ? originalData as Record<string, unknown> : { value: originalData },
          name: scoreItem.name,
        });
      }
    }

    this.scoredItems = scoredItems;
    return scoredItems;
  }

  /**
   * Select top resume items using dynamic thresholds and proportional allocation
   */
  filterTopItems(options: {
    minScore?: number;
    minItems?: number;
    maxItems?: number;
    proportions?: Record<string, number>;
    minWorkItems?: number;
    maxEducationItems?: number;
    educationMinScore?: number;
  } = {}): { items: ScoredItem[]; metrics: SelectionMetrics } {
    const {
      minScore = 40,
      minItems = 10,
      maxItems = 15,
      proportions = { work: 0.65, projects: 0.30, certificates: 0.05 },
      minWorkItems = 2,
      maxEducationItems = 5,
      educationMinScore = 50,
    } = options;

    log.info(`Filtering items: minScore=${minScore}, min=${minItems}, max=${maxItems}`);
    log.info(`Special rules: minWork=${minWorkItems}, maxEducation=${maxEducationItems}, educationThreshold=${educationMinScore}`);

    // Separate skills and education from other categories
    const nonSkillItems = this.scoredItems.filter(item => item.category !== 'skills');
    const educationItems = nonSkillItems.filter(item => item.category === 'education');
    const otherItems = nonSkillItems.filter(item => item.category !== 'education');

    // Step 1: Handle education with chronological filtering
    const selectedEducation = this.filterEducationChronological(
      educationItems,
      maxEducationItems,
      educationMinScore
    );
    log.info(`Selected ${selectedEducation.length} education items (chronological + score-based)`);

    // Step 2: Sort other items by score (descending)
    const otherItemsSorted = [...otherItems].sort((a, b) => b.score - a.score);

    // Step 3: Apply min_score threshold
    const aboveThreshold = otherItemsSorted.filter(item => item.score >= minScore);
    let belowThreshold = otherItemsSorted.filter(item => item.score < minScore);

    log.debug(`Non-education items above threshold (${minScore}): ${aboveThreshold.length}`);
    log.debug(`Non-education items below threshold: ${belowThreshold.length}`);

    // Step 4: Enforce minimum work items (graceful degradation)
    const workItemsAbove = aboveThreshold.filter(item => item.category === 'work');
    const workItemsBelow = belowThreshold.filter(item => item.category === 'work');
    const workItemsTotal = [...workItemsAbove, ...workItemsBelow];

    if (workItemsAbove.length < minWorkItems && workItemsTotal.length >= minWorkItems) {
      const deficit = minWorkItems - workItemsAbove.length;
      log.info(`Enforcing min ${minWorkItems} work items: adding ${deficit} below-threshold items`);
      const forcedWork = workItemsBelow.slice(0, deficit);
      aboveThreshold.push(...forcedWork);
      belowThreshold = belowThreshold.filter(item => !forcedWork.includes(item));
    } else if (workItemsTotal.length < minWorkItems) {
      log.warn(`Only ${workItemsTotal.length} work items available, cannot reach min ${minWorkItems} - using all available`);
    }

    // Step 5: Ensure minimum total items (excluding education)
    const targetMin = minItems - selectedEducation.length;
    let selectedItems: ScoredItem[];
    
    if (aboveThreshold.length < targetMin) {
      const deficit = targetMin - aboveThreshold.length;
      log.info(`Need ${deficit} more items to reach minimum of ${minItems} total`);
      selectedItems = [...aboveThreshold, ...belowThreshold.slice(0, deficit)];
    } else {
      selectedItems = aboveThreshold;
    }

    // Step 6: Apply maximum limit with proportional allocation
    const targetMax = maxItems - selectedEducation.length;
    if (selectedItems.length > targetMax) {
      log.info(`Applying proportional allocation to limit to ${targetMax} non-education items`);
      selectedItems = this.applyProportionalAllocation(selectedItems, targetMax, proportions);
    }

    // Combine education with other selected items
    const allSelected = [...selectedItems, ...selectedEducation];

    // Calculate metrics
    const scores = allSelected.map(item => item.score);
    const categoryCount: Record<string, number> = {};
    for (const item of allSelected) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }

    const metrics: SelectionMetrics = {
      totalItemsScored: nonSkillItems.length,
      itemsSelected: allSelected.length,
      itemsRejected: nonSkillItems.length - allSelected.length,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      selectionByCategory: categoryCount,
    };

    log.info(`Selected ${allSelected.length} items total: ${JSON.stringify(categoryCount)}`);
    log.info(`Score range: ${metrics.minScore}-${metrics.maxScore} (avg: ${metrics.avgScore.toFixed(1)})`);

    return { items: allSelected, metrics };
  }

  /**
   * Filter education items chronologically with score threshold
   */
  private filterEducationChronological(
    educationItems: ScoredItem[],
    maxItems: number,
    minScore: number
  ): ScoredItem[] {
    if (educationItems.length === 0) {
      log.debug('No education items to filter');
      return [];
    }

    // Sort by score first (highest to lowest)
    let sortedItems = [...educationItems].sort((a, b) => b.score - a.score);

    // Try to parse dates and sort chronologically
    try {
      const getEndDate = (item: ScoredItem): string => {
        const data = item.originalData;
        const endDate = (data.endDate as string) || '';
        if (!endDate || ['present', 'current', 'ongoing'].includes(endDate.toLowerCase())) {
          return '9999-12'; // Sort current education first
        }
        return endDate;
      };

      sortedItems = [...educationItems].sort((a, b) => {
        const dateA = getEndDate(a);
        const dateB = getEndDate(b);
        return dateB.localeCompare(dateA); // Descending (newest first)
      });
      log.debug('Education sorted chronologically (newest first)');
    } catch (error) {
      log.debug(`Could not sort education by date (${error}), using score-based order`);
    }

    // Select items up to maxItems, stopping when score drops below threshold
    const selected: ScoredItem[] = [];
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

    // Ensure at least 1 education if any exist
    if (selected.length === 0 && educationItems.length > 0) {
      selected.push(sortedItems[0]);
      log.info(`All education below threshold, keeping highest-scored item (score=${selected[0].score})`);
    }

    return selected;
  }

  /**
   * Apply proportional allocation to limit items
   */
  private applyProportionalAllocation(
    items: ScoredItem[],
    maxItems: number,
    proportions: Record<string, number>
  ): ScoredItem[] {
    // Group by category
    const byCategory: Record<string, ScoredItem[]> = {};
    for (const item of items) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }

    // Sort within each category by score
    for (const category in byCategory) {
      byCategory[category].sort((a, b) => b.score - a.score);
    }

    // Calculate allocations
    const allocations: Record<string, number> = {};
    let remainingSlots = maxItems;

    for (const [category, proportion] of Object.entries(proportions)) {
      if (!byCategory[category]) continue;

      let allocatedSlots = Math.floor(maxItems * proportion);
      // Don't allocate more than available
      allocatedSlots = Math.min(allocatedSlots, byCategory[category].length);
      allocations[category] = allocatedSlots;
      remainingSlots -= allocatedSlots;
    }

    // Distribute remaining slots to categories with available items
    while (remainingSlots > 0) {
      let bestCategory: string | null = null;
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

    // Select items according to allocations
    const selected: ScoredItem[] = [];
    for (const [category, allocation] of Object.entries(allocations)) {
      selected.push(...byCategory[category].slice(0, allocation));
    }

    log.debug(`Proportional allocation: ${JSON.stringify(allocations)}`);
    return selected;
  }

  /**
   * Select top N skills based on scores
   */
  getTopSkills(limit: number = 20): ScoredItem[] {
    const skillItems = this.scoredItems.filter(item => item.category === 'skills');
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
  filterResumeYaml(selectedItems: ScoredItem[], selectedSkills: ScoredItem[]): string {
    log.info('Building filtered resume YAML');

    // Deep copy original resume data
    const filteredData = yaml.load(this.resumeYaml) as Record<string, unknown>;

    // Group selected items by category
    const byCategory: Record<string, ScoredItem[]> = {};
    for (const item of selectedItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }

    // Filter each category
    for (const category of ['work', 'projects', 'education', 'certificates']) {
      if (byCategory[category]) {
        // Sort by original index to maintain chronological order
        const itemsInCat = byCategory[category].sort((a, b) => a.index - b.index);
        const selectedIndices = new Set(itemsInCat.map(item => item.index));

        // Keep only selected items
        const originalItems = (filteredData[category] || []) as unknown[];
        const filtered = originalItems.filter((_: unknown, i: number) => selectedIndices.has(i));
        filteredData[category] = filtered;

        log.debug(`Filtered '${category}': ${originalItems.length} → ${filtered.length} items`);
      } else {
        // No items selected from this category
        filteredData[category] = [];
        log.debug(`No items selected from '${category}'`);
      }
    }

    // Filter skills
    if (selectedSkills.length > 0) {
      const selectedSkillNames = selectedSkills.map(
        item => item.name || item.originalData.value || ''
      );

      if (filteredData.skills) {
        for (const skillSection of filteredData.skills as Array<{ name?: string; keywords?: string[] }>) {
          if (skillSection.name === 'Languages') {
            // Don't filter language skills
            continue;
          }
          const originalKeywords = skillSection.keywords || [];
          const filtered = originalKeywords.filter((kw: string) => selectedSkillNames.includes(kw));
          skillSection.keywords = filtered;
        }

        log.debug(`Filtered skills: ${selectedSkillNames.length} keywords`);
      }
    }

    // Convert back to YAML
    const filteredYaml = yaml.dump(filteredData, { noRefs: true, sortKeys: false });
    log.info(`Filtered YAML generated: ${filteredYaml.length} bytes`);

    return filteredYaml;
  }
}
