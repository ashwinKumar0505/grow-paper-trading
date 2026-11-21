import { INITIAL_QUIZ_STATS, INITIAL_STATS, INITIAL_SURVIVAL } from '../quizDefaults';
import type { QuizStats, SurvivalState, UserStats } from '../types/trading';
import { reconcileQuizStats, reconcileUserStats } from './quizStatsReconciler';

export { reconcileQuizStats, reconcileUserStats };

const LEGACY_QUIZ_STATS_KEY = 'tradeplaybook_india_quiz_stats_v1';
const LEGACY_USER_STATS_KEY = 'tradeplaybook_india_stats_v1';
const LEGACY_SURVIVAL_BEST_KEY = 'tradepulse_survival_best_streak';
const LEGACY_MIGRATED_FLAG = 'niftylens_quiz_legacy_migrated_v2';

export function normalizeQuizScope(uid?: string | null): string {
  const cleaned = (uid || '').trim();
  return cleaned.length > 0 ? cleaned.replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
}

export function getQuizStatsStorageKey(uid?: string | null): string {
  return `niftylens_quiz_stats_v2_${normalizeQuizScope(uid)}`;
}

export function getQuizJournalStorageKey(uid?: string | null): string {
  return `niftylens_quiz_journal_v2_${normalizeQuizScope(uid)}`;
}

export function getQuizSurvivalBestStorageKey(uid?: string | null): string {
  return `niftylens_quiz_survival_best_v2_${normalizeQuizScope(uid)}`;
}

export function getQuizSurvivalBestScoreStorageKey(uid?: string | null): string {
  return `niftylens_quiz_survival_score_v2_${normalizeQuizScope(uid)}`;
}

/**
 * Safely migrates legacy unscoped quiz keys at most once to the current scope and removes
 * the unscoped keys so Account A's local quiz history can never leak into Account B.
 */
function migrateLegacyQuizStorageOnce(uid?: string | null, storage?: Storage): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;

  try {
    const alreadyMigrated = store.getItem(LEGACY_MIGRATED_FLAG);
    const legacyQuiz = store.getItem(LEGACY_QUIZ_STATS_KEY);
    const legacyStats = store.getItem(LEGACY_USER_STATS_KEY);
    const legacySurvival = store.getItem(LEGACY_SURVIVAL_BEST_KEY);

    if (!alreadyMigrated && (legacyQuiz || legacyStats || legacySurvival)) {
      const targetScope = uid || 'guest';
      if (legacyQuiz && !store.getItem(getQuizStatsStorageKey(targetScope))) {
        store.setItem(getQuizStatsStorageKey(targetScope), legacyQuiz);
      }
      if (legacyStats && !store.getItem(getQuizJournalStorageKey(targetScope))) {
        store.setItem(getQuizJournalStorageKey(targetScope), legacyStats);
      }
      if (legacySurvival && !store.getItem(getQuizSurvivalBestStorageKey(targetScope))) {
        store.setItem(getQuizSurvivalBestStorageKey(targetScope), legacySurvival);
      }
      store.setItem(LEGACY_MIGRATED_FLAG, normalizeQuizScope(targetScope));
    }

    // Always remove unscoped global keys so they can never be shared across accounts
    store.removeItem(LEGACY_QUIZ_STATS_KEY);
    store.removeItem(LEGACY_USER_STATS_KEY);
    store.removeItem(LEGACY_SURVIVAL_BEST_KEY);
  } catch {
    // Ignore storage access errors
  }
}

export function loadScopedQuizProgress(
  uid?: string | null,
  storage?: Storage
): {
  quizStats: QuizStats;
  stats: UserStats;
  survivalState: SurvivalState;
} {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  migrateLegacyQuizStorageOnce(uid, store);

  let quizStats = { ...INITIAL_QUIZ_STATS };
  let stats = { ...INITIAL_STATS };
  let bestStreak = 0;

  if (store) {
    try {
      const rawQuiz = store.getItem(getQuizStatsStorageKey(uid));
      if (rawQuiz) quizStats = reconcileQuizStats(JSON.parse(rawQuiz));
    } catch {}

    try {
      const rawStats = store.getItem(getQuizJournalStorageKey(uid));
      if (rawStats) stats = reconcileUserStats(JSON.parse(rawStats));
    } catch {}

    try {
      const rawBest = store.getItem(getQuizSurvivalBestStorageKey(uid));
      const parsed = rawBest ? Number(rawBest) : 0;
      bestStreak = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    } catch {}
  }

  return {
    quizStats,
    stats,
    survivalState: {
      ...INITIAL_SURVIVAL,
      bestStreak,
    },
  };
}

export function saveScopedQuizProgress(
  uid: string | null | undefined,
  payload: {
    quizStats: QuizStats;
    stats: UserStats;
    survivalBestStreak: number;
  },
  storage?: Storage
): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;
  try {
    store.setItem(
      getQuizStatsStorageKey(uid),
      JSON.stringify(reconcileQuizStats(payload.quizStats))
    );
    store.setItem(
      getQuizJournalStorageKey(uid),
      JSON.stringify(reconcileUserStats(payload.stats))
    );
    store.setItem(
      getQuizSurvivalBestStorageKey(uid),
      String(Math.max(0, Math.floor(payload.survivalBestStreak || 0)))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearScopedQuizProgress(uid?: string | null, storage?: Storage): void {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(getQuizStatsStorageKey(uid));
    store.removeItem(getQuizJournalStorageKey(uid));
    store.removeItem(getQuizSurvivalBestStorageKey(uid));
    store.removeItem(getQuizSurvivalBestScoreStorageKey(uid));
  } catch {}
}
