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
  RecallDirection,
  DailyGoalSettings,
  DailyGoalRecord,
  DailyGoalHistory,
  DailyGoalPracticeMode,
  DailyGoalCompletionStatus,
  ReviewModeFilter,
  LeSocleBackupPayload,
  BackupPreview,
  BackupValidationResult,
  RestoreBackupResult
} from '../types';
import { 
  calculateWordMasteryLevel, 
  DEFAULT_MASTERY_STREAK_THRESHOLD,
  getSpacedDueWords
} from './progression';

export const PROGRESS_STORAGE_KEY = 'le_socle_word_progress_v1';
export const STATS_STORAGE_KEY = 'le_socle_user_stats_v1';
export const SETTINGS_STORAGE_KEY = 'le_socle_user_settings_v1';
export const DAILY_GOALS_STORAGE_KEY = 'le_socle_daily_goals_v1';

export const DEFAULT_DAILY_NEW_INTAKE_GOAL = 25;
export const DEFAULT_DAILY_WEAK_WORDS_GOAL = 10;
export const MIN_DAILY_GOAL_TARGET = 1;
export const MAX_DAILY_NEW_INTAKE_GOAL = 100;
export const MAX_DAILY_WEAK_WORDS_GOAL = 100;

export const DEFAULT_DAILY_GOAL_SETTINGS: DailyGoalSettings = {
  newIntakeTarget: DEFAULT_DAILY_NEW_INTAKE_GOAL,
  weakWordsTarget: DEFAULT_DAILY_WEAK_WORDS_GOAL,
};

/**
 * Validates whether a daily goal target is a positive integer within allowable bounds.
 * Minimum is 1; maximum is documented and constrained (e.g. 100 words/day).
 */
export function isValidDailyGoalTarget(val: unknown, maxTarget: number = 100): val is number {
  return (
    typeof val === 'number' &&
    Number.isInteger(val) &&
    val >= MIN_DAILY_GOAL_TARGET &&
    val <= maxTarget
  );
}

export const SUPPORTED_NEW_INTAKE_SESSION_SIZES = [10, 15, 20, 25, 30, 50] as const;
export type NewIntakeSessionSize = (typeof SUPPORTED_NEW_INTAKE_SESSION_SIZES)[number];
export const DEFAULT_NEW_INTAKE_SESSION_SIZE: NewIntakeSessionSize = 25;

export function isValidNewIntakeSessionSize(val: unknown): val is NewIntakeSessionSize {
  return typeof val === 'number' && (SUPPORTED_NEW_INTAKE_SESSION_SIZES as readonly number[]).includes(val);
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  typoTolerance: 80,
  speechRate: 0.9,
  masteryStreakThreshold: DEFAULT_MASTERY_STREAK_THRESHOLD,
  previewLockedLevels: false,
  newIntakeSessionSize: DEFAULT_NEW_INTAKE_SESSION_SIZE,
  dailyGoals: DEFAULT_DAILY_GOAL_SETTINGS,
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
      newIntakeSessionSize: isValidNewIntakeSessionSize(parsed.newIntakeSessionSize)
        ? parsed.newIntakeSessionSize
        : DEFAULT_NEW_INTAKE_SESSION_SIZE,
      dailyGoals: {
        newIntakeTarget: isValidDailyGoalTarget(parsed.dailyGoals?.newIntakeTarget, MAX_DAILY_NEW_INTAKE_GOAL)
          ? parsed.dailyGoals.newIntakeTarget
          : DEFAULT_DAILY_NEW_INTAKE_GOAL,
        weakWordsTarget: isValidDailyGoalTarget(parsed.dailyGoals?.weakWordsTarget, MAX_DAILY_WEAK_WORDS_GOAL)
          ? parsed.dailyGoals.weakWordsTarget
          : DEFAULT_DAILY_WEAK_WORDS_GOAL,
      },
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
 * Returns the calendar date formatted as YYYY-MM-DD in the user's local timezone.
 * Used specifically for Daily Goals persistence so that daily targets align with the learner's local day.
 */
export function getLocalCalendarDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the difference in integer calendar days between two YYYY-MM-DD date strings.
 * Returns (toDate - fromDate) in whole calendar days.
 * E.g., ('2026-10-20', '2026-10-21') -> 1 (consecutive day).
 * Safe against daylight saving time shifts and avoids raw millisecond / timestamp comparisons.
 */
export function getCalendarDayDifference(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return Infinity;
  const parts1 = fromDateStr.split('-').map(Number);
  const parts2 = toDateStr.split('-').map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) return Infinity;
  const [y1, m1, d1] = parts1;
  const [y2, m2, d2] = parts2;
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    return Infinity;
  }
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the new study streak when both daily goals become complete for todayDateKey.
 * - If the previous credited date is yesterday (1 calendar day difference), extends streak by 1.
 * - If a calendar day was missed (>1 calendar day difference), restarts streak at 1.
 * - For existing users on day 1 with prior study history, seamlessly extends their existing streak if
 *   their last study date was yesterday or earlier today.
 */
