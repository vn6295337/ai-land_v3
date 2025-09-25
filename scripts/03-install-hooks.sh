#!/bin/bash
# Installation script for pre-commit hooks
# Handles systems without pre-commit package installed

set -e

echo "🔧 Setting up file naming enforcement hooks..."

# Check if pre-commit is available
if command -v pre-commit &> /dev/null; then
    echo "✅ pre-commit found, installing hooks..."
    pre-commit install
    echo "✅ Pre-commit hooks installed successfully"
else
    echo "⚠️  pre-commit not found, setting up manual git hooks..."

    # Create manual pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Manual pre-commit hook for naming convention validation

echo "🔍 Validating naming conventions..."

# Run naming validation
python3 50-scripts/01-validate-naming.py
naming_result=$?

# Run extension validation
python3 50-scripts/02-validate-extensions.py
extension_result=$?

# Exit with error if any validation failed
if [ $naming_result -ne 0 ] || [ $extension_result -ne 0 ]; then
    echo ""
    echo "❌ Commit blocked due to naming convention violations"
    echo "💡 Fix the issues above or use 'git commit --no-verify' to bypass"
    exit 1
fi

echo "✅ All naming conventions validated successfully"
EOF

    # Make the hook executable
    chmod +x .git/hooks/pre-commit
    echo "✅ Manual git hook installed successfully"
fi

echo ""
echo "🎉 File naming enforcement is now active!"
echo ""
echo "📋 Usage:"
echo "   • Normal commits will be validated automatically"
echo "   • Use 'git commit --no-verify' to bypass validation in emergencies"
echo "   • Edit '50-scripts/02-naming-config.yml' to modify rules"
echo ""
echo "🧪 Test the setup:"
echo "   python3 50-scripts/01-validate-naming.py"
