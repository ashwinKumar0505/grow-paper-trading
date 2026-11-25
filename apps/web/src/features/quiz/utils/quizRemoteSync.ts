import { buildAuthenticatedHeaders } from '../../../lib/authSession';
import { db, doc, getDoc, setDoc } from '../../../lib/firebase';
import type { QuizStats, UserStats } from '../types/trading';
import { reconcileQuizStats, reconcileUserStats } from './quizStorage';

export async function fetchRemoteQuizProgress(uid: string): Promise<{
  quizStats: QuizStats;
  stats: UserStats;
  survivalBestStreak: number;
} | null> {
  try {
    const headers = await buildAuthenticatedHeaders();
    if (headers.Authorization) {
      const res = await fetch('/api/quiz/progress', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.progress) {
          const p = data.progress;
          return {
            quizStats: reconcileQuizStats(p.quizStats),
            stats: reconcileUserStats(p.stats),
            survivalBestStreak: Number(p.survivalBestStreak || 0),
          };
        }
      }
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, 'users', uid, 'quiz_progress', 'main'));
    if (snap.exists()) {
      const remote = snap.data();
      if (remote) {
        return {
          quizStats: reconcileQuizStats(remote.quizStats),
          stats: reconcileUserStats(remote.stats),
          survivalBestStreak: Number(remote.survivalBestStreak || 0),
        };
      }
    }
  } catch {}

  return null;
}

export async function pushRemoteQuizProgress(
  uid: string,
  payload: {
    quizStats: QuizStats;
    stats: UserStats;
    survivalBestStreak: number;
  }
): Promise<void> {
  const progressPayload = {
    quizStats: reconcileQuizStats(payload.quizStats),
    stats: reconcileUserStats(payload.stats),
    survivalBestStreak: payload.survivalBestStreak,
    updatedAt: Date.now(),
  };

  try {
    const headers = await buildAuthenticatedHeaders();
    if (headers.Authorization) {
      await fetch('/api/quiz/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ progress: progressPayload }),
      });
    }
  } catch {}

  try {
    await setDoc(doc(db, 'users', uid, 'quiz_progress', 'main'), progressPayload, {
      merge: true,
    });
  } catch {}
}
