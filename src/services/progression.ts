import { FrequencyBand, VocabularyItem, WordProgress, LevelProgression } from '../types';
import { MOCK_VOCABULARY } from '../data/vocabulary';

export const DEFAULT_MASTERY_STREAK_THRESHOLD = 7;
export const UNLOCK_THRESHOLD_RATIO = 0.80; // 80% cumulative threshold

export interface LevelDefinition {
  levelNumber: number;
  band: FrequencyBand;
  name: string;
  rankRange: string;
  minRank: number;
  maxRank: number;
  cumulativeTargetRank: number;
  description: string;
}

export const LEVELS_CONFIG: LevelDefinition[] = [
  {
    levelNumber: 1,
    band: 'ESSENTIAL',
    name: 'ESSENTIAL',
    rankRange: 'Ranks 1–500',
    minRank: 1,
    maxRank: 500,
    cumulativeTargetRank: 500,
    description: 'High-frequency structural core and fundamental verbs/nouns forming the foundation of French.',
  },
  {
    levelNumber: 2,
    band: 'FOUNDATION',
    name: 'FOUNDATION',
    rankRange: 'Ranks 501–1,000',
    minRank: 501,
    maxRank: 1000,
    cumulativeTargetRank: 1000,
    description: 'Everyday conversational framework, routine interactions, and contextual modifiers.',
  },
  {
    levelNumber: 3,
    band: 'EVERYDAY',
    name: 'EVERYDAY',
    rankRange: 'Ranks 1,001–1,500',
    minRank: 1001,
    maxRank: 1500,
    cumulativeTargetRank: 1500,
    description: 'Workplace exchanges, social discourse, media consumption, and descriptive nuance.',
  },
  {
    levelNumber: 4,
    band: 'INDEPENDENT',
    name: 'INDEPENDENT',
    rankRange: 'Ranks 1,501–2,000',
    minRank: 1501,
    maxRank: 2000,
    cumulativeTargetRank: 2000,
    description: 'Autonomous reasoning, French press, formal essays, and articulate debate structures.',
  },
  {
    levelNumber: 5,
    band: 'ADVANCED CORE',
    name: 'ADVANCED CORE',
    rankRange: 'Ranks 2,001–2,500',
    minRank: 2001,
    maxRank: 2500,
    cumulativeTargetRank: 2500,
    description: 'Sophisticated literary prose, precise conceptual terminology, and mastery of the 2,500 core.',
  },
];

/**
 * Determine a word's mastery level strictly based on its current successful recall streak
 * and total attempts.
 */
export function calculateWordMasteryLevel(
  currentStreak: number,
  totalAttempts: number,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): 'new' | 'learning' | 'reviewing' | 'mastered' {
  if (totalAttempts === 0) return 'new';
  if (currentStreak >= masteryThreshold) return 'mastered';
  // Reviewing threshold is ~40% of the mastery streak (e.g. 3 recalls when threshold is 7)
  const reviewingThreshold = Math.max(2, Math.ceil(masteryThreshold * 0.4));
  if (currentStreak >= reviewingThreshold) return 'reviewing';
  return 'learning';
}

/**
 * Derives comprehensive progression status for all 5 cumulative levels.
 * This is the single source of truth across the entire app.
 */