export function calculateNextStreakDays(
  todayDateKey: string,
  history: DailyGoalHistory,
  currentStreakDays: number,
  lastStudyDate: string | null
): number {
  // Find all previously credited dates strictly before today
  const priorCreditedDates = Object.keys(history)
    .filter((d) => d < todayDateKey && history[d]?.isCompleted && history[d]?.streakCredited)
    .sort();

  if (priorCreditedDates.length > 0) {
    const lastCreditedDate = priorCreditedDates[priorCreditedDates.length - 1];
    const diff = getCalendarDayDifference(lastCreditedDate, todayDateKey);
    if (diff === 1) {
      // Consecutive calendar day completion -> extend streak
      return Math.max(1, currentStreakDays + 1);
    } else {
      // Missed one or more days -> restart streak at 1
      return 1;
    }
  }

  // Fallback for existing learners with a legacy streak but no previous daily goals history:
  if (lastStudyDate) {
    const diff = getCalendarDayDifference(lastStudyDate, todayDateKey);
    if (diff <= 1) {
      // Last studied yesterday or earlier today -> preserve and advance existing streak
      return Math.max(1, currentStreakDays + 1);
    } else {
      // Missed day -> restart streak at 1
      return 1;
    }
  }

  // Brand new learner achieving first completion
  return 1;
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

    // 2. Ensure any vocabulary items missing from parsed get a clean default entry
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

    // Ensure migration key is recorded so future checks confirm storage is current
    if (!hasMigrated) {
      localStorage.setItem(migrationKey, 'true');
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
    lastStudyDate: getLocalCalendarDateKey(),
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
  direction: RecallDirection = 'en_to_fr',
  mode?: ReviewModeFilter
): { 
  updatedProgress: Record<string, WordProgress>; 
  updatedStats: UserStats;
  dailyGoalRecord?: DailyGoalRecord;
} {
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

  const priorAttempts = existing.totalAttempts ?? existing.timesReviewed ?? 0;
  const wasUnattempted = priorAttempts === 0;

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

  // Daily Goals qualification & recording (local calendar day)
  const todayLocalKey = getLocalCalendarDateKey();
  const isSuccessfulAnswer = isCorrect && recallQuality !== 'revealed';

  if (mode === 'new' && wasUnattempted && isSuccessfulAnswer) {
    recordDailyGoalWord('new_intake', wordId, settings, todayLocalKey);
  } else if (mode === 'weak' && isSuccessfulAnswer) {
    recordDailyGoalWord('weak_words', wordId, settings, todayLocalKey);
  }

  // Evaluate Daily Goals completion & synchronize streak
  const todayRecord = getOrCreateDailyGoalRecord(todayLocalKey);
  const completion = checkDailyGoalCompletion(todayRecord, settings);
  let updatedStreakDays = currentStats.streakDays;

  if (completion.isFullyComplete && !todayRecord.streakCredited) {
    const { updatedHistory, creditAwarded } = claimDailyGoalStreakCredit(todayLocalKey);
    if (creditAwarded) {
      updatedStreakDays = calculateNextStreakDays(
        todayLocalKey,
        updatedHistory,
        currentStats.streakDays,
        currentStats.lastStudyDate
      );
    }
  }

  const isNewDay = currentStats.lastStudyDate !== todayLocalKey;

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
    streakDays: Math.max(1, updatedStreakDays),
    lastStudyDate: todayLocalKey,
    reviewedTodayCount: isNewDay ? 1 : currentStats.reviewedTodayCount + 1,
    ratingDistribution: updatedRatingDist,
    recentHistory: updatedHistory,
  };

  saveWordProgressMap(updatedProgress);
  saveUserStats(updatedStats);

  return { 
    updatedProgress, 
    updatedStats,
    dailyGoalRecord: getOrCreateDailyGoalRecord(todayLocalKey)
  };
}

