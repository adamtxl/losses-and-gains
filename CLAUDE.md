# Workout App — Claude Code Instructions

## Project overview
A React Native workout planning and logging app built with Expo.
Targets Android first (Google Play). Local-only storage via expo-sqlite.

## Tech stack
- **Framework**: Expo (managed workflow) + Expo Router (file-based routing)
- **Language**: TypeScript — strict mode, no `any`
- **State**: Zustand
- **Storage**: expo-sqlite with a repository pattern
- **UI**: React Native core components + custom components in `src/components`
- **Calendar**: react-native-calendars

## Key architecture decisions
- All weights are stored internally in **lbs**. Convert to kg on display only.
  Use the `formatWeight(lbs, unit)` util — never do inline math in components.
- **Planned vs logged are always separate.**
  `CalendarEntry` = the plan. `LoggedSession` = what happened.
  They link via `loggedSessionId` only after a workout is completed.
- Rest timer: store `Date.now()` at start, compute elapsed on every render tick.
  Never use a countdown — it breaks when the app backgrounds.
- Back-off set percentages always reference the **actual logged top set weight**
  from that session, not the prescribed value or any stored 1RM.
- PRs are detected at log time by querying all prior LoggedSets for that exercise.

## Folder structure
```
app/              # Expo Router pages — one file = one route
  (tabs)/         # Tab group: index, calendar, history, settings
  workout/        # [date].tsx — dynamic route for each training day
  exercise/       # Library and detail views
  template/       # Workout template editor
  program/        # Program block views
src/
  types/          # index.ts — all interfaces, never import from elsewhere
  store/          # Zustand stores (settingsStore, exerciseStore, workoutStore)
  db/             # SQLite schema + repositories (one per entity group)
  utils/          # Pure functions: units.ts, plates.ts, timer.ts
  components/
    ui/            # Generic: Button, Card, Modal, Input, etc.
    workout/       # Domain: SetRow, ExerciseCard, RestTimer, PlateDisplay, etc.
```

## Code conventions
- **No `any`.** If you're not sure of a type, use `unknown` and narrow it.
- Prefer named exports over default exports everywhere except Expo Router pages
  (Expo Router requires default exports for screen files).
- Components go in `src/components`. No business logic in components — 
  logic belongs in stores, repositories, or utils.
- Repository functions are async and return typed results. No raw SQL in components or stores.
- Zustand stores should be small and focused. One store per domain area.

## Learning mode — IMPORTANT
This developer is learning React Native while building.
**Before writing any non-trivial code:**
1. Briefly explain what you're about to do and why
2. Call out any React Native-specific behaviour that differs from web
3. If there are two reasonable approaches, name both and say which you're using and why

**Flag these explicitly when they come up:**
- iOS vs Android behaviour differences (even though we're Android-first, note it)
- Expo managed workflow limitations
- Anything that would need to change if we add cloud sync later
- Performance gotchas (FlatList vs ScrollView, unnecessary re-renders, etc.)

## What NOT to do
- Do not install bare React Native libraries that require `expo prebuild` or 
  native module linking without flagging it first
- Do not put SQLite queries directly in components or Zustand stores
- Do not hardcode any weight values as kg — always lbs internally
- Do not use `ScrollView` for long lists — use `FlatList` with `keyExtractor`
- Do not use `any` type
- Do not add cloud/backend concerns — this is local-only for now

## Running the app
```bash
npx expo start          # Start dev server
# Scan QR code with Expo Go on your Android device
```
