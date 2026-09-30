import React from 'react';
import { WordProgress, UserStats, FrequencyBand, NavigationTab, UserSettings } from '../types';
import { MOCK_VOCABULARY } from '../data/vocabulary';
import { 
  getCumulativeLevelsProgression, 
  getWeakWords, 
  getNewWords, 
  getSpacedDueWords, 
  DEFAULT_MASTERY_STREAK_THRESHOLD,
  UNLOCK_THRESHOLD_RATIO
} from '../services/progression';
import { 
  Sparkles, 
  Layers, 
  Flame, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Lock,
  Unlock,
  Target,
  RotateCcw,
  Check
} from 'lucide-react';
import { ReviewModeFilter } from './ReviewView';

interface HomeViewProps {
  progressMap: Record<string, WordProgress>;
  userStats: UserStats;
  settings: UserSettings;
  onNavigate: (tab: NavigationTab) => void;
  onStartReview: (mode: ReviewModeFilter, band?: FrequencyBand | null) => void;
  onSelectBandForLearn: (band: FrequencyBand) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  progressMap,
  userStats,
  settings,
  onNavigate,
  onStartReview,
  onSelectBandForLearn,
}) => {
  const masteryThreshold = settings.masteryStreakThreshold || DEFAULT_MASTERY_STREAK_THRESHOLD;
  const previewLocked = Boolean(settings.previewLockedLevels);
  const levels = getCumulativeLevelsProgression(progressMap, MOCK_VOCABULARY, masteryThreshold, previewLocked);

  const dueWords = getSpacedDueWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold, previewLocked);
  const weakWords = getWeakWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold, previewLocked);
  const newWords = getNewWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold, previewLocked);

  // Overall cumulative calculations
  const totalCorpusTarget = 2500;
  const finalCorpusUnlockTarget = 2000; // 80% of 2,500
  
  // Total mastered in dataset
  let totalMastered = 0;
  let totalReviewing = 0;
  let totalLearning = 0;
  let totalNew = 0;

  MOCK_VOCABULARY.forEach((item) => {
    const p = progressMap[item.id];
    if (p && (p.mastery === 'mastered' || p.currentStreak >= masteryThreshold)) totalMastered++;
    else if (p && p.mastery === 'reviewing') totalReviewing++;
    else if (p && p.mastery === 'learning') totalLearning++;
    else totalNew++;
  });

  const totalMockWords = MOCK_VOCABULARY.length;
  const overallMasteryPct = totalMockWords > 0 
    ? Math.round((totalMastered / totalMockWords) * 100) 
    : 0;

  // Active level to highlight
  const currentActiveLevel = levels.find((l) => l.isCurrentActiveLevel) || levels[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Hero Header */}
      <div className="mb-10 flex flex-col justify-between gap-6 border-b border-stone-200/80 pb-8 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100/80 px-3 py-1 text-xs font-medium text-stone-700 mb-3">
            <BookOpen className="h-3.5 w-3.5 text-stone-600" />
            <span>French Frequency Mastery Progression</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            LE SOCLE
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
            A 5-level cumulative French campaign. Master 80% of each level range to unlock the next, 
            while retaining previous vocabulary through ongoing spaced recall.
          </p>
        </div>

        {/* Quick Snapshot Metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-2xs">
            <Flame className="h-4.5 w-4.5 text-amber-500" />
            <div>
              <span className="text-[11px] font-medium text-stone-400 block uppercase tracking-wider">Streak</span>
              <span className="text-base font-bold text-stone-900">{userStats.streakDays} days</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-2xs">
            <Target className="h-4.5 w-4.5 text-stone-500" />
            <div>
              <span className="text-[11px] font-medium text-stone-400 block uppercase tracking-wider">Mastered</span>
              <span className="text-base font-bold text-emerald-600">{totalMastered} words</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Banners */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        
        {/* 1. Spaced Due Review */}
        <div className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Spaced Recall
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                dueWords.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {dueWords.length} due
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-stone-900">Review Queue</h3>
            <p className="mt-1 text-xs text-stone-500">
              {dueWords.length > 0 
                ? 'Vocabulary scheduled for recall today to prevent forgetting.'
                : 'All reviews up to date! Great job staying ahead.'}
            </p>
          </div>

          <button
            id="start-due-review-btn"
            onClick={() => onStartReview('due')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-50 transition-colors hover:bg-stone-800"
          >
            <span>{dueWords.length > 0 ? `Start Review (${dueWords.length} Due)` : 'Start Daily Session'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 2. The Weak Words Pool */}
        <div className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Needs Reinforcement
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                {weakWords.length} unmastered
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-stone-900">Weak Words Pool</h3>
            <p className="mt-1 text-xs text-stone-600">
              Unlocked vocabulary that has not yet reached Mastered ({masteryThreshold} streak).
            </p>
          </div>

          <button
            id="start-weak-review-btn"
            onClick={() => onStartReview('weak')}
            disabled={weakWords.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100/70 disabled:opacity-50"
          >
            <Target className="h-3.5 w-3.5 text-amber-700" />
            <span>Practice Weak Words ({weakWords.length})</span>
          </button>
        </div>

        {/* 3. New Intake from Active Level */}
        <div className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Level {currentActiveLevel.levelNumber} Intake
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
                {newWords.length} new
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-stone-900">{currentActiveLevel.name}</h3>
            <p className="mt-1 text-xs text-stone-500">
              Acquire new words in strict frequency-rank order from the unlocked level.
            </p>
          </div>

          <button
            id="start-new-words-btn"
            onClick={() => onStartReview('new')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-50"
          >
            <span>Learn Next Words</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Global Mastery Snapshot & Cumulative Progress */}
      <div className="mb-10 rounded-xl border border-stone-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">
              Cumulative Corpus Progress
            </h2>
            <p className="text-xs text-stone-500">
              Target: 2,000 / 2,500 core French units mastered (80% threshold) • Active Exposure: {totalMastered + totalReviewing + totalLearning} words
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-serif text-stone-900">{totalMastered}</span>
            <span className="text-xs text-stone-400"> / {totalMockWords} words mastered ({overallMasteryPct}%)</span>
          </div>
        </div>

        {/* Dual-Indicator Visual Progress Bar: Exposure vs Mastered */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 flex">
          {/* Mastered portion */}
          <div
            className="h-full bg-stone-900 transition-all duration-500"
            style={{ width: `${overallMasteryPct}%` }}
            title={`Mastered: ${totalMastered} words (${overallMasteryPct}%)`}
          />
          {/* Active Exposure (Reviewing + Learning) portion */}
          <div
            className="h-full bg-stone-400/60 transition-all duration-500"
            style={{ width: `${totalMockWords > 0 ? Math.round(((totalReviewing + totalLearning) / totalMockWords) * 100) : 0}%` }}
            title={`In Progress (Reviewing + Learning): ${totalReviewing + totalLearning} words`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-stone-600">Mastered ({masteryThreshold}+ streak):</span>
            <span className="font-semibold text-stone-900">{totalMastered}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-stone-600">Reviewing:</span>
            <span className="font-semibold text-stone-900">{totalReviewing}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-stone-600">Learning:</span>
            <span className="font-semibold text-stone-900">{totalLearning}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
            <span className="text-stone-600">Unseen:</span>
            <span className="font-semibold text-stone-900">{totalNew}</span>
          </div>
        </div>
      </div>

      {/* THE FIVE CUMULATIVE LEVELS */}
      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-200 pb-3">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
              The Five Levels
            </h2>
            <p className="text-xs text-stone-500">
              Sequential unlocking: Master 80% of cumulative vocabulary to unlock each subsequent tier.
            </p>
          </div>
          <div className="text-xs text-stone-400">
            Rule: 80% to unlock • 100% to complete
          </div>
        </div>

        <div className="space-y-4">
          {levels.map((lvl) => {
            return (
              <div
                key={lvl.levelNumber}
                id={`level-card-${lvl.levelNumber}`}
                className={`relative rounded-xl border p-5 transition-all ${
                  lvl.isUnlocked
                    ? lvl.isComplete
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : lvl.isCurrentActiveLevel
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900 shadow-xs'
                      : 'border-stone-200 bg-white shadow-2xs'
                    : 'border-stone-200 bg-stone-50/60 opacity-85'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Level Identity & Status */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        lvl.isUnlocked
                          ? 'bg-stone-900 text-stone-50'
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        LEVEL {lvl.levelNumber}
                      </span>
                      
                      <span className="font-mono text-xs text-stone-500">
                        {lvl.rankRange}
                      </span>

                      {/* Status Badges */}
                      {lvl.isComplete ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <Check className="h-3 w-3" />
                          <span>LEVEL COMPLETE</span>
                        </span>
                      ) : lvl.masteryPercentage >= 80 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                          <Unlock className="h-3 w-3" />
                          <span>UNLOCKED (80%+)</span>
                        </span>
                      ) : lvl.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                          <span>IN PROGRESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-200/80 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                          <Lock className="h-3 w-3" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-stone-900">
                      {lvl.name}
                    </h3>
                    
                    {/* Locked Requirement explanation */}
                    {!lvl.isUnlocked && (
                      <p className="mt-1 text-xs text-stone-500 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span>
                          Master 80% of cumulative vocabulary to unlock ({lvl.wordsNeededToUnlock} more words required in preceding levels).
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Middle: Progress Bar & Mastered Count */}
                  <div className="w-full sm:w-64">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500">
                        {lvl.isUnlocked ? (
                          `${lvl.masteredCount} / ${lvl.totalWordsInLevel} mastered`
                        ) : (
                          `${lvl.unlockProgressPercentage}% toward unlock`
                        )}
                      </span>
                      <span className="font-semibold text-stone-900">
                        {lvl.isUnlocked ? `${lvl.masteryPercentage}%` : `Req: 80%`}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full transition-all duration-500 ${
                          lvl.isComplete 
                            ? 'bg-emerald-600' 
                            : lvl.isUnlocked 
                            ? 'bg-stone-900' 
                            : 'bg-stone-300'
                        }`}
                        style={{ 
                          width: lvl.isUnlocked 
                            ? `${lvl.masteryPercentage}%` 
                            : `${lvl.unlockProgressPercentage}%` 
                        }}
                      />
                    </div>

                    {lvl.isUnlocked && lvl.unmasteredCount > 0 && (
                      <span className="text-[11px] text-stone-400 mt-1 block">
                        {lvl.unmasteredCount} {lvl.unmasteredCount === 1 ? 'word' : 'words'} in weak words pool
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {lvl.isUnlocked ? (
                      <>
                        {lvl.unmasteredCount > 0 && (
                          <button
                            onClick={() => onStartReview('weak', lvl.band)}
                            className="rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                            title="Practice unmastered words in this level"
                          >
                            Practice Weak ({lvl.unmasteredCount})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onSelectBandForLearn(lvl.band);
                            onNavigate('learn');
                          }}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors"
                        >
                          Explore
                        </button>
                      </>
                    ) : (
                      <div className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-400 font-mono">
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
