import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  WorkoutTemplate,
  WorkoutExercise,
  PrescribedSet,
  SetType,
  RepTypeConfig,
} from '../../types';

// ─── Row types ────────────────────────────────────────────────────────────────

interface WorkoutTemplateRow {
  id: string;
  name: string;
  description: string | null;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface WorkoutExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
}

interface PrescribedSetRow {
  id: string;
  workout_exercise_id: string;
  set_type: string;
  rep_type: string;
  tempo: string | null;
  pause_duration: number | null;
  target_reps: string;
  target_rpe: number | null;
  is_percentage_based: number;
  percentage_ref: string | null;
  percentage: number | null;
  prescribed_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

// ─── Row converters ───────────────────────────────────────────────────────────

function rowToRepTypeConfig(
  row: Pick<PrescribedSetRow, 'rep_type' | 'tempo' | 'pause_duration'>,
): RepTypeConfig {
  if (row.rep_type === 'tempo') return { repType: 'tempo', tempo: row.tempo ?? '' };
  if (row.rep_type === 'pause') return { repType: 'pause', pauseDuration: row.pause_duration ?? 0 };
  return { repType: 'normal' };
}

function rowToPrescribedSet(row: PrescribedSetRow): PrescribedSet {
  return {
    id: row.id,
    setType: row.set_type as SetType,
    repTypeConfig: rowToRepTypeConfig(row),
    targetReps: row.target_reps === 'amrap' ? 'amrap' : Number(row.target_reps),
    targetRPE: row.target_rpe ?? undefined,
    isPercentageBased: row.is_percentage_based === 1,
    percentageRef: row.percentage_ref === 'top_set' ? 'top_set' : undefined,
    percentage: row.percentage ?? undefined,
    prescribedWeight: row.prescribed_weight ?? undefined,
    restSeconds: row.rest_seconds ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function rowToWorkoutExercise(row: WorkoutExerciseRow, sets: PrescribedSet[]): WorkoutExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    order: row.order_index,
    sets,
    notes: row.notes ?? undefined,
  };
}

function rowToWorkoutTemplate(
  row: WorkoutTemplateRow,
  exercises: WorkoutExercise[],
): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    exercises,
    estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchExercisesForTemplate(
  db: SQLiteDatabase,
  templateId: string,
): Promise<WorkoutExercise[]> {
  const exerciseRows = await db.getAllAsync<WorkoutExerciseRow>(
    'SELECT * FROM workout_exercises WHERE template_id = ? ORDER BY order_index ASC',
    [templateId],
  );

  const exercises: WorkoutExercise[] = [];
  for (const eRow of exerciseRows) {
    const setRows = await db.getAllAsync<PrescribedSetRow>(
      'SELECT * FROM prescribed_sets WHERE workout_exercise_id = ?',
      [eRow.id],
    );
    exercises.push(rowToWorkoutExercise(eRow, setRows.map(rowToPrescribedSet)));
  }
  return exercises;
}

// ─── Template CRUD ────────────────────────────────────────────────────────────

export async function getAllTemplates(db: SQLiteDatabase): Promise<WorkoutTemplate[]> {
  const rows = await db.getAllAsync<WorkoutTemplateRow>(
    'SELECT * FROM workout_templates ORDER BY name ASC',
    [],
  );

  const templates: WorkoutTemplate[] = [];
  for (const row of rows) {
    const exercises = await fetchExercisesForTemplate(db, row.id);
    templates.push(rowToWorkoutTemplate(row, exercises));
  }
  return templates;
}

export async function getTemplateById(
  db: SQLiteDatabase,
  id: string,
): Promise<WorkoutTemplate | null> {
  const row = await db.getFirstAsync<WorkoutTemplateRow>(
    'SELECT * FROM workout_templates WHERE id = ?',
    [id],
  );
  if (!row) return null;

  const exercises = await fetchExercisesForTemplate(db, id);
  return rowToWorkoutTemplate(row, exercises);
}

export async function createTemplate(
  db: SQLiteDatabase,
  name: string,
  description?: string,
): Promise<WorkoutTemplate> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO workout_templates (id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, description ?? null, now, now],
  );

  return { id, name, description, exercises: [], createdAt: now, updatedAt: now };
}

