#!/bin/bash

# Task 26: Setup git-secrets for credential scanning
# This script helps developers set up git-secrets for local development

echo "🔒 Setting up git-secrets for credential scanning..."

# Check if git-secrets is installed
if ! command -v git-secrets &> /dev/null; then
    echo "❌ git-secrets is not installed"
    echo "📦 Please install git-secrets:"
    echo "   macOS: brew install git-secrets"
    echo "   Ubuntu: sudo apt install git-secrets"
    echo "   Manual: https://github.com/awslabs/git-secrets#installing-git-secrets"
    exit 1
fi

echo "✅ git-secrets is installed"

# Install git-secrets hooks
echo "🔧 Installing git-secrets hooks..."
git secrets --install --force

# Register AWS patterns
echo "🔧 Registering AWS patterns..."
git secrets --register-aws

# Add custom patterns from .gitsecrets file
if [ -f ".gitsecrets" ]; then
    echo "🔧 Adding custom secret patterns..."
    while IFS= read -r pattern; do
        # Skip comments and empty lines
        if [[ ! "$pattern" =~ ^#.*$ ]] && [[ ! -z "$pattern" ]]; then
            if [[ "$pattern" =~ ^!.*$ ]]; then
                # This is an allowed pattern (exclusion)
                allowed_pattern="${pattern#!}"
                git secrets --add --allowed "$allowed_pattern"
                echo "  ✅ Added allowed pattern: $allowed_pattern"
            else
                # This is a forbidden pattern
                git secrets --add "$pattern"
                echo "  ✅ Added forbidden pattern: $pattern"
            fi
        fi
    done < .gitsecrets
else
    echo "⚠️  .gitsecrets file not found, using default patterns only"
fi

# Test the configuration
echo "🧪 Testing git-secrets configuration..."
git secrets --scan

if [ $? -eq 0 ]; then
    echo "✅ git-secrets setup completed successfully!"
    echo "🛡️  Your repository is now protected against committing secrets"
    echo ""
    echo "💡 Usage:"
    echo "   - git secrets --scan                    # Scan entire repository"
    echo "   - git secrets --scan-history           # Scan commit history"
    echo "   - git secrets --add 'pattern'          # Add custom pattern"
    echo "   - git secrets --add --allowed 'pattern' # Add allowed pattern"
else
    echo "⚠️  git-secrets scan found potential issues"
    echo "🔍 Please review the output above and fix any detected secrets"
fi