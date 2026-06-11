import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTemplateStore } from '@/store/templateStore';
import { useExerciseStore } from '@/store/exerciseStore';
import type { SetType, WorkoutExercise, PrescribedSet } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'topset',  label: 'Top Set' },
  { value: 'backoff', label: 'Back-off' },
  { value: 'warmup',  label: 'Warm-up' },
  { value: 'amrap',   label: 'AMRAP' },
];

function setChipLabel(set: PrescribedSet): string {
  const reps = set.targetReps;
  if (reps === 'amrap') return 'AMRAP';
  if (set.isPercentageBased && set.percentage !== undefined) {
    return `${reps}×${Math.round(set.percentage * 100)}%`;
  }
  if (set.prescribedWeight !== undefined) {
    return `${reps}×${set.prescribedWeight}`;
  }
  return `${reps} reps`;
}

// ─── Set Editor ───────────────────────────────────────────────────────────────

interface SetEditorProps {
  workoutExerciseId: string;
  onSaved: () => void;
}

function SetEditor({ workoutExerciseId, onSaved }: SetEditorProps) {
  const theme = useTheme();
  const addSet = useTemplateStore((s) => s.addSet);

  const [setType, setSetType] = useState<SetType>('working');
  const [targetRepsStr, setTargetRepsStr] = useState('');
  const [isPercentageBased, setIsPercentageBased] = useState(false);
  const [percentageStr, setPercentageStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [restSecondsStr, setRestSecondsStr] = useState('');
  const [saving, setSaving] = useState(false);

  const isAmrap = setType === 'amrap';
  const canSave = isAmrap || targetRepsStr.trim().length > 0;

  function handleSetTypeChange(st: SetType) {
    setSetType(st);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);

    const targetReps: number | 'amrap' = isAmrap
      ? 'amrap'
      : parseInt(targetRepsStr, 10);

    const prescribedWeight =
      !isPercentageBased && weightStr.trim() ? parseFloat(weightStr) : undefined;

    const percentage =
      isPercentageBased && percentageStr.trim() ? parseFloat(percentageStr) / 100 : undefined;

    await addSet(workoutExerciseId, {
      setType,
      repTypeConfig: { repType: 'normal' },
      targetReps,
      isPercentageBased,
      percentageRef: isPercentageBased ? 'top_set' : undefined,
      percentage,
      prescribedWeight,
      restSeconds: restSecondsStr.trim() ? parseInt(restSecondsStr, 10) : undefined,
    });

    setSaving(false);
    onSaved();
  }

  return (
    <View style={[styles.setEditor, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>

      <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>SET TYPE</Text>
      <View style={styles.typeChipRow}>
        {SET_TYPES.map(({ value, label }) => {
          const selected = setType === value;
          return (
            <Pressable
              key={value}
              onPress={() => handleSetTypeChange(value)}
              style={[
                styles.typeChip,
                { backgroundColor: selected ? theme.accent : theme.backgroundElement },
              ]}
            >
              <Text style={[styles.typeChipText, { color: selected ? '#ffffff' : theme.text }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>TARGET REPS</Text>
      <TextInput
        style={[
          styles.editorInput,
          {
            backgroundColor: theme.backgroundElement,
            color: isAmrap ? theme.textSecondary : theme.text,
          },
        ]}
        value={isAmrap ? 'AMRAP' : targetRepsStr}
        onChangeText={setTargetRepsStr}
        editable={!isAmrap}
        keyboardType="number-pad"
        placeholder="e.g. 5"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Percentage-based toggle */}
      <Pressable
        onPress={() => setIsPercentageBased(!isPercentageBased)}
        style={styles.toggleRow}
      >
        <View style={[styles.toggleBox, { backgroundColor: isPercentageBased ? theme.accent : theme.backgroundElement }]}>
          {isPercentageBased && <Text style={styles.toggleCheck}>✓</Text>}
        </View>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>% of top set</Text>
      </Pressable>

      {isPercentageBased ? (
        <>
          <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>% OF TOP SET (0–100)</Text>
          <TextInput
            style={[styles.editorInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={percentageStr}
            onChangeText={setPercentageStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 75"
            placeholderTextColor={theme.textSecondary}
          />
        </>
      ) : (
        <>
          <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>TARGET WEIGHT (LBS, OPTIONAL)</Text>
          <TextInput
            style={[styles.editorInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={weightStr}
            onChangeText={setWeightStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 135"
            placeholderTextColor={theme.textSecondary}
          />
        </>
      )}

      <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>REST SECONDS (OPTIONAL)</Text>
      <TextInput
        style={[styles.editorInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        value={restSecondsStr}
        onChangeText={setRestSecondsStr}
        keyboardType="number-pad"
        placeholder="e.g. 180"
        placeholderTextColor={theme.textSecondary}
      />

      <Pressable
        onPress={handleSave}
        disabled={!canSave || saving}
        style={[
          styles.saveSetBtn,
          { backgroundColor: theme.accent },
          (!canSave || saving) && styles.disabledBtn,
        ]}
      >
        <Text style={styles.saveSetBtnText}>{saving ? 'Adding…' : 'Add Set'}</Text>
      </Pressable>
    </View>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseName: string;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
  onRemoveExercise: () => void;
  onRemoveSet: (setId: string) => void;
}

function ExerciseCard({
  workoutExercise,
  exerciseName,
  isEditorOpen,
  onToggleEditor,
  onRemoveExercise,
  onRemoveSet,
}: ExerciseCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.exerciseCard, { backgroundColor: theme.backgroundElement }]}>

      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>
          {exerciseName}
        </Text>
        <Pressable onPress={onRemoveExercise} hitSlop={12}>
          <Text style={[styles.removeExBtn, { color: theme.textSecondary }]}>✕</Text>
        </Pressable>
      </View>

      {workoutExercise.sets.length > 0 && (
        <>
          {/* Set chips — long-press to remove.
              Long-press is used instead of a tap-to-delete button to keep the
              chips compact. On Android, the haptic feedback on long-press makes
              the intent clear. */}
          <View style={styles.setsRow}>
            {workoutExercise.sets.map((set) => (
              <Pressable
                key={set.id}
                onLongPress={() => onRemoveSet(set.id)}
                style={[styles.setChip, { backgroundColor: theme.backgroundSelected }]}
              >
                <Text style={[styles.setChipText, { color: theme.text }]}>
                  {setChipLabel(set)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.holdHint, { color: theme.textSecondary }]}>
            Hold a chip to remove
          </Text>
        </>
      )}

      {isEditorOpen && (
        <SetEditor workoutExerciseId={workoutExercise.id} onSaved={onToggleEditor} />
      )}

      <Pressable
        onPress={onToggleEditor}
        style={[styles.addSetBtn, { borderColor: theme.accent }]}
      >
        <Text style={[styles.addSetBtnText, { color: theme.accent }]}>
          {isEditorOpen ? 'Hide Editor' : '+ Add Set'}
        </Text>
      </Pressable>

    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TemplateEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const templates      = useTemplateStore((s) => s.templates);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const addExercise    = useTemplateStore((s) => s.addExercise);
  const removeExercise = useTemplateStore((s) => s.removeExercise);
  const removeSet      = useTemplateStore((s) => s.removeSet);

  const allExercises = useExerciseStore((s) => s.exercises);

  const template = useMemo(
    () => templates.find((t) => t.id === id) ?? null,
    [templates, id],
  );

  const [nameText, setNameText] = useState(template?.name ?? '');
  const [setEditorFor, setSetEditorFor] = useState<string | null>(null);
  const [addExModalVisible, setAddExModalVisible] = useState(false);
  const [exSearch, setExSearch] = useState('');

  // Keep nameText in sync if the template name changes externally.
  useEffect(() => {
    if (template) setNameText(template.name);
  }, [template?.name]);

  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of allExercises) map.set(ex.id, ex.name);
    return map;
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    if (!q) return allExercises;
    return allExercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [allExercises, exSearch]);

  function handleNameBlur() {
    const trimmed = nameText.trim();
    if (!trimmed || !template || trimmed === template.name) return;
    void updateTemplate(id, { name: trimmed });
  }

  function handleDelete() {
    Alert.alert(
      'Delete Template',
      `Delete "${template?.name ?? 'this template'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(id);
            router.back();
          },
        },
      ],
    );
  }

  function handleToggleEditor(workoutExerciseId: string) {
    setSetEditorFor((prev) => (prev === workoutExerciseId ? null : workoutExerciseId));
  }

  function handleRemoveExercise(workoutExerciseId: string, name: string) {
    Alert.alert('Remove Exercise', `Remove ${name} from this template?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => { void removeExercise(workoutExerciseId); },
      },
    ]);
  }

  function handleRemoveSet(setId: string) {
    Alert.alert('Remove Set', 'Remove this prescribed set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => { void removeSet(setId); },
      },
    ]);
  }

  function handleSelectExercise(exerciseId: string) {
    if (!template) return;
    void addExercise(template.id, exerciseId);
    setAddExModalVisible(false);
    setExSearch('');
  }

  function closeExModal() {
    setAddExModalVisible(false);
    setExSearch('');
  }

  if (!template) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement, paddingTop: insets.top }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.backBtn, { color: theme.accent }]}>‹ Back</Text>
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerRight} />
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
            Template not found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      <View style={[styles.header, { borderBottomColor: theme.backgroundElement, paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>‹ Back</Text>
        </Pressable>

        {/* Inline editable name. onBlur persists changes. selectTextOnFocus lets
            the user quickly replace the whole name on tap. */}
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={nameText}
          onChangeText={setNameText}
          onBlur={handleNameBlur}
          returnKeyType="done"
          selectTextOnFocus
        />

        <Pressable onPress={handleDelete} hitSlop={12}>
          <Text style={styles.deleteBtn}>Delete</Text>
        </Pressable>
      </View>

      <FlatList
        data={template.exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            workoutExercise={item}
            exerciseName={exerciseNameMap.get(item.exerciseId) ?? 'Unknown Exercise'}
            isEditorOpen={setEditorFor === item.id}
            onToggleEditor={() => handleToggleEditor(item.id)}
            onRemoveExercise={() =>
              handleRemoveExercise(item.id, exerciseNameMap.get(item.exerciseId) ?? 'this exercise')
            }
            onRemoveSet={handleRemoveSet}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            No exercises yet — tap + Add Exercise below
          </Text>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => setAddExModalVisible(true)}
            style={({ pressed }) => [
              styles.addExBtn,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.addExBtnText, { color: theme.accent }]}>+ Add Exercise</Text>
          </Pressable>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Exercise picker modal */}
      <Modal visible={addExModalVisible} animationType="slide" onRequestClose={closeExModal}>
        <View style={[styles.pickerScreen, { backgroundColor: theme.background }]}>

          <View style={[styles.pickerHeader, { borderBottomColor: theme.backgroundElement }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Add Exercise</Text>
            <Pressable onPress={closeExModal} hitSlop={12}>
              <Text style={[styles.cancelBtn, { color: theme.accent }]}>Cancel</Text>
            </Pressable>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={exSearch}
              onChangeText={setExSearch}
              placeholder="Search…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {exSearch.length > 0 && (
              <Pressable onPress={() => setExSearch('')} hitSlop={8}>
                <Text style={[styles.clearBtn, { color: theme.textSecondary }]}>✕</Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectExercise(item.id)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
                ]}
              >
                <Text style={[styles.pickerRowName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.pickerRowMeta, { color: theme.textSecondary }]}>
                  {item.category}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
            )}
            keyboardShouldPersistTaps="handled"
          />

        </View>
      </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  backBtn: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    minWidth: 48,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 4,
  },
  deleteBtn: {
    color: '#FF5722',
    fontSize: 15,
    fontWeight: '500',
  },

  // Exercise list
  listContent: {
    padding: Spacing.two,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },

  // Exercise card
  exerciseCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: Spacing.two,
  },
  removeExBtn: {
    fontSize: 16,
  },

  // Set chips
  setsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  setChip: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
  },
  setChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  holdHint: {
    fontSize: 11,
    marginTop: -Spacing.one,
  },

  // Add set button (toggle)
  addSetBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  addSetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Set editor (inline)
  setEditor: {
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.one + 2,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: Spacing.one,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  typeChip: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editorInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheck: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleLabel: {
    fontSize: 14,
  },
  saveSetBtn: {
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  saveSetBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.4,
  },

  // Add exercise button (footer)
  addExBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  addExBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Exercise picker modal
  pickerScreen: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cancelBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
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
  pickerRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pickerRowName: {
    fontSize: 16,
  },
  pickerRowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
  },
});