export async function updateTemplate(
  db: SQLiteDatabase,
  id: string,
  data: { name?: string; description?: string },
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE workout_templates
     SET name        = COALESCE(?, name),
         description = COALESCE(?, description),
         updated_at  = ?
     WHERE id = ?`,
    [data.name ?? null, data.description ?? null, now, id],
  );
}

export async function deleteTemplate(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
}

// ─── Exercises within a template ──────────────────────────────────────────────

export async function addExerciseToTemplate(
  db: SQLiteDatabase,
  data: { templateId: string; exerciseId: string; order: number; notes?: string },
): Promise<WorkoutExercise> {
  const id = crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO workout_exercises (id, template_id, exercise_id, order_index, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.templateId, data.exerciseId, data.order, data.notes ?? null],
  );

  return { id, exerciseId: data.exerciseId, order: data.order, sets: [], notes: data.notes };
}

export async function removeExerciseFromTemplate(
  db: SQLiteDatabase,
  workoutExerciseId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [workoutExerciseId]);
}

export async function reorderExercises(
  db: SQLiteDatabase,
  templateId: string,
  orderedIds: string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE workout_exercises SET order_index = ? WHERE id = ? AND template_id = ?',
        [i, orderedIds[i], templateId],
      );
    }
  });
}

// ─── Prescribed sets ──────────────────────────────────────────────────────────

export type AddPrescribedSetInput = {
  workoutExerciseId: string;
  setType: SetType;
  repTypeConfig: RepTypeConfig;
  targetReps: number | 'amrap';
  targetRPE?: number;
  isPercentageBased: boolean;
  percentageRef?: 'top_set';
  percentage?: number;
  prescribedWeight?: number;
  restSeconds?: number;
  notes?: string;
};

export async function addPrescribedSet(
  db: SQLiteDatabase,
  data: AddPrescribedSetInput,
): Promise<PrescribedSet> {
  const id = crypto.randomUUID();
  const repType = data.repTypeConfig.repType;
  const tempo = data.repTypeConfig.repType === 'tempo' ? data.repTypeConfig.tempo : null;
  const pauseDuration = data.repTypeConfig.repType === 'pause' ? data.repTypeConfig.pauseDuration : null;
  const targetRepsStr = data.targetReps === 'amrap' ? 'amrap' : String(data.targetReps);

  await db.runAsync(
    `INSERT INTO prescribed_sets
       (id, workout_exercise_id, set_type, rep_type, tempo, pause_duration,
        target_reps, target_rpe, is_percentage_based, percentage_ref,
        percentage, prescribed_weight, rest_seconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.workoutExerciseId,
      data.setType,
      repType,
      tempo,
      pauseDuration,
      targetRepsStr,
      data.targetRPE ?? null,
      data.isPercentageBased ? 1 : 0,
      data.percentageRef ?? null,
      data.percentage ?? null,
      data.prescribedWeight ?? null,
      data.restSeconds ?? null,
      data.notes ?? null,
    ],
  );

  return {
    id,
    setType: data.setType,
    repTypeConfig: data.repTypeConfig,
    targetReps: data.targetReps,
    targetRPE: data.targetRPE,
    isPercentageBased: data.isPercentageBased,
    percentageRef: data.percentageRef,
    percentage: data.percentage,
    prescribedWeight: data.prescribedWeight,
    restSeconds: data.restSeconds,
    notes: data.notes,
  };
}

export async function removePrescribedSet(
  db: SQLiteDatabase,
  prescribedSetId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM prescribed_sets WHERE id = ?', [prescribedSetId]);
}

export type UpdatePrescribedSetInput = Partial<Omit<AddPrescribedSetInput, 'workoutExerciseId'>>;

export async function updatePrescribedSet(
  db: SQLiteDatabase,
  id: string,
  data: UpdatePrescribedSetInput,
): Promise<void> {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.setType !== undefined) {
    setClauses.push('set_type = ?');
    params.push(data.setType);
  }
  if (data.repTypeConfig !== undefined) {
    setClauses.push('rep_type = ?', 'tempo = ?', 'pause_duration = ?');
    params.push(
      data.repTypeConfig.repType,
      data.repTypeConfig.repType === 'tempo' ? data.repTypeConfig.tempo : null,
      data.repTypeConfig.repType === 'pause' ? data.repTypeConfig.pauseDuration : null,
    );
  }
  if (data.targetReps !== undefined) {
    setClauses.push('target_reps = ?');
    params.push(data.targetReps === 'amrap' ? 'amrap' : String(data.targetReps));
  }
  if (data.targetRPE !== undefined) {
    setClauses.push('target_rpe = ?');
    params.push(data.targetRPE);
  }
  if (data.isPercentageBased !== undefined) {
    setClauses.push('is_percentage_based = ?');
    params.push(data.isPercentageBased ? 1 : 0);
  }
  if (data.percentageRef !== undefined) {
    setClauses.push('percentage_ref = ?');
    params.push(data.percentageRef);
  }
  if (data.percentage !== undefined) {
    setClauses.push('percentage = ?');
    params.push(data.percentage);
  }
  if (data.prescribedWeight !== undefined) {
    setClauses.push('prescribed_weight = ?');
    params.push(data.prescribedWeight);
  }
  if (data.restSeconds !== undefined) {
    setClauses.push('rest_seconds = ?');
    params.push(data.restSeconds);
  }
  if (data.notes !== undefined) {
    setClauses.push('notes = ?');
    params.push(data.notes);
  }

  if (setClauses.length === 0) return;

  params.push(id);
  await db.runAsync(
    `UPDATE prescribed_sets SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );
}
