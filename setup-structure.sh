#!/bin/bash
# Run this from inside your project directory after create-expo-app
# Usage: bash setup-structure.sh

echo "Setting up project structure..."

# Remove Expo template boilerplate
rm -rf app/\(tabs\)
rm -f app/index.tsx
rm -f app/+not-found.tsx
rm -f components/ 2>/dev/null || true
rm -rf components

# Create app routes
mkdir -p app/\(tabs\)
mkdir -p app/workout
mkdir -p app/exercise
mkdir -p app/template
mkdir -p app/program

# Create source folders
mkdir -p src/types
mkdir -p src/store
mkdir -p src/db/repositories
mkdir -p src/utils
mkdir -p src/components/ui
mkdir -p src/components/workout

# Create placeholder files so git tracks the folders
touch src/store/.gitkeep
touch src/db/repositories/.gitkeep
touch src/utils/.gitkeep
touch src/components/ui/.gitkeep
touch src/components/workout/.gitkeep

echo ""
echo "Done. Folder structure created."
echo ""
echo "Next steps:"
echo "  1. Copy types.ts into src/types/index.ts"
echo "  2. Copy CLAUDE.md into the project root"
echo "  3. Run: npx expo start"
echo "  4. Scan the QR code with Expo Go on your Android device"