export function resetAllProgress(): { progress: Record<string, WordProgress>; stats: UserStats } {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
    localStorage.removeItem(DAILY_GOALS_STORAGE_KEY);
    localStorage.setItem('le_socle_demo_cleanup_v3', 'true');
  }

  const initialProgress = getDefaultWordProgressMap();

  const initialStats: UserStats = {
    totalReviewed: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    streakDays: 1,
    lastStudyDate: getLocalCalendarDateKey(),
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

/* ==========================================================================
   DAILY GOALS DATA MODEL & PERSISTENCE (STAGE 1)
   ========================================================================== */

/**
 * Creates a clean default DailyGoalRecord for a specified local calendar date.
 */
export function createDefaultDailyGoalRecord(dateKey: string): DailyGoalRecord {
  return {
    date: dateKey,
    newIntakeWordIds: [],
    weakWordsWordIds: [],
    isCompleted: false,
    streakCredited: false,
  };
}

/**
 * Loads the complete daily goals history map from localStorage with validation and sanitization.
 * Missing or malformed records are handled safely without throwing or corrupting application state.
 */
export function loadDailyGoalsHistory(): DailyGoalHistory {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(DAILY_GOALS_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return {};

    const validated: DailyGoalHistory = {};
    for (const [dateKey, rawRecord] of Object.entries(parsed)) {
      if (!rawRecord || typeof rawRecord !== 'object') continue;
      const rec = rawRecord as any;
      if (typeof rec.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) continue;

      // Ensure distinct array of non-empty strings for word IDs
      const newIntakeWordIds = Array.isArray(rec.newIntakeWordIds)
        ? Array.from(new Set(rec.newIntakeWordIds.filter((id: unknown) => typeof id === 'string' && (id as string).trim().length > 0))) as string[]
        : [];

      const weakWordsWordIds = Array.isArray(rec.weakWordsWordIds)
        ? Array.from(new Set(rec.weakWordsWordIds.filter((id: unknown) => typeof id === 'string' && (id as string).trim().length > 0))) as string[]
        : [];

      validated[dateKey] = {
        date: rec.date,
        newIntakeWordIds,
        weakWordsWordIds,
        isCompleted: typeof rec.isCompleted === 'boolean' ? rec.isCompleted : false,
        completedAt: typeof rec.completedAt === 'string' ? rec.completedAt : undefined,
        streakCredited: typeof rec.streakCredited === 'boolean' ? rec.streakCredited : false,
        streakCreditedAt: typeof rec.streakCreditedAt === 'string' ? rec.streakCreditedAt : undefined,
      };
    }
    return validated;
  } catch (e) {
    console.error('Failed to load daily goals history from localStorage', e);
    return {};
  }
}

/**
 * Persists the daily goals history map to localStorage.
 */
export function saveDailyGoalsHistory(history: DailyGoalHistory): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save daily goals history to localStorage', e);
  }
}

/**
 * Retrieves the record for the given local calendar date, or initializes a clean default record if none exists.
 */
export function getOrCreateDailyGoalRecord(
  dateKey: string = getLocalCalendarDateKey(),
  history?: DailyGoalHistory
): DailyGoalRecord {
  const currentHistory = history ?? loadDailyGoalsHistory();
  return currentHistory[dateKey] ?? createDefaultDailyGoalRecord(dateKey);
}

/**
 * Evaluates the current completion status of a daily goal record against user settings.
 */
export function checkDailyGoalCompletion(
  record: DailyGoalRecord | undefined,
  settings: UserSettings
): DailyGoalCompletionStatus {
  const newIntakeTarget = isValidDailyGoalTarget(settings.dailyGoals?.newIntakeTarget, MAX_DAILY_NEW_INTAKE_GOAL)
    ? settings.dailyGoals.newIntakeTarget
    : DEFAULT_DAILY_NEW_INTAKE_GOAL;
  const weakWordsTarget = isValidDailyGoalTarget(settings.dailyGoals?.weakWordsTarget, MAX_DAILY_WEAK_WORDS_GOAL)
    ? settings.dailyGoals.weakWordsTarget
    : DEFAULT_DAILY_WEAK_WORDS_GOAL;

  const newIntakeCount = record?.newIntakeWordIds?.length ?? 0;
  const weakWordsCount = record?.weakWordsWordIds?.length ?? 0;

  const isNewIntakeComplete = newIntakeCount >= newIntakeTarget;
  const isWeakWordsComplete = weakWordsCount >= weakWordsTarget;
  const isFullyComplete = isNewIntakeComplete && isWeakWordsComplete;
  const streakCredited = record?.streakCredited ?? false;

  return {
    newIntakeCount,
    newIntakeTarget,
    isNewIntakeComplete,
    weakWordsCount,
    weakWordsTarget,
    isWeakWordsComplete,
    isFullyComplete,
    streakCredited,
  };
}

/**
 * Idempotently records a qualifying vocabulary word completion into the specified daily practice mode.
 * Adding the same word multiple times on the same date will not duplicate the entry or inflate the count.
 * Automatically checks and updates goal completion status and timestamp when thresholds are met.
 */
