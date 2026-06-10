import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';

import type { Exercise, ExerciseCategory, Equipment } from '../../types';

// ─── Row type ────────────────────────────────────────────────────────────────
// Mirrors exactly what SQLite returns: snake_case, 0/1 for booleans, null for optional.

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  equipment: string;
  is_custom: number;
  notes: string | null;
  created_at: string;
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    isCustom: row.is_custom === 1,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Pure async functions ─────────────────────────────────────────────────────
// Accept db explicitly — usable from Zustand store actions and other non-React code.

export async function getAllExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY name ASC',
    [],
  );
  return rows.map(rowToExercise);
}

export async function getExerciseById(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ?',
    [id],
  );
  return row ? rowToExercise(row) : null;
}

export async function searchExercises(db: SQLiteDatabase, query: string): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC',
    [`%${query}%`],
  );
  return rows.map(rowToExercise);
}

export async function createExercise(
  db: SQLiteDatabase,
  data: Omit<Exercise, 'id' | 'createdAt'>,
): Promise<Exercise> {
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO exercises (id, name, category, equipment, is_custom, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.category, data.equipment, data.isCustom ? 1 : 0, data.notes ?? null, createdAt],
  );

  return { ...data, id, createdAt };
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
): Promise<Exercise | null> {
  const existing = await getExerciseById(db, id);
  if (!existing) return null;

  const merged: Exercise = { ...existing, ...updates };

  await db.runAsync(
    `UPDATE exercises SET name = ?, category = ?, equipment = ?, is_custom = ?, notes = ?
     WHERE id = ?`,
    [merged.name, merged.category, merged.equipment, merged.isCustom ? 1 : 0, merged.notes ?? null, id],
  );

  return merged;
}

export async function deleteExercise(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

// ─── Hook wrapper ─────────────────────────────────────────────────────────────
// Thin convenience layer for components that don't go through the Zustand store.
// Gets db from context so callers don't need to pass it.

export function useExerciseRepository() {
  const db = useSQLiteContext();

  return {
    getAllExercises:  ()                                                              => getAllExercises(db),
    getExerciseById: (id: string)                                                    => getExerciseById(db, id),
    searchExercises: (query: string)                                                 => searchExercises(db, query),
    createExercise:  (data: Omit<Exercise, 'id' | 'createdAt'>)                     => createExercise(db, data),
    updateExercise:  (id: string, updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>) => updateExercise(db, id, updates),
    deleteExercise:  (id: string)                                                    => deleteExercise(db, id),
  };
}
