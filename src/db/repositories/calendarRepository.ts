import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { CalendarEntry, CalendarEntryStatus } from '../../types';

// ─── Row type ─────────────────────────────────────────────────────────────────

interface CalendarEntryRow {
  id: string;
  date: string;
  workout_template_id: string | null;
  program_block_id: string | null;
  program_week: number | null;
  status: string;
  logged_session_id: string | null;
  notes: string | null;
}

// ─── Row converter ────────────────────────────────────────────────────────────

function rowToCalendarEntry(row: CalendarEntryRow): CalendarEntry {
  return {
    id: row.id,
    date: row.date,
    workoutTemplateId: row.workout_template_id ?? undefined,
    programBlockId: row.program_block_id ?? undefined,
    programWeek: row.program_week ?? undefined,
    status: row.status as CalendarEntryStatus,
    loggedSessionId: row.logged_session_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}

// ─── Repository functions ─────────────────────────────────────────────────────

export async function createCalendarEntry(
  db: SQLiteDatabase,
  data: { date: string; workoutTemplateId?: string; notes?: string },
): Promise<CalendarEntry> {
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO calendar_entries (id, date, workout_template_id, status, notes)
     VALUES (?, ?, ?, 'planned', ?)`,
    [id, data.date, data.workoutTemplateId ?? null, data.notes ?? null],
  );

  return {
    id,
    date: data.date,
    workoutTemplateId: data.workoutTemplateId,
    status: 'planned',
    notes: data.notes,
  };
}

export async function getCalendarEntry(
  db: SQLiteDatabase,
  date: string,
): Promise<CalendarEntry | null> {
  const row = await db.getFirstAsync<CalendarEntryRow>(
    'SELECT * FROM calendar_entries WHERE date = ? LIMIT 1',
    [date],
  );
  return row ? rowToCalendarEntry(row) : null;
}

// month is 1-indexed. Uses LIKE 'YYYY-MM-%' — safe because both year and month
// are numbers, so there's no user input reaching the query.
export async function getCalendarEntriesForMonth(
  db: SQLiteDatabase,
  year: number,
  month: number,
): Promise<CalendarEntry[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const rows = await db.getAllAsync<CalendarEntryRow>(
    'SELECT * FROM calendar_entries WHERE date LIKE ? ORDER BY date ASC',
    [`${prefix}%`],
  );
  return rows.map(rowToCalendarEntry);
}

export async function updateCalendarEntryStatus(
  db: SQLiteDatabase,
  id: string,
  status: CalendarEntryStatus,
): Promise<void> {
  await db.runAsync(
    'UPDATE calendar_entries SET status = ? WHERE id = ?',
    [status, id],
  );
}

export async function linkSessionToEntry(
  db: SQLiteDatabase,
  entryId: string,
  sessionId: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE calendar_entries SET logged_session_id = ?, status = 'completed' WHERE id = ?`,
    [sessionId, entryId],
  );
}

export async function deleteCalendarEntry(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync('DELETE FROM calendar_entries WHERE id = ?', [id]);
}