export function recordDailyGoalWord(
  mode: DailyGoalPracticeMode,
  wordId: string,
  settings: UserSettings,
  dateKey: string = getLocalCalendarDateKey(),
  existingHistory?: DailyGoalHistory
): {
  updatedHistory: DailyGoalHistory;
  record: DailyGoalRecord;
  wasAdded: boolean;
  justCompleted: boolean;
} {
  const history = existingHistory ?? loadDailyGoalsHistory();
  const currentRecord = history[dateKey] ?? createDefaultDailyGoalRecord(dateKey);

  let wasAdded = false;
  let updatedNewIntake = currentRecord.newIntakeWordIds;
  let updatedWeakWords = currentRecord.weakWordsWordIds;

  if (mode === 'new_intake') {
    if (!currentRecord.newIntakeWordIds.includes(wordId)) {
      updatedNewIntake = [...currentRecord.newIntakeWordIds, wordId];
      wasAdded = true;
    }
  } else if (mode === 'weak_words') {
    if (!currentRecord.weakWordsWordIds.includes(wordId)) {
      updatedWeakWords = [...currentRecord.weakWordsWordIds, wordId];
      wasAdded = true;
    }
  }

  const newIntakeTarget = isValidDailyGoalTarget(settings.dailyGoals?.newIntakeTarget, MAX_DAILY_NEW_INTAKE_GOAL)
    ? settings.dailyGoals.newIntakeTarget
    : DEFAULT_DAILY_NEW_INTAKE_GOAL;
  const weakWordsTarget = isValidDailyGoalTarget(settings.dailyGoals?.weakWordsTarget, MAX_DAILY_WEAK_WORDS_GOAL)
    ? settings.dailyGoals.weakWordsTarget
    : DEFAULT_DAILY_WEAK_WORDS_GOAL;

  const isNowComplete = updatedNewIntake.length >= newIntakeTarget && updatedWeakWords.length >= weakWordsTarget;
  const justCompleted = !currentRecord.isCompleted && isNowComplete;

  const updatedRecord: DailyGoalRecord = {
    ...currentRecord,
    newIntakeWordIds: updatedNewIntake,
    weakWordsWordIds: updatedWeakWords,
    isCompleted: currentRecord.isCompleted || isNowComplete,
    completedAt: currentRecord.completedAt ?? (justCompleted ? new Date().toISOString() : undefined),
  };

  const updatedHistory: DailyGoalHistory = {
    ...history,
    [dateKey]: updatedRecord,
  };

  saveDailyGoalsHistory(updatedHistory);

  return {
    updatedHistory,
    record: updatedRecord,
    wasAdded,
    justCompleted,
  };
}

/**
 * Grants streak credit for a completed daily goal record.
 * Guarantees that a completed day can receive streak credit at most once.
 */
export function claimDailyGoalStreakCredit(
  dateKey: string = getLocalCalendarDateKey(),
  existingHistory?: DailyGoalHistory
): {
  updatedHistory: DailyGoalHistory;
  creditAwarded: boolean;
} {
  const history = existingHistory ?? loadDailyGoalsHistory();
  const currentRecord = history[dateKey];

  if (!currentRecord || !currentRecord.isCompleted || currentRecord.streakCredited) {
    return {
      updatedHistory: history,
      creditAwarded: false,
    };
  }

  const updatedRecord: DailyGoalRecord = {
    ...currentRecord,
    streakCredited: true,
    streakCreditedAt: new Date().toISOString(),
  };

  const updatedHistory: DailyGoalHistory = {
    ...history,
    [dateKey]: updatedRecord,
  };

  saveDailyGoalsHistory(updatedHistory);

  return {
    updatedHistory,
    creditAwarded: true,
  };
}

/**
 * Synchronizes and re-evaluates today's daily goal record and streak credit when daily goal targets change in Settings.
 * - If lowering a target causes an uncredited day to become complete, claims credit once and advances streak.
 * - If raising a target causes today to no longer meet targets, updates isCompleted to false while preserving streakCredited and word IDs.
 * - Guarantees that streak credit is never awarded more than once.
 */
export function syncDailyGoalOnSettingsChange(
  settings: UserSettings,
  currentStats: UserStats,
  dateKey: string = getLocalCalendarDateKey()
): {
  updatedRecord: DailyGoalRecord;
  updatedStats: UserStats;
} {
  const history = loadDailyGoalsHistory();
  const currentRecord = history[dateKey] ?? createDefaultDailyGoalRecord(dateKey);

  const completion = checkDailyGoalCompletion(currentRecord, settings);
  const isNowComplete = completion.isFullyComplete;

  let updatedRecord: DailyGoalRecord = { ...currentRecord };
  let updatedStats: UserStats = { ...currentStats };

  if (isNowComplete) {
    if (!currentRecord.isCompleted) {
      updatedRecord.isCompleted = true;
      updatedRecord.completedAt = updatedRecord.completedAt ?? new Date().toISOString();
    }

    if (!currentRecord.streakCredited) {
      // Award credit once
      updatedRecord.streakCredited = true;
      updatedRecord.streakCreditedAt = new Date().toISOString();
      const updatedHistory: DailyGoalHistory = {
        ...history,
        [dateKey]: updatedRecord,
      };
      saveDailyGoalsHistory(updatedHistory);

      const nextStreak = calculateNextStreakDays(
        dateKey,
        updatedHistory,
        currentStats.streakDays,
        currentStats.lastStudyDate
      );
      updatedStats = {
        ...currentStats,
        streakDays: Math.max(1, nextStreak),
      };
      saveUserStats(updatedStats);
      return { updatedRecord, updatedStats };
    }
  } else {
    // If target increased above current counts, mark isCompleted = false while preserving streakCredited
    if (currentRecord.isCompleted) {
      updatedRecord.isCompleted = false;
    }
  }

  const updatedHistory: DailyGoalHistory = {
    ...history,
    [dateKey]: updatedRecord,
  };
  saveDailyGoalsHistory(updatedHistory);

  return { updatedRecord, updatedStats };
}

