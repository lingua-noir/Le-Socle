import React, { useState } from 'react';
import { UserSettings } from '../types';
import { DEFAULT_USER_SETTINGS } from '../services/storage';
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
  Target
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saveToast, setSaveToast] = useState(false);

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
    if (confirm('Reset all settings to default values?')) {
      handleUpdate(DEFAULT_USER_SETTINGS);
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

      </div>

    </div>
  );
};
