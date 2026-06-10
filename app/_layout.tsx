import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '../src/db/schema';
import { useCalendarStore } from '../src/store/calendarStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useTemplateStore } from '../src/store/templateStore';
import { useWorkoutStore } from '../src/store/workoutStore';

// Bridges the SQLite context (React) into the Zustand stores (outside React).
// Rendered inside <SQLiteProvider> so useSQLiteContext() is valid here.
// initialize() is stable across renders, so this effect runs exactly once.
function DatabaseInitializer(): null {
  const db = useSQLiteContext();
  const initCalendar  = useCalendarStore((s) => s.initialize);
  const initExercise  = useExerciseStore((s) => s.initialize);
  const initTemplate  = useTemplateStore((s) => s.initialize);
  const initWorkout   = useWorkoutStore((s) => s.initialize);

  useEffect(() => {
    initCalendar(db);
    initExercise(db);
    initTemplate(db);
    initWorkout(db);
  }, [db, initCalendar, initExercise, initTemplate, initWorkout]);

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