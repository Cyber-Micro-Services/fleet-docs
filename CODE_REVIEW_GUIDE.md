# Automatic Code Review Workflow

This document explains the automatic code review workflow set up for this Next.js/React project.

## Overview

The code review workflow consists of three layers:

1. **Pre-commit hooks** - Local checks before commits
2. **GitHub Actions CI** - Remote checks on pull requests
3. **Code review scripts** - Custom automated analysis

## Setup

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Setup Husky hooks
npx husky install
```

### 2. Verify Installation

Check that the following files exist:
- `.husky/pre-commit` - Pre-commit hook
- `.husky/commit-msg` - Commit message validation
- `.github/workflows/code-review.yml` - GitHub Actions workflow
- `.eslintrc.json` - ESLint configuration
- `.prettierrc.json` - Prettier formatting config
- `scripts/code-review.js` - Custom review script

## Features

### Pre-Commit Checks (Local)

When you commit code, the following checks run automatically:

```bash
git commit -m "feat: add new feature"
```

**Checks performed:**
- ✓ TypeScript/JavaScript file formatting (Prettier)
- ✓ ESLint linting rules
- ✓ Type safety validation
- ✓ Commit message format validation

**Commit Message Format:**
```
<type>(<scope>): <subject>

Valid types: feat, fix, docs, style, refactor, perf, test, chore, ci, revert
Example: feat(auth): add login page
```

### Code Review Script (Manual)

Run a detailed code review comparing your changes against `origin/main`:

```bash
npm run review
```

**This performs:**
- 📋 TypeScript type checking
- 🔎 ESLint validation on all changed files
- 📝 Diff summary with additions/deletions
- 🔒 Security checks:
  - Hardcoded credentials
  - Debug statements (console.log, debugger)
  - TODO/FIXME comments
  - Unused variables

### GitHub Actions Workflow (Remote CI)

When you push commits or create a pull request to `main` or `develop`, the workflow automatically:

1. Checks out your code
2. Installs dependencies
3. Runs TypeScript type checking
4. Runs ESLint validation
5. Runs the custom code review
6. Checks code formatting
7. Posts a summary comment on the PR

## Available Commands

```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Code formatting
npm run format

# Manual code review (compares against origin/main)
npm run review

# Build project
npm run build

# Start development server
npm dev
```

## Workflow Examples

### Example 1: Normal Development Work

```bash
# Make changes to your code
# ... edit files ...

# Stage your changes
git add .

# Commit - this will automatically run pre-commit checks
git commit -m "feat(dashboard): add vehicle list component"

# If there are ESLint errors, fix them
# If formatting is needed, Prettier will fix it automatically
# Re-stage and commit again

# Push to your branch
git push origin your-branch-name

# Create a pull request - GitHub Actions will run the full review
```

### Example 2: Bypass Pre-Commit Checks (Not Recommended)

If you need to skip pre-commit checks (only in urgent cases):

```bash
git commit --no-verify
```

### Example 3: Manual Review Before Pushing

```bash
# Make your changes
git add .

# Run manual review before committing
npm run review

# If issues are found, fix them
# Then commit
git commit -m "fix: resolve linting issues"
```

## Configuration Files

### `.eslintrc.json`
ESLint rules for code quality:
- React hooks best practices
- No console.log in production
- Strict equality checks
- No unused variables

### `.prettierrc.json`
Code formatting standards:
- Semicolons enabled
- Single quotes
- 100 character line width
- 2 space indentation

### `.github/workflows/code-review.yml`
GitHub Actions workflows that run on:
- Pull requests to main/develop
- Direct pushes to main/develop
- Posts review results as PR comment

### `scripts/code-review.js`
Custom node script that:
- Compares changes against `origin/main`
- Runs type checking
- Runs linting on changed files
- Detects security issues
- Shows diff statistics

## Troubleshooting

### Husky hooks not running

```bash
# Re-install Husky
npx husky install
```

### ESLint errors before committing

```bash
# Auto-fix ESLint issues
npx eslint . --fix
```

### Formatting issues

```bash
# Format all files
npm run format
```

### Pre-commit hook not executable

```bash
# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### GitHub Actions workflow not triggering

- Ensure workflow file is in `.github/workflows/code-review.yml`
- Check that you're pushing to `main` or `develop` branch
- Verify GitHub Actions is enabled in repository settings

## Best Practices

1. **Commit often** - Smaller, focused commits are easier to review
2. **Follow commit message format** - Use conventional commits for clarity
3. **Run review locally** - Use `npm run review` before pushing
4. **Fix issues immediately** - Don't ignore linting warnings
5. **Review PR comments** - Read and address GitHub Actions PR comments
6. **Keep dependencies updated** - Update ESLint and dependencies regularly

## Next Steps

1. Install dependencies: `npm install`
2. Setup Husky: `npx husky install`
3. Make a test commit to verify everything works
4. Push to create a PR and see the GitHub Actions workflow in action

## Additional Resources

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
