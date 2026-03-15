#!/usr/bin/env node

/**
 * Smart dependency installer with fallback
 * Tries Bun first, falls back to npm if needed
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';

console.log('🚀 Smart Dependency Installer');
console.log('==============================');

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function tryBunInstall() {
  console.log('📦 Attempting Bun install...');
  try {
    // Try with shorter timeout first
    await runCommand('bun', ['install', '--timeout', '60000']);
    console.log('✅ Bun install succeeded!');
    return true;
  } catch (error) {
    console.log('❌ Bun install failed:', error.message);
    return false;
  }
}

async function tryNpmInstall() {
  console.log('📦 Falling back to npm install...');
  try {
    await runCommand('npm', ['install', '--timeout=300000']);
    console.log('✅ npm install succeeded!');
    return true;
  } catch (error) {
    console.log('❌ npm install failed:', error.message);
    return false;
  }
}

async function cleanAndRetry() {
  console.log('🧹 Cleaning node_modules and lock files...');
  try {
    // Remove node_modules and lock files
    if (fs.existsSync('node_modules')) {
      execSync('rm -rf node_modules', { stdio: 'inherit' });
    }
    if (fs.existsSync('bun.lockb')) {
      execSync('rm -f bun.lockb', { stdio: 'inherit' });
    }
    if (fs.existsSync('package-lock.json')) {
      execSync('rm -f package-lock.json', { stdio: 'inherit' });
    }

    console.log('🔄 Retrying with npm...');
    return await tryNpmInstall();
  } catch (error) {
    console.log('❌ Clean install failed:', error.message);
    return false;
  }
}

async function main() {
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found in current directory');
    process.exit(1);
  }

  console.log('Node version:', process.version);
  console.log('Current directory:', process.cwd());

  // Try Bun first
  let success = await tryBunInstall();

  // If Bun fails, try npm
  if (!success) {
    console.log('\n⚠️  Bun install failed, trying npm...');
    success = await tryNpmInstall();
  }

  // If npm also fails, try clean install
  if (!success) {
    console.log('\n🔄 Both installs failed, trying clean install...');
    success = await cleanAndRetry();
  }

  if (success) {
    console.log('\n🎉 Dependencies installed successfully!');
    console.log('💡 You can now run: npm run dev');
  } else {
    console.log('\n💥 All installation methods failed');
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check your network connection');
    console.log('2. Try running from a different terminal');
    console.log('3. Check if you have sufficient disk space');
    console.log('4. Try clearing npm cache: npm cache clean --force');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Installer crashed:', error.message);
  process.exit(1);
});
