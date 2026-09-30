import { MOCK_VOCABULARY } from '../data/vocabulary';
import { 
  MasteryLevel, 
  WordProgress, 
  UserStats, 
  FrequencyBand, 
  UserSettings, 
  SpacedRepetitionRating, 
  ReviewLogEntry,
  RecallQuality,
  RecallDirection
} from '../types';
import { 
  calculateWordMasteryLevel, 
  DEFAULT_MASTERY_STREAK_THRESHOLD,
  getSpacedDueWords
} from './progression';

const PROGRESS_STORAGE_KEY = 'le_socle_word_progress_v1';
const STATS_STORAGE_KEY = 'le_socle_user_stats_v1';
const SETTINGS_STORAGE_KEY = 'le_socle_user_settings_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  typoTolerance: 80,
  speechRate: 0.9,
  masteryStreakThreshold: DEFAULT_MASTERY_STREAK_THRESHOLD,
  previewLockedLevels: false,
  intervals: {
    again: 1,
    hard: 2,
    good: 4,
    easy: 7,
  },
};

export function loadUserSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) {
      saveUserSettings(DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    }
    const parsed = JSON.parse(saved);
    return {
      typoTolerance: typeof parsed.typoTolerance === 'number' ? parsed.typoTolerance : DEFAULT_USER_SETTINGS.typoTolerance,
      speechRate: typeof parsed.speechRate === 'number' ? parsed.speechRate : DEFAULT_USER_SETTINGS.speechRate,
      masteryStreakThreshold: typeof parsed.masteryStreakThreshold === 'number' ? parsed.masteryStreakThreshold : DEFAULT_MASTERY_STREAK_THRESHOLD,
      previewLockedLevels: typeof parsed.previewLockedLevels === 'boolean' ? parsed.previewLockedLevels : false,
      intervals: {
        again: typeof parsed.intervals?.again === 'number' ? parsed.intervals.again : DEFAULT_USER_SETTINGS.intervals.again,
        hard: typeof parsed.intervals?.hard === 'number' ? parsed.intervals.hard : DEFAULT_USER_SETTINGS.intervals.hard,
        good: typeof parsed.intervals?.good === 'number' ? parsed.intervals.good : DEFAULT_USER_SETTINGS.intervals.good,
        easy: typeof parsed.intervals?.easy === 'number' ? parsed.intervals.easy : DEFAULT_USER_SETTINGS.intervals.easy,
      },
    };
  } catch (e) {
    console.error('Failed to load user settings from localStorage', e);
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings to localStorage', e);
  }
}

function getTodayKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Clean default vocabulary progress map for fresh users:
 * Every single vocabulary item starts completely new with 0 attempts.
 * Frequency rank strictly governs the order of new words discovery (#1 first, then #2, #3, etc.)
 */
export function getDefaultWordProgressMap(): Record<string, WordProgress> {
  const initial: Record<string, WordProgress> = {};
  
  MOCK_VOCABULARY.forEach((item) => {
    initial[item.id] = {
      wordId: item.id,
      mastery: 'new',
      totalAttempts: 0,
      totalExactCorrect: 0,
      totalAcceptedTypo: 0,
      totalIncorrect: 0,
      totalRevealed: 0,
      currentStreak: 0,
      timesReviewed: 0,
      timesCorrect: 0,
      consecutiveCorrect: 0,
      nextDueAt: new Date().toISOString(),
    };
  });

  return initial;
}

export const OBSOLETE_DEMO_WORD_IDS = new Set([
  'v-112', 'v-210', 'v-225',
  // Removed Level 3-5 sample entries
  'v-1080', 'v-1150', 'v-1240', 'v-1320', 'v-1410',
  'v-1560', 'v-1680', 'v-1750', 'v-1890',
  'v-2050', 'v-2140', 'v-2280', 'v-2410', 'v-2490'
]);

/**
 * Sample progress distribution for developer mode testing only
 */
export function getSampleDemoProgressMap(): Record<string, WordProgress> {
  const initial = getDefaultWordProgressMap();
  
  MOCK_VOCABULARY.forEach((item, index) => {
    if (index === 0) {
      // être - Mastered (7 streak)
      initial[item.id] = {
        wordId: item.id,
        mastery: 'mastered',
        totalAttempts: 9,
        totalExactCorrect: 8,
        totalAcceptedTypo: 1,
        totalIncorrect: 0,
        totalRevealed: 0,
        currentStreak: 7,
        lastRecallQuality: 'exact_correct',
        timesReviewed: 9,
        timesCorrect: 9,
        consecutiveCorrect: 7,
        lastReviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        nextDueAt: new Date(Date.now() + 86400000 * 4).toISOString(),
      };
    } else if (index === 1) {
      // avoir - Reviewing (4 streak, due now)
      initial[item.id] = {
        wordId: item.id,
        mastery: 'reviewing',
        totalAttempts: 5,
        totalExactCorrect: 4,
        totalAcceptedTypo: 1,
        totalIncorrect: 0,
        totalRevealed: 0,
        currentStreak: 4,
        lastRecallQuality: 'exact_correct',
        timesReviewed: 5,
        timesCorrect: 5,
        consecutiveCorrect: 4,
        lastReviewedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        nextDueAt: new Date(Date.now() - 3600000).toISOString(),
      };
    } else if (index === 2) {
      // aller - Learning (1 streak, due now)
      initial[item.id] = {
        wordId: item.id,
        mastery: 'learning',
        totalAttempts: 3,
        totalExactCorrect: 1,
        totalAcceptedTypo: 1,
        totalIncorrect: 1,
        totalRevealed: 0,
        currentStreak: 1,
        lastRecallQuality: 'exact_correct',
        timesReviewed: 3,
        timesCorrect: 2,
        consecutiveCorrect: 1,
        lastReviewedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        nextDueAt: new Date(Date.now() - 1000).toISOString(),
      };
    }
  });

  return initial;
}

export function loadWordProgressMap(): Record<string, WordProgress> {
  if (typeof window === 'undefined') return getDefaultWordProgressMap();
  try {
    const validWordIds = new Set(MOCK_VOCABULARY.map((item) => item.id));
    const migrationKey = 'le_socle_demo_cleanup_v3';
    const hasMigrated = localStorage.getItem(migrationKey);

    const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!saved) {
      const initial = getDefaultWordProgressMap();
      saveWordProgressMap(initial);
      localStorage.setItem(migrationKey, 'true');
      return initial;
    }

    const parsed = JSON.parse(saved);
    let hasMutated = false;

    // 1. Remove obsolete demo keys (v-112, v-210, v-225) and orphan keys
    Object.keys(parsed).forEach((key) => {
      if (OBSOLETE_DEMO_WORD_IDS.has(key) || !validWordIds.has(key)) {
        delete parsed[key];
        hasMutated = true;
      }
    });

    // 2. Migration check: if old demo seed is present or old browser state has not migrated
    if (!hasMigrated) {
      const attemptedKeys = Object.keys(parsed).filter(
        (k) => (parsed[k]?.totalAttempts ?? 0) > 0 || parsed[k]?.mastery !== 'new'
      );
      // Check if it's the exact old demo sample state (only v-1, v-2, v-3 had attempts)
      const isDemoSampleSeed =
        attemptedKeys.length <= 3 &&
        attemptedKeys.every((k) => k === 'v-1' || k === 'v-2' || k === 'v-3');

      if (isDemoSampleSeed || hasMutated) {
        const fresh = getDefaultWordProgressMap();
        saveWordProgressMap(fresh);
        localStorage.setItem(migrationKey, 'true');
        return fresh;
      }
      localStorage.setItem(migrationKey, 'true');
    }

    // 3. Ensure any vocabulary items missing from parsed get a clean default entry
    MOCK_VOCABULARY.forEach((item) => {
      if (!parsed[item.id]) {
        parsed[item.id] = {
          wordId: item.id,
          mastery: 'new',
          totalAttempts: 0,
          totalExactCorrect: 0,
          totalAcceptedTypo: 0,
          totalIncorrect: 0,
          totalRevealed: 0,
          currentStreak: 0,
          timesReviewed: 0,
          timesCorrect: 0,
          consecutiveCorrect: 0,
          nextDueAt: new Date().toISOString(),
        };
        hasMutated = true;
      }
    });

    if (hasMutated) {
      saveWordProgressMap(parsed);
    }

    return parsed;
  } catch (e) {
    console.error('Failed to load progress from localStorage', e);
    return getDefaultWordProgressMap();
  }
}

