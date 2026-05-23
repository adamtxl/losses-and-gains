import { useSQLiteContext } from 'expo-sqlite';

import type { Exercise, ExerciseCategory, Equipment } from '../../types';

// What SQLite actually returns — snake_case, integers for booleans, null for optional
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

// Call this hook inside any component that needs exercise data.
// useSQLiteContext() requires a <SQLiteProvider> ancestor in the tree.
export function useExerciseRepository() {
  const db = useSQLiteContext();

  async function getAllExercises(): Promise<Exercise[]> {
    const rows = await db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises ORDER BY name ASC',
      [],
    );
    return rows.map(rowToExercise);
  }

  async function getExerciseById(id: string): Promise<Exercise | null> {
    const row = await db.getFirstAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE id = ?',
      [id],
    );
    return row ? rowToExercise(row) : null;
  }

  async function searchExercises(query: string): Promise<Exercise[]> {
    const rows = await db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC',
      [`%${query}%`],
    );
    return rows.map(rowToExercise);
  }

  async function createExercise(data: Omit<Exercise, 'id' | 'createdAt'>): Promise<Exercise> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO exercises (id, name, category, equipment, is_custom, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.category, data.equipment, data.isCustom ? 1 : 0, data.notes ?? null, createdAt],
    );

    return { ...data, id, createdAt };
  }

  async function updateExercise(
    id: string,
    updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
  ): Promise<Exercise | null> {
    const existing = await getExerciseById(id);
    if (!existing) return null;

    const merged: Exercise = { ...existing, ...updates };

    await db.runAsync(
      `UPDATE exercises
       SET name = ?, category = ?, equipment = ?, is_custom = ?, notes = ?
       WHERE id = ?`,
      [merged.name, merged.category, merged.equipment, merged.isCustom ? 1 : 0, merged.notes ?? null, id],
    );

    return merged;
  }

  async function deleteExercise(id: string): Promise<void> {
    await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
  }

  return { getAllExercises, getExerciseById, searchExercises, createExercise, updateExercise, deleteExercise };
}
