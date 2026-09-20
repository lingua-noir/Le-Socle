import React from 'react';
import { WordProgress, UserStats, UserSettings } from '../types';
import { MOCK_VOCABULARY, FREQUENCY_BANDS } from '../data/vocabulary';
import { getDueWords } from '../services/storage';
import { 
  getCumulativeLevelsProgression, 
  getWeakWords, 
  DEFAULT_MASTERY_STREAK_THRESHOLD 
} from '../services/progression';
import { 
  Flame, 
  Target, 
  CheckCircle2, 
  RotateCcw,
  Sparkles, 
  TrendingUp, 
  Clock, 
  History, 
  Check, 
  X, 
  Sliders,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';

interface StatsViewProps {
  progressMap: Record<string, WordProgress>;
  userStats: UserStats;
  settings: UserSettings;
  onResetProgress: () => void;
  onSeedDemoProgress: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  progressMap,
  userStats,
  settings,
  onResetProgress,
  onSeedDemoProgress,
}) => {
  const masteryThreshold = settings.masteryStreakThreshold || DEFAULT_MASTERY_STREAK_THRESHOLD;
  const levels = getCumulativeLevelsProgression(progressMap, MOCK_VOCABULARY, masteryThreshold);
  const weakWords = getWeakWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold);
  const totalWords = MOCK_VOCABULARY.length;
  const dueWords = getDueWords(progressMap, masteryThreshold);

  let wordsMastered = 0;
  let wordsReviewing = 0;
  let wordsLearning = 0;
  let wordsNew = 0;
  let wordsEncountered = 0;

  // Recall Quality Granular Totals
  let totalExactCorrect = 0;
  let totalAcceptedTypo = 0;
  let totalIncorrectQuality = 0;
  let totalRevealedQuality = 0;

  Object.values(progressMap).forEach((p) => {
    if (p.timesReviewed > 0) {
      wordsEncountered++;
    }
    if (p.mastery === 'mastered' || p.currentStreak >= masteryThreshold) wordsMastered++;
    else if (p.mastery === 'reviewing') wordsReviewing++;
    else if (p.mastery === 'learning') wordsLearning++;
    else wordsNew++;

    totalExactCorrect += p.totalExactCorrect || 0;
    totalAcceptedTypo += p.totalAcceptedTypo || 0;
    totalIncorrectQuality += p.totalIncorrect || 0;
    totalRevealedQuality += p.totalRevealed || 0;
  });

  const totalAttempts = userStats.totalReviewed || 0;
  const correctAttempts = userStats.totalCorrect || 0;
  const incorrectAttempts = userStats.totalIncorrect ?? Math.max(0, totalAttempts - correctAttempts);
  const accuracyRate = totalAttempts > 0
    ? Math.round((correctAttempts / totalAttempts) * 100)
    : 100;

  const ratings = userStats.ratingDistribution || { again: 0, hard: 0, good: 0, easy: 0 };
  const totalRatings = ratings.again + ratings.hard + ratings.good + ratings.easy;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-stone-200/80 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Learning Analytics & Progression
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Active recall accuracy, unlock milestone compliance, and spaced repetition metrics.
          </p>
        </div>

        {/* PM / Testing controls */}
        <div className="flex items-center gap-2">
          <button
            id="seed-demo-progress-btn"
            onClick={onSeedDemoProgress}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors"
            title="Reset to initial test distribution"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Load Sample State</span>
          </button>
          <button
            id="reset-progress-btn"
            onClick={() => {
              if (confirm('Are you sure you want to reset all vocabulary progress and review stats?')) {
                onResetProgress();
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 shadow-2xs hover:text-rose-600 hover:border-rose-200 transition-colors"
            title="Clear all progress to zero"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Progress</span>
          </button>
        </div>
      </div>

      {/* Row 1: High-Level Metric Tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        
        {/* Total Attempts */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total Attempts</span>
            <Target className="h-4 w-4 text-stone-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {totalAttempts}
          </p>
          <span className="text-[11px] text-stone-500">
            {correctAttempts} correct • {incorrectAttempts} incorrect
          </span>
        </div>

        {/* Accuracy */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Accuracy</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {accuracyRate}%
          </p>
          <span className="text-[11px] text-stone-500">
            Active recall production rate
          </span>
        </div>

        {/* Words Mastered */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Mastered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {wordsMastered}
          </p>
          <span className="text-[11px] text-stone-500">
            {weakWords.length} in Weak Words pool
          </span>
        </div>

        {/* Current Streak */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Study Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {userStats.streakDays}
          </p>
          <span className="text-[11px] text-stone-500">
            consecutive study days
          </span>
        </div>
      </div>

      {/* Row 2: Recall Quality Granular Breakdown */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
        <div className="mb-4">
          <h2 className="font-serif text-lg font-bold text-stone-900">
            Recall Production Quality
          </h2>
          <p className="text-xs text-stone-500">
            Tracking exact productions (which advance mastery streaks), accepted typos (which preserve streaks), incorrect productions, and revelations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              Exact Correct
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {totalExactCorrect}
            </p>
            <span className="text-[11px] text-emerald-700/80">
              Advances mastery streak
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
              Accepted Typos
            </span>
            <p className="mt-1 text-2xl font-bold text-amber-950">
              {totalAcceptedTypo}
            </p>
            <span className="text-[11px] text-amber-700/80">
              Preserves current streak
            </span>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">
              Incorrect
            </span>
            <p className="mt-1 text-2xl font-bold text-rose-950">
              {totalIncorrectQuality}
            </p>
            <span className="text-[11px] text-rose-700/80">
              Streak reset to 0
            </span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
              Revealed
            </span>
            <p className="mt-1 text-2xl font-bold text-stone-950">
              {totalRevealedQuality}
            </p>
            <span className="text-[11px] text-stone-500">
              Revealed without attempt
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Spaced Repetition Rating Distribution */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Spaced Repetition Rating Distribution
            </h2>
            <p className="text-xs text-stone-500">
              Breakdown of manual self-evaluation ratings chosen during review sessions.
            </p>
          </div>
          <span className="text-xs font-medium text-stone-400">
            {totalRatings} total ratings logged
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">AGAIN</span>
            <p className="mt-1 text-2xl font-bold text-rose-950">{ratings.again}</p>
            <span className="text-[11px] text-rose-700/80">{totalRatings > 0 ? Math.round((ratings.again / totalRatings) * 100) : 0}% of ratings</span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">HARD</span>
            <p className="mt-1 text-2xl font-bold text-amber-950">{ratings.hard}</p>
            <span className="text-[11px] text-amber-700/80">{totalRatings > 0 ? Math.round((ratings.hard / totalRatings) * 100) : 0}% of ratings</span>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block">GOOD</span>
            <p className="mt-1 text-2xl font-bold text-sky-950">{ratings.good}</p>
            <span className="text-[11px] text-sky-700/80">{totalRatings > 0 ? Math.round((ratings.good / totalRatings) * 100) : 0}% of ratings</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">EASY</span>
            <p className="mt-1 text-2xl font-bold text-emerald-950">{ratings.easy}</p>
            <span className="text-[11px] text-emerald-700/80">{totalRatings > 0 ? Math.round((ratings.easy / totalRatings) * 100) : 0}% of ratings</span>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Active Recall History */}
      {userStats.recentHistory && userStats.recentHistory.length > 0 && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4.5 w-4.5 text-stone-700" />
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Recent Review History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200/80 text-stone-400 uppercase tracking-wider">
                <tr>
                  <th className="pb-2 font-medium">Prompt (EN)</th>
                  <th className="pb-2 font-medium">Correct (FR)</th>
                  <th className="pb-2 font-medium">Your Input</th>
                  <th className="pb-2 font-medium">Result</th>
                  <th className="pb-2 font-medium">Rating</th>
                  <th className="pb-2 font-medium text-right">Next Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {userStats.recentHistory.slice(0, 10).map((log) => {
                  const ratingBadge: Record<string, string> = {
                    again: 'bg-rose-50 text-rose-800 border-rose-200',
                    hard: 'bg-amber-50 text-amber-800 border-amber-200',
                    good: 'bg-sky-50 text-sky-800 border-sky-200',
                    easy: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  };

                  const nextDueFormatted = new Date(log.nextDueAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-stone-50/50">
                      <td className="py-2.5 font-medium text-stone-700">{log.wordEnglish}</td>
                      <td className="py-2.5 font-bold text-stone-900">{log.wordFrench}</td>
                      <td className="py-2.5 font-mono text-stone-600">
                        {log.userAnswer || <span className="italic text-stone-400">(Revealed)</span>}
                      </td>
                      <td className="py-2.5">
                        {log.isCorrect ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <Check className="h-3.5 w-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <X className="h-3.5 w-3.5" /> Incorrect
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${ratingBadge[log.rating] || 'bg-stone-100 text-stone-700'}`}>
                          {log.rating}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-stone-500">
                        {nextDueFormatted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 5: Progress by Level (5 Cumulative Levels) */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">
              The 5 Cumulative Progression Levels
            </h2>
            <p className="text-xs text-stone-500">
              Unlock requirement: 80% cumulative mastery of all preceding tiers
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {levels.map((lvl) => {
            return (
              <div key={lvl.levelNumber} className="border-b border-stone-100 pb-5 last:border-0 last:pb-0">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-500">
                      LEVEL {lvl.levelNumber}
                    </span>
                    <span className="text-sm font-bold text-stone-900">
                      {lvl.name.replace(`LEVEL ${lvl.levelNumber} — `, '')}
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      ({lvl.rankRange})
                    </span>
                    {!lvl.isUnlocked && (
                      <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-stone-500">
                      {lvl.masteredCount} mastered • {lvl.unmasteredCount} in weak pool
                    </span>
                    <span className="font-bold text-stone-900 min-w-8 text-right">
                      {lvl.masteryPercentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-stone-100 flex">
                  <div
                    className={`transition-all duration-300 ${lvl.isComplete ? 'bg-emerald-600' : 'bg-stone-900'}`}
                    style={{ width: `${lvl.masteryPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
