export type FrequencyBand = 
  | 'ESSENTIAL'
  | 'FOUNDATION'
  | 'EVERYDAY'
  | 'INDEPENDENT'
  | 'ADVANCED CORE';

export interface FrequencyBandInfo {
  id: FrequencyBand;
  name: string;
  rankRange: string;
  minRank: number;
  maxRank: number;
  description: string;
  tagline: string;
}

export type PartOfSpeech =
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'expression'
  | 'article';

export type Gender = 'masculine' | 'feminine' | 'both';

export interface PresentConjugation {
  je: string;
  tu: string;
  il_elle: string;
  nous: string;
  vous: string;
  ils_elles: string;
}

export interface RelatedWord {
  french: string;
  english: string;
  relationship: string;
}

export interface CommonExpression {
  french: string;
  english: string;
}

export interface GenderForms {
  masculine: string;
  feminine: string;
  masculinePlural?: string;
  femininePlural?: string;
  notes?: string;
}

export interface VocabularyItem {
  id: string;
  rank: number;
  french: string;
  english: string;
  lemma?: string;
  partOfSpeech: PartOfSpeech;
  gender?: Gender;
  plural?: string;
  pronunciation: string;
  frequencyBand: FrequencyBand;
  exampleSentence?: string;
  exampleTranslation?: string;
  conjugation?: PresentConjugation;
  genderForms?: GenderForms;
  relatedWords?: RelatedWord[];
  commonExpressions?: CommonExpression[];
  notes?: string;
  flag?: string;
  enrichmentStatus?: string;
}

export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered';

export type SpacedRepetitionRating = 'again' | 'hard' | 'good' | 'easy';

export type RecallQuality = 'exact_correct' | 'accepted_typo' | 'incorrect' | 'revealed';

export interface ReviewIntervals {
  again: number; // in days
  hard: number;  // in days
  good: number;  // in days
  easy: number;  // in days
}

export interface UserSettings {
  typoTolerance: number; // 50 to 100 percentage (default 80)
  speechRate: number;    // 0.5 to 1.5 (default 0.9)
  intervals: ReviewIntervals;
  masteryStreakThreshold: number; // Consecutive recalls required for Mastered (default 7)
}

export type RecallDirection = 'en_to_fr' | 'fr_to_en';

export interface WordProgress {
  wordId: string;
  mastery: MasteryLevel;
  totalAttempts: number;
  totalExactCorrect: number;
  totalAcceptedTypo: number;
  totalIncorrect: number;
  totalRevealed: number;
  currentStreak: number; // Consecutive successful recalls
  lastRecallQuality?: RecallQuality;
  lastReviewedAt?: string;
  nextDueAt?: string;
  lastRating?: SpacedRepetitionRating;
  // Directional recall statistics
  attemptsEnFr?: number;
  correctEnFr?: number;
  attemptsFrEn?: number;
  correctFrEn?: number;
  // Compatibility aliases
  timesReviewed: number;
  timesCorrect: number;
  consecutiveCorrect: number;
}

export interface LevelProgression {
  levelNumber: number; // 1 to 5
  band: FrequencyBand;
  name: string;
  rankRange: string;
  minRank: number;
  maxRank: number;
  cumulativeTargetRank: number;
  isUnlocked: boolean;
  isComplete: boolean;
  isCurrentActiveLevel: boolean;
  masteredCount: number;
  totalWordsInLevel: number;
  masteryPercentage: number;
  unmasteredCount: number;
  cumulativeMasteredCount: number;
  cumulativeTotalWords: number;
  cumulativeMasteryPercentage: number;
  unlockRequiredMasteredCount: number;
  wordsNeededToUnlock: number;
  unlockProgressPercentage: number;
}


export interface ReviewLogEntry {
  id: string;
  wordId: string;
  wordFrench: string;
  wordEnglish: string;
  userAnswer: string;
  isCorrect: boolean;
  rating: SpacedRepetitionRating;
  reviewedAt: string;
  nextDueAt: string;
  direction?: RecallDirection;
}

export interface UserStats {
  totalReviewed: number;
  totalCorrect: number;
  totalIncorrect: number;
  streakDays: number;
  lastStudyDate: string | null;
  reviewedTodayCount: number;
  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  recentHistory: ReviewLogEntry[];
}

export type NavigationTab = 'home' | 'learn' | 'review' | 'stats' | 'search' | 'settings';

