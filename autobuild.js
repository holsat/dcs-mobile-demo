/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidBuildFile = path.resolve(__dirname, 'android/app/build.gradle');
const rootDir = path.resolve(__dirname);

function bumpVersion() {
  console.log('--- Starting Version Bump ---');
  let content = fs.readFileSync(androidBuildFile, 'utf-8');

  // 1. Find and Increment versionCode
  const versionCodeRegex = /(versionCode\s)(\d+)/;
  const currentVersionCode = parseInt(content.match(versionCodeRegex)[2]);
  const newVersionCode = currentVersionCode + 1;
  content = content.replace(versionCodeRegex, `$1${newVersionCode}`);

  // 2. Find and Increment versionName (e.g., 1.0.0 -> 1.0.1)
  const versionNameRegex = /(versionName\s\")(\d+)\.(\d+)\.(\d+)(\")/;
  const match = content.match(versionNameRegex);

  if (!match) {
    console.error('❌ ERROR: Could not find versionName pattern (e.g., 1.0.0) in build.gradle.');
    process.exit(1);
  }

  // Extract major, minor, patch and increment patch
  let [major, minor, patch] = [match[2], match[3], match[4]].map(Number);
  const oldVersionName = `${major}.${minor}.${patch}`;
  patch += 1;
  const newVersionName = `${major}.${minor}.${patch}`;

  content = content.replace(versionNameRegex, `$1${major}.${minor}.${patch}$5`);

  // 3. Write the updated content back
  fs.writeFileSync(androidBuildFile, content, 'utf-8');

  console.log(`✅ Version Code bumped: ${currentVersionCode} -> ${newVersionCode}`);
  console.log(`✅ Version Name bumped: ${oldVersionName} -> ${newVersionName}`);
  console.log('--- Version Bump Complete ---');
}

function runBuildSequence() {
  try {
    console.log('\n--- Starting Nuclear Clean-up (Bypassing Failing gradlew clean) ---');

    // Manual deletion of all critical build and cache folders (fixes Codegen errors)
    const cleanCommands = [
      `rm -rf ${rootDir}/android/build`,
      `rm -rf ${rootDir}/android/app/build`,
      `rm -rf ${rootDir}/android/.gradle`,
      `rm -rf ${rootDir}/android/app/.cxx`,
      `rm -rf ${rootDir}/node_modules`,
      `rm -rf ${rootDir}/$TMPDIR/react-native-packager-cache-*`,
      `rm -rf ${rootDir}/$TMPDIR/metro-cache`,
    ];

    // Execute cleaning commands
    cleanCommands.forEach((cmd) => {
      try {
        execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
        console.log(`   - Successfully executed: ${cmd}`);
      } catch (_error) {
        // Ignore errors for rm -rf commands, as the folder might not exist
        // The point is to ensure the directory is gone.
        console.log(`   - Clean command ran (may have failed if dir was absent): ${cmd}`);
      }
    });

    console.log('✅ Manual Clean Successful.');

    // Reinstall modules after cleaning to regenerate Codegen artifacts
    console.log('\n--- Reinstalling dependencies (npm install) ---');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies Reinstalled.');

    // Step 3: Build the AAB
    console.log('\n--- Building Signed Release AAB ---');

    // Execute the bundleRelease command from the android directory
    const buildCommand = `cd ${rootDir}/android && NODE_ENV=production ./gradlew bundleRelease`;
    execSync(buildCommand, { stdio: 'inherit' });

    console.log('✅ Release AAB Build Successful!');
    console.log('\n---------------------------------------------------------');
    console.log('🚀 FINAL AAB READY FOR UPLOAD 🚀');
    console.log(`Location: ${rootDir}/android/app/build/outputs/bundle/release/app-release.aab`);
    console.log('---------------------------------------------------------');
  } catch (_error) {
    console.error('\n❌ FATAL BUILD FAILURE. Check console output for Gradle/Node errors.');
    process.exit(1);
  }
}

// Main execution flow
bumpVersion();
runBuildSequence();
