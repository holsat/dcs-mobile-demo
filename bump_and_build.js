/* eslint-env node */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidBuildFile = path.resolve(__dirname, 'android/app/build.gradle');

function bumpVersion() {
  console.log('--- Starting Version Bump ---');
  let content = fs.readFileSync(androidBuildFile, 'utf-8');

  // 1. Find and Increment versionCode
  const versionCodeRegex = /(versionCode\s)(\d+)/;
  const currentVersionCode = parseInt(content.match(versionCodeRegex)[2]);
  const newVersionCode = currentVersionCode + 1;
  content = content.replace(versionCodeRegex, `$1${newVersionCode}`);
  console.log(`✅ Version Code bumped: ${currentVersionCode} -> ${newVersionCode}`);

  // 2. Find and Increment versionName (e.g., 1.0.0 -> 1.0.1)
  const versionNameRegex = /(versionName\s\")(.*?)(\")/;
  const currentVersionName = content.match(versionNameRegex)[2];

  // Split version string and increment the patch number
  let [major, minor, patch] = currentVersionName.split('.').map(Number);
  patch = (patch || 0) + 1;
  const newVersionName = `${major}.${minor}.${patch}`;

  content = content.replace(versionNameRegex, `$1${newVersionName}$3`);
  console.log(`✅ Version Name bumped: ${currentVersionName} -> ${newVersionName}`);

  // 3. Write the updated content back to build.gradle
  fs.writeFileSync(androidBuildFile, content, 'utf-8');
  console.log('--- Version Bump Complete ---');

  return { newVersionCode, newVersionName };
}

function runBuildSequence() {
  try {
    // Step 1: Clean (The failing task must be run via the manual shell command)
    console.log('\n--- Starting Aggressive Gradle Clean ---');
    // Using execSync to run shell commands synchronously
    execSync('cd android && ./gradlew clean', { stdio: 'inherit' });
    console.log('✅ Gradle Clean Successful.');

    // Step 2: Build the AAB
    console.log('\n--- Starting Signed Release AAB Build ---');
    // Setting NODE_ENV=production is critical for the JS bundle task
    execSync('cd android && NODE_ENV=production ./gradlew bundleRelease', { stdio: 'inherit' });
    console.log('✅ Release AAB Build Successful!');
    console.log('\n---------------------------------------------------------');
    console.log('🚀 FINAL AAB READY FOR UPLOAD 🚀');
    console.log('Location: android/app/build/outputs/bundle/release/app-release.aab');
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error('❌ BUILD FAILED in Shell Execution:', error.message);
    process.exit(1);
  }
}

// Main execution flow
bumpVersion();
runBuildSequence();
