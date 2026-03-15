#!/usr/bin/env node

/**
 * Emergency install fix for when all else fails
 * This script handles the most common dependency issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🆘 Emergency Install Fix');
console.log('========================');

// Check environment
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

// Clean everything
console.log('\n🧹 Cleaning all lock files and caches...');

try {
  // Remove all possible lock files and caches
  const filesToRemove = [
    'node_modules',
    'bun.lockb', 
    'package-lock.json',
    'yarn.lock',
    '.npm',
    '.bun'
  ];

  filesToRemove.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`Removing ${file}...`);
      execSync(`rm -rf "${file}"`, { stdio: 'inherit' });
    }
  });

  // Clear npm cache
  console.log('Clearing npm cache...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
  } catch (e) {
    console.log('npm cache clean failed (might not be installed)');
  }

  console.log('\n📦 Installing with npm (most reliable)...');
  execSync('npm install --no-package-lock --timeout=600000', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_timeout: '600000',
      npm_config_registry: 'https://registry.npmjs.org/'
    }
  });

  console.log('\n✅ Emergency install completed successfully!');
  console.log('🚀 Try running: npm run dev');

} catch (error) {
  console.log('\n💥 Emergency install failed');
  console.log('Error:', error.message);
  
  console.log('\n🔍 Final troubleshooting steps:');
  console.log('1. Check network: ping registry.npmjs.org');
  console.log('2. Check disk space: df -h');
  console.log('3. Try different network/VPN');
  console.log('4. Contact system administrator');
  
  process.exit(1);
}