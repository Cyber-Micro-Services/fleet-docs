#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    if (!silent) throw error;
    return '';
  }
}

async function performCodeReview() {
  log('cyan', '\n🔍 Starting Automatic Code Review...\n');

  try {
    // Get current branch
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD', true).trim();
    log('blue', `Current branch: ${currentBranch}`);

    // Check if origin/main exists
    const mainExists = runCommand('git rev-parse --verify origin/main', true).trim();
    if (!mainExists) {
      log('yellow', 'Warning: origin/main not found. Skipping comparison.');
      return false;
    }

    // Get list of changed files
    const changedFiles = runCommand('git diff origin/main --name-only', true)
      .split('\n')
      .filter((f) => f && /\.(ts|tsx|js|jsx)$/.test(f));

    if (changedFiles.length === 0) {
      log('green', '✓ No TypeScript/JavaScript changes to review');
      return true;
    }

    log('blue', `\nFiles changed: ${changedFiles.length}`);
    changedFiles.forEach((file) => log('blue', `  - ${file}`));

    // Run TypeScript type checking
    log('cyan', '\n📋 Running TypeScript type check...');
    try {
      runCommand('npx tsc --noEmit', false);
      log('green', '✓ TypeScript checks passed');
    } catch (error) {
      log('red', '✗ TypeScript errors found');
      return false;
    }

    // Run ESLint on changed files
    log('cyan', '\n🔎 Running ESLint...');
    try {
      runCommand(`npx eslint ${changedFiles.join(' ')}`, false);
      log('green', '✓ ESLint checks passed');
    } catch (error) {
      log('red', '✗ ESLint errors found');
      return false;
    }

    // Show detailed diff
    log('cyan', '\n📝 Code Diff Summary:');
    const diffStat = runCommand('git diff origin/main --stat', true);
    console.log(diffStat);

    // Get commit diff details
    const commitDiff = runCommand('git diff origin/main --no-ext-diff', true);
    const lineCount = commitDiff.split('\n').length;
    log('blue', `Total diff lines: ${lineCount}`);

    // Count additions/deletions
    const additions = runCommand('git diff origin/main --numstat', true)
      .split('\n')
      .filter((line) => line)
      .reduce((sum, line) => sum + parseInt(line.split('\t')[0], 10), 0);

    const deletions = runCommand('git diff origin/main --numstat', true)
      .split('\n')
      .filter((line) => line)
      .reduce((sum, line) => sum + parseInt(line.split('\t')[1], 10), 0);

    log('green', `Lines added: +${additions}`);
    log('red', `Lines deleted: -${deletions}`);

    // Security check for common issues
    log('cyan', '\n🔒 Checking for common security issues...');
    const securityChecks = [
      {
        pattern: /hardcoded.*password|api[_-]?key|secret/gi,
        message: 'Possible hardcoded credentials',
      },
      {
        pattern: /console\.log|debugger/g,
        message: 'Debug statements found',
      },
      {
        pattern: /\/\/\s*TODO|\/\/\s*FIXME/g,
        message: 'TODO/FIXME comments found',
      },
    ];

    let securityIssues = 0;
    changedFiles.forEach((file) => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          securityChecks.forEach((check) => {
            if (check.pattern.test(line)) {
              log('yellow', `  ⚠ ${file}:${index + 1} - ${check.message}`);
              securityIssues++;
            }
          });
        });
      } catch (error) {
        // File may not exist or be readable
      }
    });

    if (securityIssues === 0) {
      log('green', '✓ No obvious security issues found');
    } else {
      log('yellow', `⚠ Found ${securityIssues} potential issues to review`);
    }

    log('green', '\n✅ Code Review Complete!\n');
    return true;
  } catch (error) {
    log('red', `\n❌ Code Review Failed: ${error.message}\n`);
    return false;
  }
}

performCodeReview().then((success) => {
  process.exit(success ? 0 : 1);
});
