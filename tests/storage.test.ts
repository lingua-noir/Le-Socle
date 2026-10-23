import assert from 'node:assert';
import test from 'node:test';

// Set up mock window and localStorage before importing storage module
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mockStorage = new MockLocalStorage();
(global as any).window = {};
(global as any).localStorage = mockStorage;

// Now dynamically import storage and vocabulary
const {
  loadUserStats,
  saveUserStats,
  loadWordProgressMap,
  saveWordProgressMap,
  getDefaultUserStats,
  getDefaultWordProgressMap,
  getSampleDemoProgressMap,
  generateBackupPayload,
  validateBackupPayload,
  restoreBackupPayload,
  PROGRESS_STORAGE_KEY,
  STATS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DAILY_GOALS_STORAGE_KEY,
} = await import('../src/services/storage.ts');

const { MOCK_VOCABULARY } = await import('../src/data/vocabulary.ts');

test('Requirement 1: Stats with totalReviewed=10 and totalCorrect=8 survive reload', () => {
  mockStorage.clear();

  const testStats = {
    totalReviewed: 10,
    totalCorrect: 8,
    totalIncorrect: 2,
    streakDays: 3,
    lastStudyDate: '2026-10-23',
    reviewedTodayCount: 2,
    ratingDistribution: { again: 2, hard: 2, good: 4, easy: 2 },
    recentHistory: [],
  };

  saveUserStats(testStats);

  // Simulate page reload by calling loadUserStats()
  const loaded = loadUserStats();

  assert.strictEqual(loaded.totalReviewed, 10, 'totalReviewed should remain 10');
  assert.strictEqual(loaded.totalCorrect, 8, 'totalCorrect should remain 8');
  assert.strictEqual(loaded.totalIncorrect, 2, 'totalIncorrect should remain 2');
  assert.strictEqual(loaded.streakDays, 3, 'streakDays should remain 3');
});

test('Requirement 2: Seeded word progress survives reload when legacy migration flag is absent', () => {
  mockStorage.clear();

  const demoProg = getSampleDemoProgressMap();
  saveWordProgressMap(demoProg);

  // Explicitly ensure migration key is absent
  mockStorage.removeItem('le_socle_demo_cleanup_v3');
  assert.strictEqual(mockStorage.getItem('le_socle_demo_cleanup_v3'), null);

  // Simulate page reload by calling loadWordProgressMap()
  const loaded = loadWordProgressMap();

  // Verify that sample demo progress on v-1, v-2, v-3 was NOT wiped
  assert.strictEqual(loaded['v-1'].mastery, 'mastered', 'v-1 should remain mastered');
  assert.strictEqual(loaded['v-1'].totalAttempts, 9, 'v-1 attempts should be 9');
  assert.strictEqual(loaded['v-2'].mastery, 'reviewing', 'v-2 should remain reviewing');
  assert.strictEqual(loaded['v-2'].totalAttempts, 5, 'v-2 attempts should be 5');
  assert.strictEqual(loaded['v-3'].mastery, 'learning', 'v-3 should remain learning');
  assert.strictEqual(loaded['v-3'].totalAttempts, 3, 'v-3 attempts should be 3');

  // Verify migration flag is now set
  assert.strictEqual(mockStorage.getItem('le_socle_demo_cleanup_v3'), 'true');
});

test('Requirement 2B: Legitimate beginner progress (only v-1 attempted) survives reload without migration flag', () => {
  mockStorage.clear();

  const beginnerProg = getDefaultWordProgressMap();
  beginnerProg['v-1'] = {
    ...beginnerProg['v-1'],
    mastery: 'learning',
    totalAttempts: 1,
    totalExactCorrect: 1,
    currentStreak: 1,
    timesReviewed: 1,
    timesCorrect: 1,
  };

  saveWordProgressMap(beginnerProg);
  mockStorage.removeItem('le_socle_demo_cleanup_v3');

  // Simulate page reload
  const loaded = loadWordProgressMap();
  assert.strictEqual(loaded['v-1'].totalAttempts, 1, 'Beginner progress on v-1 must survive');
  assert.strictEqual(loaded['v-1'].mastery, 'learning');
});

test('Requirement 3: Genuinely empty storage initializes cleanly with defaults', () => {
  mockStorage.clear();

  const freshProg = loadWordProgressMap();
  const freshStats = loadUserStats();

  assert.strictEqual(Object.keys(freshProg).length, 2500, 'Should initialize all 2500 words');
  assert.strictEqual(freshProg['v-1'].mastery, 'new', 'Initial mastery must be new');
  assert.strictEqual(freshProg['v-1'].totalAttempts, 0, 'Initial attempts must be 0');

  assert.strictEqual(freshStats.totalReviewed, 0, 'Fresh totalReviewed must be 0');
  assert.strictEqual(freshStats.totalCorrect, 0, 'Fresh totalCorrect must be 0');
  assert.strictEqual(freshStats.totalIncorrect, 0, 'Fresh totalIncorrect must be 0');
  assert.strictEqual(freshStats.streakDays, 1, 'Default streak must be 1');
});

test('Requirement 4: Existing backup export, validation, and rollback tests still pass', () => {
  mockStorage.clear();

  // 1. Seed some known state
  const demoProg = getSampleDemoProgressMap();
  saveWordProgressMap(demoProg);
  const demoStats = {
    totalReviewed: 15,
    totalCorrect: 12,
    totalIncorrect: 3,
    streakDays: 4,
    lastStudyDate: '2026-10-23',
    reviewedTodayCount: 5,
    ratingDistribution: { again: 1, hard: 2, good: 7, easy: 5 },
    recentHistory: [],
  };
  saveUserStats(demoStats);

  // 2. Generate backup
  const backup = generateBackupPayload();
  assert.strictEqual(backup.format, 'le-socle-backup');
  assert.strictEqual(backup.schemaVersion, 1);
  assert.strictEqual(backup.data.stats.totalReviewed, 15);
  assert.strictEqual(Object.keys(backup.data.progress).length, 2500);

  // 3. Validate backup
  const validation = validateBackupPayload(backup);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.preview.progressCount, 2500);

  // 4. Wipe storage and restore
  mockStorage.clear();
  const restoreResult = restoreBackupPayload(backup);
  assert.strictEqual(restoreResult.success, true);

  const restoredStats = loadUserStats();
  assert.strictEqual(restoredStats.totalReviewed, 15);
  assert.strictEqual(restoredStats.totalCorrect, 12);

  const restoredProg = loadWordProgressMap();
  assert.strictEqual(restoredProg['v-1'].mastery, 'mastered');
  assert.strictEqual(restoredProg['v-2'].mastery, 'reviewing');
});

test('Requirement 5: Corpus integrity - all 2,500 entries and seven protected Level 5 placeholders preserved', () => {
  assert.strictEqual(MOCK_VOCABULARY.length, 2500, 'Corpus must contain exactly 2,500 entries');

  const level5Items = MOCK_VOCABULARY.filter((w) => w.frequencyBand === 'ADVANCED CORE');
  assert.strictEqual(level5Items.length, 500, 'Level 5 must contain 500 entries');

  // Check the seven protected Level 5 "à vérifier" placeholders
  const placeholders = MOCK_VOCABULARY.filter((w) =>
    (w.relatedWords && w.relatedWords.some((r: any) => r.french === 'à vérifier')) ||
    (w.commonExpressions && w.commonExpressions.some((e: any) => e.french === 'à vérifier'))
  );
  assert.strictEqual(placeholders.length, 7, 'Must preserve all seven protected Level 5 placeholders');
});
