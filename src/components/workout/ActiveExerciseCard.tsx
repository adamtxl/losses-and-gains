import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LoggedExercise } from '@/types';

interface Props {
  loggedExercise: LoggedExercise;
  exerciseName: string;
  onLogSet: () => void;
}

export function ActiveExerciseCard({ loggedExercise, exerciseName, onLogSet }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {exerciseName}
        </Text>
        <Pressable
          onPress={onLogSet}
          style={({ pressed }) => [
            styles.logSetBtn,
            { backgroundColor: theme.accent },
            pressed && styles.logSetBtnPressed,
          ]}
        >
          <Text style={styles.logSetBtnText}>+ Log Set</Text>
        </Pressable>
      </View>

      {loggedExercise.sets.length > 0 && (
        <View style={styles.chips}>
          {loggedExercise.sets.map((set) => (
            <View
              key={set.id}
              style={[
                styles.chip,
                { backgroundColor: set.isTopSet ? theme.accent : theme.backgroundSelected },
              ]}
            >
              <Text style={[styles.chipText, { color: set.isTopSet ? '#ffffff' : theme.text }]}>
                {set.weight}×{set.completedReps}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    marginRight: Spacing.two,
  },
  logSetBtn: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  logSetBtnPressed: {
    opacity: 0.8,
  },
  logSetBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderRadius: 4,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
