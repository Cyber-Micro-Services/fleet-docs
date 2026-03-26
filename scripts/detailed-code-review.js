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

class CodeReviewAnalyzer {
  constructor() {
    this.findings = {
      critical: [],
      major: [],
      minor: [],
      suggestions: [],
    };
    this.stats = {
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0,
    };
  }

  analyzeFile(filePath, content) {
    const ext = path.extname(filePath);
    if (!/\.(ts|tsx|js|jsx)$/.test(ext)) return;

    const lines = content.split('\n');

    // Check for TypeScript issues
    if (/\.tsx?$/.test(ext)) {
      this.checkTypeScriptBestPractices(filePath, lines);
    }

    // Check for React/Next.js issues
    if (/\.tsx?$/.test(ext) && (content.includes('React') || content.includes('useContext'))) {
      this.checkReactBestPractices(filePath, lines, content);
    }

    // Check for security issues
    this.checkSecurityIssues(filePath, lines);

    // Check for performance issues
    this.checkPerformanceIssues(filePath, lines, content);

    // Check for code quality
    this.checkCodeQuality(filePath, lines, content);
  }

  checkTypeScriptBestPractices(filePath, lines) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for 'any' type
      if (/:\s*any\b|<any>/.test(line)) {
        this.findings.major.push({
          file: filePath,
          line: lineNum,
          issue: 'Use of `any` type',
          suggestion: 'Replace with specific type to maintain type safety',
          severity: 'major',
        });
      }

