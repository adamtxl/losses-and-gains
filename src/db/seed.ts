import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExerciseCategory, Equipment } from '../types';

interface SeedExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
}

// Fixed IDs ensure INSERT OR IGNORE is truly idempotent — same row, same PK, every run.
// isCustom = 0 (false) for all standard library entries.
const SEED_EXERCISES: SeedExercise[] = [
  // ─── Squats ──────────────────────────────────────────────────
  { id: 'ex-back-squat',    name: 'Back Squat',          category: 'squat', equipment: 'barbell'    },
  { id: 'ex-front-squat',   name: 'Front Squat',         category: 'squat', equipment: 'barbell'    },
  { id: 'ex-pause-squat',   name: 'Pause Squat',         category: 'squat', equipment: 'barbell'    },
  { id: 'ex-box-squat',     name: 'Box Squat',           category: 'squat', equipment: 'barbell'    },
  { id: 'ex-goblet-squat',  name: 'Goblet Squat',        category: 'squat', equipment: 'kettlebell' },

  // ─── Hinges ──────────────────────────────────────────────────
  { id: 'ex-deadlift',      name: 'Deadlift',            category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-sumo-deadlift', name: 'Sumo Deadlift',       category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-rdl',           name: 'Romanian Deadlift',   category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-sldl',          name: 'Stiff-Leg Deadlift',  category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-good-morning',  name: 'Good Morning',        category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-hip-thrust',    name: 'Hip Thrust',          category: 'hinge', equipment: 'barbell'    },
  { id: 'ex-kb-swing',      name: 'Kettlebell Swing',    category: 'hinge', equipment: 'kettlebell' },

  // ─── Presses ─────────────────────────────────────────────────
  { id: 'ex-bench-press',       name: 'Bench Press',              category: 'press', equipment: 'barbell'  },
  { id: 'ex-incline-bench',     name: 'Incline Bench Press',      category: 'press', equipment: 'barbell'  },
  { id: 'ex-close-grip-bench',  name: 'Close-Grip Bench Press',   category: 'press', equipment: 'barbell'  },
  { id: 'ex-ohp',               name: 'Overhead Press',           category: 'press', equipment: 'barbell'  },
  { id: 'ex-push-press',        name: 'Push Press',               category: 'press', equipment: 'barbell'  },
  { id: 'ex-db-bench',          name: 'Dumbbell Bench Press',     category: 'press', equipment: 'dumbbell' },
  { id: 'ex-db-ohp',            name: 'Dumbbell Overhead Press',  category: 'press', equipment: 'dumbbell' },

  // ─── Pulls ───────────────────────────────────────────────────
  { id: 'ex-pull-up',      name: 'Pull-Up',                   category: 'pull', equipment: 'bodyweight' },
  { id: 'ex-chin-up',      name: 'Chin-Up',                   category: 'pull', equipment: 'bodyweight' },
  { id: 'ex-barbell-row',  name: 'Barbell Row',               category: 'pull', equipment: 'barbell'    },
  { id: 'ex-pendlay-row',  name: 'Pendlay Row',               category: 'pull', equipment: 'barbell'    },
  { id: 'ex-cable-row',    name: 'Cable Row',                 category: 'pull', equipment: 'cable'      },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown',              category: 'pull', equipment: 'cable'      },
  { id: 'ex-db-row',       name: 'Single-Arm Dumbbell Row',   category: 'pull', equipment: 'dumbbell'   },
  { id: 'ex-face-pull',    name: 'Face Pull',                 category: 'pull', equipment: 'cable'      },

  // ─── Carries ─────────────────────────────────────────────────
  { id: 'ex-farmer-carry',   name: 'Farmer Carry',    category: 'carry', equipment: 'dumbbell' },
  { id: 'ex-suitcase-carry', name: 'Suitcase Carry',  category: 'carry', equipment: 'dumbbell' },

  // ─── Accessories ─────────────────────────────────────────────
  { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown',       category: 'accessory', equipment: 'cable'      },
  { id: 'ex-bicep-curl',      name: 'Bicep Curl',            category: 'accessory', equipment: 'barbell'    },
  { id: 'ex-db-curl',         name: 'Dumbbell Curl',         category: 'accessory', equipment: 'dumbbell'   },
  { id: 'ex-lateral-raise',   name: 'Lateral Raise',         category: 'accessory', equipment: 'dumbbell'   },
  { id: 'ex-leg-curl',        name: 'Leg Curl',              category: 'accessory', equipment: 'machine'    },
  { id: 'ex-leg-extension',   name: 'Leg Extension',         category: 'accessory', equipment: 'machine'    },
  { id: 'ex-calf-raise',      name: 'Calf Raise',            category: 'accessory', equipment: 'machine'    },
  { id: 'ex-ab-wheel',        name: 'Ab Wheel Rollout',      category: 'accessory', equipment: 'other'      },
  { id: 'ex-plank',           name: 'Plank',                 category: 'accessory', equipment: 'bodyweight' },
];

const SEED_DATE = '2024-01-01T00:00:00.000Z';

export async function seedExercises(db: SQLiteDatabase): Promise<void> {
  // Single transaction: all inserts commit together or not at all.
  // INSERT OR IGNORE skips any row whose id already exists — safe to re-run every startup.
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const ex of SEED_EXERCISES) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO exercises (id, name, category, equipment, is_custom, notes, created_at)
         VALUES (?, ?, ?, ?, 0, NULL, ?)`,
        [ex.id, ex.name, ex.category, ex.equipment, SEED_DATE],
      );
    }
  });
}
