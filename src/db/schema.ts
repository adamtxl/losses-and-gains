import type { SQLiteDatabase } from 'expo-sqlite';

import { seedExercises } from './seed';

// Matches SQLiteProvider's onInit prop: (db: SQLiteDatabase) => Promise<void>
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // WAL mode: writes don't block concurrent reads — keeps the UI thread responsive
  await db.execAsync('PRAGMA journal_mode = WAL;');
  // SQLite disables foreign key enforcement by default
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await createTables(db);
  await seedExercises(db);
}

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  // execAsync runs all statements in a single call — safe for DDL only (no user input)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      equipment   TEXT NOT NULL,
      is_custom   INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id                         TEXT PRIMARY KEY NOT NULL,
      name                       TEXT NOT NULL,
      description                TEXT,
      estimated_duration_minutes INTEGER,
      created_at                 TEXT NOT NULL,
      updated_at                 TEXT NOT NULL
    );

    -- One row per exercise slot in a template, ordered by order_index
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id          TEXT PRIMARY KEY NOT NULL,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      order_index INTEGER NOT NULL,
      notes       TEXT
    );

    -- RepTypeConfig is a TS discriminated union; we flatten it into columns.
    -- tempo and pause_duration are NULL when not applicable.
    -- target_reps stores a number or the literal string 'amrap'.
    CREATE TABLE IF NOT EXISTS prescribed_sets (
      id                  TEXT PRIMARY KEY NOT NULL,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_type            TEXT NOT NULL,
      rep_type            TEXT NOT NULL,
      tempo               TEXT,
      pause_duration      INTEGER,
      target_reps         TEXT NOT NULL,
      target_rpe          REAL,
      is_percentage_based INTEGER NOT NULL DEFAULT 0,
      percentage_ref      TEXT,
      percentage          REAL,
      prescribed_weight   REAL,
      rest_seconds        INTEGER,
      notes               TEXT
    );

    CREATE TABLE IF NOT EXISTS program_blocks (
      id             TEXT PRIMARY KEY NOT NULL,
      name           TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      start_date     TEXT NOT NULL,
      is_active      INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS program_weeks (
      id          TEXT PRIMARY KEY NOT NULL,
      block_id    TEXT NOT NULL REFERENCES program_blocks(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS program_days (
      id                  TEXT PRIMARY KEY NOT NULL,
      week_id             TEXT NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
      day_of_week         INTEGER NOT NULL,
      workout_template_id TEXT REFERENCES workout_templates(id),
      is_rest_day         INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS calendar_entries (
      id                  TEXT PRIMARY KEY NOT NULL,
      date                TEXT NOT NULL,
      workout_template_id TEXT REFERENCES workout_templates(id),
      program_block_id    TEXT REFERENCES program_blocks(id),
      program_week        INTEGER,
      status              TEXT NOT NULL DEFAULT 'planned',
      logged_session_id   TEXT,
      notes               TEXT
    );

    CREATE TABLE IF NOT EXISTS logged_sessions (
      id                TEXT PRIMARY KEY NOT NULL,
      calendar_entry_id TEXT REFERENCES calendar_entries(id),
      date              TEXT NOT NULL,
      started_at        TEXT NOT NULL,
      completed_at      TEXT,
      duration_seconds  INTEGER,
      bodyweight_lbs    REAL,
      overall_rpe       REAL,
      notes             TEXT
    );

    CREATE TABLE IF NOT EXISTS logged_exercises (
      id                  TEXT PRIMARY KEY NOT NULL,
      session_id          TEXT NOT NULL REFERENCES logged_sessions(id) ON DELETE CASCADE,
      workout_exercise_id TEXT,
      exercise_id         TEXT NOT NULL REFERENCES exercises(id),
      order_index         INTEGER NOT NULL,
      top_set_weight      REAL,
      notes               TEXT
    );

    -- Same RepTypeConfig flattening as prescribed_sets
    CREATE TABLE IF NOT EXISTS logged_sets (
      id                 TEXT PRIMARY KEY NOT NULL,
      logged_exercise_id TEXT NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
      prescribed_set_id  TEXT,
      set_number         INTEGER NOT NULL,
      rep_type           TEXT NOT NULL,
      tempo              TEXT,
      pause_duration     INTEGER,
      completed_reps     INTEGER NOT NULL,
      weight             REAL NOT NULL,
      rpe                REAL,
      is_top_set         INTEGER NOT NULL DEFAULT 0,
      is_personal_record INTEGER NOT NULL DEFAULT 0,
      notes              TEXT,
      completed_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id            TEXT PRIMARY KEY NOT NULL,
      exercise_id   TEXT NOT NULL REFERENCES exercises(id),
      weight        REAL NOT NULL,
      reps          INTEGER NOT NULL,
      achieved_at   TEXT NOT NULL,
      logged_set_id TEXT NOT NULL REFERENCES logged_sets(id)
    );
  `);
}
