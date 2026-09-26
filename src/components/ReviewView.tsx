import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  VocabularyItem, 
  WordProgress, 
  FrequencyBand, 
  UserStats, 
  UserSettings, 
  SpacedRepetitionRating,
  RecallDirection
} from '../types';
import { MOCK_VOCABULARY } from '../data/vocabulary';
import { speakFrench, speakEnglish } from '../services/tts';
import { evaluateFrenchAnswer, evaluateEnglishAnswer, EvaluationResult } from '../services/evaluator';
import { 
  getWeakWords, 
  getNewWords, 
  getSpacedDueWords, 
  getCumulativeLevelsProgression, 
  DEFAULT_MASTERY_STREAK_THRESHOLD,
  buildReviewSessionQueue
} from '../services/progression';
import { 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  GitBranch,
  Layers,
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  Target,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';

export type ReviewModeFilter = 'due' | 'weak' | 'new' | 'all';

interface ReviewViewProps {
  progressMap: Record<string, WordProgress>;
  userStats: UserStats;
  settings: UserSettings;
  onRecordResult: (
    wordId: string,
    isCorrect: boolean,
    rating: SpacedRepetitionRating,
    userAnswer: string,
    isExact?: boolean,
    direction?: RecallDirection
  ) => void;
  initialWord?: VocabularyItem | null;
  initialMode?: ReviewModeFilter;
  initialBand?: FrequencyBand | null;
  onReturnHome: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  progressMap,
  userStats,
  settings,
  onRecordResult,
  initialWord,
  initialMode = 'due',
  initialBand = null,
  onReturnHome,
}) => {
  const [selectedMode, setSelectedMode] = useState<ReviewModeFilter>(initialMode);
  const [selectedBandFilter, setSelectedBandFilter] = useState<FrequencyBand | 'all'>(initialBand || 'all');
  const [sessionQueue, setSessionQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Active recall interaction state
  const [currentDirection, setCurrentDirection] = useState<RecallDirection>('en_to_fr');
  const [userInput, setUserInput] = useState('');
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [wasRevealedWithoutTyping, setWasRevealedWithoutTyping] = useState(false);

  // Collapsible supplementary sections (collapsed by default)
  const [showConjugation, setShowConjugation] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [showGenderForms, setShowGenderForms] = useState(false);

  // Session summary stats
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    exactCorrect: 0,
    typos: 0,
    incorrect: 0,
    revealed: 0,
    totalAnswered: 0,
    enToFrTotal: 0,
    enToFrCorrect: 0,
    frToEnTotal: 0,
    frToEnCorrect: 0,
    ratings: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
  });
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const masteryThreshold = settings.masteryStreakThreshold || DEFAULT_MASTERY_STREAK_THRESHOLD;

  // Progression context
  const levelsProgression = getCumulativeLevelsProgression(progressMap, MOCK_VOCABULARY, masteryThreshold);
  const unlockedBands = new Set(levelsProgression.filter((l) => l.isUnlocked).map((l) => l.band));

  // Maintain ref to latest progressMap so session answers don't trigger unwanted re-initialization
  const progressMapRef = useRef(progressMap);
  useEffect(() => {
    progressMapRef.current = progressMap;
  }, [progressMap]);

  // Focus input helper
  const focusInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  }, []);

  // Initialize review queue without random shuffling:
  // Strict frequency-rank order for new vocabulary discovery.
  // Spaced repetition schedule order for due reviews.
  const initQueue = useCallback((
    mode: ReviewModeFilter,
    bandFilter: FrequencyBand | 'all',
    specificWord?: VocabularyItem | null
  ) => {
    const items = buildReviewSessionQueue(progressMapRef.current, MOCK_VOCABULARY, {
      mode,
      bandFilter,
      specificWord,
      masteryThreshold,
      newBatchSize: 5,
    });

    setSessionQueue(items);
    setCurrentIndex(0);
    // Dynamic random direction (approx. 50/50 distribution) per card
    setCurrentDirection(Math.random() < 0.5 ? 'en_to_fr' : 'fr_to_en');
    setUserInput('');
    setIsEvaluated(false);
    setEvaluationResult(null);
    setWasRevealedWithoutTyping(false);
    setShowConjugation(false);
    setShowRelated(false);
    setShowGenderForms(false);
    setSessionStats({
      correct: 0,
      exactCorrect: 0,
      typos: 0,
      incorrect: 0,
      revealed: 0,
      totalAnswered: 0,
      enToFrTotal: 0,
      enToFrCorrect: 0,
      frToEnTotal: 0,
      frToEnCorrect: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    });
    setIsSessionComplete(false);
    focusInput();
  }, [masteryThreshold, focusInput]);

  useEffect(() => {
    if (initialWord) {
      initQueue('all', 'all', initialWord);
    } else {
      initQueue(selectedMode, selectedBandFilter);
    }
  }, [initialWord, selectedMode, selectedBandFilter, initQueue]);

  // Auto-focus input when card changes or mounts
  useEffect(() => {
    if (!isEvaluated && !isSessionComplete) {
      focusInput();
    }
  }, [currentIndex, isEvaluated, isSessionComplete, focusInput]);

  const currentWord = sessionQueue[currentIndex];

  // CHECK ANSWER: Evaluates user's typed input based on current card direction
  const handleCheckAnswer = () => {
    if (!currentWord || isEvaluated) return;

    const result = currentDirection === 'en_to_fr'
      ? evaluateFrenchAnswer(userInput, currentWord.french, settings.typoTolerance)
      : evaluateEnglishAnswer(userInput, currentWord.english, settings.typoTolerance);

    setEvaluationResult(result);
    setWasRevealedWithoutTyping(false);
    setIsEvaluated(true);

    // Speak native French pronunciation on evaluation
    speakFrench(currentWord.french);
  };

  // REVEAL ANSWER: Secondary option when user does not know the answer
  const handleRevealAnswer = () => {
    if (!currentWord || isEvaluated) return;

    const emptyEval: EvaluationResult = {
      isCorrect: false,
      isExact: false,
      hasAccentDifference: false,
      hasMinorTypo: false,
      similarity: 0,
      feedbackMessage: 'Revealed without answer',
    };
    setEvaluationResult(emptyEval);
    setWasRevealedWithoutTyping(true);
    setIsEvaluated(true);

    // Speak French audio
    speakFrench(currentWord.french);
  };

  // SUBMIT RATING: Applies manual spaced repetition rating and updates progression
  const handleSelectRating = (rating: SpacedRepetitionRating) => {
    if (!currentWord || !isEvaluated || !evaluationResult) return;

    const isCorrect = evaluationResult.isCorrect;
    const isExact = evaluationResult.isExact;
    const answerRecorded = wasRevealedWithoutTyping ? '' : userInput;
    const directionOfCard = currentDirection;

    // Record review result with rating, isExact, settings, and card direction
    onRecordResult(currentWord.id, isCorrect, rating, answerRecorded, isExact, directionOfCard);

    setSessionStats((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      exactCorrect: isExact ? prev.exactCorrect + 1 : prev.exactCorrect,
      typos: (isCorrect && !isExact) ? prev.typos + 1 : prev.typos,
      incorrect: (!isCorrect && !wasRevealedWithoutTyping) ? prev.incorrect + 1 : prev.incorrect,
      revealed: wasRevealedWithoutTyping ? prev.revealed + 1 : prev.revealed,
      totalAnswered: prev.totalAnswered + 1,
      enToFrTotal: directionOfCard === 'en_to_fr' ? prev.enToFrTotal + 1 : prev.enToFrTotal,
      enToFrCorrect: directionOfCard === 'en_to_fr' && isCorrect ? prev.enToFrCorrect + 1 : prev.enToFrCorrect,
      frToEnTotal: directionOfCard === 'fr_to_en' ? prev.frToEnTotal + 1 : prev.frToEnTotal,
      frToEnCorrect: directionOfCard === 'fr_to_en' && isCorrect ? prev.frToEnCorrect + 1 : prev.frToEnCorrect,
      ratings: {
        ...prev.ratings,
        [rating]: prev.ratings[rating] + 1,
      },
    }));

    // Advance to next card
    if (currentIndex + 1 < sessionQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      // Pick random direction for next card
      setCurrentDirection(Math.random() < 0.5 ? 'en_to_fr' : 'fr_to_en');
      setUserInput('');
      setIsEvaluated(false);
      setEvaluationResult(null);
      setWasRevealedWithoutTyping(false);
      setShowConjugation(false);
      setShowRelated(false);
      setShowGenderForms(false);
      focusInput();
    } else {
      setIsSessionComplete(true);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // Before answer is evaluated:
      if (!isEvaluated) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCheckAnswer();
        } else if (e.code === 'Space' && !isInputFocused) {
          // Reveal Answer only when input is NOT focused
          e.preventDefault();
          handleRevealAnswer();
        }
      } else {
        // After answer is evaluated: rating keys 1, 2, 3, 4
        if (e.key === '1') {
          e.preventDefault();
          handleSelectRating('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectRating('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectRating('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleSelectRating('easy');
        }
      }

      // Audio shortcuts
      if (e.key.toLowerCase() === 'e' && !isInputFocused && currentWord) {
        speakEnglish(currentWord.english);
      }
      if (e.key.toLowerCase() === 'f' && !isInputFocused && currentWord) {
        speakFrench(currentWord.french);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEvaluated, evaluationResult, currentWord, userInput, wasRevealedWithoutTyping]);

  // Pool counts for badge numbers
  const dueCount = getSpacedDueWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold).length;
  const weakCount = getWeakWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold).length;
  const newCount = getNewWords(progressMap, MOCK_VOCABULARY, undefined, masteryThreshold).length;

  // Session complete screen
  if (isSessionComplete || sessionQueue.length === 0) {
    const accuracy = sessionStats.totalAnswered > 0
      ? Math.round((sessionStats.correct / sessionStats.totalAnswered) * 100)
      : 100;

    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div 
          id="review-complete-card"
          className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-xs"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="h-7 w-7" />
          </div>

          <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-stone-900">
            {sessionQueue.length === 0 ? 'No Words In Queue' : 'Practice Session Complete'}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {sessionQueue.length === 0 
              ? 'There are currently no words matching your selected filter. Select another queue or practice weak words.'
              : 'Your active recall production and spaced repetition intervals have been updated.'}
          </p>

          {sessionStats.totalAnswered > 0 && (
            <>
              <div className="my-6 grid grid-cols-4 gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-center">
                <div>
                  <span className="block text-xs font-medium text-stone-400">Total</span>
                  <span className="text-lg font-bold text-stone-900">{sessionStats.totalAnswered}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-400">Exact</span>
                  <span className="text-lg font-bold text-emerald-600">{sessionStats.exactCorrect}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-400">Typos</span>
                  <span className="text-lg font-bold text-amber-600">{sessionStats.typos}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-stone-400">Accuracy</span>
                  <span className="text-lg font-bold text-stone-900">{accuracy}%</span>
                </div>
              </div>

              {/* Direction Breakdown */}
              {(sessionStats.enToFrTotal > 0 || sessionStats.frToEnTotal > 0) && (
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-left">
                    <span className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider">English → French</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-bold text-stone-800">
                        {sessionStats.enToFrCorrect}/{sessionStats.enToFrTotal}
                      </span>
                      <span className="text-stone-500 font-medium">
                        {sessionStats.enToFrTotal > 0 ? Math.round((sessionStats.enToFrCorrect / sessionStats.enToFrTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-left">
                    <span className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider">French → English</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-bold text-stone-800">
                        {sessionStats.frToEnCorrect}/{sessionStats.frToEnTotal}
                      </span>
                      <span className="text-stone-500 font-medium">
                        {sessionStats.frToEnTotal > 0 ? Math.round((sessionStats.frToEnCorrect / sessionStats.frToEnTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rating breakdown */}
              <div className="mb-6 rounded-xl border border-stone-100 bg-stone-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-2">
                  Rating Distribution
                </span>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-800 border border-rose-100">
                    <span className="block font-bold">Again</span>
                    <span className="text-sm font-semibold">{sessionStats.ratings.again}</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-800 border border-amber-100">
                    <span className="block font-bold">Hard</span>
                    <span className="text-sm font-semibold">{sessionStats.ratings.hard}</span>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-2 text-sky-800 border border-sky-100">
                    <span className="block font-bold">Good</span>
                    <span className="text-sm font-semibold">{sessionStats.ratings.good}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800 border border-emerald-100">
                    <span className="block font-bold">Easy</span>
                    <span className="text-sm font-semibold">{sessionStats.ratings.easy}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              id="review-again-btn"
              onClick={() => initQueue(selectedMode, selectedBandFilter)}
              className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Practice Again</span>
            </button>
            <button
              id="return-home-btn"
              onClick={onReturnHome}
              className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentProgress = currentWord ? progressMap[currentWord.id] : undefined;
  const currentMastery = currentProgress?.mastery || 'new';
  const currentStreak = currentProgress?.currentStreak ?? currentProgress?.consecutiveCorrect ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      
      {/* Header & Filter Controls */}
      <div className="mb-6 border-b border-stone-200/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold tracking-wide text-stone-900 uppercase flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-stone-400" />
                <span>Active Recall • {currentDirection === 'en_to_fr' ? 'English → French' : 'French → English'}</span>
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Card {currentIndex + 1} of {sessionQueue.length}
            </p>
          </div>

          {/* Filter Mode Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              id="filter-due-btn"
              onClick={() => {
                setSelectedMode('due');
                initQueue('due', selectedBandFilter);
              }}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedMode === 'due'
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Due Queue ({dueCount})
            </button>
            <button
              id="filter-weak-btn"
              onClick={() => {
                setSelectedMode('weak');
                initQueue('weak', selectedBandFilter);
              }}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedMode === 'weak'
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Weak Words ({weakCount})
            </button>
            <button
              id="filter-new-btn"
              onClick={() => {
                setSelectedMode('new');
                initQueue('new', selectedBandFilter);
              }}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedMode === 'new'
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              New Intake ({newCount})
            </button>
          </div>
        </div>

        {/* Dedicated Context Banners */}
        {selectedMode === 'weak' && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50/80 border border-amber-200/60 px-3 py-1.5 text-xs text-amber-900">
            <Target className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Weak Words Session:</strong> Practicing unmastered words in unlocked levels. Words leave this pool upon reaching Mastered ({masteryThreshold} streak).
            </span>
          </div>
        )}
        {selectedMode === 'new' && (
          <div className="flex items-center gap-2 rounded-lg bg-sky-50/80 border border-sky-200/60 px-3 py-1.5 text-xs text-sky-900">
            <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>
              <strong>New Vocabulary Queue:</strong> Introducing unlearned words in strict frequency-rank order (#1, #2, #3...).
            </span>
          </div>
        )}
        {selectedMode === 'due' && dueCount === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 border border-emerald-200/60 px-3 py-1.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>All Due Reviews Caught Up:</strong> Introducing the next unlearned vocabulary in strict frequency-rank order.
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full bg-stone-800 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
        />
      </div>

      {/* Main Review Card */}
      <div
        id="review-main-card"
        className={`relative overflow-hidden rounded-2xl border bg-white p-6 sm:p-8 shadow-xs transition-all duration-200 ${
          isEvaluated && evaluationResult?.isCorrect
            ? 'border-emerald-200 ring-1 ring-emerald-100'
            : isEvaluated && !evaluationResult?.isCorrect
            ? 'border-rose-200 ring-1 ring-rose-100'
            : 'border-stone-200'
        }`}
      >
        {/* Card Header: Rank & Metadata */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">
              #{currentWord.rank}
            </span>
            <span className="text-xs font-medium text-stone-500">
              {currentWord.frequencyBand}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="capitalize text-stone-400 font-mono">
              {currentWord.partOfSpeech}
              {currentWord.gender && ` (${currentWord.gender[0]})`}
            </span>
            <span className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize ${
              currentMastery === 'new'
                ? 'bg-sky-50 text-sky-700 border border-sky-200/60 font-semibold'
                : currentMastery === 'mastered'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {currentMastery === 'new' ? 'New' : 'Review'} · Streak {currentStreak}/{masteryThreshold}
            </span>
          </div>
        </div>

        {/* STEP 1: Prompt Area */}
        <div className="my-6 text-center sm:my-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 flex items-center justify-center gap-1.5">
            <ArrowRightLeft className="h-3 w-3 text-stone-400" />
            <span>{currentDirection === 'en_to_fr' ? 'ENGLISH TO FRENCH' : 'FRENCH TO ENGLISH'}</span>
          </p>

          <div className="mt-2 flex items-center justify-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              {currentDirection === 'en_to_fr' ? currentWord.english : currentWord.french}
            </h1>
            <button
              id="prompt-audio-btn"
              onClick={() => (currentDirection === 'en_to_fr' ? speakEnglish(currentWord.english) : speakFrench(currentWord.french))}
              title={currentDirection === 'en_to_fr' ? "Listen to English prompt (shortcut: E)" : "Listen to French prompt (shortcut: F)"}
              className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-2 text-xs text-stone-400">
            {isEvaluated 
              ? 'Review your recall below' 
              : currentDirection === 'en_to_fr'
              ? 'Type the French translation, then press ENTER'
              : 'Type the English translation, then press ENTER'}
          </p>
        </div>

        {/* STEP 2: Active Recall Input & Submit Area */}
        {!isEvaluated ? (
          <div className="mt-6 border-t border-stone-100 pt-6">
            <div className="relative">
              <input
                ref={inputRef}
                id="active-recall-input"
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={currentDirection === 'en_to_fr' ? "Type the French word or phrase..." : "Type the English word or phrase..."}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-4 py-3.5 pr-28 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-stone-900 transition-all"
              />
              <button
                id="check-answer-btn"
                onClick={handleCheckAnswer}
                disabled={!userInput.trim()}
                className="absolute right-2 top-2 bottom-2 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 text-xs font-semibold text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-900"
              >
                <span>Check</span>
                <Send className="h-3 w-3" />
              </button>
            </div>

            {/* Helper Bar: Keyboard hints and Reveal Answer */}
            <div className="mt-3 flex items-center justify-between text-xs text-stone-400 px-1">
              <span>Press <kbd className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600 border border-stone-200">ENTER</kbd> to submit</span>
              
              <button
                id="reveal-answer-btn"
                onClick={handleRevealAnswer}
                className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors"
                title="Don't know? Reveal answer (Space)"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Reveal Answer</span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 3: Evaluated Comparison Feedback */
          <div className="mt-6 space-y-6 border-t border-stone-100 pt-6">
            
            {/* Direct Side-by-Side Comparison */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              
              {/* User Input Result Box */}
              <div 
                id="user-answer-box"
                className={`rounded-xl border p-3.5 ${
                  evaluationResult?.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                    : 'border-rose-200 bg-rose-50/40 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1">
                  <span>Your Answer</span>
                  {evaluationResult?.isCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                      {evaluationResult.isExact ? 'Exact' : 'Accepted'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600">
                      <X className="h-3.5 w-3.5" />
                      {wasRevealedWithoutTyping ? 'Revealed' : 'Incorrect'}
                    </span>
                  )}
                </div>

                <div className="text-lg font-medium">
                  {wasRevealedWithoutTyping ? (
                    <span className="italic text-stone-400 text-sm">(Revealed without typing)</span>
                  ) : (
                    <span className={evaluationResult?.isCorrect ? 'text-emerald-950 font-semibold' : 'line-through text-rose-900'}>
                      {userInput}
                    </span>
                  )}
                </div>
              </div>

              {/* Correct Canonical Answer Box */}
              <div 
                id="canonical-answer-box"
                className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 text-stone-900"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  <span>{currentDirection === 'en_to_fr' ? 'Correct French' : 'Correct English'}</span>
                  <button
                    id="french-audio-btn"
                    onClick={() => speakFrench(currentWord.french)}
                    title="Listen to French (shortcut: F)"
                    className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-950"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>French</span>
                  </button>
                </div>

                <div className="text-xl font-bold font-serif text-stone-900 flex items-center justify-between">
                  <span>{currentDirection === 'en_to_fr' ? currentWord.french : currentWord.english}</span>
                  {currentDirection === 'en_to_fr' && (
                    <span className="text-xs font-normal font-sans text-stone-500">
                      {currentWord.pronunciation}
                    </span>
                  )}
                </div>
                {currentDirection === 'fr_to_en' && (
                  <div className="mt-1 text-xs text-stone-500 flex items-center gap-2">
                    <span className="font-medium text-stone-700">{currentWord.french}</span>
                    <span>•</span>
                    <span className="italic">{currentWord.pronunciation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Typo / Accent Feedback Notice */}
            {evaluationResult?.feedbackMessage && (
              <div className={`rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 border ${
                evaluationResult.isExact 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : evaluationResult.isCorrect
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {evaluationResult.isCorrect && !evaluationResult.isExact ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                ) : evaluationResult.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <div className="flex-1">
                  <span>{evaluationResult.feedbackMessage}</span>
                  {evaluationResult.isCorrect && !evaluationResult.isExact && (
                    <span className="block text-[11px] text-amber-700 mt-0.5">
                      Accepted typo preserved your streak, but exact spelling is required to achieve Mastered status ({masteryThreshold} streak).
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Contextual Example Sentence */}
            {currentWord.exampleSentence && (
              <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Example Sentence
                  </span>
                  <button
                    onClick={() => speakFrench(currentWord.exampleSentence || '')}
                    className="text-stone-400 hover:text-stone-700"
                    title="Pronounce example sentence"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="font-serif text-sm font-medium text-stone-900">
                  {currentWord.exampleSentence}
                </p>
                {currentWord.exampleTranslation && (
                  <p className="mt-0.5 text-xs text-stone-500">
                    {currentWord.exampleTranslation}
                  </p>
                )}
              </div>
            )}

            {/* Collapsible Present Tense Conjugation (for verbs) */}
            {currentWord.conjugation && (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden text-xs">
                <button
                  onClick={() => setShowConjugation(!showConjugation)}
                  className="w-full flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/70 transition-colors font-medium text-stone-700"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-stone-500" />
                    <span>Present Tense Conjugation ({currentWord.french})</span>
                  </span>
                  {showConjugation ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                </button>

                {showConjugation && (
                  <div className="p-4 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white">
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">je</span><span className="font-semibold text-stone-900">{currentWord.conjugation.je}</span></div>
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">tu</span><span className="font-semibold text-stone-900">{currentWord.conjugation.tu}</span></div>
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">il/elle</span><span className="font-semibold text-stone-900">{currentWord.conjugation.il_elle}</span></div>
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">nous</span><span className="font-semibold text-stone-900">{currentWord.conjugation.nous}</span></div>
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">vous</span><span className="font-semibold text-stone-900">{currentWord.conjugation.vous}</span></div>
                    <div className="rounded-lg bg-stone-50 p-2"><span className="text-stone-400 block text-[10px]">ils/elles</span><span className="font-semibold text-stone-900">{currentWord.conjugation.ils_elles}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Gender Forms (M/F) */}
            {currentWord.genderForms && (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden text-xs">
                <button
                  id="toggle-gender-forms-btn"
                  onClick={() => setShowGenderForms(!showGenderForms)}
                  className="w-full flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/70 transition-colors font-medium text-stone-700"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-stone-500" />
                    <span>Gender Forms (M/F)</span>
                  </span>
                  {showGenderForms ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                </button>

                {showGenderForms && (
                  <div className="p-4 border-t border-stone-100 bg-white space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-stone-50/80 border border-stone-200/60 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          MASCULINE
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-base font-semibold text-stone-900">
                            {currentWord.genderForms.masculine}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakFrench(currentWord.genderForms!.masculine)}
                            className="text-stone-400 hover:text-stone-700 p-1"
                            aria-label={`Listen to masculine form ${currentWord.genderForms.masculine}`}
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg bg-stone-50/80 border border-stone-200/60 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                          FEMININE
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-base font-semibold text-stone-900">
                            {currentWord.genderForms.feminine}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakFrench(currentWord.genderForms!.feminine)}
                            className="text-stone-400 hover:text-stone-700 p-1"
                            aria-label={`Listen to feminine form ${currentWord.genderForms.feminine}`}
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {(currentWord.genderForms.masculinePlural || currentWord.genderForms.femininePlural) && (
                      <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-stone-100 text-stone-600">
                        {currentWord.genderForms.masculinePlural && (
                          <div className="rounded-lg bg-stone-50/50 p-2">
                            <span className="block text-[10px] text-stone-400 uppercase tracking-wider">M. Plural</span>
                            <span className="font-medium text-stone-800">{currentWord.genderForms.masculinePlural}</span>
                          </div>
                        )}
                        {currentWord.genderForms.femininePlural && (
                          <div className="rounded-lg bg-stone-50/50 p-2">
                            <span className="block text-[10px] text-stone-400 uppercase tracking-wider">F. Plural</span>
                            <span className="font-medium text-stone-800">{currentWord.genderForms.femininePlural}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {currentWord.genderForms.notes && (
                      <p className="text-[11px] text-stone-500 italic pt-1">
                        {currentWord.genderForms.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Related Words */}
            {currentWord.relatedWords && currentWord.relatedWords.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden text-xs">
                <button
                  onClick={() => setShowRelated(!showRelated)}
                  className="w-full flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/70 transition-colors font-medium text-stone-700"
                >
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-stone-500" />
                    <span>Related French Vocabulary ({currentWord.relatedWords.length})</span>
                  </span>
                  {showRelated ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                </button>

                {showRelated && (
                  <div className="p-3 border-t border-stone-100 divide-y divide-stone-100 bg-white">
                    {currentWord.relatedWords.map((rel, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-stone-900 mr-2">{rel.french}</span>
                          <span className="text-stone-500">{rel.english}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">{rel.relationship}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Manual Spaced Repetition Rating Selection */}
            <div className="border-t border-stone-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Rate Recall & Schedule Next Interval
                </span>
                <span className="text-[11px] text-stone-400">
                  Shortcut keys: <kbd className="rounded bg-stone-100 px-1 border">1</kbd> <kbd className="rounded bg-stone-100 px-1 border">2</kbd> <kbd className="rounded bg-stone-100 px-1 border">3</kbd> <kbd className="rounded bg-stone-100 px-1 border">4</kbd>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                
                {/* AGAIN */}
                <button
                  id="rating-again-btn"
                  onClick={() => handleSelectRating('again')}
                  className="group flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-white p-3 text-center transition-all hover:bg-rose-50 hover:border-rose-300 shadow-2xs"
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                    <span>1. AGAIN</span>
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-rose-600">
                    +{settings.intervals.again} {settings.intervals.again === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">Reset streak</span>
                </button>

                {/* HARD */}
                <button
                  id="rating-hard-btn"
                  onClick={() => handleSelectRating('hard')}
                  className="group flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-white p-3 text-center transition-all hover:bg-amber-50 hover:border-amber-300 shadow-2xs"
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                    <span>2. HARD</span>
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-amber-600">
                    +{settings.intervals.hard} {settings.intervals.hard === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">Hesitation</span>
                </button>

                {/* GOOD */}
                <button
                  id="rating-good-btn"
                  onClick={() => handleSelectRating('good')}
                  className="group flex flex-col items-center justify-center rounded-xl border border-sky-200 bg-white p-3 text-center transition-all hover:bg-sky-50 hover:border-sky-300 shadow-2xs"
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-sky-700">
                    <span>3. GOOD</span>
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-sky-600">
                    +{settings.intervals.good} {settings.intervals.good === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">Normal recall</span>
                </button>

                {/* EASY */}
                <button
                  id="rating-easy-btn"
                  onClick={() => handleSelectRating('easy')}
                  className="group flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-white p-3 text-center transition-all hover:bg-emerald-50 hover:border-emerald-300 shadow-2xs"
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <span>4. EASY</span>
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-emerald-600">
                    +{settings.intervals.easy} {settings.intervals.easy === 1 ? 'day' : 'days'}
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">+2 streak</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
