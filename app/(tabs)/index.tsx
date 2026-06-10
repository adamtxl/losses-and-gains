import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { getBestSetForExercise } from '@/db/repositories/sessionRepository';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseStore } from '@/store/exerciseStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { ActiveExerciseCard } from '@/components/workout/ActiveExerciseCard';
import type { Exercise, LoggedExercise, LoggedSet } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// fontVariant: ['tabular-nums'] keeps each digit the same width so the counter
// doesn't jitter when e.g. "9" flips to "10". Supported on both platforms.
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

// ─── Log Set Modal ────────────────────────────────────────────────────────────

interface LogSetTarget {
  loggedExerciseId: string;
  exerciseId: string;
  exerciseName: string;
}

interface LogSetModalProps {
  visible: boolean;
  target: LogSetTarget | null;
  currentSetCount: number;
  bestSet: LoggedSet | null;
  onSave: (weight: number, reps: number, rpe: number | undefined, isTopSet: boolean) => Promise<void>;
  onClose: () => void;
}

function LogSetModal({
  visible,
  target,
  currentSetCount,
  bestSet,
  onSave,
  onClose,
}: LogSetModalProps) {
  const theme = useTheme();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [isTopSet, setIsTopSet] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset fields each time the modal opens (visible transitions false → true).
  useEffect(() => {
    if (visible) {
      setWeight('');
      setReps('');
      setRpe('');
      setIsTopSet(currentSetCount === 0);
      setSaving(false);
    }
  }, [visible, currentSetCount]);

  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps, 10);
  const canSave = !isNaN(weightNum) && weightNum > 0 && !isNaN(repsNum) && repsNum > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await onSave(weightNum, repsNum, rpe ? parseFloat(rpe) : undefined, isTopSet);
    setSaving(false);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalInner, { backgroundColor: theme.background }]}>

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
              {target?.exerciseName ?? 'Log Set'}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>

          {bestSet !== null && (
            <View style={[styles.bestSetBanner, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.bestSetLabel, { color: theme.textSecondary }]}>Your best</Text>
              <Text style={[styles.bestSetValue, { color: theme.accent }]}>
                {bestSet.weight} × {bestSet.completedReps}
              </Text>
            </View>
          )}

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>WEIGHT (lbs)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="135"
              placeholderTextColor={theme.textSecondary}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>REPS</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="5"
              placeholderTextColor={theme.textSecondary}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>RPE (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="8"
              placeholderTextColor={theme.textSecondary}
              value={rpe}
              onChangeText={setRpe}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Top Set</Text>
                <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                  Back-off percentages reference this weight
                </Text>
              </View>
              <Switch
                value={isTopSet}
                onValueChange={setIsTopSet}
                trackColor={{ false: theme.backgroundSelected, true: theme.accent }}
                thumbColor={theme.background}
              />
            </View>

            <View style={{ height: Spacing.four }} />
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.accent },
              (!canSave || saving) && styles.saveButtonDisabled,
              pressed && canSave && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving…' : 'Log Set'}
            </Text>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Exercise Modal ───────────────────────────────────────────────────────

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

