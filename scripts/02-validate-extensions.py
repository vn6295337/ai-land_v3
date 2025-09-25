#!/usr/bin/env python3
"""
File extension validator for specific folder types.
Ensures appropriate file types are placed in correct folders.
"""

import os
import sys
import yaml
from pathlib import Path

def load_config():
    """Load extension validation configuration."""
    config_path = Path("50-scripts/02-naming-config.yml")
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            return config.get('folder_type_rules', {})

    # Default folder type rules
    return {
        '10-documentation': ['.txt', '.md'],
        '20-architecture': ['.txt', '.md', '.json', '.yml', '.yaml'],
        '30-configuration': ['.ts', '.js', '.json', '.yml', '.yaml', '.env'],
        '40-integrations': ['.ts', '.js', '.json', '.yml', '.yaml'],
        '50-scripts': ['.py', '.js', '.ts', '.sh', '.yml', '.yaml'],
        '60-security': ['.txt', '.md', '.yml', '.yaml', '.json'],
        '70-testing': ['.py', '.js', '.ts', '.json', '.yml', '.yaml'],
        '80-deployment': ['.yml', '.yaml', '.json', '.sh', '.dockerfile'],
        '90-utilities': ['.py', '.js', '.ts', '.sh', '.json', '.yml', '.yaml']
    }

def validate_folder_extensions(root_path, folder_rules):
    """Validate file extensions within specific folder types."""
    violations = []

    for folder_name, allowed_extensions in folder_rules.items():
        folder_path = Path(root_path) / folder_name

        if not folder_path.exists():
            continue

        for file_path in folder_path.rglob('*'):
            if file_path.is_file():
                file_extension = file_path.suffix

                # Skip hidden files and special files
                if file_path.name.startswith('.'):
                    continue

                if file_extension not in allowed_extensions:
                    violations.append({
                        'folder': folder_name,
                        'file': str(file_path),
                        'extension': file_extension,
                        'allowed': allowed_extensions
                    })

    return violations

def main():
    """Main extension validation function."""
    folder_rules = load_config()

    violations = validate_folder_extensions('.', folder_rules)

    if violations:
        print("🚫 File Extension Violations Found:")
        print("=" * 50)

        for violation in violations:
            print(f"❌ FILE: {violation['file']}")
            print(f"   Folder: {violation['folder']}")
            print(f"   Extension: {violation['extension']}")
            print(f"   Allowed: {', '.join(violation['allowed'])}")
            print()

        print("📋 Folder Type Rules:")
        for folder, extensions in folder_rules.items():
            print(f"   📁 {folder}: {', '.join(extensions)}")

        return 1

    print("✅ All file extensions are appropriate for their folders")
    return 0

if __name__ == "__main__":
    sys.exit(main())
