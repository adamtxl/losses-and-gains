import { View, Text, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types';

interface Props {
  exercise: Exercise;
}

// Capitalise first letter — categories are stored lowercase ('squat' → 'Squat')
function label(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ExerciseRow({ exercise }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.background }]}>
      <View style={styles.text}>
        <Text
          style={[styles.name, { color: theme.text }]}
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {label(exercise.category)} · {label(exercise.equipment)}
        </Text>
      </View>

      {exercise.isCustom && (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={styles.badgeText}>Custom</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  meta: {
    fontSize: 13,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: Spacing.two,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
