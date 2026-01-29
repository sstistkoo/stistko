#!/usr/bin/env node

/**
 * Simple Test Runner
 */

const fs = require('fs');
const path = require('path');

// Global test registry
global.tests = [];
global.describe = function(suite, fn) {
    const suiteTests = [];
    global.currentSuite = { name: suite, tests: suiteTests };
    fn();
    global.tests.push(global.currentSuite);
};

global.it = function(description, fn) {
    global.currentSuite.tests.push({ description, fn });
};

// Run tests
function runTests() {
    const testDir = __dirname;
    const testFiles = fs.readdirSync(testDir)
        .filter(f => f.startsWith('test-') && f.endsWith('.cjs'))
        .sort();

    if (testFiles.length === 0) {
        console.log('❌ No test files found');
        process.exit(1);
    }

    console.log(`\n🧪 Running ${testFiles.length} test suite(s)...\n`);

    // Load test files
    testFiles.forEach(file => {
        require(path.join(testDir, file));
    });

    // Execute tests
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of global.tests) {
        console.log(`\n📋 ${suite.name}`);

        for (const test of suite.tests) {
            totalTests++;
            try {
                test.fn();
                passedTests++;
                console.log(`  ✅ ${test.description}`);
            } catch (error) {
                failedTests++;
                console.log(`  ❌ ${test.description}`);
                console.log(`     Error: ${error.message}`);
            }
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Tests: ${passedTests}/${totalTests} passed`);

    if (failedTests > 0) {
        console.log(`⚠️  ${failedTests} test(s) failed\n`);
        process.exit(1);
    } else {
        console.log(`✅ All tests passed!\n`);
        process.exit(0);
    }
}

try {
    runTests();
} catch (err) {
    console.error('❌ Test runner error:', err);
    process.exit(1);
}