export function saveWordProgressMap(data: Record<string, WordProgress>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress to localStorage', e);
  }
}

export function getDefaultUserStats(): UserStats {
  return {
    totalReviewed: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    streakDays: 1,
    lastStudyDate: getTodayKey(),
    reviewedTodayCount: 0,
    ratingDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    recentHistory: [],
  };
}

export function loadUserStats(): UserStats {
  const defaultStats = getDefaultUserStats();

  if (typeof window === 'undefined') return defaultStats;
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    if (!saved) {
      saveUserStats(defaultStats);
      return defaultStats;
    }
    const parsed = JSON.parse(saved);
    const validWordIds = new Set(MOCK_VOCABULARY.map((item) => item.id));

    // If stats were the old hardcoded demo seed (10 reviews, 8 correct), reset to default clean stats
    if (parsed.totalReviewed === 10 && parsed.totalCorrect === 8) {
      saveUserStats(defaultStats);
      return defaultStats;
    }

    const filteredHistory = Array.isArray(parsed.recentHistory)
      ? parsed.recentHistory.filter(
          (entry: any) => entry && !OBSOLETE_DEMO_WORD_IDS.has(entry.wordId) && validWordIds.has(entry.wordId)
        )
      : [];

    return {
      totalReviewed: typeof parsed.totalReviewed === 'number' ? parsed.totalReviewed : defaultStats.totalReviewed,
      totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : defaultStats.totalCorrect,
      totalIncorrect: typeof parsed.totalIncorrect === 'number' 
        ? parsed.totalIncorrect 
        : Math.max(0, (parsed.totalReviewed || 0) - (parsed.totalCorrect || 0)),
      streakDays: typeof parsed.streakDays === 'number' ? parsed.streakDays : defaultStats.streakDays,
      lastStudyDate: parsed.lastStudyDate || defaultStats.lastStudyDate,
      reviewedTodayCount: typeof parsed.reviewedTodayCount === 'number' ? parsed.reviewedTodayCount : defaultStats.reviewedTodayCount,
      ratingDistribution: {
        again: parsed.ratingDistribution?.again ?? 0,
        hard: parsed.ratingDistribution?.hard ?? 0,
        good: parsed.ratingDistribution?.good ?? 0,
        easy: parsed.ratingDistribution?.easy ?? 0,
      },
      recentHistory: filteredHistory,
    };
  } catch (e) {
    console.error('Failed to load stats from localStorage', e);
    return defaultStats;
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats to localStorage', e);
  }
}

/**
 * Handle feedback for a vocabulary word review with user rating, recall quality, and progression
 */
