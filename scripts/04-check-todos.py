#!/usr/bin/env python3
"""
TODO format validation script for AI Models Discovery Dashboard
Ensures TODOs follow consistent format and are properly tracked.
"""

import sys
import os
import re
from typing import List, Tuple, Dict
from pathlib import Path


class TodoPattern:
    """Represents a TODO pattern to validate."""

    def __init__(self, name: str, pattern: str, valid: bool, description: str):
        self.name = name
        self.pattern = re.compile(pattern, re.IGNORECASE)
        self.valid = valid
        self.description = description


# TODO patterns
TODO_PATTERNS = [
    # Valid patterns
    TodoPattern(
        "standard-todo",
        r"(//|#)\s*TODO:\s+[A-Z][^,]*\s+\(Task\s+\d+\)",
        True,
        "Standard TODO with task reference"
    ),
    TodoPattern(
        "author-todo",
        r"(//|#)\s*TODO\([\w\s]+\):\s+[A-Z].*",
        True,
        "TODO with author attribution"
    ),
    TodoPattern(
        "date-todo",
        r"(//|#)\s*TODO\s+\d{4}-\d{2}-\d{2}:\s+[A-Z].*",
        True,
        "TODO with date"
    ),

    # Invalid patterns that should be flagged
    TodoPattern(
        "vague-todo",
        r"(//|#)\s*TODO:?\s+(fix|update|change|improve|refactor|cleanup)\s*$",
        False,
        "Vague TODO - be more specific about what needs to be done"
    ),
    TodoPattern(
        "no-context-todo",
        r"(//|#)\s*TODO:?\s*$",
        False,
        "Empty TODO - add description"
    ),
    TodoPattern(
        "informal-todo",
        r"(//|#)\s*(todo|Todo|fix this|fixme|hack|temp)\s+",
        False,
        "Informal TODO - use standard format: TODO: Description"
    ),
    TodoPattern(
        "outdated-todo",
        r"(//|#)\s*TODO.*(\d{4}.*old|over\s+\d+\s+(months?|years?))",
        False,
        "Potentially outdated TODO - review and update"
    ),
]

# Specific patterns for different file types
FILETYPE_PATTERNS = {
    'py': [
        TodoPattern(
            "python-multiline-todo",
            r'"""\s*TODO:.*?"""',
            True,
            "Python docstring TODO"
        ),
    ],
    'md': [
        TodoPattern(
            "markdown-todo",
            r"^\s*-\s*\[\s*\]\s+TODO:",
            True,
            "Markdown checklist TODO"
        ),
        TodoPattern(
            "markdown-incomplete",
            r"^\s*-\s*\[\s*\]\s+[a-z]",
            False,
            "Markdown TODO should start with capital letter"
        ),
    ],
    'txt': [
        TodoPattern(
            "plaintext-todo",
            r"^TODO\s+\d+\.\s+[A-Z].*",
            True,
            "Plain text numbered TODO"
        ),
    ]
}


def get_file_extension(filepath: str) -> str:
    """Get the file extension without the dot."""
    return Path(filepath).suffix.lstrip('.')


def check_file_todos(filepath: str) -> List[Tuple[str, int, str, str]]:
    """
    Check a file for TODO format issues.

    Returns list of (severity, line_number, pattern_name, description) tuples.
    """
    if not os.path.exists(filepath):
        return []

    file_ext = get_file_extension(filepath)
    issues = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except (UnicodeDecodeError, IOError) as e:
        print(f"Warning: Could not read file {filepath}: {e}")
        return []

    # Get patterns for this file type
    patterns_to_check = TODO_PATTERNS[:]
    if file_ext in FILETYPE_PATTERNS:
        patterns_to_check.extend(FILETYPE_PATTERNS[file_ext])

    for line_num, line in enumerate(lines, 1):
        line_stripped = line.strip()

        # Skip empty lines and non-TODO lines
        if not line_stripped or 'todo' not in line_stripped.lower():
            continue

        # Check against all patterns
        found_valid_pattern = False
        for pattern in patterns_to_check:
            if pattern.pattern.search(line):
                if pattern.valid:
                    found_valid_pattern = True
                else:
                    issues.append(("warning", line_num, pattern.name, pattern.description))

        # If line contains TODO but no valid pattern matched, it's invalid
        if 'todo' in line_stripped.lower() and not found_valid_pattern:
            # Check for some common valid patterns that might not be caught
            if re.search(r'TODO:\s+[A-Z].*\w', line, re.IGNORECASE):
                continue  # This is actually valid

            issues.append((
                "warning",
                line_num,
                "invalid-todo-format",
                "TODO doesn't follow standard format - use: TODO: Description (Task #)"
            ))

    return issues


