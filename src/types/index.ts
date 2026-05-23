// ============================================================
// WORKOUT APP — CORE TYPES
// All weights stored internally in lbs. Convert on display only.
// ============================================================

// ─────────────────────────────────────────────
// PRIMITIVES & ENUMS
// ─────────────────────────────────────────────

export type WeightUnit = 'lbs' | 'kg';

export type RepType = 'normal' | 'tempo' | 'pause';

export type SetType = 'warmup' | 'working' | 'topset' | 'backoff' | 'amrap';

export type ExerciseCategory =
  | 'squat'
  | 'hinge'
  | 'press'
  | 'pull'
  | 'carry'
  | 'accessory'
  | 'conditioning';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';

export type CalendarEntryStatus = 'planned' | 'completed' | 'missed' | 'partial';

// ─────────────────────────────────────────────
// EXERCISE LIBRARY
// ─────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  isCustom: boolean;          // false = standard library, true = user-created
  notes?: string;
  createdAt: string;          // ISO datetime
}

// ─────────────────────────────────────────────
// REP TYPE CONFIG
// Discriminated union — TypeScript will enforce
// that tempo is only present on tempo sets, etc.
// ─────────────────────────────────────────────

export interface NormalRepConfig {
  repType: 'normal';
}

export interface TempoRepConfig {
  repType: 'tempo';
  tempo: string;              // e.g. "32X1" (eccentric-pause-concentric-lockout)
}

export interface PauseRepConfig {
  repType: 'pause';
  pauseDuration: number;      // seconds
}

export type RepTypeConfig = NormalRepConfig | TempoRepConfig | PauseRepConfig;

// ─────────────────────────────────────────────
// WORKOUT TEMPLATES
// Reusable, not tied to any date.
// Both program blocks and calendar drops reference these.
// ─────────────────────────────────────────────

export interface PrescribedSet {
  id: string;
  setType: SetType;
  repTypeConfig: RepTypeConfig;
  targetReps: number | 'amrap';
  targetRPE?: number;         // 1-10 scale
  // Percentage-based back-off sets
  // "percentage of the weight you actually logged on the top set that day"
  isPercentageBased: boolean;
  percentageRef?: 'top_set';  // only ref type for now — expand later if needed
  percentage?: number;        // 0-1, e.g. 0.75 for 75%
  // For sets with a fixed prescribed weight (not percentage-based)
  prescribedWeight?: number;  // stored in lbs
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;              // display order within the workout
  sets: PrescribedSet[];
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  estimatedDurationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// PROGRAM BLOCKS (optional 12-week style)
// ─────────────────────────────────────────────

export interface ProgramDay {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  workoutTemplateId?: string;             // undefined = rest day
  isRestDay: boolean;
}

export interface ProgramWeek {
  weekNumber: number;         // 1-indexed
  days: ProgramDay[];
}

export interface ProgramBlock {
  id: string;
  name: string;               // e.g. "12-Week Strongman Block"
  durationWeeks: number;
  startDate: string;          // ISO date YYYY-MM-DD
  weeks: ProgramWeek[];
  isActive: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────
// CALENDAR
// Keeps planned vs logged completely separate.
// A CalendarEntry is the plan. LoggedSession is what happened.
// ─────────────────────────────────────────────

export interface CalendarEntry {
  id: string;
  date: string;               // ISO date YYYY-MM-DD
  workoutTemplateId?: string; // undefined = ad-hoc / to be decided
  programBlockId?: string;    // populated if part of a block
  programWeek?: number;
  status: CalendarEntryStatus;
  loggedSessionId?: string;   // populated after the workout is logged
  notes?: string;
}

// ─────────────────────────────────────────────
// LOGGED SESSIONS
// The actual record of what happened.
// ─────────────────────────────────────────────

export interface LoggedSet {
  id: string;
  prescribedSetId?: string;   // link back to template set, if applicable
  setNumber: number;          // 1-indexed
  repTypeConfig: RepTypeConfig;
  completedReps: number;
  weight: number;             // stored in lbs — always
  rpe?: number;
  isTopSet: boolean;          // used as percentage reference for back-off sets
  isPersonalRecord: boolean;
  notes?: string;
  completedAt: string;        // ISO datetime — used for elapsed time calc
}

export interface LoggedExercise {
  id: string;
  workoutExerciseId?: string; // link back to template exercise, if applicable
  exerciseId: string;
  order: number;
  sets: LoggedSet[];
  // Computed at log time: the actual weight logged on the top set
  // Back-off sets use this as their percentage reference
  topSetWeight?: number;      // lbs
  notes?: string;
}

export interface LoggedSession {
  id: string;
  calendarEntryId?: string;   // undefined for fully ad-hoc sessions
  date: string;               // ISO date
  startedAt: string;          // ISO datetime — store this, derive elapsed from it
  completedAt?: string;       // ISO datetime — undefined if in progress
  durationSeconds?: number;   // computed from start/complete
  exercises: LoggedExercise[];
  bodyweightLbs?: number;     // optional session bodyweight log
  overallRPE?: number;        // session RPE
  notes?: string;
}

// ─────────────────────────────────────────────
// PERSONAL RECORDS
// Detected automatically when a set is logged
// heavier than any prior log for that exercise.
// ─────────────────────────────────────────────

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  weight: number;             // lbs
  reps: number;
  achievedAt: string;         // ISO date
  loggedSetId: string;        // link to the set that set the record
}

// ─────────────────────────────────────────────
// PLATES CALCULATOR
// ─────────────────────────────────────────────

export interface PlateConfig {
  weightLbs: number;          // plate weight in lbs
  color: string;              // hex or named color for the icon
  quantity: number;           // how many the user owns (for availability check)
}

// Result of the plates calculation for a given target weight
export interface PlatesResult {
  targetWeightLbs: number;
  barbellWeightLbs: number;
  platesPerSide: Array<{ weightLbs: number; color: string; count: number }>;
  achievable: boolean;        // false if you can't hit this weight with available plates
  actualWeightLbs: number;    // closest achievable weight (may differ from target)
}

// ─────────────────────────────────────────────
// USER SETTINGS
// ─────────────────────────────────────────────

export interface UserSettings {
  weightUnit: WeightUnit;
  defaultRestSeconds: number;
  barbellWeightLbs: number;   // default 45
  availablePlates: PlateConfig[];
  // Notification settings (phase 2)
  // notificationsEnabled: boolean;
  // reminderTime?: string;    // HH:MM
}

// ─────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────

// Use this everywhere you display a weight to the user
export type DisplayWeight = {
  value: number;
  unit: WeightUnit;
  formatted: string;          // e.g. "315 lbs" or "142.9 kg"
};

// Timer state — store start time, derive elapsed
export interface RestTimer {
  startedAt: number;          // Date.now() — milliseconds since epoch
  durationSeconds: number;    // target rest duration
  isActive: boolean;
}
