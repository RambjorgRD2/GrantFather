#!/usr/bin/env node

/**
 * Phase 3: Parallel Test Execution Script
 *
 * This script runs Cypress tests in parallel groups to achieve the 8-minute runtime target.
 * Groups are organized by complexity and dependencies.
 */

import { spawn } from 'child_process';
import path from 'path';

// Define test groups for parallel execution
const testGroups = {
  'group-1-core': ['cypress/e2e/01-core-functionality.cy.ts'],
  'group-2-onboarding': ['cypress/e2e/02-onboarding-complete.cy.ts'],
  'group-3-management': ['cypress/e2e/03-grant-management.cy.ts'],
  'group-4-advanced': [
    'cypress/e2e/04-advanced-features.cy.ts',
    'cypress/e2e/05-integration-suite.cy.ts',
  ],
};

// Performance tracking
const startTime = Date.now();
const results = {};

function runTestGroup(groupName, specs) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ${groupName}: ${specs.join(', ')}`);

    const groupStart = Date.now();
    const specArg = specs.join(',');

    const cypress = spawn(
      'npx',
      [
        'start-server-and-test',
        'npm run dev',
        'http://localhost:8080',
        `cypress run --spec "${specArg}" --reporter json`,
      ],
      {
        stdio: 'pipe',
        shell: true,
      }
    );

    let output = '';
    let errorOutput = '';

    cypress.stdout.on('data', (data) => {
      output += data.toString();
    });

    cypress.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    cypress.on('close', (code) => {
      const duration = Date.now() - groupStart;
      const durationMin = Math.round((duration / 1000 / 60) * 100) / 100;

      results[groupName] = {
        code,
        duration: durationMin,
        specs: specs.length,
        success: code === 0,
      };

      if (code === 0) {
        console.log(
          `✅ ${groupName} completed successfully in ${durationMin}min`
        );
      } else {
        console.log(
          `❌ ${groupName} failed (exit code ${code}) in ${durationMin}min`
        );
        console.log('Error output:', errorOutput);
      }

      resolve();
    });

    cypress.on('error', (err) => {
      console.error(`❌ Failed to start ${groupName}:`, err);
      results[groupName] = {
        code: -1,
        duration: 0,
        specs: specs.length,
        success: false,
        error: err.message,
      };
      resolve();
    });
  });
}

async function runAllGroups() {
  console.log('🎯 Phase 3: Parallel Test Execution Starting...');
  console.log(
    `📊 Running ${Object.keys(testGroups).length} groups in parallel`
  );

  // Run all groups in parallel
  const promises = Object.entries(testGroups).map(([groupName, specs]) =>
    runTestGroup(groupName, specs)
  );

  await Promise.all(promises);

  // Calculate total results
  const totalDuration = (Date.now() - startTime) / 1000 / 60;
  const totalSpecs = Object.values(testGroups).flat().length;
  const successfulGroups = Object.values(results).filter(
    (r) => r.success
  ).length;
  const totalGroups = Object.keys(testGroups).length;

  console.log('\n🏁 Parallel Execution Complete!');
  console.log('=====================================');
  console.log(
    `⏱️  Total Runtime: ${Math.round(totalDuration * 100) / 100} minutes`
  );
  console.log(`📝 Total Specs: ${totalSpecs}`);
  console.log(`✅ Successful Groups: ${successfulGroups}/${totalGroups}`);
  console.log(
    `🎯 Target Achievement: ${
      totalDuration <= 8 ? '✅ SUCCESS' : '❌ NEEDS OPTIMIZATION'
    }`
  );

  // Detailed results
  console.log('\n📊 Group Results:');
  Object.entries(results).forEach(([group, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(
      `  ${status} ${group}: ${result.duration}min (${result.specs} specs)`
    );
  });

  // Exit with appropriate code
  const allSuccessful = successfulGroups === totalGroups;
  process.exit(allSuccessful ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Parallel execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Parallel execution terminated');
  process.exit(1);
});

// Run the parallel execution
runAllGroups().catch((error) => {
  console.error('❌ Parallel execution failed:', error);
  process.exit(1);
});
