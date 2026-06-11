import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import {
  getSetting,
  getSettingJson,
  setSetting,
} from '../db/repositories/settingsRepository';

export interface BarDefinition {
  id: string;
  name: string;
  weightLbs: number;
}

export interface PlateCount {
  weightLbs: number;
  count: number;
}

const DEFAULT_BARS: BarDefinition[] = [
  { id: 'bar-standard', name: 'Standard Bar',   weightLbs: 45 },
  { id: 'bar-ssb',      name: 'SSB',            weightLbs: 62 },
  { id: 'bar-axle',     name: 'Axle',           weightLbs: 35 },
  { id: 'bar-log',      name: 'Log',            weightLbs: 80 },
  { id: 'bar-farmers',  name: 'Farmers Handle', weightLbs: 25 },
];

const DEFAULT_PLATE_INVENTORY: PlateCount[] = [
  { weightLbs: 45,  count: 10 },
  { weightLbs: 35,  count: 2  },
  { weightLbs: 25,  count: 4  },
  { weightLbs: 10,  count: 4  },
  { weightLbs: 5,   count: 4  },
  { weightLbs: 2.5, count: 2  },
];

const DEFAULT_BAR_ID = 'bar-standard';

interface SettingsStore {
  bars: BarDefinition[];
  plateInventory: PlateCount[];
  defaultBarId: string;
  isLoading: boolean;
  error: string | null;
  _db: SQLiteDatabase | null;

  initialize: (db: SQLiteDatabase) => Promise<void>;
  updateBars: (bars: BarDefinition[]) => Promise<void>;
  updatePlateInventory: (inventory: PlateCount[]) => Promise<void>;
  setDefaultBar: (barId: string) => Promise<void>;
  updateBarWeight: (barId: string, weightLbs: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  bars: DEFAULT_BARS,
  plateInventory: DEFAULT_PLATE_INVENTORY,
  defaultBarId: DEFAULT_BAR_ID,
  isLoading: false,
  error: null,
  _db: null,

  initialize: async (db) => {
    set({ _db: db, isLoading: true, error: null });
    try {
      // Seed defaults on first launch (INSERT OR REPLACE won't overwrite user changes
      // because we only seed when the key is absent entirely).
      const rawBars = await getSetting(db, 'bars');
      if (rawBars === null) {
        await setSetting(db, 'bars', JSON.stringify(DEFAULT_BARS));
        await setSetting(db, 'plate_inventory', JSON.stringify(DEFAULT_PLATE_INVENTORY));
        await setSetting(db, 'default_bar_id', JSON.stringify(DEFAULT_BAR_ID));
      }

      const bars = await getSettingJson<BarDefinition[]>(db, 'bars', DEFAULT_BARS);
      const plateInventory = await getSettingJson<PlateCount[]>(db, 'plate_inventory', DEFAULT_PLATE_INVENTORY);
      const defaultBarId = await getSettingJson<string>(db, 'default_bar_id', DEFAULT_BAR_ID);

      set({ bars, plateInventory, defaultBarId, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  updateBars: async (bars) => {
    const db = get()._db;
    if (!db) return;
    await setSetting(db, 'bars', JSON.stringify(bars));
    set({ bars });
  },

  updatePlateInventory: async (inventory) => {
    const db = get()._db;
    if (!db) return;
    await setSetting(db, 'plate_inventory', JSON.stringify(inventory));
    set({ plateInventory: inventory });
  },

  setDefaultBar: async (barId) => {
    const db = get()._db;
    if (!db) return;
    await setSetting(db, 'default_bar_id', JSON.stringify(barId));
    set({ defaultBarId: barId });
  },

  updateBarWeight: async (barId, weightLbs) => {
    const db = get()._db;
    if (!db) return;
    const bars = get().bars.map((b) =>
      b.id === barId ? { ...b, weightLbs } : b,
    );
    await setSetting(db, 'bars', JSON.stringify(bars));
    set({ bars });
  },
}));
