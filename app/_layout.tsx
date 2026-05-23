import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '../src/db/schema';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="losses_and_gains.db" onInit={initDatabase}>
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}