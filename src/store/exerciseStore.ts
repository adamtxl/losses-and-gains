import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  getAllExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../db/repositories/exerciseRepository';
import type { Exercise } from '../types';

interface ExerciseStore {
  // ── State ──────────────────────────────────────────────────────────────────
  exercises: Exercise[];
  isLoading: boolean;
  error: string | null;

  // ── Internal ───────────────────────────────────────────────────────────────
  // Not for component use — holds the db reference after initialize() is called.
  _db: SQLiteDatabase | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  // Called once by DatabaseInitializer in _layout.tsx.
  initialize: (db: SQLiteDatabase) => Promise<void>;

  // Mutations. After each one, state re-syncs from the DB via _reload().
  addExercise:    (data: Omit<Exercise, 'id' | 'createdAt'>)                         => Promise<void>;
  editExercise:   (id: string, updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>) => Promise<void>;
  removeExercise: (id: string)                                                        => Promise<void>;
}

export const useExerciseStore = create<ExerciseStore>()((set, get) => ({
  exercises: [],
  isLoading: false,
  error: null,
  _db: null,

  initialize: async (db) => {
    set({ _db: db });
    await _reload(db, set);
  },

  addExercise: async (data) => {
    const db = get()._db;
    if (!db) return;
    await createExercise(db, data);
    await _reload(db, set);
  },

  editExercise: async (id, updates) => {
    const db = get()._db;
    if (!db) return;
    await updateExercise(db, id, updates);
    await _reload(db, set);
  },

  removeExercise: async (id) => {
    const db = get()._db;
    if (!db) return;
    await deleteExercise(db, id);
    await _reload(db, set);
  },
}));

// Extracted so both initialize() and every mutation can share the same reload logic
// without importing get() into a scope where it isn't available.
async function _reload(
  db: SQLiteDatabase,
  set: (partial: Partial<ExerciseStore>) => void,
): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    const exercises = await getAllExercises(db);
    set({ exercises, isLoading: false });
  } catch (e) {
    set({ error: String(e), isLoading: false });
  }
}
