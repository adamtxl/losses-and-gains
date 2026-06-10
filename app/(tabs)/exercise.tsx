import { useState, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseStore } from '@/store/exerciseStore';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import type { Exercise, ExerciseCategory, Equipment } from '@/types';

// Typed arrays let TypeScript verify every value against the union.
const CATEGORIES: ExerciseCategory[] = [
  'squat', 'hinge', 'press', 'pull', 'carry', 'accessory', 'conditioning',
];
const EQUIPMENT: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight', 'other',
];

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Add Exercise Modal ───────────────────────────────────────────────────────

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<Exercise, 'id' | 'createdAt'>) => Promise<void>;
}

function AddExerciseModal({ visible, onClose, onSave }: AddModalProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && category !== null && equipment !== null;

  function reset() {
    setName('');
    setCategory(null);
    setEquipment(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await onSave({ name: name.trim(), category: category!, equipment: equipment!, isCustom: true });
    setSaving(false);
    reset();
    onClose();
  }

  return (
    // animationType="slide" slides up from the bottom on both platforms.
    // onRequestClose handles the Android hardware back button — required to avoid a stuck modal.
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      {/*
        KeyboardAvoidingView pushes content up when the software keyboard appears.
        'padding' works well on iOS; 'height' is more reliable on Android.
      */}
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalInner, { backgroundColor: theme.background }]}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exercise</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>

          {/* Scrollable form — lets short phones scroll past the keyboard */}
          <ScrollView
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>NAME</Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="e.g. Log Press"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />

            {/* Category chips */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      selected && { backgroundColor: theme.accent },
                      pressed && !selected && { backgroundColor: theme.backgroundSelected },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selected ? '#ffffff' : theme.text },
                    ]}>
                      {cap(cat)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Equipment chips */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>EQUIPMENT</Text>
            <View style={styles.chipGrid}>
              {EQUIPMENT.map((eq) => {
                const selected = equipment === eq;
                return (
                  <Pressable
                    key={eq}
                    onPress={() => setEquipment(eq)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      selected && { backgroundColor: theme.accent },
                      pressed && !selected && { backgroundColor: theme.backgroundSelected },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selected ? '#ffffff' : theme.text },
                    ]}>
                      {cap(eq)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom padding so Save button isn't hidden behind the keyboard */}
            <View style={{ height: Spacing.six }} />
          </ScrollView>

          {/* Save — kept outside ScrollView so it's always visible at the bottom */}
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
              {saving ? 'Saving…' : 'Save Exercise'}
            </Text>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExerciseScreen() {
  const theme = useTheme();
  const exercises = useExerciseStore((s) => s.exercises);
  const isLoading = useExerciseStore((s) => s.isLoading);
  const addExercise = useExerciseStore((s) => s.addExercise);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Both filters are applied together. Either can be null/empty to act as a no-op.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesQuery    = !q             || e.name.toLowerCase().includes(q);
      const matchesCategory = !activeCategory || e.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [exercises, query, activeCategory]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Exercises</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Search bar — fixed above the list, not inside FlatList */}
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
        {/*
          clearButtonMode="while-editing" shows a native × on iOS only.
          This custom button covers Android.
        */}
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={[styles.clearButton, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Category filter row — horizontal ScrollView, not FlatList, because
          the chip count is fixed and small. showsHorizontalScrollIndicator={false}
          hides the scroll bar on both platforms. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryRow}
        keyboardShouldPersistTaps="handled"
      >
        {/* "All" chip — selected when no category filter is active */}
        <Pressable
          onPress={() => setActiveCategory(null)}
          style={({ pressed }) => [
            styles.filterChip,
            { backgroundColor: activeCategory === null ? theme.accent : theme.backgroundElement },
            pressed && activeCategory !== null && { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <Text style={[styles.chipText, { color: activeCategory === null ? '#ffffff' : theme.text }]}>
            All
          </Text>
        </Pressable>

        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              // Tapping the active chip a second time clears the filter.
              onPress={() => setActiveCategory(active ? null : cat)}
              style={({ pressed }) => [
                styles.filterChip,
                { backgroundColor: active ? theme.accent : theme.backgroundElement },
                pressed && !active && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#ffffff' : theme.text }]}>
                {cap(cat)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Exercise list */}
      {/*
        FlatList virtualizes — it only renders items near the viewport and recycles
        views as you scroll. ScrollView would mount all items immediately.
        keyExtractor tells FlatList each item's identity (same role as key= on the web).
        ItemSeparatorComponent renders between items but NOT after the last one.
      */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseRow exercise={item} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: theme.textSecondary }}>
              {isLoading ? 'Loading…' : 'No exercises found.'}
            </Text>
          </View>
        }
        // contentContainerStyle only when empty so the empty message can be centred
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        keyboardShouldPersistTaps="handled"
      />

      <AddExerciseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={addExercise}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 8,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Search
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
  clearButton: {
    fontSize: 14,
    paddingHorizontal: Spacing.one,
  },

  // Category filter
  categoryScroll: {
    height: 36,
    marginVertical: Spacing.two,
  },
  categoryRow: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
  },
  // Separate from modal `chip` so height is locked without affecting the modal.
  // justifyContent: 'center' keeps text centred regardless of platform lineHeight variance.
  filterChip: {
    height: 36,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
  },

  // List
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.five,
  },
  emptyContainer: {
    flexGrow: 1,
  },

  // Modal
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
    fontSize: 20,
    fontWeight: '700',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: Spacing.three,
    marginBottom: Spacing.one + 2,
  },
  nameInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
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
});
