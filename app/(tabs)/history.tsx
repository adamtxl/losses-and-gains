import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseStore } from '@/store/exerciseStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { LoggedSession } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Parses as local date (not UTC) so "2026-06-10" stays June 10 in all timezones.
// Avoids Intl.DateTimeFormat — manual formatting is more predictable across
// Hermes versions and Android API levels.
function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}`;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function sessionHasPR(session: LoggedSession): boolean {
  return session.exercises.some((ex) => ex.sets.some((s) => s.isPersonalRecord));
}

function totalSets(session: LoggedSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────

interface SessionDetailModalProps {
  visible: boolean;
  session: LoggedSession | null;
  exerciseNameMap: Map<string, string>;
  onClose: () => void;
}

function SessionDetailModal({
  visible,
  session,
  exerciseNameMap,
  onClose,
}: SessionDetailModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.detailScreen, { backgroundColor: theme.background }]}>

        <View style={[styles.detailHeader, { borderBottomColor: theme.backgroundElement }]}>
          <View style={styles.detailHeaderText}>
            <Text style={[styles.detailDate, { color: theme.text }]}>
              {session ? formatDate(session.date) : ''}
            </Text>
            <Text style={[styles.detailDuration, { color: theme.textSecondary }]}>
              {session ? formatDuration(session.durationSeconds) : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.doneBtn, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.detailScroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          {session?.exercises.map((ex) => {
            const name = exerciseNameMap.get(ex.exerciseId) ?? 'Unknown Exercise';
            return (
              <View
                key={ex.id}
                style={[styles.detailExercise, { backgroundColor: theme.backgroundElement }]}
              >
                <Text style={[styles.detailExName, { color: theme.text }]}>
                  {name}
                </Text>

                {ex.sets.length > 0 && (
                  <View style={styles.chipRow}>
                    {ex.sets.map((set) => (
                      <View key={set.id} style={styles.chipGroup}>
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: set.isTopSet
                                ? theme.accent
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: set.isTopSet ? '#ffffff' : theme.text },
                            ]}
                          >
                            {set.weight}×{set.completedReps}
                          </Text>
                        </View>
                        {set.isPersonalRecord && (
                          <Text style={styles.prMark}>🏆</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {session?.overallRPE !== undefined && (
            <Text style={[styles.metaLine, { color: theme.textSecondary }]}>
              Session RPE: {session.overallRPE}
            </Text>
          )}

          {!!session?.notes && (
            <Text style={[styles.notesLine, { color: theme.textSecondary }]}>
              {session.notes}
            </Text>
          )}
        </ScrollView>

      </View>
    </Modal>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: LoggedSession;
  exerciseNameMap: Map<string, string>;
  onPress: () => void;
}

function SessionCard({ session, exerciseNameMap, onPress }: SessionCardProps) {
  const theme = useTheme();
  const sets = totalSets(session);
  const hasPR = sessionHasPR(session);
  const count = session.exercises.length;
  const exerciseNames = session.exercises
    .map((ex) => exerciseNameMap.get(ex.exerciseId) ?? 'Unknown')
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed
            ? theme.backgroundSelected
            : theme.backgroundElement,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardDate, { color: theme.text }]} numberOfLines={1}>
          {formatDate(session.date)}
        </Text>
        {hasPR && (
          <View style={[styles.prBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.prBadgeText}>🏆 PR</Text>
          </View>
        )}
      </View>

      <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
        {formatDuration(session.durationSeconds)}
        {'  ·  '}
        {count} exercise{count !== 1 ? 's' : ''},{'  '}
        {sets} set{sets !== 1 ? 's' : ''}
      </Text>

      {exerciseNames.length > 0 && (
        <Text
          style={[styles.cardExercises, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {exerciseNames}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const theme = useTheme();
  const recentSessions  = useWorkoutStore((s) => s.recentSessions);
  const isLoading       = useWorkoutStore((s) => s.isLoading);
  const refreshHistory  = useWorkoutStore((s) => s.refreshHistory);
  const allExercises    = useExerciseStore((s) => s.exercises);

  const [refreshing, setRefreshing]       = useState(false);
  const [detailSession, setDetailSession] = useState<LoggedSession | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Build once; O(1) name lookups inside card and detail renders.
  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of allExercises) map.set(ex.id, ex.name);
    return map;
  }, [allExercises]);

  // Refresh on mount so sessions finished in this app run are visible
  // without the user having to pull-to-refresh manually.
  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  }

  function openDetail(session: LoggedSession) {
    setDetailSession(session);
    setDetailVisible(true);
  }

  function closeDetail() {
    setDetailVisible(false);
    // Keep detailSession non-null so the card content stays visible during
    // the modal's slide-out animation. Overwritten by the next openDetail().
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>History</Text>
      </View>

      <FlatList
        data={recentSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            exerciseNameMap={exerciseNameMap}
            onPress={() => openDetail(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          recentSessions.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {isLoading
                ? 'Loading…'
                : 'No workouts yet — start one on the Today tab'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // tintColor: iOS spinner colour. colors: Android spinner colours.
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      />

      <SessionDetailModal
        visible={detailVisible}
        session={detailSession}
        exerciseNameMap={exerciseNameMap}
        onClose={closeDetail}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Header
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

  // Session list
  listContent: {
    padding: Spacing.two,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },

  // Session card
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: Spacing.two,
  },
  prBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  prBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 13,
  },
  cardExercises: {
    fontSize: 13,
  },

  // Session detail modal
  detailScreen: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailHeaderText: {
    flex: 1,
    gap: 3,
    marginRight: Spacing.two,
  },
  detailDate: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailDuration: {
    fontSize: 14,
  },
  doneBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  detailExercise: {
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailExName: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  prMark: {
    fontSize: 11,
  },
  metaLine: {
    fontSize: 14,
  },
  notesLine: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
