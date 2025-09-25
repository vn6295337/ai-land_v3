#!/usr/bin/env python3
"""
File and folder naming convention validator for pre-commit hooks.
Enforces 2-digit serial number naming system.
"""

import os
import re
import sys
import yaml
from pathlib import Path

def load_config():
    """Load naming configuration from YAML file."""
    config_path = Path("50-scripts/02-naming-config.yml")
    if config_path.exists():
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    # Default configuration if file doesn't exist
    return {
        'folder_patterns': {
            'required_prefix': r'^\d{2}-[a-z][a-z0-9-]*$',
            'allowed_folders': [
                '10-documentation', '20-architecture', '30-configuration',
                '40-integrations', '50-scripts', '60-security',
                '70-testing', '80-deployment', '90-utilities'
            ]
        },
        'file_patterns': {
            'required_prefix': r'^\d{2}-[a-z][a-z0-9-]*\.',
            'allowed_extensions': ['.txt', '.ts', '.js', '.py', '.md', '.json', '.yml', '.yaml']
        },
        'exclusions': [
            '.git', '.claude', 'node_modules', '.venv', '__pycache__',
            '.pytest_cache', '.mypy_cache', 'dist', 'build'
        ],
        'enforcement_level': 'error'  # 'error', 'warn', 'off'
    }

def is_excluded(path, exclusions):
    """Check if path should be excluded from validation."""
    path_str = str(path)
    for exclusion in exclusions:
        if exclusion in path_str:
            return True
    return False

def is_legacy_exempted(path, legacy_exemptions):
    """Check if file is exempt from naming rules."""
    file_name = Path(path).name
    return file_name in legacy_exemptions

def is_legacy_folder_exempted(folder_name, legacy_folder_exemptions):
    """Check if folder is exempt from naming rules."""
    return folder_name in legacy_folder_exemptions

def validate_folder_name(folder_name, config):
    """Validate folder naming convention."""
    pattern = config['folder_patterns']['required_prefix']
    return re.match(pattern, folder_name) is not None

def validate_file_name(file_name, config):
    """Validate file naming convention."""
    pattern = config['file_patterns']['required_prefix']
    allowed_extensions = config['file_patterns']['allowed_extensions']

    # Check if file has correct prefix pattern
    if not re.match(pattern, file_name):
        return False

    # Check if file has allowed extension
    file_ext = Path(file_name).suffix
    return file_ext in allowed_extensions

def scan_directory(root_path, config):
    """Scan directory for naming convention violations."""
    violations = []

    for root, dirs, files in os.walk(root_path):
        root_path_obj = Path(root)

        # Skip excluded directories
        if is_excluded(root_path_obj, config['exclusions']):
            continue

        # Validate folder names (skip root directory)
        if root != '.':
            for dir_name in dirs:
                if is_excluded(Path(root) / dir_name, config['exclusions']):
                    continue

                # Skip legacy exempted folders
                legacy_folder_exemptions = config.get('legacy_folder_exemptions', [])
                if is_legacy_folder_exempted(dir_name, legacy_folder_exemptions):
                    continue

                if not validate_folder_name(dir_name, config):
                    violations.append({
                        'type': 'folder',
                        'path': str(Path(root) / dir_name),
                        'issue': f"Folder '{dir_name}' doesn't match pattern: {config['folder_patterns']['required_prefix']}"
                    })

        # Validate file names
        for file_name in files:
            file_path = Path(root) / file_name

            if is_excluded(file_path, config['exclusions']):
                continue

            # Skip hidden files and legacy exempted files
            legacy_exemptions = config.get('legacy_exemptions', [])
            if file_name.startswith('.') or is_legacy_exempted(file_path, legacy_exemptions):
                continue

            if not validate_file_name(file_name, config):
                violations.append({
                    'type': 'file',
                    'path': str(file_path),
                    'issue': f"File '{file_name}' doesn't match naming convention"
                })

    return violations

def main():
    """Main validation function."""
    config = load_config()

    if config['enforcement_level'] == 'off':
        print("Naming convention validation is disabled")
        return 0

    violations = scan_directory('.', config)

    if violations:
        print("🚫 Naming Convention Violations Found:")
        print("=" * 50)

        for violation in violations:
            print(f"❌ {violation['type'].upper()}: {violation['path']}")
            print(f"   Issue: {violation['issue']}")
            print()

        print("📋 Expected Naming Conventions:")
        print(f"   📁 Folders: {config['folder_patterns']['required_prefix']}")
        print(f"   📄 Files: {config['file_patterns']['required_prefix']}")
        print(f"   📎 Extensions: {', '.join(config['file_patterns']['allowed_extensions'])}")
        print()
        print("💡 Examples:")
        print("   ✅ 10-documentation/01-project-overview.txt")
        print("   ✅ 50-scripts/02-validation-script.py")
        print("   ❌ documentation/project_overview.txt")
        print("   ❌ scripts/validation.py")

        if config['enforcement_level'] == 'error':
            return 1
        else:
            print("\n⚠️  Warnings only - commit will proceed")
            return 0

    print("✅ All files and folders follow naming conventions")
    return 0

if __name__ == "__main__":
    sys.exit(main())
