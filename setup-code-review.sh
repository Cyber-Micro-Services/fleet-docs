#!/bin/bash

# Automatic Code Review Workflow - Quick Setup
# Run this script to complete the initial setup

echo "🚀 Setting up Automatic Code Review Workflow..."
echo ""

# Check if npm/node installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Setup Husky
echo "🪝 Setting up Husky git hooks..."
npx husky install
if [ $? -ne 0 ]; then
    echo "❌ Failed to setup Husky"
    exit 1
fi
echo "✓ Husky hooks installed"
echo ""

# Verify files
echo "🔍 Verifying setup files..."
files=(
    ".eslintrc.json"
    ".prettierrc.json"
    ".husky/pre-commit"
    ".husky/commit-msg"
    ".github/workflows/code-review.yml"
    "scripts/code-review.js"
    "CODE_REVIEW_GUIDE.md"
)

all_good=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "❌ $file - MISSING"
        all_good=false
    fi
done

echo ""
if [ "$all_good" = true ]; then
    echo "✅ Setup completed successfully!"
    echo ""
    echo "📚 Next steps:"
    echo "1. Read the CODE_REVIEW_GUIDE.md for detailed documentation"
    echo "2. Try a test commit: git commit --allow-empty -m \"test: initial commit\""
    echo "3. Run manual review: npm run review"
    echo ""
    echo "🎯 Your workflow is ready!"
else
    echo "⚠️  Some files are missing. Please check the setup."
    exit 1
fi
