import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCalendarStore } from '@/store/calendarStore';
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

function totalSets(session: LoggedSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

function sessionHasPR(session: LoggedSession): boolean {
  return session.exercises.some((ex) => ex.sets.some((s) => s.isPersonalRecord));
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────

interface PlanModalProps {
  visible: boolean;
  date: string | null;
  onSave: (notes: string) => void;
  onClose: () => void;
}

function PlanModal({ visible, date, onSave, onClose }: PlanModalProps) {
  const theme = useTheme();
  const [notes, setNotes] = useState('');

  function handleSave() {
    onSave(notes.trim());
    setNotes('');
  }

  function handleClose() {
    setNotes('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.planScreen, { backgroundColor: theme.background }]}>

        <View style={[styles.planHeader, { borderBottomColor: theme.backgroundElement }]}>
          <Text style={[styles.planTitle, { color: theme.text }]}>Plan Workout</Text>
          <Text style={[styles.planDate, { color: theme.textSecondary }]}>
            {date ? formatDate(date) : ''}
          </Text>
        </View>

        <ScrollView
          style={styles.planScroll}
          contentContainerStyle={styles.planContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="What are you planning?"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={[styles.planActions, { borderTopColor: theme.backgroundElement, paddingBottom: BottomTabInset }]}>
          <Pressable
            onPress={handleClose}
            style={[styles.planBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.planBtnText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[styles.planBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.planBtnText}>Save Plan</Text>
          </Pressable>
        </View>

      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();

  const entriesByDate = useCalendarStore((s) => s.entriesByDate);
  const selectedDate  = useCalendarStore((s) => s.selectedDate);
  const loadMonth     = useCalendarStore((s) => s.loadMonth);
  const selectDate    = useCalendarStore((s) => s.selectDate);
  const planWorkout   = useCalendarStore((s) => s.planWorkout);
  const deletePlan    = useCalendarStore((s) => s.deletePlan);
  const linkSession   = useCalendarStore((s) => s.linkSession);

  const recentSessions = useWorkoutStore((s) => s.recentSessions);
  const startSession   = useWorkoutStore((s) => s.startSession);

  const allExercises = useExerciseStore((s) => s.exercises);

  const [sheetVisible, setSheetVisible]     = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }, []);

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of allExercises) map.set(ex.id, ex.name);
    return map;
  }, [allExercises]);

  // O(1) lookup for session by date
  const sessionByDate = useMemo(() => {
    const map = new Map<string, LoggedSession>();
    for (const s of recentSessions) map.set(s.date, s);
    return map;
  }, [recentSessions]);

  useEffect(() => {
    const now = new Date();
    void loadMonth(now.getFullYear(), now.getMonth() + 1);
  }, [loadMonth]);

  // Build the markedDates object for react-native-calendars.
  // Dot colours: blue = planned, green = completed, red = missed.
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};

    for (const [date, entry] of Object.entries(entriesByDate)) {
      const dotColor =
        entry.status === 'completed' ? '#4CAF50' :
        entry.status === 'missed'    ? '#FF5722' :
        theme.accent;

      marks[date] = {
        marked: true,
        dotColor,
        ...(selectedDate === date ? { selected: true, selectedColor: theme.accent } : {}),
      };
    }

    // Selected date may not have an entry yet — still highlight it
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: theme.accent };
    }

    return marks;
  }, [entriesByDate, selectedDate, theme.accent]);

  function handleDayPress(day: DateData) {
    selectDate(day.dateString);
    setSheetVisible(true);
  }

  function handleMonthChange(month: DateData) {
    void loadMonth(month.year, month.month);
  }

  function closeSheet() {
    setSheetVisible(false);
  }

  async function handleStartWorkout(date: string, linkedEntryDate?: string) {
    if (useWorkoutStore.getState().activeSession) {
      Alert.alert(
        'Active Workout',
        'You already have a workout in progress. Finish it before starting a new one.',
      );
      return;
    }

    await startSession({
      date,
      startedAt: new Date().toISOString(),
      calendarEntryId: undefined,
      bodyweightLbs: undefined,
      notes: undefined,
    });

    if (linkedEntryDate) {
      const session = useWorkoutStore.getState().activeSession;
      if (session) {
        await linkSession(linkedEntryDate, session.id);
      }
    }

    closeSheet();
    router.push('/(tabs)/');
  }

  async function handleSavePlan(notes: string) {
    if (!selectedDate) return;
    await planWorkout(selectedDate, notes || undefined);
    setPlanModalVisible(false);
  }

  function handleDeletePlan() {
    if (!selectedDate) return;
    Alert.alert('Delete Plan', 'Remove this planned workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { void deletePlan(selectedDate); },
      },
    ]);
  }

  // ── Date detail content ────────────────────────────────────────────────────

  function renderDateDetail() {
    if (!selectedDate) return null;

    const entry = entriesByDate[selectedDate];
    const isPast   = selectedDate < today;
    const isToday  = selectedDate === today;

    if (isPast) {
      const session = entry?.loggedSessionId
        ? recentSessions.find((s) => s.id === entry.loggedSessionId)
        : sessionByDate.get(selectedDate);

      if (session) {
        const sets  = totalSets(session);
        const hasPR = sessionHasPR(session);
        const exerciseNames = session.exercises
          .map((ex) => exerciseNameMap.get(ex.exerciseId) ?? 'Unknown')
          .join(', ');

        return (
          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailMeta, { color: theme.textSecondary }]}>
                {formatDuration(session.durationSeconds)}
                {'  ·  '}
                {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''},
                {'  '}
                {sets} set{sets !== 1 ? 's' : ''}
              </Text>
              {hasPR && (
                <View style={[styles.prBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.prBadgeText}>🏆 PR</Text>
                </View>
              )}
            </View>
            {exerciseNames.length > 0 && (
              <Text
                style={[styles.exerciseSummary, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {exerciseNames}
              </Text>
            )}
          </View>
        );
      }

      return (
        <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>
          No workout logged
        </Text>
      );
    }

    if (isToday) {
      if (entry) {
        return (
          <View style={styles.detailContent}>
            {!!entry.notes && (
              <Text style={[styles.planNotesText, { color: theme.textSecondary }]}>
                {entry.notes}
              </Text>
            )}
            <Pressable
              onPress={() => { void handleStartWorkout(today, today); }}
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.actionBtnText}>Start Planned Workout</Text>
            </Pressable>
            <Pressable
              onPress={handleDeletePlan}
              style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.text }]}>Delete Plan</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View style={styles.detailContent}>
          <Pressable
            onPress={() => { void handleStartWorkout(today); }}
            style={[styles.actionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.actionBtnText}>Start Workout</Text>
          </Pressable>
          <Pressable
            onPress={() => setPlanModalVisible(true)}
            style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Plan for Later</Text>
          </Pressable>
        </View>
      );
    }

    // Future date
    if (entry) {
      return (
        <View style={styles.detailContent}>
          {!!entry.notes && (
            <Text style={[styles.planNotesText, { color: theme.textSecondary }]}>
              {entry.notes}
            </Text>
          )}
          <Pressable
            onPress={handleDeletePlan}
            style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Delete Plan</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.detailContent}>
        <Pressable
          onPress={() => setPlanModalVisible(true)}
          style={[styles.actionBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.actionBtnText}>Plan Workout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Calendar</Text>
      </View>

      {/* key on theme.background so the Calendar remounts on dark/light switch,
          forcing it to re-apply theme colours (react-native-calendars doesn't
          respond to theme prop changes after first mount). */}
      <Calendar
        key={theme.background}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        enableSwipeMonths
        theme={{
          backgroundColor: theme.background,
          calendarBackground: theme.background,
          textSectionTitleColor: theme.textSecondary,
          selectedDayBackgroundColor: theme.accent,
          selectedDayTextColor: '#ffffff',
          todayTextColor: theme.accent,
          dayTextColor: theme.text,
          textDisabledColor: theme.textSecondary,
          dotColor: theme.accent,
          selectedDotColor: '#ffffff',
          arrowColor: theme.accent,
          monthTextColor: theme.text,
          indicatorColor: theme.accent,
        }}
      />

      {/* Date detail bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.overlay} onPress={closeSheet}>
          <View
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.backgroundSelected }]} />

            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetDate, { color: theme.text }]}>
                {selectedDate ? formatDate(selectedDate) : ''}
              </Text>
              <Pressable onPress={closeSheet} hitSlop={12}>
                <Text style={[styles.doneBtn, { color: theme.accent }]}>Done</Text>
              </Pressable>
            </View>

            {renderDateDetail()}
          </View>
        </Pressable>
      </Modal>

      <PlanModal
        visible={planModalVisible}
        date={selectedDate}
        onSave={(notes) => { void handleSavePlan(notes); }}
        onClose={() => setPlanModalVisible(false)}
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

  // Bottom sheet
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    minHeight: 220,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sheetDate: {
    fontSize: 17,
    fontWeight: '600',
  },
  doneBtn: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Detail content
  detailContent: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailMeta: {
    flex: 1,
    fontSize: 13,
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
  exerciseSummary: {
    fontSize: 13,
  },
  emptyNote: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  planNotesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Plan modal
  planScreen: {
    flex: 1,
  },
  planHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  planDate: {
    fontSize: 14,
  },
  planScroll: {
    flex: 1,
  },
  planContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  notesInput: {
    borderRadius: 10,
    padding: Spacing.three,
    fontSize: 15,
    minHeight: 100,
  },
  planActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  planBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  planBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
