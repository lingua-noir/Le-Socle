import React, { useState } from 'react';
import { FrequencyBand, VocabularyItem, WordProgress, PartOfSpeech, UserSettings } from '../types';
import { FREQUENCY_BANDS, MOCK_VOCABULARY } from '../data/vocabulary';
import { speakFrench } from '../services/tts';
import { 
  getCumulativeLevelsProgression, 
  DEFAULT_MASTERY_STREAK_THRESHOLD 
} from '../services/progression';
import { 
  Volume2, 
  BookOpen, 
  GitBranch, 
  Sparkles, 
  Filter, 
  ChevronRight,
  Search,
  Lock,
  Unlock,
  Check,
  Target
} from 'lucide-react';

interface LearnViewProps {
  selectedBand: FrequencyBand;
  onSelectBand: (band: FrequencyBand) => void;
  progressMap: Record<string, WordProgress>;
  settings: UserSettings;
  onInspectWord: (word: VocabularyItem) => void;
  onPracticeWord: (word: VocabularyItem) => void;
  onPracticeWeakWords?: (band?: FrequencyBand) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  selectedBand,
  onSelectBand,
  progressMap,
  settings,
  onInspectWord,
  onPracticeWord,
  onPracticeWeakWords,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'weak' | 'new' | 'learning' | 'reviewing' | 'mastered'>('all');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const masteryThreshold = settings.masteryStreakThreshold || DEFAULT_MASTERY_STREAK_THRESHOLD;
  const levels = getCumulativeLevelsProgression(progressMap, MOCK_VOCABULARY, masteryThreshold);

  const currentLevelInfo = levels.find((l) => l.band === selectedBand) || levels[0];
  const currentBandInfo = FREQUENCY_BANDS.find((b) => b.id === selectedBand) || FREQUENCY_BANDS[0];

  // Words in this band
  const bandWords = MOCK_VOCABULARY.filter((w) => w.frequencyBand === selectedBand);

  // Apply filters
  const filteredWords = bandWords.filter((word) => {
    const prog = progressMap[word.id];
    const mastery = prog?.mastery || 'new';
    const streak = prog?.currentStreak ?? prog?.consecutiveCorrect ?? 0;
    const isMastered = mastery === 'mastered' || streak >= masteryThreshold;

    if (statusFilter === 'weak') {
      const hasBeenAttempted = prog && prog.totalAttempts > 0 && prog.mastery !== 'new';
      if (!hasBeenAttempted || isMastered) return false;
    } else if (statusFilter !== 'all' && mastery !== statusFilter) {
      return false;
    }

    if (posFilter !== 'all' && word.partOfSpeech !== posFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchFrench = word.french.toLowerCase().includes(q);
      const matchEnglish = word.english.toLowerCase().includes(q);
      const matchRank = word.rank.toString().includes(q);
      if (!matchFrench && !matchEnglish && !matchRank) return false;
    }
    return true;
  });

