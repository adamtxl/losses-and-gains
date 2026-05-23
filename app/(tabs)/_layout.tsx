import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index"    options={{ title: 'Today'     }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar'  }} />
      <Tabs.Screen name="exercise" options={{ title: 'Exercises' }} />
      <Tabs.Screen name="history"  options={{ title: 'History'   }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings'  }} />
    </Tabs>
  );
}