def analyze_todo_stats(filepaths: List[str]) -> Dict[str, int]:
    """Analyze TODO statistics across files."""
    stats = {
        'total_todos': 0,
        'valid_todos': 0,
        'invalid_todos': 0,
        'files_with_todos': 0,
        'most_todos_file': '',
        'most_todos_count': 0
    }

    for filepath in filepaths:
        if not os.path.exists(filepath):
            continue

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, IOError):
            continue

        todo_count = len(re.findall(r'todo', content, re.IGNORECASE))
        if todo_count > 0:
            stats['files_with_todos'] += 1
            stats['total_todos'] += todo_count

            if todo_count > stats['most_todos_count']:
                stats['most_todos_count'] = todo_count
                stats['most_todos_file'] = filepath

        # Check for valid TODOs
        issues = check_file_todos(filepath)
        stats['invalid_todos'] += len(issues)

    stats['valid_todos'] = stats['total_todos'] - stats['invalid_todos']
    return stats


def main():
    """Main function to check TODO formats."""
    if len(sys.argv) < 2:
        print("Usage: python3 04-check-todos.py <file1> [file2] ...")
        sys.exit(1)

    filepaths = [f for f in sys.argv[1:] if os.path.exists(f)]

    if not filepaths:
        print("No valid files provided")
        sys.exit(0)

    total_issues = 0
    files_with_issues = 0

    print("🔍 Checking TODO format compliance...")

    for filepath in filepaths:
        issues = check_file_todos(filepath)

        if issues:
            files_with_issues += 1
            print(f"\n📝 TODO issues in: {filepath}")
            print("-" * (20 + len(filepath)))

            for severity, line_num, pattern_name, description in issues:
                icon = "⚠️" if severity == "warning" else "❌"
                print(f"  {icon} Line {line_num}: {description}")
                total_issues += 1

    # Generate statistics
    stats = analyze_todo_stats(filepaths)

    print(f"\n📊 TODO Analysis Summary:")
    print(f"   Files checked: {len(filepaths)}")
    print(f"   Files with TODOs: {stats['files_with_todos']}")
    print(f"   Total TODOs found: {stats['total_todos']}")
    print(f"   Valid TODOs: {stats['valid_todos']}")
    print(f"   Invalid TODOs: {stats['invalid_todos']}")
    print(f"   Format issues: {total_issues}")

    if stats['most_todos_file']:
        print(f"   File with most TODOs: {stats['most_todos_file']} ({stats['most_todos_count']})")

    # Recommendations
    if total_issues > 0:
        print(f"\n💡 Recommendations:")
        print(f"   • Use format: TODO: Clear description (Task #123)")
        print(f"   • Include task/issue references when possible")
        print(f"   • Be specific about what needs to be done")
        print(f"   • Review and remove outdated TODOs")

    if total_issues > 10:  # Too many formatting issues
        print(f"\n❌ TODO check failed - too many format issues ({total_issues})")
        sys.exit(1)
    elif total_issues > 0:
        print(f"\n⚠️  TODO check passed with warnings ({total_issues} issues)")
    else:
        print(f"\n✅ TODO check passed - all TODOs properly formatted")

    sys.exit(0)


if __name__ == "__main__":
    main()