  const masteryBadges: Record<string, { label: string; style: string }> = {
    new: { label: 'New', style: 'bg-stone-100 text-stone-600' },
    learning: { label: 'Learning', style: 'bg-amber-50 text-amber-800 border border-amber-200' },
    reviewing: { label: 'Reviewing', style: 'bg-sky-50 text-sky-800 border border-sky-200' },
    mastered: { label: 'Mastered', style: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title & Introduction */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Curriculum & Vocabulary Levels
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Progress sequentially through five cumulative frequency tiers.
          </p>
        </div>
        
        {onPracticeWeakWords && currentLevelInfo.isUnlocked && currentLevelInfo.unmasteredCount > 0 && (
          <button
            id="practice-level-weak-btn"
            onClick={() => onPracticeWeakWords(selectedBand)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-2 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 transition-colors shrink-0"
          >
            <Target className="h-3.5 w-3.5 text-amber-700" />
            <span>Practice Weak Words in Level {currentLevelInfo.levelNumber} ({currentLevelInfo.unmasteredCount})</span>
          </button>
        )}
      </div>

      {/* The 5 Frequency Bands Tab Strip */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {levels.map((lvl) => {
          const isActive = selectedBand === lvl.band;
          return (
            <button
              key={lvl.levelNumber}
              id={`tab-band-${lvl.band.toLowerCase().replace(' ', '-')}`}
              onClick={() => onSelectBand(lvl.band)}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all relative overflow-hidden ${
                isActive
                  ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-xs'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                  L{lvl.levelNumber} • {lvl.rankRange}
                </span>
                {!lvl.isUnlocked ? (
                  <Lock className={`h-3 w-3 ${isActive ? 'text-stone-300' : 'text-stone-400'}`} />
                ) : lvl.isComplete ? (
                  <Check className={`h-3 w-3 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`} />
                ) : null}
              </div>

              <span className="mt-1 text-sm font-bold truncate w-full">
                {lvl.name.replace(`LEVEL ${lvl.levelNumber} — `, '')}
              </span>

              <div className="mt-2 w-full">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isActive ? 'text-stone-300' : 'text-stone-400'}>
                    {lvl.masteredCount}/{lvl.totalWordsInLevel}
                  </span>
                  <span className={isActive ? 'text-stone-200' : 'text-stone-600'}>
                    {lvl.masteryPercentage}%
                  </span>
                </div>
                <div className={`h-1 w-full rounded-full overflow-hidden ${isActive ? 'bg-stone-800' : 'bg-stone-100'}`}>
                  <div
                    className={`h-full ${isActive ? 'bg-emerald-400' : 'bg-stone-900'}`}
                    style={{ width: `${lvl.masteryPercentage}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Band Header Description */}
      <div className={`mb-6 rounded-2xl border p-5 shadow-2xs sm:p-6 ${
        currentLevelInfo.isUnlocked ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-50/80'
      }`}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-xl font-bold text-stone-900">
                {currentLevelInfo.name}
              </span>
              <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                {currentBandInfo.rankRange}
              </span>
              {!currentLevelInfo.isUnlocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                  <Lock className="h-3 w-3" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-600 max-w-2xl">
              {currentBandInfo.description}
            </p>
            {!currentLevelInfo.isUnlocked && (
              <p className="mt-2 text-xs text-stone-600 font-medium">
                * Unlock Rule: Master 80% of cumulative vocabulary in preceding levels to unlock new study in this tier ({currentLevelInfo.wordsNeededToUnlock} more words required).
              </p>
            )}
          </div>

          <div className="text-right sm:border-l sm:border-stone-100 sm:pl-6">
            <span className="text-xs text-stone-400">Level Mastery</span>
            <div className="text-xl font-bold text-stone-900">
              {currentLevelInfo.masteredCount} / {currentLevelInfo.totalWordsInLevel}
              <span className="text-xs font-normal text-stone-500 ml-1">({currentLevelInfo.masteryPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'weak', 'new', 'learning', 'reviewing', 'mastered'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st === 'weak' ? `Weak Words (${currentLevelInfo.unmasteredCount})` : st}
              </button>
            ))}
          </div>

          {/* Search and Part of Speech Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search French or English..."
                className="w-44 sm:w-56 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 pl-8 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
            </div>

            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="all">All Parts of Speech</option>
              <option value="verb">Verbs</option>
              <option value="noun">Nouns</option>
              <option value="adjective">Adjectives</option>
              <option value="adverb">Adverbs</option>
              <option value="preposition">Prepositions</option>
              <option value="conjunction">Conjunctions</option>
              <option value="pronoun">Pronouns</option>
              <option value="article">Articles</option>
            </select>
          </div>
        </div>
      </div>

      {/* Word Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-medium text-stone-600">No words match the selected filters</p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setPosFilter('all');
              setQuery('');
            }}
            className="mt-2 text-xs font-semibold text-stone-900 underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWords.map((word) => {
            const prog = progressMap[word.id];
            const mastery = prog?.mastery || 'new';
            const streak = prog?.currentStreak ?? prog?.consecutiveCorrect ?? 0;
            const badge = masteryBadges[mastery] || masteryBadges.new;

            return (
              <div
                key={word.id}
                id={`word-card-${word.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs transition-all hover:border-stone-300 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-600">
                      #{word.rank}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${badge.style}`}>
                        {badge.label}
                      </span>
                      {streak > 0 && (
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700">
                          {streak}/{masteryThreshold}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        {word.french}
                      </h3>
                      <p className="text-xs text-stone-500">{word.pronunciation}</p>
                    </div>

                    <button
                      onClick={() => speakFrench(word.french)}
                      className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                      title="Pronounce French"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-2 text-sm font-medium text-stone-700">
                    {word.english}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                    <span className="capitalize">{word.partOfSpeech}</span>
                    {word.gender && <span>• {word.gender}</span>}
                    {word.conjugation && <span>• Conj.</span>}
                    {word.genderForms && <span>• M/F</span>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                  <button
                    onClick={() => onInspectWord(word)}
                    className="font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => onPracticeWord(word)}
                    className="flex items-center gap-1 font-semibold text-stone-900 hover:text-stone-700 transition-colors"
                  >
                    <span>Practice</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
