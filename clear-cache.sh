#!/bin/bash
echo "🧹 Clearing all caches..."

# Stop any running Metro bundler
echo "Stopping Metro bundler..."
pkill -f "react-native start" || true
pkill -f "expo start" || true

# Clear Watchman (file watcher)
echo "Clearing Watchman..."
watchman watch-del-all 2>/dev/null || echo "Watchman not installed, skipping..."

# Clear Metro bundler cache
echo "Clearing Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Clear Expo cache
echo "Clearing Expo cache..."
npx expo start -c --clear 2>/dev/null &
sleep 2
pkill -f "expo start" || true

# Clear React Native cache
echo "Clearing React Native cache..."
rm -rf $TMPDIR/react-native-packager-cache-* 2>/dev/null || true

# Clear node_modules cache (Babel, etc.)
echo "Clearing node_modules cache..."
rm -rf node_modules/.cache 2>/dev/null || true

# Clear iOS build cache
echo "Clearing iOS DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null || true
rm -rf ios/build 2>/dev/null || true
rm -rf ios/Pods 2>/dev/null || true

# Clear Android build cache
echo "Clearing Android cache..."
rm -rf android/build 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
rm -rf android/.gradle 2>/dev/null || true

# Clear JavaScript bundle cache
echo "Clearing JavaScript bundles..."
rm -rf .expo 2>/dev/null || true
rm -rf .expo-shared 2>/dev/null || true

echo "✅ All caches cleared!"
echo ""
echo "Next steps:"
echo "1. Run: npm install (to reinstall pods if needed)"
echo "2. Run: npx expo start --clear"
echo "3. Delete and reinstall the app on your device"