      // Check for missing type annotations
      if (/const\s+\w+\s*=\s*(?!.*:).*(?:async\s+)?=>|function\s+\w+\s*\(/.test(line) && !line.includes(':')) {
        if (/useState|useRef|useCallback|useMemo/.test(line)) {
          this.findings.minor.push({
            file: filePath,
            line: lineNum,
            issue: 'Missing explicit type annotation',
            suggestion: 'Add generic type to hook, e.g., useState<string>()',
            severity: 'minor',
          });
        }
      }

      // Check for non-null assertion
      if (/!\s*[,;)]|as\s+const/.test(line) && !/!important/.test(line)) {
        this.findings.minor.push({
          file: filePath,
          line: lineNum,
          issue: 'Non-null assertion operator (!)',
          suggestion: 'Consider proper null checking instead of !',
          severity: 'minor',
        });
      }
    });
  }

  checkReactBestPractices(filePath, lines, content) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for missing dependency arrays
      if (/useEffect\s*\(/.test(line)) {
        const nextLines = lines.slice(index, Math.min(index + 5, lines.length));
        if (!nextLines.join('').match(/\]\s*[,;]/)) {
          this.findings.critical.push({
            file: filePath,
            line: lineNum,
            issue: 'useEffect missing dependency array',
            suggestion: 'Add dependency array [] to useEffect',
            severity: 'critical',
          });
        }
      }

      // Check for missing key in lists
      if (/\.map\s*\(\s*\(.*,\s*index\s*\)/.test(line) && /key\s*=\s*{?index}?/.test(line)) {
        this.findings.major.push({
          file: filePath,
          line: lineNum,
          issue: 'Using index as React key',
          suggestion: 'Use unique identifier instead of array index',
          severity: 'major',
        });
      }

      // Check for missing error boundaries
      if (/render|ReactDOM\.render/.test(line) && !content.includes('ErrorBoundary')) {
        this.findings.major.push({
          file: filePath,
          line: lineNum,
          issue: 'No Error Boundary detected',
          suggestion: 'Wrap component tree with Error Boundary for crash recovery',
          severity: 'major',
        });
      }

      // Check for console.log in production code
      if (/console\.(log|warn|error)/.test(line) && !filePath.includes('test') && !line.includes('//')) {
        this.findings.minor.push({
          file: filePath,
          line: lineNum,
          issue: 'Console statement in production code',
          suggestion: 'Remove or use proper logging library',
          severity: 'minor',
        });
      }

      // Check for missing use client directive in client components
      if (/useContext|useState|useEffect/.test(line) && !content.startsWith('"use client"')) {
        this.findings.critical.push({
          file: filePath,
          line: 1,
          issue: 'Missing "use client" directive',
          suggestion: 'Add "use client" at top of file for client components',
          severity: 'critical',
        });
      }
    });
  }

  checkSecurityIssues(filePath, lines) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for hardcoded secrets
      if (/(?:password|api[_-]?key|secret|token)\s*[=:]\s*['"]/.test(line) && !filePath.includes('example')) {
        this.findings.critical.push({
          file: filePath,
          line: lineNum,
          issue: 'Possible hardcoded secret/credential',
          suggestion: 'Move to environment variables (.env.local)',
          severity: 'critical',
        });
      }

      // Check for eval
      if (/\beval\s*\(/.test(line)) {
        this.findings.critical.push({
          file: filePath,
          line: lineNum,
          issue: 'Use of eval() function',
          suggestion: 'Avoid eval, use Function constructor or safer alternatives',
          severity: 'critical',
        });
      }

      // Check for innerHTML without sanitization
      if (/innerHTML\s*=|innerHTML\s*\+=/.test(line) && !line.includes('sanitize') && !line.includes('DOMPurify')) {
        this.findings.major.push({
          file: filePath,
          line: lineNum,
          issue: 'Unsafe innerHTML usage (XSS risk)',
          suggestion: 'Use textContent or dangerouslySetInnerHTML with sanitization',
          severity: 'major',
        });
      }

      // Check for localStorage with sensitive data
      if (/localStorage\.setItem.*(?:password|token|secret|key)/i.test(line)) {
        this.findings.major.push({
          file: filePath,
          line: lineNum,
          issue: 'Sensitive data in localStorage',
          suggestion: 'Use httpOnly cookies or sessionStorage instead',
          severity: 'major',
        });
      }
    });
  }

  checkPerformanceIssues(filePath, lines, content) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for missing React.memo
      if (/export\s+(?:default\s+)?(?:function|const)\s+\w+Component/.test(line) && content.includes('props')) {
        if (!content.includes('React.memo') && !content.includes('memo(')) {
          this.findings.minor.push({
            file: filePath,
            line: lineNum,
            issue: 'Component not memoized',
            suggestion: 'Consider using React.memo for components that receive props',
            severity: 'minor',
          });
        }
      }

      // Check for inline object literals in render
      if (/style\s*=\s*\{|\s*onClick\s*=\s*\{[^}]*\{/.test(line)) {
        this.findings.minor.push({
          file: filePath,
          line: lineNum,
          issue: 'Inline object/function in render',
          suggestion: 'Define outside component or use useCallback for optimal performance',
          severity: 'minor',
        });
      }

      // Check for missing lazy loading
      if (/import.*from/.test(line) && content.includes('export default') && content.split('\n').length > 500) {
        this.findings.suggestions.push({
          file: filePath,
          line: lineNum,
          issue: 'Large component file',
          suggestion: 'Consider code splitting or lazy loading with React.lazy()',
          severity: 'suggestion',
        });
      }
    });
  }

  checkCodeQuality(filePath, lines, content) {
    // Check file size
    if (lines.length > 300) {
      this.findings.suggestions.push({
        file: filePath,
        line: 1,
        issue: `Large file (${lines.length} lines)`,
        suggestion: 'Consider breaking into smaller, focused files',
        severity: 'suggestion',
      });
    }

    // Check for deeply nested conditions
    const nestingLevel = Math.max(...content.split('\n').map((line) => (line.match(/^[\s{]*/)[0].match(/{/g) || []).length));
    if (nestingLevel > 5) {
      this.findings.minor.push({
        file: filePath,
        line: 1,
        issue: 'Deep nesting detected',
        suggestion: 'Consider refactoring with early returns or helper functions',
        severity: 'minor',
      });
    }

    // Check for missing error handling
    if (/fetch\s*\(|axios|\.then\s*\(/.test(content) && !content.includes('catch')) {
      this.findings.major.push({
        file: filePath,
        line: 1,
        issue: 'Missing error handling in async code',
        suggestion: 'Add .catch() handler or try-catch block for async operations',
        severity: 'major',
      });
    }

    // Check for TODO/FIXME
    lines.forEach((line, index) => {
      if (/\/\/\s*(TODO|FIXME)/.test(line)) {
        this.findings.minor.push({
          file: filePath,
          line: index + 1,
          issue: line.trim(),
          suggestion: 'Address TODO/FIXME or create GitHub issue',
          severity: 'minor',
        });
      }
    });
  }

  generateJSON() {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues:
          this.findings.critical.length + this.findings.major.length + this.findings.minor.length + this.findings.suggestions.length,
        critical: this.findings.critical.length,
        major: this.findings.major.length,
        minor: this.findings.minor.length,
        suggestions: this.findings.suggestions.length,
      },
      stats: this.stats,
      findings: this.findings,
    };
  }

  generateMarkdown() {
    let markdown = '## 🔍 Senior Developer Code Review\n\n';

    if (this.findings.critical.length === 0 && this.findings.major.length === 0 && this.findings.minor.length === 0 && this.findings.suggestions.length === 0) {
      markdown += '✅ No issues found! Great work!\n\n';
    } else {
      const summary = this.generateJSON().summary;
      markdown += `### Summary\n\n`;
      markdown += `- 🔴 **Critical:** ${summary.critical}\n`;
      markdown += `- 🟠 **Major:** ${summary.major}\n`;
      markdown += `- 🟡 **Minor:** ${summary.minor}\n`;
      markdown += `- 💡 **Suggestions:** ${summary.suggestions}\n\n`;

      if (this.findings.critical.length > 0) {
        markdown += `## 🔴 Critical Issues (${this.findings.critical.length})\n\n`;
        this.findings.critical.forEach((finding) => {
          markdown += `**${finding.issue}** (${finding.file}:${finding.line})\n`;
          markdown += `> ${finding.suggestion}\n\n`;
        });
      }

      if (this.findings.major.length > 0) {
        markdown += `## 🟠 Major Issues (${this.findings.major.length})\n\n`;
        this.findings.major.forEach((finding) => {
          markdown += `**${finding.issue}** (${finding.file}:${finding.line})\n`;
          markdown += `> ${finding.suggestion}\n\n`;
        });
      }

      if (this.findings.minor.length > 0) {
        markdown += `## 🟡 Minor Issues (${this.findings.minor.length})\n\n`;
        this.findings.minor.forEach((finding) => {
          markdown += `**${finding.issue}** (${finding.file}:${finding.line})\n`;
          markdown += `> ${finding.suggestion}\n\n`;
        });
      }

      if (this.findings.suggestions.length > 0) {
        markdown += `## 💡 Suggestions (${this.findings.suggestions.length})\n\n`;
        this.findings.suggestions.forEach((finding) => {
          markdown += `**${finding.issue}** (${finding.file}:${finding.line})\n`;
          markdown += `> ${finding.suggestion}\n\n`;
        });
      }
    }

    markdown += `### Statistics\n\n`;
    markdown += `- Files analyzed: ${this.stats.filesChanged}\n`;
    markdown += `- Lines added: +${this.stats.linesAdded}\n`;
    markdown += `- Lines deleted: -${this.stats.linesDeleted}\n`;

    return markdown;
  }
}

async function performDetailedCodeReview() {
  log('cyan', '\n🔍 Starting Detailed Code Review...\n');

  try {
    // Get current branch
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD', true).trim();
    log('blue', `Current branch: ${currentBranch}`);

    // Check if origin/main exists
    const mainExists = runCommand('git rev-parse --verify origin/main', true).trim();
    if (!mainExists) {
      log('yellow', 'Warning: origin/main not found. Skipping detailed review.');
      return { success: false, review: null };
    }

    // Get list of changed files
    const changedFiles = runCommand('git diff origin/main --name-only', true)
      .split('\n')
      .filter((f) => f && /\.(ts|tsx|js|jsx)$/.test(f));

    if (changedFiles.length === 0) {
      log('green', '✓ No TypeScript/JavaScript changes to review');
      return { success: true, review: null };
    }

    log('blue', `\nAnalyzing ${changedFiles.length} files...\n`);

    const analyzer = new CodeReviewAnalyzer();

    // Analyze each changed file
    changedFiles.forEach((file) => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        analyzer.analyzeFile(file, content);
        analyzer.stats.filesChanged += 1;
      } catch (error) {
        log('yellow', `⚠ Could not analyze ${file}`);
      }
    });

    // Get diff stats
    try {
      const stats = runCommand('git diff origin/main --numstat', true)
        .split('\n')
        .filter((line) => line && /\.tsx?$|\.jsx?$/.test(line));

      stats.forEach((stat) => {
        const [added, deleted] = stat.split('\t').slice(0, 2);
        analyzer.stats.linesAdded += parseInt(added, 10) || 0;
        analyzer.stats.linesDeleted += parseInt(deleted, 10) || 0;
      });
    } catch (e) {
      // Ignore stat errors
    }

    // Log findings
    const reviewData = analyzer.generateJSON();
    const summary = reviewData.summary;
    log('cyan', '\n📊 Review Results:');
    log('red', `  🔴 Critical: ${summary.critical}`);
    log('yellow', `  🟠 Major: ${summary.major}`);
    log('yellow', `  🟡 Minor: ${summary.minor}`);
    log('blue', `  💡 Suggestions: ${summary.suggestions}`);

    const markdown = analyzer.generateMarkdown();

    // Write review data to JSON file for GitHub Actions
    const outputFile = 'code-review-findings.json';
    fs.writeFileSync(outputFile, JSON.stringify(reviewData, null, 2));
    log('blue', `\n📄 Findings written to ${outputFile}`);

    if (process.env.GITHUB_OUTPUT) {
      // Write to GitHub Actions environment
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `review_markdown<<EOF\n${markdown}\nEOF\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `review_json=${JSON.stringify(reviewData)}\n`);
    }

    log('green', '\n✅ Detailed Code Review Complete!\n');

    return {
      success: true,
      review: {
        markdown,
        json: reviewData,
      },
    };
  } catch (error) {
    log('red', `\n❌ Code Review Failed: ${error.message}\n`);
    return { success: false, review: null };
  }
}

performDetailedCodeReview().then((result) => {
  process.exit(result.success ? 0 : 1);
});