export function recordReviewResult(
  wordId: string,
  isCorrect: boolean,
  rating: SpacedRepetitionRating,
  userAnswer: string,
  currentProgressMap: Record<string, WordProgress>,
  currentStats: UserStats,
  settings: UserSettings,
  isExact: boolean = false,
  direction: RecallDirection = 'en_to_fr'
): { updatedProgress: Record<string, WordProgress>; updatedStats: UserStats } {
  const existing = currentProgressMap[wordId] || {
    wordId,
    mastery: 'new',
    totalAttempts: 0,
    totalExactCorrect: 0,
    totalAcceptedTypo: 0,
    totalIncorrect: 0,
    totalRevealed: 0,
    currentStreak: 0,
    timesReviewed: 0,
    timesCorrect: 0,
    consecutiveCorrect: 0,
  };

  // Determine specific recall quality
  let recallQuality: RecallQuality;
  if (!userAnswer || userAnswer.trim() === '' || userAnswer === '(Revealed without typing)') {
    recallQuality = 'revealed';
  } else if (!isCorrect) {
    recallQuality = 'incorrect';
  } else if (isExact) {
    recallQuality = 'exact_correct';
  } else {
    recallQuality = 'accepted_typo';
  }

  // Update counters
  const totalAttempts = (existing.totalAttempts ?? existing.timesReviewed ?? 0) + 1;
  const totalExactCorrect = (existing.totalExactCorrect ?? (isCorrect ? existing.timesCorrect : 0)) + 
    (recallQuality === 'exact_correct' ? 1 : 0);
  const totalAcceptedTypo = (existing.totalAcceptedTypo ?? 0) + 
    (recallQuality === 'accepted_typo' ? 1 : 0);
  const totalIncorrect = (existing.totalIncorrect ?? 0) + 
    (recallQuality === 'incorrect' ? 1 : 0);
  const totalRevealed = (existing.totalRevealed ?? 0) + 
    (recallQuality === 'revealed' ? 1 : 0);

  // Directional performance tracking
  const attemptsEnFr = (existing.attemptsEnFr ?? 0) + (direction === 'en_to_fr' ? 1 : 0);
  const correctEnFr = (existing.correctEnFr ?? 0) + (direction === 'en_to_fr' && isCorrect ? 1 : 0);
  const attemptsFrEn = (existing.attemptsFrEn ?? 0) + (direction === 'fr_to_en' ? 1 : 0);
  const correctFrEn = (existing.correctFrEn ?? 0) + (direction === 'fr_to_en' && isCorrect ? 1 : 0);

  // Consecutive successful recall streak calculation:
  // Only genuine exact correct answers contribute towards the mastery streak.
  // Accepted typos do not advance the streak, and incorrect/revealed answers reset it to 0.
  const existingStreak = existing.currentStreak ?? existing.consecutiveCorrect ?? 0;
  let currentStreak = 0;

  if (recallQuality === 'exact_correct') {
    if (rating === 'again') {
      currentStreak = 0;
    } else if (rating === 'easy') {
      currentStreak = existingStreak + 2;
    } else {
      currentStreak = existingStreak + 1;
    }
  } else if (recallQuality === 'accepted_typo') {
    if (rating === 'again') {
      currentStreak = 0;
    } else {
      // Retains existing streak without advancing it, requiring exact spelling for graduation
      currentStreak = existingStreak;
    }
  } else {
    // incorrect or revealed interrupts the streak
    currentStreak = 0;
  }

  // Determine mastery status via single authoritative progression logic
  const masteryThreshold = settings.masteryStreakThreshold || DEFAULT_MASTERY_STREAK_THRESHOLD;
  const newMastery = calculateWordMasteryLevel(currentStreak, totalAttempts, masteryThreshold);

  // Interval calculation strictly from UserSettings (in days)
  const intervalDays = Math.max(0.01, settings.intervals[rating] ?? (
    rating === 'again' ? 1 : rating === 'hard' ? 2 : rating === 'good' ? 4 : 7
  ));

  const now = new Date();
  const nextDue = new Date(now.getTime() + intervalDays * 24 * 3600000);

  const updatedItem: WordProgress = {
    wordId,
    mastery: newMastery,
    totalAttempts,
    totalExactCorrect,
    totalAcceptedTypo,
    totalIncorrect,
    totalRevealed,
    currentStreak,
    lastRecallQuality: recallQuality,
    lastRating: rating,
    lastReviewedAt: now.toISOString(),
    nextDueAt: nextDue.toISOString(),
    // Directional recall statistics
    attemptsEnFr,
    correctEnFr,
    attemptsFrEn,
    correctFrEn,
    // Compatibility aliases
    timesReviewed: totalAttempts,
    timesCorrect: totalExactCorrect + totalAcceptedTypo,
    consecutiveCorrect: currentStreak,
  };

  const updatedProgress = {
    ...currentProgressMap,
    [wordId]: updatedItem,
  };

  // Find vocabulary item info for historical logging
  const targetWord = MOCK_VOCABULARY.find((w) => w.id === wordId);
  const logEntry: ReviewLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    wordId,
    wordFrench: targetWord?.french || wordId,
    wordEnglish: targetWord?.english || '',
    userAnswer: userAnswer || '(Revealed without typing)',
    isCorrect,
    rating,
    reviewedAt: now.toISOString(),
    nextDueAt: nextDue.toISOString(),
    direction,
  };

  // Update overall user stats
  const todayKey = getTodayKey();
  const isNewDay = currentStats.lastStudyDate !== todayKey;
  
  let newStreak = currentStats.streakDays;
  if (isNewDay) {
    if (currentStats.lastStudyDate) {
      const lastDate = new Date(currentStats.lastStudyDate);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  }

  const prevDist = currentStats.ratingDistribution || { again: 0, hard: 0, good: 0, easy: 0 };
  const updatedRatingDist = {
    ...prevDist,
    [rating]: (prevDist[rating] || 0) + 1,
  };

  const updatedHistory = [logEntry, ...(currentStats.recentHistory || [])].slice(0, 30);

  const updatedStats: UserStats = {
    totalReviewed: currentStats.totalReviewed + 1,
    totalCorrect: isCorrect ? currentStats.totalCorrect + 1 : currentStats.totalCorrect,
    totalIncorrect: !isCorrect ? (currentStats.totalIncorrect || 0) + 1 : (currentStats.totalIncorrect || 0),
    streakDays: Math.max(1, newStreak),
    lastStudyDate: todayKey,
    reviewedTodayCount: isNewDay ? 1 : currentStats.reviewedTodayCount + 1,
    ratingDistribution: updatedRatingDist,
    recentHistory: updatedHistory,
  };

  saveWordProgressMap(updatedProgress);
  saveUserStats(updatedStats);

  return { updatedProgress, updatedStats };
}

