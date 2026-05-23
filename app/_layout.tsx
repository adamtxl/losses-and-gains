import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '../src/db/schema';
import { useExerciseStore } from '../src/store/exerciseStore';

// Bridges the SQLite context (React) into the Zustand store (outside React).
// Rendered inside <SQLiteProvider> so useSQLiteContext() is valid here.
// initialize() is stable across renders, so this effect runs exactly once.
function DatabaseInitializer(): null {
  const db = useSQLiteContext();
  const initialize = useExerciseStore((s) => s.initialize);

  useEffect(() => {
    initialize(db);
  }, [db, initialize]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="losses_and_gains.db" onInit={initDatabase}>
        <DatabaseInitializer />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}