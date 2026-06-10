import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTemplateStore } from '@/store/templateStore';
import type { WorkoutTemplate } from '@/types';

// ─── Template Row ─────────────────────────────────────────────────────────────

interface TemplateRowProps {
  template: WorkoutTemplate;
  onPress: () => void;
}

function TemplateRow({ template, onPress }: TemplateRowProps) {
  const theme = useTheme();
  const count = template.exercises.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
      ]}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
          {template.name}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
          {count === 0 ? 'No exercises yet' : `${count} exercise${count !== 1 ? 's' : ''}`}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TemplateListScreen() {
  const theme = useTheme();
  const router = useRouter();

  const templates      = useTemplateStore((s) => s.templates);
  const isLoading      = useTemplateStore((s) => s.isLoading);
  const createTemplate = useTemplateStore((s) => s.createTemplate);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = newName.trim().length > 0;

  function handleClose() {
    setNewName('');
    setCreateVisible(false);
  }

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    const newId = await createTemplate(newName.trim());
    setSaving(false);
    setNewName('');
    setCreateVisible(false);
    if (newId) {
      router.push(`/template/${newId}`);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>

      {/* All stack screens use headerShown: false globally, so we build our own. */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backBtn, { color: theme.accent }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Templates</Text>
        <Pressable
          onPress={() => setCreateVisible(true)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TemplateRow
            template={item}
            onPress={() => router.push(`/template/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {isLoading ? 'Loading…' : 'No templates yet — tap + New to create one'}
            </Text>
          </View>
        }
        contentContainerStyle={templates.length === 0 ? styles.emptyContainer : undefined}
      />

      {/*
        Alert.prompt is iOS-only, so we use a centred modal with a TextInput instead.
        This gives identical behaviour on iOS and Android.
        The outer Pressable dismisses on backdrop tap. onStartShouldSetResponder on
        the card absorbs taps so they don't propagate to the backdrop Pressable.
      */}
      <Modal
        visible={createVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View
              style={[styles.createCard, { backgroundColor: theme.backgroundElement }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.createTitle, { color: theme.text }]}>New Template</Text>
              <TextInput
                style={[styles.createInput, { backgroundColor: theme.background, color: theme.text }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Upper A, Lower B…"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <View style={styles.createActions}>
                <Pressable
                  onPress={handleClose}
                  style={[styles.createBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <Text style={[styles.createBtnText, { color: theme.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!canSave || saving}
                  style={[
                    styles.createBtn,
                    { backgroundColor: theme.accent },
                    (!canSave || saving) && styles.disabledBtn,
                  ]}
                >
                  <Text style={styles.createBtnText}>
                    {saving ? 'Creating…' : 'Create'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 52,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    borderRadius: 8,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
    minWidth: 52,
    alignItems: 'flex-end',
  },
  addButtonPressed: {
    opacity: 0.75,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

  // List
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 20,
    marginLeft: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },

  // Create modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  createCard: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  createTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  createInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  createActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  createBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.4,
  },
});