export function getCumulativeLevelsProgression(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): LevelProgression[] {
  const result: LevelProgression[] = [];
  
  let runningCumulativeMastered = 0;
  let runningCumulativeTotal = 0;
  let hasFoundActiveLevel = false;

  for (let i = 0; i < LEVELS_CONFIG.length; i++) {
    const config = LEVELS_CONFIG[i];
    const wordsInLevel = vocabulary.filter(
      (w) => w.frequencyBand === config.band && w.rank >= config.minRank && w.rank <= config.maxRank
    );
    const totalWordsInLevel = wordsInLevel.length;

    let masteredCount = 0;
    wordsInLevel.forEach((w) => {
      const p = progressMap[w.id];
      if (p) {
        // Evaluate with configurable threshold
        const isMastered = p.currentStreak >= masteryThreshold || p.mastery === 'mastered';
        if (isMastered) masteredCount++;
      }
    });

    const unmasteredCount = Math.max(0, totalWordsInLevel - masteredCount);
    const masteryPercentage = totalWordsInLevel > 0 
      ? Math.round((masteredCount / totalWordsInLevel) * 100) 
      : 0;

    // Unlock Rule:
    // Level 1 is always unlocked.
    // Level N unlocks when 80% of cumulative vocabulary in levels 1 through N-1 is mastered.
    let isUnlocked = false;
    let unlockRequiredMasteredCount = 0;
    let wordsNeededToUnlock = 0;
    let unlockProgressPercentage = 100;

    if (config.levelNumber === 1) {
      isUnlocked = true;
    } else {
      // Required cumulative mastered in prior levels
      unlockRequiredMasteredCount = Math.ceil(runningCumulativeTotal * UNLOCK_THRESHOLD_RATIO);
      isUnlocked = runningCumulativeTotal === 0 || runningCumulativeMastered >= unlockRequiredMasteredCount;
      wordsNeededToUnlock = Math.max(0, unlockRequiredMasteredCount - runningCumulativeMastered);
      unlockProgressPercentage = unlockRequiredMasteredCount > 0
        ? Math.min(100, Math.round((runningCumulativeMastered / unlockRequiredMasteredCount) * 100))
        : 100;
    }

    // Cumulative stats including this level
    const cumulativeTotalWords = runningCumulativeTotal + totalWordsInLevel;
    const cumulativeMasteredCount = runningCumulativeMastered + masteredCount;
    const cumulativeMasteryPercentage = cumulativeTotalWords > 0
      ? Math.round((cumulativeMasteredCount / cumulativeTotalWords) * 100)
      : 0;

    const isComplete = totalWordsInLevel > 0 && masteredCount === totalWordsInLevel;

    // Active level: the earliest unlocked level that has not reached 100% completion
    let isCurrentActiveLevel = false;
    if (isUnlocked && !isComplete && !hasFoundActiveLevel) {
      isCurrentActiveLevel = true;
      hasFoundActiveLevel = true;
    }

    result.push({
      levelNumber: config.levelNumber,
      band: config.band,
      name: config.name,
      rankRange: config.rankRange,
      minRank: config.minRank,
      maxRank: config.maxRank,
      cumulativeTargetRank: config.cumulativeTargetRank,
      isUnlocked,
      isComplete,
      isCurrentActiveLevel,
      masteredCount,
      totalWordsInLevel,
      masteryPercentage,
      unmasteredCount,
      cumulativeMasteredCount,
      cumulativeTotalWords,
      cumulativeMasteryPercentage,
      unlockRequiredMasteredCount,
      wordsNeededToUnlock,
      unlockProgressPercentage,
    });

    // Accumulate for the next level's unlock requirement
    runningCumulativeTotal += totalWordsInLevel;
    runningCumulativeMastered += masteredCount;
  }

  // If all are complete, set Level 5 as active
  if (!hasFoundActiveLevel && result.length > 0) {
    result[result.length - 1].isCurrentActiveLevel = true;
  }

  return result;
}

/**
 * Check if a specific level is unlocked
 */
export function isLevelUnlocked(
  levelNumber: number,
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): boolean {
  const levels = getCumulativeLevelsProgression(progressMap, vocabulary, masteryThreshold);
  const target = levels.find((l) => l.levelNumber === levelNumber);
  return target ? target.isUnlocked : false;
}

/**
 * Check if a specific vocabulary word belongs to an unlocked level
 */
export function isWordUnlocked(
  word: VocabularyItem,
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): boolean {
  const config = LEVELS_CONFIG.find((c) => c.band === word.frequencyBand);
  if (!config) return true;
  return isLevelUnlocked(config.levelNumber, progressMap, vocabulary, masteryThreshold);
}

/**
 * THE WEAK WORDS POOL:
 * Vocabulary items from unlocked levels that have NOT yet reached MASTERED status.
 * Can optionally be filtered to a specific level or frequency band.
 */
