import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  LoggedSession,
  LoggedExercise,
  LoggedSet,
  PersonalRecord,
  RepType,
  RepTypeConfig,
} from '../../types';

// ─── Row types ────────────────────────────────────────────────────────────────

interface LoggedSessionRow {
  id: string;
  calendar_entry_id: string | null;
  date: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  bodyweight_lbs: number | null;
  overall_rpe: number | null;
  notes: string | null;
}

interface LoggedExerciseRow {
  id: string;
  session_id: string;
  workout_exercise_id: string | null;
  exercise_id: string;
  order_index: number;
  top_set_weight: number | null;
  notes: string | null;
}

interface LoggedSetRow {
  id: string;
  logged_exercise_id: string;
  prescribed_set_id: string | null;
  set_number: number;
  rep_type: string;
  tempo: string | null;
  pause_duration: number | null;
  completed_reps: number;
  weight: number;
  rpe: number | null;
  is_top_set: number;
  is_personal_record: number;
  notes: string | null;
  completed_at: string;
}

interface PersonalRecordRow {
  id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  achieved_at: string;
  logged_set_id: string;
}

// ─── Row converters ───────────────────────────────────────────────────────────

function rowToRepTypeConfig(row: { rep_type: string; tempo: string | null; pause_duration: number | null }): RepTypeConfig {
  const repType = row.rep_type as RepType;
  if (repType === 'tempo') return { repType: 'tempo', tempo: row.tempo ?? '' };
  if (repType === 'pause') return { repType: 'pause', pauseDuration: row.pause_duration ?? 0 };
  return { repType: 'normal' };
}

function rowToLoggedSet(row: LoggedSetRow): LoggedSet {
  return {
    id: row.id,
    prescribedSetId: row.prescribed_set_id ?? undefined,
    setNumber: row.set_number,
    repTypeConfig: rowToRepTypeConfig(row),
    completedReps: row.completed_reps,
    weight: row.weight,
    rpe: row.rpe ?? undefined,
    isTopSet: row.is_top_set === 1,
    isPersonalRecord: row.is_personal_record === 1,
    notes: row.notes ?? undefined,
    completedAt: row.completed_at,
  };
}

