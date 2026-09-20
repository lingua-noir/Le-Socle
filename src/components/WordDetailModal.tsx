import React, { useState } from 'react';
import { VocabularyItem, WordProgress } from '../types';
import { 
  Volume2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  BookOpen, 
  ArrowRight,
  GitBranch,
  Layers,
  Sparkles
} from 'lucide-react';
import { speakFrench, speakEnglish } from '../services/tts';

interface WordDetailModalProps {
  word: VocabularyItem | null;
  progress?: WordProgress;
  onClose: () => void;
  onPracticeWord?: (word: VocabularyItem) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  progress,
  onClose,
  onPracticeWord,
}) => {
  const [showConjugation, setShowConjugation] = useState(false);
  const [showRelated, setShowRelated] = useState(true);
  const [showGenderForms, setShowGenderForms] = useState(true);

  if (!word) return null;

  const mastery = progress?.mastery || 'new';

  const masteryLabels: Record<string, { label: string; bg: string; text: string }> = {
    new: { label: 'New', bg: 'bg-stone-100', text: 'text-stone-700' },
    learning: { label: 'Learning', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-800' },
    reviewing: { label: 'Reviewing', bg: 'bg-sky-50 border border-sky-200', text: 'text-sky-800' },
    mastered: { label: 'Mastered', bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800' },
  };

  const masteryInfo = masteryLabels[mastery];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="word-detail-modal-card"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with rank badge & close */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-mono font-semibold text-stone-700">
              #{word.rank}
            </span>
            <span className="rounded-md bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-500">
              {word.frequencyBand}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${masteryInfo.bg} ${masteryInfo.text}`}>
              {masteryInfo.label}
            </span>
          </div>

          <button
            id="close-word-detail-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Word Presentation */}
        <div className="my-5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-stone-900">
                {word.french}
              </h2>
              <button
                id="listen-french-word-btn"
                onClick={() => speakFrench(word.french)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition-colors hover:border-stone-400 hover:bg-white hover:text-stone-900"
                title="Listen to French pronunciation"
                aria-label="Listen in French"
              >
                <Volume2 className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
              <span>{word.partOfSpeech}</span>
              {word.gender && <span>• {word.gender}</span>}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-sm text-stone-500">
              {word.pronunciation}
            </span>
          </div>

          {/* English Meaning */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-50/80 p-3.5 border border-stone-200/70">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-400 font-medium">
                English
              </p>
              <p className="text-lg font-medium text-stone-800 mt-0.5">
                {word.english}
              </p>
            </div>
            <button
              onClick={() => speakEnglish(word.english)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-white hover:text-stone-800"
              title="Listen to English pronunciation"
              aria-label="Listen in English"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Example Sentence */}
        {word.exampleSentence && (
          <div className="mb-5 rounded-xl border border-stone-200/80 p-4 bg-white">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              <span>Example in Context</span>
              <button
                onClick={() => speakFrench(word.exampleSentence || '')}
                className="flex items-center gap-1 text-[11px] font-normal lowercase tracking-normal text-stone-500 hover:text-stone-800"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>listen</span>
              </button>
            </div>
            <p className="text-stone-900 font-medium text-base">
              « {word.exampleSentence} »
            </p>
            {word.exampleTranslation && (
              <p className="text-sm text-stone-500 mt-1 italic">
                "{word.exampleTranslation}"
              </p>
            )}
          </div>
        )}

        {/* Expandable Conjugation for Verbs */}
        {word.conjugation && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden">
            <button
              id="toggle-conjugation-btn"
              onClick={() => setShowConjugation(!showConjugation)}
              className="flex w-full items-center justify-between p-3.5 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-stone-500" />
                <span>Present Tense Conjugation</span>
              </div>
              {showConjugation ? (
                <ChevronUp className="h-4 w-4 text-stone-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-400" />
              )}
            </button>

            {showConjugation && (
              <div className="border-t border-stone-200/80 bg-white p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">je</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.je}</span>
                  </div>
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">tu</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.tu}</span>
                  </div>
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">il / elle / on</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.il_elle}</span>
                  </div>
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">nous</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.nous}</span>
                  </div>
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">vous</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.vous}</span>
                  </div>
                  <div className="rounded-lg border border-stone-100 bg-stone-50/60 p-2.5">
                    <span className="text-xs font-medium text-stone-400 block mb-0.5">ils / elles</span>
                    <span className="font-semibold text-stone-900">{word.conjugation.ils_elles}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expandable Gender Forms (M/F) */}
        {word.genderForms && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden">
            <button
              id="toggle-gender-forms-modal-btn"
              onClick={() => setShowGenderForms(!showGenderForms)}
              className="flex w-full items-center justify-between p-3.5 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-stone-500" />
                <span>Gender Forms (M/F)</span>
              </div>
              {showGenderForms ? (
                <ChevronUp className="h-4 w-4 text-stone-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-400" />
              )}
            </button>

            {showGenderForms && (
              <div className="border-t border-stone-200/80 bg-white p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-stone-50/80 border border-stone-200/60 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                      MASCULINE
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base font-semibold text-stone-900">
                        {word.genderForms.masculine}
                      </span>
                      <button
                        onClick={() => speakFrench(word.genderForms!.masculine)}
                        className="text-stone-400 hover:text-stone-700 p-1"
                        aria-label={`Listen to ${word.genderForms.masculine}`}
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
                        {word.genderForms.feminine}
                      </span>
                      <button
                        onClick={() => speakFrench(word.genderForms!.feminine)}
                        className="text-stone-400 hover:text-stone-700 p-1"
                        aria-label={`Listen to ${word.genderForms.feminine}`}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {(word.genderForms.masculinePlural || word.genderForms.femininePlural) && (
                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-stone-100 text-xs text-stone-600">
                    {word.genderForms.masculinePlural && (
                      <div className="rounded-lg bg-stone-50/50 p-2">
                        <span className="block text-[10px] text-stone-400 uppercase tracking-wider">M. Plural</span>
                        <span className="font-medium text-stone-800">{word.genderForms.masculinePlural}</span>
                      </div>
                    )}
                    {word.genderForms.femininePlural && (
                      <div className="rounded-lg bg-stone-50/50 p-2">
                        <span className="block text-[10px] text-stone-400 uppercase tracking-wider">F. Plural</span>
                        <span className="font-medium text-stone-800">{word.genderForms.femininePlural}</span>
                      </div>
                    )}
                  </div>
                )}

                {word.genderForms.notes && (
                  <p className="text-xs text-stone-500 italic pt-1">
                    {word.genderForms.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable Related Words */}
        {word.relatedWords && word.relatedWords.length > 0 && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden">
            <button
              id="toggle-related-words-btn"
              onClick={() => setShowRelated(!showRelated)}
              className="flex w-full items-center justify-between p-3.5 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-stone-500" />
                <span>Related Words ({word.relatedWords.length})</span>
              </div>
              {showRelated ? (
                <ChevronUp className="h-4 w-4 text-stone-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-400" />
              )}
            </button>

            {showRelated && (
              <div className="border-t border-stone-200/80 bg-white p-3 divide-y divide-stone-100">
                {word.relatedWords.map((rel, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900 text-sm">{rel.french}</span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] text-stone-500">
                          {rel.relationship}
                        </span>
                      </div>
                      <span className="text-xs text-stone-500">{rel.english}</span>
                    </div>
                    <button
                      onClick={() => speakFrench(rel.french)}
                      className="text-stone-400 hover:text-stone-700 p-1"
                      aria-label={`Listen to ${rel.french}`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Common Expressions if available */}
        {word.commonExpressions && word.commonExpressions.length > 0 && (
          <div className="mb-4 rounded-xl border border-stone-200 p-3.5 bg-stone-50/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-2">
              Common Expressions
            </span>
            <div className="space-y-2">
              {word.commonExpressions.map((expr, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-stone-800">{expr.french}</span>
                  <span className="text-stone-500 ml-2">— {expr.english}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Close
          </button>

          {onPracticeWord && (
            <button
              id="modal-practice-word-btn"
              onClick={() => {
                onClose();
                onPracticeWord(word);
              }}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 shadow-xs hover:bg-stone-800 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Practice This Word</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