export function getWeakWords(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  filterLevelOrBand?: number | FrequencyBand,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): VocabularyItem[] {
  const levels = getCumulativeLevelsProgression(progressMap, vocabulary, masteryThreshold);
  const unlockedBands = new Set(levels.filter((l) => l.isUnlocked).map((l) => l.band));

  return vocabulary.filter((item) => {
    // Must belong to an unlocked level
    if (!unlockedBands.has(item.frequencyBand)) return false;

    // Optional level/band filter
    if (typeof filterLevelOrBand === 'number') {
      const levelCfg = LEVELS_CONFIG.find((c) => c.levelNumber === filterLevelOrBand);
      if (levelCfg && (item.frequencyBand !== levelCfg.band || item.rank < levelCfg.minRank || item.rank > levelCfg.maxRank)) return false;
    } else if (typeof filterLevelOrBand === 'string') {
      if (item.frequencyBand !== filterLevelOrBand) return false;
    }

    const p = progressMap[item.id];
    // Only words that have entered the learning system (attempted at least once)
    if (!p || !p.totalAttempts || p.totalAttempts === 0 || p.mastery === 'new') return false;
    const isMastered = p.currentStreak >= masteryThreshold || p.mastery === 'mastered';
    return !isMastered;
  }).sort((a, b) => {
    // Priority: lowest streak first, then lower consecutive correct
    const streakA = progressMap[a.id]?.currentStreak ?? 0;
    const streakB = progressMap[b.id]?.currentStreak ?? 0;
    if (streakA !== streakB) return streakA - streakB;
    return a.rank - b.rank;
  });
}

/**
 * THE NEW WORD QUEUE:
 * Words from unlocked levels that have NEVER been learned before (totalAttempts === 0 and mastery === 'new').
 * 
 * CRITICAL RULE:
 * New vocabulary MUST be introduced in strict frequency-rank order within the currently unlocked range.
 * The app must always select the LOWEST-RANKED eligible vocabulary item that has never been learned.
 * E.g., if #1–#30 have been encountered, and #31 is still new, then #31 MUST be selected.
 * When Level 2 unlocks, the new-word queue continues from the beginning of the newly unlocked range (#501, #502...).
 */
export function getNewWords(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  filterLevelOrBand?: number | FrequencyBand,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): VocabularyItem[] {
  const levels = getCumulativeLevelsProgression(progressMap, vocabulary, masteryThreshold);
  const unlockedBands = new Set(levels.filter((l) => l.isUnlocked).map((l) => l.band));

  return vocabulary
    .filter((item) => {
      if (!unlockedBands.has(item.frequencyBand)) return false;

      if (typeof filterLevelOrBand === 'number') {
        const levelCfg = LEVELS_CONFIG.find((c) => c.levelNumber === filterLevelOrBand);
        if (levelCfg && (item.frequencyBand !== levelCfg.band || item.rank < levelCfg.minRank || item.rank > levelCfg.maxRank)) return false;
      } else if (typeof filterLevelOrBand === 'string') {
        if (item.frequencyBand !== filterLevelOrBand) return false;
      }

      const p = progressMap[item.id];
      // Eligible new word: has never been attempted and status is new
      if (!p) return true;
      return (!p.totalAttempts || p.totalAttempts === 0) && p.mastery === 'new';
    })
    .sort((a, b) => a.rank - b.rank); // STRICT ASCENDING FREQUENCY-RANK ORDER
}

/**
 * Get the next single eligible new word in strict frequency-rank order
 */
export function getNextNewWord(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  filterLevelOrBand?: number | FrequencyBand,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): VocabularyItem | null {
  const newWords = getNewWords(progressMap, vocabulary, filterLevelOrBand, masteryThreshold);
  return newWords.length > 0 ? newWords[0] : null;
}

/**
 * THE REVIEW QUEUE (Due Words):
 * Previously encountered words from unlocked levels whose scheduled interval has elapsed (nextDueAt <= now).
 * 
 * CRITICAL RULE:
 * Previously encountered words must NOT follow frequency order.
 * Once a word has entered the learning/review system, spaced repetition controls when it appears again.
 * Due reviews are selected strictly according to SRS scheduling priority (earliest due timestamp / most overdue first,
 * with lower streak as tie-breaker).
 */
