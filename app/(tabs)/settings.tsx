import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settingsStore';
import { PlateCalculator } from '@/components/workout/PlateCalculator';

// ─── Bar Weight Row ───────────────────────────────────────────────────────────

interface BarRowProps {
  name: string;
  weightLbs: number;
  onBlur: (value: number) => void;
}

function BarRow({ name, weightLbs, onBlur }: BarRowProps) {
  const theme = useTheme();
  const [text, setText] = useState(String(weightLbs));

  function handleBlur() {
    const n = parseFloat(text);
    if (!isNaN(n) && n > 0) {
      onBlur(n);
    } else {
      setText(String(weightLbs));
    }
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{name}</Text>
      <TextInput
        style={[styles.rowInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        returnKeyType="done"
        selectTextOnFocus
      />
    </View>
  );
}

// ─── Plate Count Row ──────────────────────────────────────────────────────────

interface PlateRowProps {
  weightLbs: number;
  count: number;
  onBlur: (value: number) => void;
}

function PlateRow({ weightLbs, count, onBlur }: PlateRowProps) {
  const theme = useTheme();
  const [text, setText] = useState(String(count));

  function handleBlur() {
    const n = parseInt(text, 10);
    if (!isNaN(n) && n >= 0) {
      onBlur(n);
    } else {
      setText(String(count));
    }
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{weightLbs} lbs</Text>
      <TextInput
        style={[styles.rowInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const bars            = useSettingsStore((s) => s.bars);
  const plateInventory  = useSettingsStore((s) => s.plateInventory);
  const updateBarWeight = useSettingsStore((s) => s.updateBarWeight);
  const updatePlateInventory = useSettingsStore((s) => s.updatePlateInventory);

  const sortedPlates = [...plateInventory].sort((a, b) => b.weightLbs - a.weightLbs);

  function handlePlateCountChange(weightLbs: number, count: number) {
    const next = plateInventory.map((p) =>
      p.weightLbs === weightLbs ? { ...p, count } : p,
    );
    void updatePlateInventory(next);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      <View style={[styles.header, { borderBottomColor: theme.backgroundElement, paddingTop: insets.top }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Settings</Text>
      </View>

      {/*
        ScrollView is appropriate here — settings content is bounded and small.
        FlatList would be overkill and makes nested inputs harder to manage.
      */}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Section 1: Bar Weights ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Bar Weights</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {bars.map((bar, i) => (
            <View key={bar.id}>
              <BarRow
                name={bar.name}
                weightLbs={bar.weightLbs}
                onBlur={(w) => { void updateBarWeight(bar.id, w); }}
              />
              {i < bars.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── Section 2: Plate Inventory ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Plate Inventory</Text>
        <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
          Total plates owned (both sides combined)
        </Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {sortedPlates.map((p, i) => (
            <View key={p.weightLbs}>
              <PlateRow
                weightLbs={p.weightLbs}
                count={p.count}
                onBlur={(c) => handlePlateCountChange(p.weightLbs, c)}
              />
              {i < sortedPlates.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── Section 3: Plate Calculator ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Plate Calculator</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <PlateCalculator />
        </View>

        <View style={{ height: Spacing.six }} />

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: Spacing.one + 2,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: Spacing.two,
    marginTop: -Spacing.one,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  rowLabel: {
    fontSize: 16,
    flex: 1,
  },
  rowInput: {
    width: 72,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
});
