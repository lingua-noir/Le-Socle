import React, { useState, useEffect } from 'react';
import { 
  NavigationTab, 
  FrequencyBand, 
  VocabularyItem, 
  WordProgress, 
  UserStats, 
  UserSettings, 
  SpacedRepetitionRating 
} from './types';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LearnView } from './components/LearnView';
import { ReviewView, ReviewModeFilter } from './components/ReviewView';
import { StatsView } from './components/StatsView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { WordDetailModal } from './components/WordDetailModal';
import { 
  loadWordProgressMap, 
  loadUserStats, 
  loadUserSettings, 
  saveUserSettings,
  DEFAULT_USER_SETTINGS,
  recordReviewResult, 
  resetAllProgress, 
  getDefaultWordProgressMap,
  getSampleDemoProgressMap,
  saveWordProgressMap,
  saveUserStats,
  getDueWords
} from './services/storage';
import { setTtsSpeechRate } from './services/tts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [selectedBandForLearn, setSelectedBandForLearn] = useState<FrequencyBand>('ESSENTIAL');
  const [inspectedWord, setInspectedWord] = useState<VocabularyItem | null>(null);
  const [practiceWord, setPracticeWord] = useState<VocabularyItem | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewModeFilter>('due');
  const [reviewBand, setReviewBand] = useState<FrequencyBand | null>(null);

  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [userStats, setUserStats] = useState<UserStats>({
    totalReviewed: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    streakDays: 1,
    lastStudyDate: null,
    reviewedTodayCount: 0,
    ratingDistribution: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
    recentHistory: [],
  });

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  // Load state and settings on mount
  useEffect(() => {
    const loadedProg = loadWordProgressMap();
    const loadedStats = loadUserStats();
    const loadedSettings = loadUserSettings();
    
    setProgressMap(loadedProg);
    setUserStats(loadedStats);
    setSettings(loadedSettings);
    setTtsSpeechRate(loadedSettings.speechRate);
  }, []);

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
    setTtsSpeechRate(newSettings.speechRate);
  };

  const handleRecordResult = (
    wordId: string, 
    isCorrect: boolean, 
    rating: SpacedRepetitionRating, 
    userAnswer: string,
    isExact: boolean = false
  ) => {
    const { updatedProgress, updatedStats } = recordReviewResult(
      wordId,
      isCorrect,
      rating,
      userAnswer,
      progressMap,
      userStats,
      settings,
      isExact
    );
    setProgressMap(updatedProgress);
    setUserStats(updatedStats);
  };

  const handleResetProgress = () => {
    const { progress, stats } = resetAllProgress();
    setProgressMap(progress);
    setUserStats(stats);
  };

  const handleSeedDemoProgress = () => {
    const initialProg = getSampleDemoProgressMap();
    const initialStats: UserStats = {
      totalReviewed: 10,
      totalCorrect: 8,
      totalIncorrect: 2,
      streakDays: 3,
      lastStudyDate: new Date().toISOString().split('T')[0],
      reviewedTodayCount: 2,
      ratingDistribution: {
        again: 2,
        hard: 2,
        good: 4,
        easy: 2,
      },
      recentHistory: [],
    };
    saveWordProgressMap(initialProg);
    saveUserStats(initialStats);
    setProgressMap(initialProg);
    setUserStats(initialStats);
  };

  const handlePracticeWord = (word: VocabularyItem) => {
    setPracticeWord(word);
    setReviewMode('all');
    setReviewBand(null);
    setCurrentTab('review');
  };

  const handleStartReview = (mode: ReviewModeFilter = 'due', band: FrequencyBand | null = null) => {
    setPracticeWord(null);
    setReviewMode(mode);
    setReviewBand(band);
    setCurrentTab('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dueCount = getDueWords(progressMap, settings.masteryStreakThreshold).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900 selection:bg-amber-100 selection:text-stone-900 pb-20 md:pb-12">
      {/* Clean Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'review') {
            setPracticeWord(null);
            setReviewMode('due');
            setReviewBand(null);
          }
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        dueCount={dueCount}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomeView
            progressMap={progressMap}
            userStats={userStats}
            settings={settings}
            onNavigate={(tab) => {
              if (tab === 'review') {
                setPracticeWord(null);
                setReviewMode('due');
                setReviewBand(null);
              }
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onStartReview={handleStartReview}
            onSelectBandForLearn={(band) => {
              setSelectedBandForLearn(band);
            }}
          />
        )}

        {currentTab === 'learn' && (
          <LearnView
            selectedBand={selectedBandForLearn}
            onSelectBand={(band) => setSelectedBandForLearn(band)}
            progressMap={progressMap}
            settings={settings}
            onInspectWord={(word) => setInspectedWord(word)}
            onPracticeWord={handlePracticeWord}
            onPracticeWeakWords={(band) => handleStartReview('weak', band || null)}
          />
        )}

        {currentTab === 'review' && (
          <ReviewView
            key={`${practiceWord ? practiceWord.id : 'queue'}-${reviewMode}-${reviewBand || 'all'}`}
            progressMap={progressMap}
            userStats={userStats}
            settings={settings}
            onRecordResult={handleRecordResult}
            initialWord={practiceWord}
            initialMode={reviewMode}
            initialBand={reviewBand}
            onReturnHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView
            progressMap={progressMap}
            userStats={userStats}
            settings={settings}
            onResetProgress={handleResetProgress}
            onSeedDemoProgress={handleSeedDemoProgress}
          />
        )}

        {currentTab === 'search' && (
          <SearchView
            progressMap={progressMap}
            onInspectWord={(word) => setInspectedWord(word)}
            onPracticeWord={handlePracticeWord}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Vocabulary Detail Modal */}
      {inspectedWord && (
        <WordDetailModal
          word={inspectedWord}
          progress={progressMap[inspectedWord.id]}
          onClose={() => setInspectedWord(null)}
          onPracticeWord={handlePracticeWord}
        />
      )}

      {/* Subtle Minimalist Footer */}
      <footer className="mt-auto border-t border-stone-200/60 py-6 text-center text-xs text-stone-400">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LE SOCLE • 2,500 French Frequency Learning Units</span>
          <span className="font-mono text-[11px] text-stone-400">
            Phases: Essential (1–500) • Foundation (501–1,000) • Everyday (1,001–1,500) • Independent (1,501–2,000) • Advanced (2,001–2,500)
          </span>
        </div>
      </footer>
    </div>
  );
}
