#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parallel test execution configuration
const TEST_GROUPS = [
  {
    name: 'Core Functionality',
    specs: [
      'cypress/e2e/01-core-functionality.cy.ts',
      'cypress/e2e/02-onboarding-complete.cy.ts',
      'cypress/e2e/07-dashboard-comprehensive.cy.ts'
    ],
    parallel: 3
  },
  {
    name: 'Grant Management',
    specs: [
      'cypress/e2e/03-grant-management.cy.ts',
      'cypress/e2e/08-grant-draft-editor-comprehensive.cy.ts',
      'cypress/e2e/09-advanced-grant-search.cy.ts'
    ],
    parallel: 3
  },
  {
    name: 'Administration & Settings',
    specs: [
      'cypress/e2e/10-organization-settings-comprehensive.cy.ts',
      'cypress/e2e/11-superadmin-comprehensive.cy.ts',
      'cypress/e2e/04-advanced-features.cy.ts'
    ],
    parallel: 3
  },
  {
    name: 'Mobile & Performance',
    specs: [
      'cypress/e2e/12-mobile-responsive-comprehensive.cy.ts',
      'cypress/e2e/13-performance-comprehensive.cy.ts',
      'cypress/e2e/05-integration-suite.cy.ts'
    ],
    parallel: 3
  },
  {
    name: 'Quality Assurance',
    specs: [
      'cypress/e2e/14-accessibility-comprehensive.cy.ts',
      'cypress/e2e/15-error-handling-comprehensive.cy.ts'
    ],
    parallel: 2
  }
];

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(`[${new Date().toLocaleTimeString()}] ${message}`, color));
}

async function runTestGroup(group, groupIndex) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    log(`🚀 Starting test group: ${group.name}`, 'cyan');
    
    // Build cypress command
    const specs = group.specs.join(',');
    const cypressArgs = [
      'run',
      '--spec', specs,
      '--parallel',
      '--record', 'false',
      '--config', `defaultCommandTimeout=10000,requestTimeout=10000,responseTimeout=10000`
    ];

    // Add browser selection for load balancing
    const browsers = ['chrome', 'electron'];
    const browser = browsers[groupIndex % browsers.length];
    cypressArgs.push('--browser', browser);

    log(`📋 Running specs: ${specs}`, 'blue');
    log(`🌐 Using browser: ${browser}`, 'blue');

    const cypress = spawn('npx', ['cypress', ...cypressArgs], {
      stdio: 'pipe',
      env: {
        ...process.env,
        CYPRESS_GROUP_NAME: group.name,
        CYPRESS_GROUP_INDEX: groupIndex.toString()
      }
    });

    let output = '';
    let errorOutput = '';

    cypress.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      // Log important messages in real-time
      if (message.includes('passing') || message.includes('failing') || message.includes('skipped')) {
        log(`📊 ${group.name}: ${message.trim()}`, 'yellow');
      }
    });

    cypress.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      if (!message.includes('warning') && !message.includes('deprecated')) {
        log(`⚠️  ${group.name}: ${message.trim()}`, 'red');
      }
    });

    cypress.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log(`✅ Test group "${group.name}" completed successfully in ${duration}s`, 'green');
      } else {
        log(`❌ Test group "${group.name}" failed with code ${code} after ${duration}s`, 'red');
      }

      resolve({
        name: group.name,
        success: code === 0,
        duration: parseFloat(duration),
        output,
        errorOutput,
        exitCode: code
      });
    });

    cypress.on('error', (error) => {
      log(`💥 Test group "${group.name}" encountered an error: ${error.message}`, 'red');
      resolve({
        name: group.name,
        success: false,
        duration: ((Date.now() - startTime) / 1000).toFixed(2),
        output,
        errorOutput: error.message,
        exitCode: 1
      });
    });
  });
}

async function generateTestReport(results) {
  const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
  const successCount = results.filter(result => result.success).length;
  const failureCount = results.length - successCount;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: successCount,
      failed: failureCount,
      duration: totalDuration,
      passRate: ((successCount / results.length) * 100).toFixed(2)
    },
    groups: results.map(result => ({
      name: result.name,
      success: result.success,
      duration: result.duration,
      exitCode: result.exitCode
    }))
  };

  // Write report to file
  const reportPath = path.join(process.cwd(), 'cypress', 'reports', 'parallel-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

function printFinalReport(report) {
  log('\n' + '='.repeat(80), 'bright');
  log('🎯 PARALLEL TEST EXECUTION SUMMARY', 'bright');
  log('='.repeat(80), 'bright');
  
  log(`📊 Total Test Groups: ${report.summary.total}`, 'cyan');
  log(`✅ Passed: ${report.summary.passed}`, 'green');
  log(`❌ Failed: ${report.summary.failed}`, 'red');
  log(`⏱️  Total Duration: ${report.summary.duration.toFixed(2)}s`, 'blue');
  log(`📈 Pass Rate: ${report.summary.passRate}%`, 'magenta');
  
  log('\n📋 Group Results:', 'bright');
  report.groups.forEach(group => {
    const status = group.success ? '✅' : '❌';
    const color = group.success ? 'green' : 'red';
    log(`  ${status} ${group.name}: ${group.duration.toFixed(2)}s`, color);
  });
  
  log('\n' + '='.repeat(80), 'bright');
  
  if (report.summary.failed > 0) {
    log('❌ Some test groups failed. Check individual outputs above.', 'red');
    return false;
  } else {
    log('🎉 All test groups passed successfully!', 'green');
    return true;
  }
}

async function main() {
  log('🚀 Starting Comprehensive Parallel Test Regime', 'bright');
  log(`📦 Test Groups: ${TEST_GROUPS.length}`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    // Run all test groups in parallel
    const promises = TEST_GROUPS.map((group, index) => runTestGroup(group, index));
    const results = await Promise.all(promises);
    
    // Generate and display report
    const report = await generateTestReport(results);
    const success = printFinalReport(report);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Total Execution Time: ${totalDuration}s`, 'blue');
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`💥 Fatal error during parallel test execution: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Parallel test execution interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n🛑 Parallel test execution terminated', 'yellow');
  process.exit(143);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { runTestGroup, generateTestReport, TEST_GROUPS };