export function resetAllProgress(): { progress: Record<string, WordProgress>; stats: UserStats } {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
    localStorage.setItem('le_socle_demo_cleanup_v2', 'true');
  }

  const initialProgress: Record<string, WordProgress> = {};
  MOCK_VOCABULARY.forEach((item) => {
    initialProgress[item.id] = {
      wordId: item.id,
      mastery: 'new',
      totalAttempts: 0,
      totalExactCorrect: 0,
      totalAcceptedTypo: 0,
      totalIncorrect: 0,
      totalRevealed: 0,
      currentStreak: 0,
      timesReviewed: 0,
      timesCorrect: 0,
      consecutiveCorrect: 0,
      nextDueAt: new Date().toISOString(),
    };
  });

  const initialStats: UserStats = {
    totalReviewed: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    streakDays: 1,
    lastStudyDate: getTodayKey(),
    reviewedTodayCount: 0,
    ratingDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    recentHistory: [],
  };

  saveWordProgressMap(initialProgress);
  saveUserStats(initialStats);

  return { progress: initialProgress, stats: initialStats };
}


export function getBandProgressSummary(
  band: FrequencyBand,
  progressMap: Record<string, WordProgress>
) {
  const wordsInBand = MOCK_VOCABULARY.filter((w) => w.frequencyBand === band);
  const total = wordsInBand.length;
  if (total === 0) return { total: 0, mastered: 0, reviewing: 0, learning: 0, new: 0, percentage: 0 };

  let mastered = 0;
  let reviewing = 0;
  let learning = 0;
  let newCount = 0;

  wordsInBand.forEach((w) => {
    const p = progressMap[w.id];
    const status = p ? p.mastery : 'new';
    if (status === 'mastered') mastered++;
    else if (status === 'reviewing') reviewing++;
    else if (status === 'learning') learning++;
    else newCount++;
  });

  // Score weight: mastered = 100%, reviewing = 66%, learning = 33%
  const score = (mastered * 1 + reviewing * 0.66 + learning * 0.33) / total;
  const percentage = Math.round(score * 100);

  return {
    total,
    mastered,
    reviewing,
    learning,
    new: newCount,
    percentage,
  };
}

export function getDueWords(
  progressMap: Record<string, WordProgress>,
  masteryThreshold: number = DEFAULT_MASTERY_STREAK_THRESHOLD,
  previewLockedLevels: boolean = false
) {
  return getSpacedDueWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold, previewLockedLevels);
}
