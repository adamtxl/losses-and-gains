import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  createSession,
  completeSession,
  getRecentSessions,
  addLoggedExercise,
  logSet,
  removeSet,
} from '../db/repositories/sessionRepository';
import type { LoggedSession, LoggedExercise, LoggedSet } from '../types';
import type { LogSetInput } from '../db/repositories/sessionRepository';

interface WorkoutStore {
  // ── State ──────────────────────────────────────────────────────────────────
  activeSession: LoggedSession | null;
  recentSessions: LoggedSession[];
  isLoading: boolean;
  error: string | null;

  // ── Internal ───────────────────────────────────────────────────────────────
  _db: SQLiteDatabase | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  initialize:           (db: SQLiteDatabase) => Promise<void>;
  startSession:         (data: Parameters<typeof createSession>[1]) => Promise<void>;
  addExerciseToSession: (data: Parameters<typeof addLoggedExercise>[1]) => Promise<void>;
  logSet:               (data: Omit<LogSetInput, 'exerciseId'> & { exerciseId: string }) => Promise<void>;
  removeSet:            (setId: string, loggedExerciseId: string) => Promise<void>;
  finishSession:        (data?: Parameters<typeof completeSession>[2]) => Promise<void>;
  cancelSession:        () => Promise<void>;
  refreshHistory:       () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>()((set, get) => ({
  activeSession: null,
  recentSessions: [],
  isLoading: false,
  error: null,
  _db: null,

  initialize: async (db) => {
    set({ _db: db });
    await _reloadHistory(db, set);
  },

  startSession: async (data) => {
    const db = get()._db;
    if (!db) return;
    if (get().activeSession) return; // guard: only one active session at a time

    set({ isLoading: true, error: null });
    try {
      const session = await createSession(db, data);
      set({ activeSession: session, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addExerciseToSession: async (data) => {
    const db = get()._db;
    const active = get().activeSession;
    if (!db || !active) return;

    set({ isLoading: true, error: null });
    try {
      const exercise = await addLoggedExercise(db, data);
      set({
        activeSession: {
          ...active,
          exercises: [...active.exercises, exercise],
        },
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  logSet: async (data) => {
    const db = get()._db;
    const active = get().activeSession;
    if (!db || !active) return;

    // Default repTypeConfig and isTopSet when callers don't specify
    const input: LogSetInput = {
      repTypeConfig: { repType: 'normal' },
      isTopSet: active.exercises
        .find((e) => e.id === data.loggedExerciseId)
        ?.sets.length === 0,
      ...data,
    };

    set({ isLoading: true, error: null });
    try {
      const logged = await logSet(db, input);
      const exercises = active.exercises.map((exercise): LoggedExercise => {
        if (exercise.id !== data.loggedExerciseId) return exercise;
        return {
          ...exercise,
          sets: [...exercise.sets, logged],
          // Keep topSetWeight in sync if this is the top set
          topSetWeight: logged.isTopSet ? logged.weight : exercise.topSetWeight,
        };
      });
      set({ activeSession: { ...active, exercises }, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  removeSet: async (setId, loggedExerciseId) => {
    const db = get()._db;
    const active = get().activeSession;
    if (!db || !active) return;

    set({ isLoading: true, error: null });
    try {
      await removeSet(db, setId, loggedExerciseId);

      // Re-derive topSetWeight from remaining sets after deletion
      const exercises = active.exercises.map((exercise): LoggedExercise => {
        if (exercise.id !== loggedExerciseId) return exercise;
        const remaining = exercise.sets.filter((s) => s.id !== setId);
        const newTop = remaining.reduce<LoggedSet | undefined>(
          (best, s) => (!best || s.weight > best.weight ? s : best),
          undefined,
        );
        return {
          ...exercise,
          sets: remaining.map((s) => ({ ...s, isTopSet: s.id === newTop?.id })),
          topSetWeight: newTop?.weight,
        };
      });
      set({ activeSession: { ...active, exercises }, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  finishSession: async (data) => {
    const db = get()._db;
    const active = get().activeSession;
    if (!db || !active) return;

    set({ isLoading: true, error: null });
    try {
      await completeSession(db, active.id, data);
      set({ activeSession: null, isLoading: false });
      await _reloadHistory(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  cancelSession: async () => {
    const db = get()._db;
    const active = get().activeSession;
    if (!db || !active) return;

    set({ isLoading: true, error: null });
    try {
      // CASCADE on logged_exercises and logged_sets handles children
      await db.runAsync('DELETE FROM logged_sessions WHERE id = ?', [active.id]);
      set({ activeSession: null, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  refreshHistory: async () => {
    const db = get()._db;
    if (!db) return;
    await _reloadHistory(db, set);
  },
}));

async function _reloadHistory(
  db: SQLiteDatabase,
  set: (partial: Partial<WorkoutStore>) => void,
): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    const recentSessions = await getRecentSessions(db);
    set({ recentSessions, isLoading: false });
  } catch (e) {
    set({ error: String(e), isLoading: false });
  }
}
