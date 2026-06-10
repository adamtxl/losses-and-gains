import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  addPrescribedSet,
  removePrescribedSet,
  updatePrescribedSet,
} from '../db/repositories/templateRepository';
import type { WorkoutTemplate } from '../types';
import type {
  AddPrescribedSetInput,
  UpdatePrescribedSetInput,
} from '../db/repositories/templateRepository';

interface TemplateStore {
  // ── State ──────────────────────────────────────────────────────────────────
  templates: WorkoutTemplate[];
  isLoading: boolean;
  error: string | null;

  // ── Internal ───────────────────────────────────────────────────────────────
  _db: SQLiteDatabase | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  initialize:     (db: SQLiteDatabase) => Promise<void>;
  refresh:        () => Promise<void>;
  // Returns the new template's id, or null on error, so the caller can navigate to it.
  createTemplate: (name: string, description?: string) => Promise<string | null>;
  updateTemplate: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addExercise:    (templateId: string, exerciseId: string) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  addSet:         (workoutExerciseId: string, data: Omit<AddPrescribedSetInput, 'workoutExerciseId'>) => Promise<void>;
  removeSet:      (prescribedSetId: string) => Promise<void>;
  updateSet:      (prescribedSetId: string, data: UpdatePrescribedSetInput) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,
  _db: null,

  initialize: async (db) => {
    set({ _db: db });
    await _reload(db, set);
  },

  refresh: async () => {
    const db = get()._db;
    if (!db) return;
    await _reload(db, set);
  },

  createTemplate: async (name, description) => {
    const db = get()._db;
    if (!db) return null;
    set({ isLoading: true, error: null });
    try {
      const template = await createTemplate(db, name, description);
      await _reload(db, set);
      return template.id;
    } catch (e) {
      set({ error: String(e), isLoading: false });
      return null;
    }
  },

  updateTemplate: async (id, data) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await updateTemplate(db, id, data);
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  deleteTemplate: async (id) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await deleteTemplate(db, id);
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addExercise: async (templateId, exerciseId) => {
    const db = get()._db;
    if (!db) return;
    const template = get().templates.find((t) => t.id === templateId);
    const order = template ? template.exercises.length : 0;
    set({ isLoading: true, error: null });
    try {
      await addExerciseToTemplate(db, { templateId, exerciseId, order });
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  removeExercise: async (workoutExerciseId) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await removeExerciseFromTemplate(db, workoutExerciseId);
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addSet: async (workoutExerciseId, data) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await addPrescribedSet(db, { workoutExerciseId, ...data });
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  removeSet: async (prescribedSetId) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await removePrescribedSet(db, prescribedSetId);
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  updateSet: async (prescribedSetId, data) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      await updatePrescribedSet(db, prescribedSetId, data);
      await _reload(db, set);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));

async function _reload(
  db: SQLiteDatabase,
  set: (partial: Partial<TemplateStore>) => void,
): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    const templates = await getAllTemplates(db);
    set({ templates, isLoading: false });
  } catch (e) {
    set({ error: String(e), isLoading: false });
  }
}
