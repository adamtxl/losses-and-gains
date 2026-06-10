import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  createCalendarEntry,
  deleteCalendarEntry,
  getCalendarEntriesForMonth,
  linkSessionToEntry,
} from '../db/repositories/calendarRepository';
import type { CalendarEntry } from '../types';

interface CalendarStore {
  // ── State ──────────────────────────────────────────────────────────────────
  entriesByDate: Record<string, CalendarEntry>;
  selectedDate: string | null;
  isLoading: boolean;
  error: string | null;

  // ── Internal ───────────────────────────────────────────────────────────────
  _db: SQLiteDatabase | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  initialize:  (db: SQLiteDatabase) => Promise<void>;
  loadMonth:   (year: number, month: number) => Promise<void>;
  selectDate:  (date: string | null) => void;
  planWorkout: (date: string, notes?: string) => Promise<void>;
  deletePlan:  (date: string) => Promise<void>;
  linkSession: (date: string, sessionId: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  entriesByDate: {},
  selectedDate: null,
  isLoading: false,
  error: null,
  _db: null,

  initialize: async (db) => {
    set({ _db: db });
    const now = new Date();
    await get().loadMonth(now.getFullYear(), now.getMonth() + 1);
  },

  loadMonth: async (year, month) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      const entries = await getCalendarEntriesForMonth(db, year, month);
      set((state) => {
        const next = { ...state.entriesByDate };
        for (const entry of entries) {
          next[entry.date] = entry;
        }
        return { entriesByDate: next, isLoading: false };
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  selectDate: (date) => {
    set({ selectedDate: date });
  },

  planWorkout: async (date, notes) => {
    const db = get()._db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      const entry = await createCalendarEntry(db, { date, notes });
      set((state) => ({
        entriesByDate: { ...state.entriesByDate, [date]: entry },
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  deletePlan: async (date) => {
    const db = get()._db;
    const entry = get().entriesByDate[date];
    if (!db || !entry) return;
    set({ isLoading: true, error: null });
    try {
      await deleteCalendarEntry(db, entry.id);
      set((state) => {
        const next = { ...state.entriesByDate };
        delete next[date];
        return { entriesByDate: next, isLoading: false };
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  linkSession: async (date, sessionId) => {
    const db = get()._db;
    const entry = get().entriesByDate[date];
    if (!db || !entry) return;
    set({ isLoading: true, error: null });
    try {
      await linkSessionToEntry(db, entry.id, sessionId);
      set((state) => ({
        entriesByDate: {
          ...state.entriesByDate,
          [date]: { ...entry, loggedSessionId: sessionId, status: 'completed' },
        },
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));
