import React, { useState, useMemo } from 'react';
import { VocabularyItem, WordProgress, FrequencyBand } from '../types';
import { MOCK_VOCABULARY, FREQUENCY_BANDS } from '../data/vocabulary';
import { speakFrench } from '../services/tts';
import { 
  Search as SearchIcon, 
  Volume2, 
  X, 
  Sparkles, 
  ChevronRight,
  BookOpen,
  Filter
} from 'lucide-react';

interface SearchViewProps {
  progressMap: Record<string, WordProgress>;
  onInspectWord: (word: VocabularyItem) => void;
  onPracticeWord: (word: VocabularyItem) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  progressMap,
  onInspectWord,
  onPracticeWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedPos, setSelectedPos] = useState<string>('all');

  const results = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return MOCK_VOCABULARY.filter((item) => {
      // Band filter
      if (selectedBand !== 'all' && item.frequencyBand !== selectedBand) {
        return false;
      }
      // POS filter
      if (selectedPos !== 'all' && item.partOfSpeech !== selectedPos) {
        return false;
      }

      if (!q) return true;

      // Match rank
      if (item.rank.toString() === q || item.rank.toString().startsWith(q)) {
        return true;
      }

      // Match French
      if (item.french.toLowerCase().includes(q)) return true;

      // Match English
      if (item.english.toLowerCase().includes(q)) return true;

      // Match lemma
      if (item.lemma && item.lemma.toLowerCase().includes(q)) return true;

      // Match related words
      if (item.relatedWords && item.relatedWords.some((r) => r.french.toLowerCase().includes(q) || r.english.toLowerCase().includes(q))) {
        return true;
      }

      return false;
    });
  }, [searchTerm, selectedBand, selectedPos]);

  const masteryBadges: Record<string, { label: string; style: string }> = {
    new: { label: 'New', style: 'bg-stone-100 text-stone-600' },
    learning: { label: 'Learning', style: 'bg-amber-50 text-amber-800 border border-amber-200' },
    reviewing: { label: 'Reviewing', style: 'bg-sky-50 text-sky-800 border border-sky-200' },
    mastered: { label: 'Mastered', style: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
          Vocabulary Search
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Search the 2,500 core units across French lemma, English translation, or frequency rank.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="mb-6">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 h-5 w-5 text-stone-400" />
          <input
            id="vocabulary-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by French (e.g. aller), English (e.g. to go), or rank (e.g. 8)..."
            className="w-full rounded-2xl border border-stone-300 bg-white py-3.5 pl-12 pr-10 text-base text-stone-900 shadow-2xs placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-stone-400 mr-1">Bands:</span>
          <button
            onClick={() => setSelectedBand('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedBand === 'all' ? 'bg-stone-900 text-stone-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Bands
          </button>
          {FREQUENCY_BANDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBand(b.id)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedBand === b.id ? 'bg-stone-900 text-stone-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="mb-3 flex items-center justify-between text-xs text-stone-500">
        <span>
          Showing {results.length} {results.length === 1 ? 'result' : 'results'}
        </span>
        {searchTerm && (
          <span>
            Query: <strong className="text-stone-800">"{searchTerm}"</strong>
          </span>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-2.5">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-sm text-stone-500">
            No vocabulary matches found for "{searchTerm}".
          </div>
        ) : (
          results.map((word) => {
            const prog = progressMap[word.id];
            const mastery = prog?.mastery || 'new';
            const badge = masteryBadges[mastery];

            return (
              <div
                key={word.id}
                id={`search-result-${word.id}`}
                onClick={() => onInspectWord(word)}
                className="group flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-2xs transition-all hover:border-stone-300 hover:shadow-xs cursor-pointer sm:flex-row sm:items-center"
              >
                {/* French & English */}
                <div className="flex items-start sm:items-center gap-4">
                  <span className="rounded-md bg-stone-100 px-2 py-1 font-mono text-xs font-semibold text-stone-700 w-12 text-center shrink-0">
                    #{word.rank}
                  </span>

                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-base font-bold text-stone-900 group-hover:text-stone-950">
                        {word.french}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakFrench(word.french);
                        }}
                        className="text-stone-400 hover:text-stone-800 p-0.5"
                        title="Listen to French"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-xs text-stone-500">
                        {word.pronunciation}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-600 font-medium">
                        {word.english}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-[11px] text-stone-400">
                        {word.frequencyBand}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Metadata & Practice */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <span className="font-mono text-xs text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                    {word.partOfSpeech}
                    {word.gender && ` (${word.gender[0]})`}
                  </span>

                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badge.style}`}>
                    {badge.label}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPracticeWord(word);
                    }}
                    className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-600 hover:bg-stone-900 hover:text-white transition-colors"
                    title="Practice this unit in Review"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>

                  <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-600 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
