#!/usr/bin/env node

/**
 * Dependency Fix Script
 * This script helps resolve common dependency installation issues
 */

console.log('🔧 Dependency Fix Script');
console.log('========================');

// Log current environment
console.log('Node version:', process.version);
console.log('Current working directory:', process.cwd());

// Check for common issues
const fs = require('fs');
const path = require('path');

// Check if package.json exists and is valid
try {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('✅ package.json is valid');
    console.log('📦 Total dependencies:', Object.keys(packageJson.dependencies || {}).length);
    console.log('🛠️ Total devDependencies:', Object.keys(packageJson.devDependencies || {}).length);
  } else {
    console.log('❌ package.json not found');
  }
} catch (error) {
  console.log('❌ package.json is invalid:', error.message);
}

// Check for lock files
const lockFiles = ['bun.lockb', 'package-lock.json', 'yarn.lock'];
lockFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found ${file}`);
  }
});

// Check for node_modules
if (fs.existsSync('node_modules')) {
  console.log('📁 node_modules directory exists');
} else {
  console.log('📁 node_modules directory not found');
}

console.log('\n🚀 Recommendations:');
console.log('1. Clear cache: bun install --no-cache');
console.log('2. Remove node_modules and reinstall');
console.log('3. Check network connectivity'); 
console.log('4. Try using npm as fallback: npm install');

console.log('\n✅ Dependency check complete');