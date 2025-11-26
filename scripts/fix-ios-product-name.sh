#!/bin/bash

# Script to fix iOS PRODUCT_NAME after expo prebuild
# This ensures the app name is "DCS+" for App Store submission

echo "🔧 Fixing iOS PRODUCT_NAME to 'DCS+' for App Store..."

if [ ! -f "ios/DCS.xcodeproj/project.pbxproj" ]; then
  echo "❌ Error: ios/DCS.xcodeproj/project.pbxproj not found"
  echo "   Run 'npx expo prebuild' first"
  exit 1
fi

# Fix PRODUCT_NAME from "DCS" to "DCS+"
sed -i '' 's/PRODUCT_NAME = DCS;/PRODUCT_NAME = "DCS+";/g' ios/DCS.xcodeproj/project.pbxproj

# Fix target name references
sed -i '' 's/PBXNativeTarget "DCS"/PBXNativeTarget "DCS+"/g' ios/DCS.xcodeproj/project.pbxproj

# Fix name field references (but not paths or file references)
sed -i '' 's/name = DCS;/name = "DCS+";/g' ios/DCS.xcodeproj/project.pbxproj

echo "✅ iOS PRODUCT_NAME fixed successfully!"
echo "   - PRODUCT_NAME is now 'DCS+'"
echo "   - Target name is now 'DCS+'"
echo "   - Ready for App Store submission"