// Alias for backwards compatibility
export const evaluateDailyGoalsOnSettingsChange = syncDailyGoalOnSettingsChange;

/* ==========================================================================
   BACKUP & EXPORT (STAGE 1A)
   ========================================================================== */

export const BACKUP_FORMAT_IDENTIFIER = 'le-socle-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';

export interface DownloadBackupResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Compiles a snapshot of all current user-specific learning data from localStorage
 * without altering, resetting, or mutating any stored records.
 * Explicitly excludes the vocabulary corpus, secrets, environment variables,
 * and internal migration/demo cleanup flags.
 */
export function generateBackupPayload(): LeSocleBackupPayload {
  const progress = loadWordProgressMap();
  const stats = loadUserStats();
  const settings = loadUserSettings();
  const dailyGoals = loadDailyGoalsHistory();

  return {
    format: BACKUP_FORMAT_IDENTIFIER,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      progress,
      stats,
      settings,
      dailyGoals,
    },
  };
}

/**
 * Triggers a browser download of the current learning data backup as a formatted JSON file.
 * Filename format: le-socle-backup-YYYY-MM-DD.json using the learner's local calendar day.
 */
export function downloadBackupJson(): DownloadBackupResult {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        success: false,
        error: 'Backup download is only supported in a browser environment.',
      };
    }

    const payload = generateBackupPayload();
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const localDate = getLocalCalendarDateKey();
    const filename = `le-socle-backup-${localDate}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('style', 'display: none;');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after download trigger
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return {
      success: true,
      filename,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during export';
    console.error('Failed to download backup JSON:', err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Validates an unknown candidate backup payload against the Le Socle backup specification.
 * Fully checks envelope metadata, schema versions, all four required data sections,
 * field types, numeric constraints, date formats, and word IDs against the 2,500-word corpus.
 * Returns either { isValid: true, payload, preview } or { isValid: false, error }.
 */
export function validateBackupPayload(raw: unknown): BackupValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { isValid: false, error: 'Malformed backup: Expected a JSON object at the root.' };
  }

  const candidate = raw as Record<string, any>;

  // 1. Envelope validation
  if (
    !candidate.format ||
    candidate.format !== BACKUP_FORMAT_IDENTIFIER ||
    candidate.schemaVersion === undefined ||
    candidate.schemaVersion === null
  ) {
    return {
      isValid: false,
      error: 'This file is not a valid Le Socle backup. Please select a JSON backup exported from Le Socle.',
    };
  }

  if (candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      isValid: false,
      error: `This backup uses an unsupported format version. Expected version ${BACKUP_SCHEMA_VERSION}.`,
    };
  }

  if (typeof candidate.exportedAt !== 'string' || candidate.exportedAt.trim().length === 0 || isNaN(Date.parse(candidate.exportedAt))) {
    return {
      isValid: false,
      error: 'Invalid backup timestamp: "exportedAt" must be a valid ISO 8601 date string.',
    };
  }

  if (candidate.appVersion !== undefined && typeof candidate.appVersion !== 'string') {
    return { isValid: false, error: 'Invalid "appVersion": expected string.' };
  }

  if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) {
    return { isValid: false, error: 'Malformed backup: Missing or invalid "data" container.' };
  }

  // 2. Required sections existence
  if (!candidate.data.progress || typeof candidate.data.progress !== 'object' || Array.isArray(candidate.data.progress)) {
    return { isValid: false, error: 'Missing required section: data.progress.' };
  }

  if (!candidate.data.stats || typeof candidate.data.stats !== 'object' || Array.isArray(candidate.data.stats)) {
    return { isValid: false, error: 'Missing required section: data.stats.' };
  }

  if (!candidate.data.settings || typeof candidate.data.settings !== 'object' || Array.isArray(candidate.data.settings)) {
    return { isValid: false, error: 'Missing required section: data.settings.' };
  }

  if (!candidate.data.dailyGoals || typeof candidate.data.dailyGoals !== 'object' || Array.isArray(candidate.data.dailyGoals)) {
    return { isValid: false, error: 'Missing required section: data.dailyGoals.' };
  }

  const validWordIds = new Set(MOCK_VOCABULARY.map((w) => w.id));

  // 3. Validate data.progress
  const progressEntries = Object.entries(candidate.data.progress);
  if (progressEntries.length !== MOCK_VOCABULARY.length) {
    return {
      isValid: false,
      error: `Incomplete vocabulary progress records: expected all ${MOCK_VOCABULARY.length} corpus words, but found ${progressEntries.length}. Cannot restore partial progress without corrupting curriculum state.`,
    };
  }

  const intProgressFields = [
    'totalAttempts',
    'totalExactCorrect',
    'totalAcceptedTypo',
    'totalIncorrect',
    'totalRevealed',
    'currentStreak',
    'timesReviewed',
    'timesCorrect',
    'consecutiveCorrect',
  ];

  for (const [wordId, rec] of progressEntries) {
    if (!validWordIds.has(wordId)) {
      return {
        isValid: false,
        error: `Invalid word ID "${wordId}" in progress records: not found in the Le Socle 2,500-word corpus.`,
      };
    }
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
      return { isValid: false, error: `Malformed progress record for word ID "${wordId}".` };
    }
    const p = rec as any;
    if (p.wordId !== wordId) {
      return {
        isValid: false,
        error: `Inconsistent wordId in progress record: key "${wordId}" does not match internal wordId "${p.wordId}".`,
      };
    }
    if (!['new', 'learning', 'reviewing', 'mastered'].includes(p.mastery)) {
      return {
        isValid: false,
        error: `Invalid mastery level "${p.mastery}" for word ID "${wordId}".`,
      };
    }
    for (const f of intProgressFields) {
      if (typeof p[f] !== 'number' || !Number.isInteger(p[f]) || p[f] < 0) {
        return {
          isValid: false,
          error: `Invalid numeric value for "${f}" in word ID "${wordId}": expected non-negative integer, found ${p[f]}.`,
        };
      }
    }
    if (p.lastRecallQuality !== undefined && !['exact_correct', 'accepted_typo', 'incorrect', 'revealed'].includes(p.lastRecallQuality)) {
      return { isValid: false, error: `Invalid lastRecallQuality "${p.lastRecallQuality}" in word ID "${wordId}".` };
    }
    if (p.lastRating !== undefined && !['again', 'hard', 'good', 'easy'].includes(p.lastRating)) {
      return { isValid: false, error: `Invalid lastRating "${p.lastRating}" in word ID "${wordId}".` };
    }
    if (p.lastReviewedAt !== undefined && (typeof p.lastReviewedAt !== 'string' || isNaN(Date.parse(p.lastReviewedAt)))) {
      return { isValid: false, error: `Invalid lastReviewedAt timestamp in word ID "${wordId}".` };
    }
    if (p.nextDueAt !== undefined && (typeof p.nextDueAt !== 'string' || isNaN(Date.parse(p.nextDueAt)))) {
      return { isValid: false, error: `Invalid nextDueAt timestamp in word ID "${wordId}".` };
    }
    for (const df of ['attemptsEnFr', 'correctEnFr', 'attemptsFrEn', 'correctFrEn']) {
      if (p[df] !== undefined && (typeof p[df] !== 'number' || !Number.isInteger(p[df]) || p[df] < 0)) {
        return { isValid: false, error: `Invalid directional stat "${df}" in word ID "${wordId}".` };
      }
    }
    if (p.totalAttempts < p.totalExactCorrect + p.totalAcceptedTypo + p.totalIncorrect) {
      return {
        isValid: false,
        error: `Inconsistent recall totals in word ID "${wordId}": total attempts (${p.totalAttempts}) is less than sum of correct and incorrect attempts.`,
      };
    }
  }

  // 4. Validate data.stats
  const s = candidate.data.stats as any;
  const statIntFields = ['totalReviewed', 'totalCorrect', 'totalIncorrect', 'streakDays', 'reviewedTodayCount'];
  for (const sf of statIntFields) {
    if (typeof s[sf] !== 'number' || !Number.isInteger(s[sf]) || s[sf] < 0) {
      return { isValid: false, error: `Invalid statistics value for "${sf}": expected non-negative integer, found ${s[sf]}.` };
    }
  }
  if (s.lastStudyDate !== null && (typeof s.lastStudyDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.lastStudyDate) || isNaN(Date.parse(s.lastStudyDate)))) {
    return { isValid: false, error: 'Invalid statistics value for "lastStudyDate": expected null or YYYY-MM-DD date string.' };
  }
  if (!s.ratingDistribution || typeof s.ratingDistribution !== 'object' || Array.isArray(s.ratingDistribution)) {
    return { isValid: false, error: 'Missing or invalid "ratingDistribution" in statistics.' };
  }
  for (const rf of ['again', 'hard', 'good', 'easy']) {
    if (typeof s.ratingDistribution[rf] !== 'number' || !Number.isInteger(s.ratingDistribution[rf]) || s.ratingDistribution[rf] < 0) {
      return { isValid: false, error: `Invalid rating distribution count for "${rf}": expected non-negative integer.` };
    }
  }
  if (!Array.isArray(s.recentHistory)) {
    return { isValid: false, error: 'Invalid "recentHistory" in statistics: expected array.' };
  }
  for (const entry of s.recentHistory) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.id !== 'string' ||
      !validWordIds.has(entry.wordId) ||
      typeof entry.isCorrect !== 'boolean' ||
      !['again', 'hard', 'good', 'easy'].includes(entry.rating) ||
      typeof entry.reviewedAt !== 'string' ||
      isNaN(Date.parse(entry.reviewedAt))
    ) {
      return { isValid: false, error: 'Invalid review entry in statistics recentHistory.' };
    }
  }

  // 5. Validate data.settings
  const cfg = candidate.data.settings as any;
  if (typeof cfg.typoTolerance !== 'number' || isNaN(cfg.typoTolerance) || cfg.typoTolerance < 50 || cfg.typoTolerance > 100) {
    return { isValid: false, error: 'Invalid typoTolerance in settings: expected number between 50 and 100.' };
  }
  if (typeof cfg.speechRate !== 'number' || isNaN(cfg.speechRate) || cfg.speechRate < 0.5 || cfg.speechRate > 1.5) {
    return { isValid: false, error: 'Invalid speechRate in settings: expected number between 0.5 and 1.5.' };
  }
  if (typeof cfg.masteryStreakThreshold !== 'number' || !Number.isInteger(cfg.masteryStreakThreshold) || cfg.masteryStreakThreshold < 1 || cfg.masteryStreakThreshold > 50) {
    return { isValid: false, error: 'Invalid masteryStreakThreshold in settings: expected integer between 1 and 50.' };
  }
  if (!cfg.intervals || typeof cfg.intervals !== 'object' || Array.isArray(cfg.intervals)) {
    return { isValid: false, error: 'Missing or invalid intervals configuration in settings.' };
  }
  for (const k of ['again', 'hard', 'good', 'easy']) {
    if (typeof cfg.intervals[k] !== 'number' || isNaN(cfg.intervals[k]) || cfg.intervals[k] <= 0) {
      return { isValid: false, error: `Invalid SRS interval value for "${k}": expected positive number.` };
    }
  }
  if (!cfg.dailyGoals || typeof cfg.dailyGoals !== 'object' || Array.isArray(cfg.dailyGoals)) {
    return { isValid: false, error: 'Missing dailyGoals configuration in settings.' };
  }
  if (!isValidDailyGoalTarget(cfg.dailyGoals.newIntakeTarget, MAX_DAILY_NEW_INTAKE_GOAL)) {
    return {
      isValid: false,
      error: `Invalid newIntakeTarget in settings: expected integer between ${MIN_DAILY_GOAL_TARGET} and ${MAX_DAILY_NEW_INTAKE_GOAL}.`,
    };
  }
  if (!isValidDailyGoalTarget(cfg.dailyGoals.weakWordsTarget, MAX_DAILY_WEAK_WORDS_GOAL)) {
    return {
      isValid: false,
      error: `Invalid weakWordsTarget in settings: expected integer between ${MIN_DAILY_GOAL_TARGET} and ${MAX_DAILY_WEAK_WORDS_GOAL}.`,
    };
  }

  // 6. Validate data.dailyGoals
  const dg = candidate.data.dailyGoals as any;
  for (const [dateKey, record] of Object.entries(dg)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || isNaN(Date.parse(dateKey))) {
      return { isValid: false, error: `Invalid date key in dailyGoals: "${dateKey}". Expected YYYY-MM-DD calendar date.` };
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return { isValid: false, error: `Malformed daily goals record for date "${dateKey}".` };
    }
    const r = record as any;
    if (r.date !== dateKey) {
      return { isValid: false, error: `Inconsistent date in daily goals record: key "${dateKey}" does not match record date "${r.date}".` };
    }
    if (!Array.isArray(r.newIntakeWordIds) || !r.newIntakeWordIds.every((id: any) => typeof id === 'string' && validWordIds.has(id))) {
      return { isValid: false, error: `Invalid newIntakeWordIds for date "${dateKey}": must be an array of valid word IDs from the corpus.` };
    }
    if (!Array.isArray(r.weakWordsWordIds) || !r.weakWordsWordIds.every((id: any) => typeof id === 'string' && validWordIds.has(id))) {
      return { isValid: false, error: `Invalid weakWordsWordIds for date "${dateKey}": must be an array of valid word IDs from the corpus.` };
    }
    if (typeof r.isCompleted !== 'boolean' || typeof r.streakCredited !== 'boolean') {
      return { isValid: false, error: `Invalid boolean completion flags in daily goals record for date "${dateKey}".` };
    }
    if (r.completedAt !== undefined && (typeof r.completedAt !== 'string' || isNaN(Date.parse(r.completedAt)))) {
      return { isValid: false, error: `Invalid completedAt timestamp in daily goals record for date "${dateKey}".` };
    }
    if (r.streakCreditedAt !== undefined && (typeof r.streakCreditedAt !== 'string' || isNaN(Date.parse(r.streakCreditedAt)))) {
      return { isValid: false, error: `Invalid streakCreditedAt timestamp in daily goals record for date "${dateKey}".` };
    }
  }

  // 7. Compile preview summary
  let masteredCount = 0;
  let reviewingCount = 0;
  let learningCount = 0;
  for (const p of Object.values(candidate.data.progress) as any[]) {
    if (p.mastery === 'mastered') masteredCount++;
    else if (p.mastery === 'reviewing') reviewingCount++;
    else if (p.mastery === 'learning') learningCount++;
  }

  const preview: BackupPreview = {
    exportedAt: candidate.exportedAt,
    appVersion: candidate.appVersion || '1.0.0',
    progressCount: progressEntries.length,
    masteredCount,
    reviewingCount,
    learningCount,
    totalReviewed: candidate.data.stats.totalReviewed,
    streakDays: candidate.data.stats.streakDays,
    newIntakeTarget: candidate.data.settings.dailyGoals.newIntakeTarget,
    weakWordsTarget: candidate.data.settings.dailyGoals.weakWordsTarget,
    dailyGoalsDatesCount: Object.keys(candidate.data.dailyGoals).length,
  };

  return {
    isValid: true,
    payload: candidate as LeSocleBackupPayload,
    preview,
  };
}

/**
 * Safely restores a validated Le Socle backup payload into browser localStorage.
 * Performs a guarded atomic operation:
 * 1. Takes a complete snapshot of all affected localStorage keys.
 * 2. Attempts to write all 4 serialized sections.
 * 3. If any write fails, immediately rolls back all keys to the original snapshot.
 * 4. Never modifies demo cleanup flags or the vocabulary corpus.
 */
export function restoreBackupPayload(payload: LeSocleBackupPayload): RestoreBackupResult {
  const validation = validateBackupPayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { success: false, error: 'Backup restoration requires a browser environment with localStorage.' };
  }

  const affectedKeys = [
    PROGRESS_STORAGE_KEY,
    STATS_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    DAILY_GOALS_STORAGE_KEY,
  ] as const;

  // 1. Snapshot current values before touching anything
  const snapshots = new Map<string, string | null>();
  for (const key of affectedKeys) {
    try {
      snapshots.set(key, localStorage.getItem(key));
    } catch (e) {
      return {
        success: false,
        error: `Failed to create pre-restore snapshot: ${e instanceof Error ? e.message : 'Storage read error'}. No data was changed.`,
      };
    }
  }

  // 2. Prepare serialized replacements
  const entriesToWrite: [string, string][] = [
    [PROGRESS_STORAGE_KEY, JSON.stringify(payload.data.progress)],
    [STATS_STORAGE_KEY, JSON.stringify(payload.data.stats)],
    [SETTINGS_STORAGE_KEY, JSON.stringify(payload.data.settings)],
    [DAILY_GOALS_STORAGE_KEY, JSON.stringify(payload.data.dailyGoals)],
  ];

  // 3. Perform guarded writes
  const writtenKeys: string[] = [];
  try {
    for (const [key, value] of entriesToWrite) {
      localStorage.setItem(key, value);
      writtenKeys.push(key);
    }
    return { success: true };
  } catch (writeErr) {
    console.error('Storage write error during backup restore:', writeErr);
    // 4. Attempt atomic rollback of written keys from snapshot
    let rollbackFailed = false;
    for (const key of writtenKeys) {
      const originalValue = snapshots.get(key);
      try {
        if (originalValue === null || originalValue === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, originalValue);
        }
      } catch (rbErr) {
        console.error(`Rollback failed for key "${key}":`, rbErr);
        rollbackFailed = true;
      }
    }

    if (rollbackFailed) {
      return {
        success: false,
        rollbackFailed: true,
        error: 'Critical: Restoration failed and automatic rollback could not completely restore the previous state. Please preserve your downloaded backup file.',
      };
    }

    return {
      success: false,
      error: `Restoration failed: ${writeErr instanceof Error ? writeErr.message : 'localStorage write error'}. All data has been safely reverted to the pre-restore state.`,
    };
  }
}

