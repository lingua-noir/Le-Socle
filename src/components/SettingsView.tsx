import React, { useState } from 'react';
import { UserSettings, WordProgress, NavigationTab } from '../types';
import { MOCK_VOCABULARY } from '../data/vocabulary';
import { getWeakWords } from '../services/progression';
import { 
  DEFAULT_USER_SETTINGS, 
  SUPPORTED_NEW_INTAKE_SESSION_SIZES,
  DEFAULT_DAILY_NEW_INTAKE_GOAL,
  DEFAULT_DAILY_WEAK_WORDS_GOAL,
  MIN_DAILY_GOAL_TARGET,
  MAX_DAILY_NEW_INTAKE_GOAL,
  MAX_DAILY_WEAK_WORDS_GOAL
} from '../services/storage';
import { evaluateFrenchAnswer } from '../services/evaluator';
import { speakFrench, setTtsSpeechRate } from '../services/tts';
import { 
  Sliders, 
  Volume2, 
  Clock, 
  RotateCcw, 
  Check, 
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Target,
  BookOpen,
  Award
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetProgress?: () => void;
  progressMap?: Record<string, WordProgress>;
  onNavigate?: (tab: NavigationTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  progressMap,
  onNavigate,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saveToast, setSaveToast] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);
  const [showDefaultsConfirm, setShowDefaultsConfirm] = useState(false);

  // Mini-sandbox testing state
  const [testTarget, setTestTarget] = useState('décision');
  const [testInput, setTestInput] = useState('decision');

  const testEval = evaluateFrenchAnswer(testInput, testTarget, localSettings.typoTolerance);

  const handleUpdate = (updated: UserSettings) => {
    setLocalSettings(updated);
    onUpdateSettings(updated);
    setTtsSpeechRate(updated.speechRate);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const currentNewIntakeTarget = localSettings.dailyGoals?.newIntakeTarget ?? DEFAULT_DAILY_NEW_INTAKE_GOAL;
  const currentWeakWordsTarget = localSettings.dailyGoals?.weakWordsTarget ?? DEFAULT_DAILY_WEAK_WORDS_GOAL;

  const weakWordsPool = getWeakWords(
    progressMap || {},
    MOCK_VOCABULARY,
    undefined,
    localSettings.masteryStreakThreshold,
    Boolean(localSettings.previewLockedLevels)
  );
  const weakWordsPoolSize = weakWordsPool.length;

  const handleDailyGoalChange = (field: 'newIntakeTarget' | 'weakWordsTarget', rawVal: string | number) => {
    let val = typeof rawVal === 'number' ? rawVal : parseInt(rawVal, 10);
    if (isNaN(val)) val = field === 'newIntakeTarget' ? DEFAULT_DAILY_NEW_INTAKE_GOAL : DEFAULT_DAILY_WEAK_WORDS_GOAL;
    val = Math.max(MIN_DAILY_GOAL_TARGET, Math.min(MAX_DAILY_NEW_INTAKE_GOAL, val));
    const updated: UserSettings = {
      ...localSettings,
      dailyGoals: {
        newIntakeTarget: currentNewIntakeTarget,
        weakWordsTarget: currentWeakWordsTarget,
        [field]: val,
      },
    };
    handleUpdate(updated);
  };

  const handleIntervalChange = (key: keyof UserSettings['intervals'], valStr: string) => {
    const num = Math.max(0.1, parseFloat(valStr) || 1);
    const updated = {
      ...localSettings,
      intervals: {
        ...localSettings.intervals,
        [key]: num,
      },
    };
    handleUpdate(updated);
  };

  const handleResetDefaults = () => {
    setShowDefaultsConfirm(true);
  };

  const handleConfirmResetDefaults = () => {
    handleUpdate(DEFAULT_USER_SETTINGS);
    setShowDefaultsConfirm(false);
  };

  const handleConfirmResetProgress = () => {
    if (onResetProgress) {
      onResetProgress();
      setShowResetConfirm(false);
      setResetSuccessMessage(true);
      setTimeout(() => setResetSuccessMessage(false), 5000);
    }
  };

  const handleTestVoice = () => {
    speakFrench('Bonjour ! Ceci est un test de vitesse de prononciation.');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-stone-200/80 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Review & Study Settings
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Configure active recall spelling tolerance, audio pronunciation speed, and spaced repetition intervals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in duration-200">
              <Check className="h-3.5 w-3.5" />
              Saved automatically
            </span>
          )}
          <button
            id="reset-settings-defaults-btn"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-2xs hover:bg-stone-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-stone-400" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* SECTION 1: TYPO TOLERANCE */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Typo Tolerance
                </h2>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-xl">
                Controls how strictly your typed French answers are evaluated against the canonical spelling, including accents (é, è, ê, à, ç, etc.) and letter variations.
              </p>
            </div>

            <span className="rounded-xl bg-stone-900 px-3.5 py-1.5 font-mono text-base font-bold text-stone-50 shrink-0">
              {localSettings.typoTolerance}%
            </span>
          </div>

          {/* Slider */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span>Strict (100% exact)</span>
              <span>Balanced (80% recommended)</span>
              <span>Forgiving (50%)</span>
            </div>
            <input
              id="typo-tolerance-slider"
              type="range"
              min="50"
              max="100"
              step="5"
              value={localSettings.typoTolerance}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                handleUpdate({ ...localSettings, typoTolerance: val });
              }}
              className="w-full accent-stone-900 h-2 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Explanation Box */}
          <div className="mt-5 rounded-xl border border-stone-100 bg-stone-50/70 p-4 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800">
              <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
              <span>How your answer is evaluated:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-stone-500">
              <li>
                <strong className="text-stone-700">Missing French Accents:</strong> Typing <span className="font-mono text-stone-800">decision</span> for <span className="font-mono text-stone-800">décision</span> yields ~92% similarity. At {localSettings.typoTolerance}%, it is {localSettings.typoTolerance <= 92 ? <span className="text-emerald-700 font-semibold">accepted with an accent reminder</span> : <span className="text-rose-700 font-semibold">rejected (requires accent)</span>}.
              </li>
              <li>
                <strong className="text-stone-700">Minor Typos:</strong> Typing <span className="font-mono text-stone-800">decission</span> for <span className="font-mono text-stone-800">décision</span> yields ~86% similarity. At {localSettings.typoTolerance}%, it is {localSettings.typoTolerance <= 86 ? <span className="text-emerald-700 font-semibold">accepted with a typo note</span> : <span className="text-rose-700 font-semibold">rejected</span>}.
              </li>
              <li>
                <strong className="text-stone-700">Clearly Wrong Words:</strong> Unrelated words like <span className="font-mono text-stone-800">chien</span> or <span className="font-mono text-stone-800">pomme</span> yield low similarity and are always rejected.
              </li>
            </ul>
          </div>

          {/* Interactive Live Sandbox */}
          <div className="mt-5 pt-5 border-t border-stone-100">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Interactive Evaluation Preview
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-500 font-medium mb-1">Target French Word:</label>
                <input
                  type="text"
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-900"
                />
              </div>
              <div>
                <label className="block text-stone-500 font-medium mb-1">Test Typed Answer:</label>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-900"
                />
              </div>
            </div>

            <div className={`mt-3 flex items-center justify-between rounded-lg p-2.5 text-xs font-medium border ${
              testEval.isCorrect 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {testEval.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
                <span>Result: {testEval.feedbackMessage}</span>
              </div>
              <span className="font-mono font-bold">
                {testEval.similarity}% match
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: SPEECH RATE */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Speech Rate (Pronunciation Speed)
                </h2>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Adjust the playback speed of the native French and English Text-to-Speech voices.
              </p>
            </div>

            <span className="rounded-xl bg-stone-900 px-3.5 py-1.5 font-mono text-base font-bold text-stone-50 shrink-0">
              {localSettings.speechRate.toFixed(2)}x
            </span>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full flex-1">
              <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                <span>0.50x (Slow)</span>
                <span>0.90x (Natural Learning)</span>
                <span>1.50x (Fast)</span>
              </div>
              <input
                id="speech-rate-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={localSettings.speechRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleUpdate({ ...localSettings, speechRate: val });
                }}
                className="w-full accent-stone-900 h-2 bg-stone-200 rounded-lg cursor-pointer"
              />
            </div>

            <button
              id="test-tts-voice-btn"
              onClick={handleTestVoice}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 shrink-0 transition-colors"
            >
              <Volume2 className="h-4 w-4 text-stone-600" />
              <span>Test Voice</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: REVIEW INTERVALS */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-stone-700" />
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Spaced Repetition Review Intervals
              </h2>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Set the number of days before a word returns for review based on your chosen rating. These intervals are saved persistently and directly schedule your future reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* AGAIN */}
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  AGAIN
                </span>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                  Key: 1
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Did not recall or made a fundamental error.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="interval-again-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={localSettings.intervals.again}
                  onChange={(e) => handleIntervalChange('again', e.target.value)}
                  className="w-20 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                />
                <span className="text-xs font-medium text-stone-600">
                  {localSettings.intervals.again === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* HARD */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  HARD
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  Key: 2
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Recalled with significant hesitation or struggle.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="interval-hard-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={localSettings.intervals.hard}
                  onChange={(e) => handleIntervalChange('hard', e.target.value)}
                  className="w-20 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                />
                <span className="text-xs font-medium text-stone-600">
                  {localSettings.intervals.hard === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* GOOD */}
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  GOOD
                </span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                  Key: 3
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Recalled correctly with normal effort.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="interval-good-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={localSettings.intervals.good}
                  onChange={(e) => handleIntervalChange('good', e.target.value)}
                  className="w-20 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                />
                <span className="text-xs font-medium text-stone-600">
                  {localSettings.intervals.good === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* EASY */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  EASY
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Key: 4
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Immediate, effortless, and confident recall.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="interval-easy-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={localSettings.intervals.easy}
                  onChange={(e) => handleIntervalChange('easy', e.target.value)}
                  className="w-20 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                />
                <span className="text-xs font-medium text-stone-600">
                  {localSettings.intervals.easy === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

          </div>

          <p className="mt-4 text-[11px] text-stone-400">
            * Future reviews use these exact day intervals to calculate the target review timestamp (<code className="font-mono text-stone-600">nextDueAt = today + interval</code>).
          </p>
        </div>

        {/* SECTION 4: INDIVIDUAL WORD MASTERY THRESHOLD */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Mastery Streak Threshold
                </h2>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-xl">
                Number of consecutive successful recalls across spaced review sessions required for a vocabulary item to reach <strong>MASTERED</strong> status. A failed or revealed attempt interrupts and resets the streak.
              </p>
            </div>

            <span className="rounded-xl bg-stone-900 px-3.5 py-1.5 font-mono text-base font-bold text-stone-50 shrink-0">
              {localSettings.masteryStreakThreshold} recalls
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <span>3 recalls (Fast)</span>
              <span className="font-bold text-stone-900">Configured: {localSettings.masteryStreakThreshold} successful recalls</span>
              <span>12 recalls (Rigorous)</span>
            </div>

            <input
              id="mastery-threshold-slider"
              type="range"
              min="3"
              max="12"
              step="1"
              value={localSettings.masteryStreakThreshold}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 7;
                handleUpdate({ ...localSettings, masteryStreakThreshold: val });
              }}
              className="w-full h-2 rounded-lg bg-stone-200 accent-stone-900 cursor-pointer"
            />
          </div>

          <p className="mt-3 text-[11px] text-stone-400">
            * Default is 7. Words meeting or exceeding this threshold graduate to Mastered and automatically exit the Weak Words pool.
          </p>
        </div>

        {/* SECTION 5: NEW INTAKE SESSION LENGTH */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  New Intake Session Length
                </h2>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-xl">
                Choose how many new vocabulary words are introduced in each New Intake session. New words are always presented in strict ascending frequency-rank order.
              </p>
            </div>

            <span className="rounded-xl bg-stone-900 px-3.5 py-1.5 font-mono text-base font-bold text-stone-50 shrink-0">
              {localSettings.newIntakeSessionSize ?? 25} words
            </span>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {SUPPORTED_NEW_INTAKE_SESSION_SIZES.map((size) => {
                const isSelected = (localSettings.newIntakeSessionSize ?? 25) === size;
                const isDefault = size === 25;
                return (
                  <button
                    key={size}
                    id={`intake-size-btn-${size}`}
                    type="button"
                    onClick={() => handleUpdate({ ...localSettings, newIntakeSessionSize: size })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white shadow-2xs ring-2 ring-stone-900/10'
                        : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:border-stone-300 hover:bg-stone-100/60'
                    }`}
                  >
                    <span className="font-mono text-base font-bold">
                      {size}
                    </span>
                    <span className={`text-[11px] font-medium ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                      words {isDefault && '(default)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-stone-400">
            * Default is 25 words. If fewer unstudied words remain in your unlocked levels, the session will cleanly include all remaining words.
          </p>
        </div>

        {/* SECTION 6: DAILY STUDY GOALS */}
        <div id="settings-daily-goals-section" className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Daily Study Goals
                </h2>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-xl">
                Configure independent daily targets for new vocabulary intake and weak words practice. Achieving both goals on a local calendar day advances your study streak.
              </p>
            </div>

            <span className="rounded-xl bg-stone-900 px-3 py-1 font-mono text-xs font-bold text-stone-50 shrink-0">
              {currentNewIntakeTarget} new • {currentWeakWordsTarget} weak
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control 1: Daily New Intake Target */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="daily-new-intake-target-input" className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-stone-600" />
                    <span>Daily New Intake Target</span>
                  </label>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    Default: {DEFAULT_DAILY_NEW_INTAKE_GOAL}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-4">
                  Target number of distinct unattempted words to discover and answer correctly in New Intake mode today (1–100).
                </p>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('newIntakeTarget', currentNewIntakeTarget - 5)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentNewIntakeTarget <= MIN_DAILY_GOAL_TARGET}
                    aria-label="Decrease new intake target by 5"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('newIntakeTarget', currentNewIntakeTarget - 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentNewIntakeTarget <= MIN_DAILY_GOAL_TARGET}
                    aria-label="Decrease new intake target by 1"
                  >
                    -1
                  </button>
                  <div className="flex-1 flex items-center justify-center">
                    <input
                      id="daily-new-intake-target-input"
                      type="number"
                      min={MIN_DAILY_GOAL_TARGET}
                      max={MAX_DAILY_NEW_INTAKE_GOAL}
                      step={1}
                      value={currentNewIntakeTarget}
                      onChange={(e) => handleDailyGoalChange('newIntakeTarget', e.target.value)}
                      className="w-20 rounded-lg border border-stone-300 bg-white py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('newIntakeTarget', currentNewIntakeTarget + 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentNewIntakeTarget >= MAX_DAILY_NEW_INTAKE_GOAL}
                    aria-label="Increase new intake target by 1"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('newIntakeTarget', currentNewIntakeTarget + 5)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentNewIntakeTarget >= MAX_DAILY_NEW_INTAKE_GOAL}
                    aria-label="Increase new intake target by 5"
                  >
                    +5
                  </button>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-stone-400">
                * Completely independent from the single-session batch size ({localSettings.newIntakeSessionSize ?? 25} words).
              </p>
            </div>

            {/* Control 2: Daily Weak Words Target */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="daily-weak-words-target-input" className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-amber-700" />
                    <span>Daily Weak Words Target</span>
                  </label>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    Default: {DEFAULT_DAILY_WEAK_WORDS_GOAL}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-4">
                  Target number of distinct unmastered words to reinforce in Weak Words mode today (1–100).
                </p>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('weakWordsTarget', currentWeakWordsTarget - 5)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentWeakWordsTarget <= MIN_DAILY_GOAL_TARGET}
                    aria-label="Decrease weak words target by 5"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('weakWordsTarget', currentWeakWordsTarget - 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentWeakWordsTarget <= MIN_DAILY_GOAL_TARGET}
                    aria-label="Decrease weak words target by 1"
                  >
                    -1
                  </button>
                  <div className="flex-1 flex items-center justify-center">
                    <input
                      id="daily-weak-words-target-input"
                      type="number"
                      min={MIN_DAILY_GOAL_TARGET}
                      max={MAX_DAILY_WEAK_WORDS_GOAL}
                      step={1}
                      value={currentWeakWordsTarget}
                      onChange={(e) => handleDailyGoalChange('weakWordsTarget', e.target.value)}
                      className="w-20 rounded-lg border border-stone-300 bg-white py-1.5 text-center font-mono text-base font-bold text-stone-900 shadow-2xs focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('weakWordsTarget', currentWeakWordsTarget + 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentWeakWordsTarget >= MAX_DAILY_WEAK_WORDS_GOAL}
                    aria-label="Increase weak words target by 1"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDailyGoalChange('weakWordsTarget', currentWeakWordsTarget + 5)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-bold hover:bg-stone-100 cursor-pointer disabled:opacity-40"
                    disabled={currentWeakWordsTarget >= MAX_DAILY_WEAK_WORDS_GOAL}
                    aria-label="Increase weak words target by 5"
                  >
                    +5
                  </button>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-stone-400">
                * Pool includes all unlocked words with streak &lt; {localSettings.masteryStreakThreshold}.
              </p>
            </div>
          </div>

          {/* Insufficient / Empty Weak Words Pool Handling */}
          {weakWordsPoolSize < currentWeakWordsTarget && (
            <div id="insufficient-weak-words-banner" className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-950">
                    {weakWordsPoolSize === 0 ? 'Weak Words Pool Is Empty' : 'Available Weak Words Pool Is Below Target'}
                  </h4>
                  <p className="mt-1 leading-relaxed text-amber-800">
                    {weakWordsPoolSize === 0
                      ? 'You currently have 0 unmastered words in your unlocked pool. All unlocked vocabulary has either reached Mastered status or new words have not yet been introduced.'
                      : `Your pool currently contains ${weakWordsPoolSize} unmastered ${weakWordsPoolSize === 1 ? 'word' : 'words'}, which is less than your daily target of ${currentWeakWordsTarget}.`}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700 font-medium">
                    Le Socle preserves your configured target and will never silently reduce it without your deliberate action.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {weakWordsPoolSize > 0 ? (
                      <button
                        type="button"
                        id="adjust-target-to-pool-btn"
                        onClick={() => handleDailyGoalChange('weakWordsTarget', weakWordsPoolSize)}
                        className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-900 transition-colors cursor-pointer"
                      >
                        Set target to available pool ({weakWordsPoolSize} words)
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="adjust-target-to-one-btn"
                        onClick={() => handleDailyGoalChange('weakWordsTarget', 1)}
                        className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-900 transition-colors cursor-pointer"
                      >
                        Adjust target to minimum (1 word)
                      </button>
                    )}

                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('learn')}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
                      >
                        Discover New Vocabulary in Learn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-stone-400">
            * Lowering a target to your current count can complete today&apos;s goal and award daily streak credit if not yet granted. Raising a target marks today incomplete if the new target exceeds today&apos;s progress, but preserves any earned streak credit. Streak credit is never duplicated.
          </p>
        </div>

        {/* SECTION 7: DEVELOPER TESTING BYPASS */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-6 shadow-2xs sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-900">
                  DEVELOPER MODE
                </span>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Preview Locked Levels
                </h2>
              </div>
              <p className="mt-2 text-xs text-stone-600 max-w-xl leading-relaxed">
                Temporarily unlocks Level 2 (FOUNDATION, ranks 501–1,000) for testing and inspection without requiring 400 mastered Level 1 words.
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-stone-500 list-disc list-inside">
                <li>Inspect, learn, search, and test ranks 501–1,000 directly.</li>
                <li>Does <strong>NOT</strong> alter actual mastery counts or streak statistics.</li>
                <li>Does <strong>NOT</strong> modify the production 80% unlock requirement when disabled.</li>
              </ul>
            </div>
            <button
              id="dev-preview-locked-toggle"
              type="button"
              role="switch"
              aria-checked={Boolean(localSettings.previewLockedLevels)}
              onClick={() => {
                handleUpdate({
                  ...localSettings,
                  previewLockedLevels: !localSettings.previewLockedLevels,
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                localSettings.previewLockedLevels ? 'bg-amber-600' : 'bg-stone-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localSettings.previewLockedLevels ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {localSettings.previewLockedLevels && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-100/60 p-3 text-xs text-amber-900 font-medium flex items-center justify-between">
              <span>Preview Mode is <strong>ACTIVE</strong>: Level 2 (ranks 501–1,000) is accessible across the app.</span>
              <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded text-amber-800">TESTING ONLY</span>
            </div>
          )}
        </div>

        {/* SECTION 7: DATA MANAGEMENT & RESET */}
        {onResetProgress && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4.5 w-4.5 text-rose-600" />
                  <h2 className="font-serif text-lg font-bold text-stone-900">
                    Reset Learning Progress
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500 max-w-xl">
                  Resets your learning mastery, streaks, spaced repetition schedule, and session history back to 0. The imported 2,500-word vocabulary dataset remains completely intact.
                </p>
              </div>

              <button
                id="settings-reset-progress-btn"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Learning Progress</span>
              </button>
            </div>

            {/* In-app post-reset success feedback banner */}
            {resetSuccessMessage && (
              <div
                id="reset-progress-success-alert"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-2xs animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Learning progress has been successfully reset. All mastery levels, streaks, and review queues are back to clean 0/100 state.</span>
                </div>
                <button
                  onClick={() => setResetSuccessMessage(false)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                  aria-label="Dismiss message"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Accessible In-App Two-Step Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-progress-modal-title"
          aria-describedby="reset-progress-modal-desc"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 sm:p-7">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 id="reset-progress-modal-title" className="font-serif text-lg font-bold text-stone-900">
                  Reset Learning Progress?
                </h3>
                <p id="reset-progress-modal-desc" className="mt-2 text-xs text-stone-600 leading-relaxed">
                  This will reset all your mastery levels, streaks, spaced-repetition schedules, and review history back to 0.
                </p>
                <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
                  <span className="font-semibold text-stone-900">Corpus Preservation Guarantee:</span> The complete 2,500-word vocabulary dataset remains fully intact across Levels 1–5.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                id="cancel-reset-progress-btn"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-reset-progress-btn"
                onClick={handleConfirmResetProgress}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation for Settings Defaults */}
      {showDefaultsConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-defaults-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 sm:p-7">
            <h3 id="reset-defaults-modal-title" className="font-serif text-lg font-bold text-stone-900">
              Reset Settings to Defaults?
            </h3>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">
              Reset all study configuration settings (typo tolerance, pronunciation rate, audio feedback, and SRS intervals) to their recommended defaults? Learning progress will not be affected.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                onClick={() => setShowDefaultsConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetDefaults}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition-colors"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