function rowToLoggedExercise(row: LoggedExerciseRow, sets: LoggedSet[]): LoggedExercise {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id ?? undefined,
    exerciseId: row.exercise_id,
    order: row.order_index,
    sets,
    topSetWeight: row.top_set_weight ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function rowToLoggedSession(row: LoggedSessionRow, exercises: LoggedExercise[]): LoggedSession {
  return {
    id: row.id,
    calendarEntryId: row.calendar_entry_id ?? undefined,
    date: row.date,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    exercises,
    bodyweightLbs: row.bodyweight_lbs ?? undefined,
    overallRPE: row.overall_rpe ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function rowToPersonalRecord(row: PersonalRecordRow): PersonalRecord {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    weight: row.weight,
    reps: row.reps,
    achievedAt: row.achieved_at,
    loggedSetId: row.logged_set_id,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchExercisesForSession(db: SQLiteDatabase, sessionId: string): Promise<LoggedExercise[]> {
  const exerciseRows = await db.getAllAsync<LoggedExerciseRow>(
    'SELECT * FROM logged_exercises WHERE session_id = ? ORDER BY order_index ASC',
    [sessionId],
  );

  const exercises: LoggedExercise[] = [];
  for (const eRow of exerciseRows) {
    const setRows = await db.getAllAsync<LoggedSetRow>(
      'SELECT * FROM logged_sets WHERE logged_exercise_id = ? ORDER BY set_number ASC',
      [eRow.id],
    );
    exercises.push(rowToLoggedExercise(eRow, setRows.map(rowToLoggedSet)));
  }
  return exercises;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

export async function createSession(
  db: SQLiteDatabase,
  data: Pick<LoggedSession, 'date' | 'startedAt' | 'calendarEntryId' | 'bodyweightLbs' | 'notes'>,
): Promise<LoggedSession> {
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO logged_sessions (id, calendar_entry_id, date, started_at, bodyweight_lbs, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.calendarEntryId ?? null, data.date, data.startedAt, data.bodyweightLbs ?? null, data.notes ?? null],
  );

  return {
    id,
    calendarEntryId: data.calendarEntryId,
    date: data.date,
    startedAt: data.startedAt,
    exercises: [],
    bodyweightLbs: data.bodyweightLbs,
    notes: data.notes,
  };
}

export async function completeSession(
  db: SQLiteDatabase,
  sessionId: string,
  data?: Pick<LoggedSession, 'overallRPE' | 'notes'>,
): Promise<LoggedSession | null> {
  const completedAt = new Date().toISOString();

  // julianday computes fractional days; multiply by 86400 to get seconds
  await db.runAsync(
    `UPDATE logged_sessions
     SET completed_at     = ?,
         duration_seconds = CAST(ROUND((julianday(?) - julianday(started_at)) * 86400) AS INTEGER),
         overall_rpe      = ?,
         notes            = COALESCE(?, notes)
     WHERE id = ?`,
    [completedAt, completedAt, data?.overallRPE ?? null, data?.notes ?? null, sessionId],
  );

  return getSessionById(db, sessionId);
}

export async function getSessionById(db: SQLiteDatabase, sessionId: string): Promise<LoggedSession | null> {
  const row = await db.getFirstAsync<LoggedSessionRow>(
    'SELECT * FROM logged_sessions WHERE id = ?',
    [sessionId],
  );
  if (!row) return null;

  const exercises = await fetchExercisesForSession(db, sessionId);
  return rowToLoggedSession(row, exercises);
}

export async function getRecentSessions(db: SQLiteDatabase, limit = 20): Promise<LoggedSession[]> {
  const rows = await db.getAllAsync<LoggedSessionRow>(
    `SELECT * FROM logged_sessions
     WHERE completed_at IS NOT NULL
     ORDER BY date DESC
     LIMIT ?`,
    [limit],
  );

  const sessions: LoggedSession[] = [];
  for (const row of rows) {
    const exercises = await fetchExercisesForSession(db, row.id);
    sessions.push(rowToLoggedSession(row, exercises));
  }
  return sessions;
}

// ─── Exercise within a session ────────────────────────────────────────────────

export async function addLoggedExercise(
  db: SQLiteDatabase,
  data: Pick<LoggedExercise, 'exerciseId' | 'order' | 'workoutExerciseId' | 'notes'> & { sessionId: string },
): Promise<LoggedExercise> {
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO logged_exercises (id, session_id, workout_exercise_id, exercise_id, order_index, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.sessionId, data.workoutExerciseId ?? null, data.exerciseId, data.order, data.notes ?? null],
  );

  return {
    id,
    workoutExerciseId: data.workoutExerciseId,
    exerciseId: data.exerciseId,
    order: data.order,
    sets: [],
    notes: data.notes,
  };
}

// ─── Set logging (with PR detection) ─────────────────────────────────────────

export type LogSetInput = {
  loggedExerciseId: string;
  exerciseId: string;
  prescribedSetId?: string;
  setNumber: number;
  repTypeConfig: RepTypeConfig;
  completedReps: number;
  weight: number;
  rpe?: number;
  isTopSet: boolean;
  notes?: string;
};

export async function logSet(db: SQLiteDatabase, data: LogSetInput): Promise<LoggedSet> {
  const id = Crypto.randomUUID();
  const completedAt = new Date().toISOString();

  let isPersonalRecord = false;
  let prId: string | null = null;

  await db.withExclusiveTransactionAsync(async () => {
    // PR detection: is this weight heavier than every prior set at this rep count?
    const prCheck = await db.getFirstAsync<{ max_weight: number | null }>(
      `SELECT MAX(ls.weight) AS max_weight
       FROM logged_sets ls
       JOIN logged_exercises le ON ls.logged_exercise_id = le.id
       WHERE le.exercise_id = ?
         AND ls.completed_reps = ?
         AND ls.id != ?`,
      [data.exerciseId, data.completedReps, id],
    );

    const prevBest = prCheck?.max_weight ?? null;
    isPersonalRecord = prevBest === null || data.weight > prevBest;

    const repType = data.repTypeConfig.repType;
    const tempo = data.repTypeConfig.repType === 'tempo' ? data.repTypeConfig.tempo : null;
    const pauseDuration = data.repTypeConfig.repType === 'pause' ? data.repTypeConfig.pauseDuration : null;

    await db.runAsync(
      `INSERT INTO logged_sets
         (id, logged_exercise_id, prescribed_set_id, set_number,
          rep_type, tempo, pause_duration, completed_reps, weight,
          rpe, is_top_set, is_personal_record, notes, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.loggedExerciseId,
        data.prescribedSetId ?? null,
        data.setNumber,
        repType,
        tempo,
        pauseDuration,
        data.completedReps,
        data.weight,
        data.rpe ?? null,
        data.isTopSet ? 1 : 0,
        isPersonalRecord ? 1 : 0,
        data.notes ?? null,
        completedAt,
      ],
    );

    if (isPersonalRecord) {
      prId = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, weight, reps, achieved_at, logged_set_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [prId, data.exerciseId, data.weight, data.completedReps, completedAt.slice(0, 10), id],
      );
    }

    if (data.isTopSet) {
      await db.runAsync(
        'UPDATE logged_exercises SET top_set_weight = ? WHERE id = ?',
        [data.weight, data.loggedExerciseId],
      );
    }
  });

  return {
    id,
    prescribedSetId: data.prescribedSetId,
    setNumber: data.setNumber,
    repTypeConfig: data.repTypeConfig,
    completedReps: data.completedReps,
    weight: data.weight,
    rpe: data.rpe,
    isTopSet: data.isTopSet,
    isPersonalRecord,
    notes: data.notes,
    completedAt,
  };
}

export async function removeSet(
  db: SQLiteDatabase,
  setId: string,
  loggedExerciseId: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async () => {
    const deleted = await db.getFirstAsync<{ is_top_set: number }>(
      'SELECT is_top_set FROM logged_sets WHERE id = ?',
      [setId],
    );

    await db.runAsync('DELETE FROM logged_sets WHERE id = ?', [setId]);

    if (deleted?.is_top_set === 1) {
      // Promote the heaviest remaining set as the new top set
      const next = await db.getFirstAsync<{ id: string; weight: number } | null>(
        `SELECT id, weight FROM logged_sets
         WHERE logged_exercise_id = ?
         ORDER BY weight DESC, set_number DESC
         LIMIT 1`,
        [loggedExerciseId],
      );

      if (next) {
        await db.runAsync(
          'UPDATE logged_sets SET is_top_set = 1 WHERE id = ?',
          [next.id],
        );
        await db.runAsync(
          'UPDATE logged_exercises SET top_set_weight = ? WHERE id = ?',
          [next.weight, loggedExerciseId],
        );
      } else {
        await db.runAsync(
          'UPDATE logged_exercises SET top_set_weight = NULL WHERE id = ?',
          [loggedExerciseId],
        );
      }
    }
  });
}

// ─── PR queries ───────────────────────────────────────────────────────────────

export async function getBestSetForExercise(
  db: SQLiteDatabase,
  exerciseId: string,
): Promise<LoggedSet | null> {
  const row = await db.getFirstAsync<LoggedSetRow>(
    `SELECT ls.*
     FROM logged_sets ls
     JOIN logged_exercises le ON ls.logged_exercise_id = le.id
     WHERE le.exercise_id = ?
     ORDER BY ls.weight DESC, ls.completed_reps DESC
     LIMIT 1`,
    [exerciseId],
  );
  return row ? rowToLoggedSet(row) : null;
}

export async function getPRHistoryForExercise(
  db: SQLiteDatabase,
  exerciseId: string,
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<PersonalRecordRow>(
    `SELECT * FROM personal_records
     WHERE exercise_id = ?
     ORDER BY achieved_at ASC, weight ASC`,
    [exerciseId],
  );
  return rows.map(rowToPersonalRecord);
}