function AddExerciseModal({ visible, onClose, onSelect }: AddExerciseModalProps) {
  const theme = useTheme();
  const exercises = useExerciseStore((s) => s.exercises);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.addExerciseScreen, { backgroundColor: theme.background }]}>

        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exercise</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: theme.backgroundElement }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search…"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setQuery('');
                onSelect(item);
              }}
              style={({ pressed }) => [
                styles.pickRow,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
              ]}
            >
              <Text style={[styles.pickName, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.pickMeta, { color: theme.textSecondary }]}>
                {cap(item.category)} · {cap(item.equipment)}
              </Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: theme.textSecondary }}>No exercises found.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />

      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const theme = useTheme();

  // _db is accessed here to call getBestSetForExercise directly per the architecture —
  // repository queries at this callsite, not raw SQL.
  const db                   = useWorkoutStore((s) => s._db);
  const activeSession        = useWorkoutStore((s) => s.activeSession);
  const startSession         = useWorkoutStore((s) => s.startSession);
  const addExerciseToSession = useWorkoutStore((s) => s.addExerciseToSession);
  const logSet               = useWorkoutStore((s) => s.logSet);
  const finishSession        = useWorkoutStore((s) => s.finishSession);
  const cancelSession        = useWorkoutStore((s) => s.cancelSession);
  const allExercises         = useExerciseStore((s) => s.exercises);

  const [elapsed, setElapsed]                         = useState(0);
  const [logSetTarget, setLogSetTarget]               = useState<LogSetTarget | null>(null);
  const [bestSet, setBestSet]                         = useState<LoggedSet | null>(null);
  const [logSetModalVisible, setLogSetModalVisible]   = useState(false);
  const [addExModalVisible, setAddExModalVisible]     = useState(false);

  // Derive elapsed from the session's startedAt, not from mount time.
  // If the user tabs away and comes back, the timer resumes at the correct value.
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }
    const startMs = new Date(activeSession.startedAt).getTime();
    setElapsed(Math.floor((Date.now() - startMs) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeSession?.startedAt]);

  async function handleStart() {
    const now = new Date();
    await startSession({
      date: now.toISOString().slice(0, 10),
      startedAt: now.toISOString(),
    });
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Workout',
      'This will delete the session and all logged sets.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => { void cancelSession(); },
        },
      ],
    );
  }

  async function openLogSet(exercise: LoggedExercise, exerciseName: string) {
    setLogSetTarget({
      loggedExerciseId: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName,
    });
    setBestSet(null);
    setLogSetModalVisible(true);
    if (db) {
      const best = await getBestSetForExercise(db, exercise.exerciseId);
      setBestSet(best);
    }
  }

  async function handleLogSet(
    weight: number,
    reps: number,
    rpe: number | undefined,
    isTopSet: boolean,
  ) {
    if (!logSetTarget || !activeSession) return;

    // Re-derive set count from live session state, not from the stale exercise
    // captured at modal-open time, to get the correct setNumber.
    const currentExercise = activeSession.exercises.find(
      (e) => e.id === logSetTarget.loggedExerciseId,
    );
    if (!currentExercise) return;

    await logSet({
      loggedExerciseId: logSetTarget.loggedExerciseId,
      exerciseId: logSetTarget.exerciseId,
      setNumber: currentExercise.sets.length + 1,
      completedReps: reps,
      weight,
      rpe,
      isTopSet,
      repTypeConfig: { repType: 'normal' },
    });
    setLogSetModalVisible(false);
    setLogSetTarget(null);
  }

  async function handleSelectExercise(exercise: Exercise) {
    if (!activeSession) return;
    await addExerciseToSession({
      sessionId: activeSession.id,
      exerciseId: exercise.id,
      order: activeSession.exercises.length,
    });
    setAddExModalVisible(false);
  }

  // Current set count for the open log-set modal, driven by live session state.
  const currentSetCount =
    activeSession?.exercises.find((e) => e.id === logSetTarget?.loggedExerciseId)?.sets.length ?? 0;

  // ── State 1: No active session ─────────────────────────────────────────────

  if (!activeSession) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.idle}>
          <Text style={[styles.idleTitle, { color: theme.text }]}>Ready to train?</Text>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.accent },
              pressed && styles.startButtonPressed,
            ]}
          >
            <Text style={styles.startButtonText}>Start Workout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── State 2: Active session ────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      {/* Session header */}
      <View style={[styles.sessionHeader, { borderBottomColor: theme.backgroundElement }]}>
        <Text style={[styles.timer, { color: theme.text }]}>
          {formatElapsed(elapsed)}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: theme.backgroundElement },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}
          >
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => { void finishSession(); }}
            style={({ pressed }) => [
              styles.finishBtn,
              { backgroundColor: theme.accent },
              pressed && styles.finishBtnPressed,
            ]}
          >
            <Text style={styles.finishBtnText}>Finish</Text>
          </Pressable>
        </View>
      </View>

      {/* Exercise list */}
      <FlatList
        data={activeSession.exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const ex = allExercises.find((e) => e.id === item.exerciseId);
          const name = ex?.name ?? 'Unknown Exercise';
          return (
            <ActiveExerciseCard
              loggedExercise={item}
              exerciseName={name}
              onLogSet={() => openLogSet(item, name)}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          activeSession.exercises.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No exercises yet — add one below
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Fixed add-exercise bar above the tab bar */}
      <View
        style={[
          styles.addBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.backgroundElement,
            paddingBottom: BottomTabInset,
          },
        ]}
      >
        <Pressable
          onPress={() => setAddExModalVisible(true)}
          style={({ pressed }) => [
            styles.addExerciseBtn,
            { backgroundColor: theme.backgroundElement },
            pressed && { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <Text style={[styles.addExerciseBtnText, { color: theme.text }]}>+ Add Exercise</Text>
        </Pressable>
      </View>

      <LogSetModal
        visible={logSetModalVisible}
        target={logSetTarget}
        currentSetCount={currentSetCount}
        bestSet={bestSet}
        onSave={handleLogSet}
        onClose={() => {
          setLogSetModalVisible(false);
          setLogSetTarget(null);
        }}
      />

      <AddExerciseModal
        visible={addExModalVisible}
        onClose={() => setAddExModalVisible(false)}
        onSelect={handleSelectExercise}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // State 1
  idle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  idleTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 12,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  startButtonPressed: {
    opacity: 0.8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Session header
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timer: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cancelBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  finishBtn: {
    borderRadius: 8,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  finishBtnPressed: {
    opacity: 0.8,
  },
  finishBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Exercise list
  listContent: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
  },

  // Add exercise bar
  addBar: {
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addExerciseBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExerciseBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Shared modal chrome
  modalRoot: {
    flex: 1,
  },
  modalInner: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    marginRight: Spacing.two,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },

  // Best-set context banner
  bestSetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 4,
  },
  bestSetLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  bestSetValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Form fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: Spacing.three,
    marginBottom: Spacing.one + 2,
  },
  fieldInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
  },
  toggleText: {
    flex: 1,
    marginRight: Spacing.two,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // Save button (log set modal)
  saveButton: {
    margin: Spacing.three,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Add exercise modal
  addExerciseScreen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearBtn: {
    fontSize: 14,
    paddingHorizontal: Spacing.one,
  },
  pickRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    gap: 2,
  },
  pickName: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickMeta: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
});
