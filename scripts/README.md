# iOS Product Name Fix Script

## Problem

When running `npx expo prebuild --clean`, Expo regenerates the iOS project from `app.json` and sets `PRODUCT_NAME` to "DCS" (without the `+`). This causes an App Store submission conflict because an app named "DCS" already exists.

## Solution

This script automatically fixes the iOS `PRODUCT_NAME` after prebuild to ensure it's "DCS+" for App Store submission.

## Usage

### Option 1: Use the Combined Command (Recommended)

```bash
npm run prebuild:ios
```

This will:
1. Run `expo prebuild --clean --platform ios`
2. Automatically fix the product name to "DCS+"

### Option 2: Fix Manually After Prebuild

```bash
npx expo prebuild --clean --platform ios
npm run fix-ios-name
```

### Option 3: Run Script Directly

```bash
./scripts/fix-ios-product-name.sh
```

## What It Fixes

The script updates the following in `ios/DCS.xcodeproj/project.pbxproj`:
- ✅ `PRODUCT_NAME` from `"DCS"` to `"DCS+"`
- ✅ Target name from `"DCS"` to `"DCS+"`
- ✅ Build configuration references

## When To Use

Run this script every time you:
- Run `npx expo prebuild --clean`
- Regenerate the iOS project
- Need to prepare for App Store submission

## Verification

After running the script, verify the changes:

```bash
grep "PRODUCT_NAME" ios/DCS.xcodeproj/project.pbxproj
```

You should see:
```
PRODUCT_NAME = "DCS+";
PRODUCT_NAME = "DCS+";
```

## Alternative: EAS Build

If you use EAS Build for production releases, you can skip prebuild entirely:

```bash
eas build --platform ios --profile production
```

EAS Build handles the native project generation automatically and you won't need to run this script.
