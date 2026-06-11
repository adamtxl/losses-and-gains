import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settingsStore';
import { calculatePlates, formatPlateList } from '@/utils/plateCalculator';

// ─── Plate visual config ──────────────────────────────────────────────────────

interface PlateVisual {
  weightLbs: number;
  color: string;
  width: number;
}

const PLATE_VISUALS: PlateVisual[] = [
  { weightLbs: 45,  color: '#C0392B', width: 40 },
  { weightLbs: 35,  color: '#8E44AD', width: 32 },
  { weightLbs: 25,  color: '#2980B9', width: 28 },
  { weightLbs: 10,  color: '#27AE60', width: 20 },
  { weightLbs: 5,   color: '#F39C12', width: 16 },
  { weightLbs: 2.5, color: '#7F8C8D', width: 12 },
];

function plateColor(weightLbs: number): string {
  return PLATE_VISUALS.find((p) => p.weightLbs === weightLbs)?.color ?? '#888888';
}

function plateWidth(weightLbs: number): number {
  return PLATE_VISUALS.find((p) => p.weightLbs === weightLbs)?.width ?? 12;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlateCalculatorProps {
  initialWeight?: number;
  onClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlateCalculator({ initialWeight, onClose }: PlateCalculatorProps) {
  const theme = useTheme();
  const bars = useSettingsStore((s) => s.bars);
  const plateInventory = useSettingsStore((s) => s.plateInventory);
  const defaultBarId = useSettingsStore((s) => s.defaultBarId);

  const [selectedBarId, setSelectedBarId] = useState(defaultBarId);
  const [weightInput, setWeightInput] = useState(
    initialWeight !== undefined ? String(initialWeight) : '',
  );

  const selectedBar = bars.find((b) => b.id === selectedBarId) ?? bars[0];
  const targetWeight = parseFloat(weightInput);
  const hasValidWeight = !isNaN(targetWeight) && targetWeight > 0;

  const result = useMemo(() => {
    if (!hasValidWeight || !selectedBar) return null;
    return calculatePlates(targetWeight, selectedBar.weightLbs, plateInventory);
  }, [targetWeight, selectedBar, plateInventory, hasValidWeight]);

  const weightPerSide = selectedBar ? (targetWeight - selectedBar.weightLbs) / 2 : -1;
  const belowBarWeight = hasValidWeight && weightPerSide < 0;

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Plate Calculator</Text>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Bar picker */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>BAR</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {bars.map((bar) => {
          const selected = bar.id === selectedBarId;
          return (
            <Pressable
              key={bar.id}
              onPress={() => setSelectedBarId(bar.id)}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.accent : theme.backgroundElement },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#ffffff' : theme.text }]}>
                {bar.name}
              </Text>
              <Text style={[styles.chipSub, { color: selected ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                {bar.weightLbs} lbs
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Weight input */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>TARGET WEIGHT (lbs)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={weightInput}
        onChangeText={setWeightInput}
        placeholder="315"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        returnKeyType="done"
      />

      {/* Results */}
      {hasValidWeight && result && !belowBarWeight && (
        <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.resultLine, { color: theme.text }]}>
            Each side: <Text style={{ fontWeight: '700' }}>{formatPlateList(result.perSide)}</Text>
          </Text>
          <Text style={[styles.resultLine, { color: theme.text }]}>
            Total: <Text style={{ fontWeight: '700' }}>{result.totalWeight} lbs</Text>
          </Text>
          {!result.achievable && (
            <Text style={[styles.warningLine, { color: '#F0A500' }]}>
              Closest achievable: {result.totalWeight} lbs
            </Text>
          )}
        </View>
      )}

      {belowBarWeight && (
        <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.warningLine, { color: '#F0A500' }]}>
            Target is below bar weight ({selectedBar?.weightLbs} lbs)
          </Text>
        </View>
      )}

      {/* Visual plate stack */}
      {result && result.perSide.length > 0 && !belowBarWeight && (
        <View style={styles.stackWrap}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>PLATE STACK (one side)</Text>
          <View style={styles.stackRow}>
            {/* Expand each plate group into individual plate rects */}
            {result.perSide.flatMap((p) =>
              Array.from({ length: p.count }, (_, i) => (
                <View key={`${p.weightLbs}-${i}`} style={styles.plateSlot}>
                  <View
                    style={[
                      styles.plate,
                      {
                        width: plateWidth(p.weightLbs),
                        backgroundColor: plateColor(p.weightLbs),
                      },
                    ]}
                  />
                </View>
              )),
            )}
          </View>
          {/* Count labels below each unique denomination */}
          <View style={styles.stackRow}>
            {result.perSide.map((p) =>
              p.count > 1 ? (
                <View
                  key={p.weightLbs}
                  style={[
                    styles.countLabelWrap,
                    { width: plateWidth(p.weightLbs) * p.count + (p.count - 1) * 4 },
                  ]}
                >
                  <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
                    ×{p.count}
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        </View>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.one + 2,
  },
  chipScroll: {
    marginBottom: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    paddingRight: Spacing.two,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipSub: {
    fontSize: 11,
    marginTop: 1,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  resultCard: {
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.one + 2,
    marginBottom: Spacing.three,
  },
  resultLine: {
    fontSize: 15,
  },
  warningLine: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.one,
  },
  stackWrap: {
    marginTop: Spacing.one,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  plateSlot: {
    alignItems: 'center',
  },
  plate: {
    height: 48,
    borderRadius: 4,
  },
  countLabelWrap: {
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 11,
  },
});