export function getSpacedDueWords(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  filterLevelOrBand?: number | FrequencyBand,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD
): VocabularyItem[] {
  const now = Date.now();
  const levels = getCumulativeLevelsProgression(progressMap, vocabulary, masteryThreshold);
  const unlockedBands = new Set(levels.filter((l) => l.isUnlocked).map((l) => l.band));

  return vocabulary
    .filter((item) => {
      if (!unlockedBands.has(item.frequencyBand)) return false;

      if (typeof filterLevelOrBand === 'number') {
        const levelCfg = LEVELS_CONFIG.find((c) => c.levelNumber === filterLevelOrBand);
        if (levelCfg && (item.frequencyBand !== levelCfg.band || item.rank < levelCfg.minRank || item.rank > levelCfg.maxRank)) return false;
      } else if (typeof filterLevelOrBand === 'string') {
        if (item.frequencyBand !== filterLevelOrBand) return false;
      }

      const p = progressMap[item.id];
      // Words that have never been practiced belong in New Queue, not Due Spaced Review
      if (!p || !p.totalAttempts || p.totalAttempts === 0 || p.mastery === 'new') return false;
      if (!p.nextDueAt) return true;
      return new Date(p.nextDueAt).getTime() <= now;
    })
    .sort((a, b) => {
      // Prioritize strictly by spaced repetition schedule: earliest due (most overdue) first
      const dueA = progressMap[a.id]?.nextDueAt;
      const dueB = progressMap[b.id]?.nextDueAt;
      const timeA = dueA ? new Date(dueA).getTime() : 0;
      const timeB = dueB ? new Date(dueB).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      // Secondary SRS tie-breaker: lower streak first
      const streakA = progressMap[a.id]?.currentStreak ?? 0;
      const streakB = progressMap[b.id]?.currentStreak ?? 0;
      return streakA - streakB;
    });
}

export interface ReviewSessionQueueOptions {
  mode: 'due' | 'weak' | 'new' | 'all';
  bandFilter?: FrequencyBand | 'all';
  specificWord?: VocabularyItem | null;
  masteryThreshold?: number;
  newBatchSize?: number;
}

/**
 * SESSION SELECTION PRIORITY:
 * When the user starts a review session:
 * 1. First identify vocabulary that is genuinely DUE for review.
 * 2. Include due reviews according to the existing spaced-repetition system (most overdue first, NOT frequency order).
 * 3. When introducing a NEW vocabulary item, select the lowest-ranked eligible NEW word from the currently unlocked range.
 * 
 * Never randomly sample new vocabulary.
 * Reviewing a review item must never permanently advance or skip the new-word queue.
 */
export function buildReviewSessionQueue(
  progressMap: Record<string, WordProgress>,
  vocabulary: VocabularyItem[] = MOCK_VOCABULARY,
  options: ReviewSessionQueueOptions
): VocabularyItem[] {
  const {
    mode,
    bandFilter = 'all',
    specificWord = null,
    masteryThreshold = DEFAULT_MASTERY_STREAK_THRESHOLD,
    newBatchSize = 5,
  } = options;

  if (specificWord) {
    return [specificWord];
  }

  const bandArg = bandFilter === 'all' ? undefined : bandFilter;
  const levels = getCumulativeLevelsProgression(progressMap, vocabulary, masteryThreshold);
  const unlockedBands = new Set(levels.filter((l) => l.isUnlocked).map((l) => l.band));

  if (mode === 'weak') {
    return getWeakWords(progressMap, vocabulary, bandArg, masteryThreshold);
  }

  if (mode === 'new') {
    // Pure new intake: strict frequency-rank order (lowest rank first)
    const newWords = getNewWords(progressMap, vocabulary, bandArg, masteryThreshold);
    return newWords.slice(0, 15);
  }

  if (mode === 'due') {
    // 1. Identify words genuinely DUE for review (SRS schedule priority)
    const dueWords = getSpacedDueWords(progressMap, vocabulary, bandArg, masteryThreshold);
    // 2. Identify eligible NEW words in strict frequency-rank order (lowest rank first)
    const newWords = getNewWords(progressMap, vocabulary, bandArg, masteryThreshold);

    if (dueWords.length > 0) {
      // Due reviews first according to SRS system, followed by the lowest-ranked eligible new words
      const newItemsToAdd = newWords.slice(0, newBatchSize);
      return [...dueWords, ...newItemsToAdd];
    } else {
      // 0 due reviews: introduce new vocabulary in strict rank order (#1, #2, #3, ...)
      return newWords.slice(0, 10);
    }
  }

  // 'all' mode: all words from unlocked bands in frequency rank order
  return vocabulary
    .filter((w) => {
      if (!unlockedBands.has(w.frequencyBand)) return false;
      if (bandArg && w.frequencyBand !== bandArg) return false;
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}
