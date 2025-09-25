#!/usr/bin/env python3
"""
Security pattern validation script for AI Models Discovery Dashboard
Checks for common security anti-patterns and vulnerabilities in code files.
"""

import sys
import os
import re
from typing import List, Dict, Tuple
from pathlib import Path


class SecurityPattern:
    """Represents a security pattern to check for."""

    def __init__(self, name: str, pattern: str, severity: str, description: str, file_types: List[str] = None):
        self.name = name
        self.pattern = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
        self.severity = severity  # 'error', 'warning', 'info'
        self.description = description
        self.file_types = file_types or ['js', 'jsx', 'ts', 'tsx', 'py']


# Security patterns to check for
SECURITY_PATTERNS = [
    # Hardcoded secrets and credentials
    SecurityPattern(
        "hardcoded-password",
        r"(password|pwd|pass)\s*[:=]\s*['\"][^'\"]{3,}['\"]",
        "error",
        "Hardcoded password detected"
    ),
    SecurityPattern(
        "hardcoded-api-key",
        r"(api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*['\"][^'\"]{10,}['\"]",
        "error",
        "Hardcoded API key detected"
    ),
    SecurityPattern(
        "hardcoded-secret",
        r"(secret|SECRET)[_\s]*[:=]\s*['\"][^'\"]{8,}['\"]",
        "error",
        "Hardcoded secret detected"
    ),
    SecurityPattern(
        "jwt-hardcoded",
        r"['\"]eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*['\"]",
        "error",
        "Hardcoded JWT token detected"
    ),
    SecurityPattern(
        "database-connection",
        r"(mongodb|mysql|postgresql|postgres)://[^/\s]+:[^@\s]+@",
        "error",
        "Database connection string with credentials detected"
    ),

    # SQL Injection patterns
    SecurityPattern(
        "sql-injection-risk",
        r"(SELECT|INSERT|UPDATE|DELETE).*(WHERE|SET).*[\+\s]\w+[\+\s]",
        "warning",
        "Potential SQL injection vulnerability - string concatenation in SQL query",
        ['js', 'jsx', 'ts', 'tsx', 'py']
    ),
    SecurityPattern(
        "dynamic-sql",
        r"(query|execute|exec)\s*\(\s*['\"].*\$\{|\+.*['\"]",
        "warning",
        "Dynamic SQL query construction detected",
        ['js', 'jsx', 'ts', 'tsx']
    ),

    # XSS patterns
    SecurityPattern(
        "dangerous-innerhtml",
        r"dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:",
        "warning",
        "Dangerous innerHTML usage - potential XSS vulnerability",
        ['js', 'jsx', 'ts', 'tsx']
    ),
    SecurityPattern(
        "eval-usage",
        r"\beval\s*\(",
        "error",
        "eval() usage detected - major security risk",
        ['js', 'jsx', 'ts', 'tsx']
    ),
    SecurityPattern(
        "function-constructor",
        r"new\s+Function\s*\(",
        "warning",
        "Function constructor usage - potential security risk",
        ['js', 'jsx', 'ts', 'tsx']
    ),

    # Insecure HTTP patterns
    SecurityPattern(
        "http-url",
        r"['\"]http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^'\"]+['\"]",
        "warning",
        "Insecure HTTP URL detected - consider using HTTPS"
    ),
    SecurityPattern(
        "insecure-random",
        r"Math\.random\(\)",
        "info",
        "Math.random() used - not cryptographically secure",
        ['js', 'jsx', 'ts', 'tsx']
    ),

    # File system and path traversal
    SecurityPattern(
        "path-traversal",
        r"\.\.\/",
        "warning",
        "Potential path traversal pattern detected"
    ),
    SecurityPattern(
        "file-inclusion",
        r"(require|import|include|readFile)\s*\(\s*.*\$\{|\+",
        "warning",
        "Dynamic file inclusion detected",
        ['js', 'jsx', 'ts', 'tsx', 'py']
    ),

    # Python-specific patterns
    SecurityPattern(
        "python-exec",
        r"\bexec\s*\(",
        "error",
        "exec() usage detected - major security risk",
        ['py']
    ),
    SecurityPattern(
        "python-input",
        r"\binput\s*\(",
        "warning",
        "input() usage - validate and sanitize user input",
        ['py']
    ),
    SecurityPattern(
        "pickle-load",
        r"pickle\.loads?\s*\(",
        "error",
        "pickle.load() usage - can execute arbitrary code",
        ['py']
    ),

    # Environment and configuration
    SecurityPattern(
        "debug-true",
        r"debug\s*[:=]\s*true",
        "warning",
        "Debug mode enabled - ensure this is not in production",
        ['js', 'jsx', 'ts', 'tsx', 'py']
    ),
    SecurityPattern(
        "console-log-sensitive",
        r"console\.log\s*\([^)]*(?:password|token|key|secret|credential)",
        "warning",
        "Logging potentially sensitive information",
        ['js', 'jsx', 'ts', 'tsx']
    ),

    # Weak cryptography
    SecurityPattern(
        "weak-crypto",
        r"(md5|sha1|des|rc4)\s*\(",
        "warning",
        "Weak cryptographic algorithm detected",
        ['js', 'jsx', 'ts', 'tsx', 'py']
    ),
]

# Allowlist patterns - these will be ignored even if they match security patterns
ALLOWLIST_PATTERNS = [
    r"// SECURITY: REVIEWED",
    r"# SECURITY: REVIEWED",
    r"TODO.*security",
    r"FIXME.*security",
    r"test.*password",
    r"example.*password",
    r"placeholder.*key",
    r"demo.*secret",
    r"validator|validation",  # Validation code patterns
    r"\.includes\(['\"]\.\.\/['\"]",  # Validation checks for path traversal
    r"error.*contains.*\.\.",  # Error messages about path traversal
    r"refine.*\.\.",  # Validation refine functions checking for patterns
    r"pattern.*\.\.",  # Pattern definitions
    r"/lib/validators/",  # Validator files
    r"\.test\.|\.spec\.",  # Test files
    r"describe\(|it\(|expect\(",  # Test code
]


def get_file_extension(filepath: str) -> str:
    """Get the file extension without the dot."""
    return Path(filepath).suffix.lstrip('.')


def is_allowlisted_line(line: str, filepath: str = "") -> bool:
    """Check if a line should be ignored due to allowlist patterns."""
    line_clean = line.strip().lower()
    filepath_clean = filepath.lower()

    for pattern_str in ALLOWLIST_PATTERNS:
        if re.search(pattern_str, line_clean, re.IGNORECASE):
            return True
        if re.search(pattern_str, filepath_clean, re.IGNORECASE):
            return True

    return False


def check_file_security(filepath: str) -> List[Tuple[str, int, str, str]]:
    """
    Check a file for security issues.

    Returns list of (severity, line_number, pattern_name, description) tuples.
    """
    if not os.path.exists(filepath):
        return []

    file_ext = get_file_extension(filepath)
    issues = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except (UnicodeDecodeError, IOError) as e:
        print(f"Warning: Could not read file {filepath}: {e}")
        return []

    for pattern in SECURITY_PATTERNS:
        # Skip if file type doesn't match
        if file_ext not in pattern.file_types:
            continue

        # Find all matches
        for match in pattern.pattern.finditer(content):
            # Find line number
            line_num = content[:match.start()].count('\n') + 1
            line_content = lines[line_num - 1] if line_num <= len(lines) else ""

            # Skip if line is allowlisted
            if is_allowlisted_line(line_content, filepath):
                continue

            issues.append((pattern.severity, line_num, pattern.name, pattern.description))

    return issues


def main():
    """Main function to check files for security issues."""
    if len(sys.argv) < 2:
        print("Usage: python3 03-security-check.py <file1> [file2] ...")
        sys.exit(1)

    total_errors = 0
    total_warnings = 0
    total_info = 0

    for filepath in sys.argv[1:]:
        if not os.path.exists(filepath):
            continue

        issues = check_file_security(filepath)

        if issues:
            print(f"\n🔍 Security check: {filepath}")
            print("-" * (20 + len(filepath)))

        for severity, line_num, pattern_name, description in issues:
            icon = "❌" if severity == "error" else "⚠️" if severity == "warning" else "ℹ️"
            print(f"  {icon} Line {line_num}: {description} [{pattern_name}]")

            if severity == "error":
                total_errors += 1
            elif severity == "warning":
                total_warnings += 1
            else:
                total_info += 1

    # Summary
    if total_errors > 0 or total_warnings > 0 or total_info > 0:
        print(f"\n📊 Security check summary:")
        print(f"   Errors: {total_errors}")
        print(f"   Warnings: {total_warnings}")
        print(f"   Info: {total_info}")

        if total_errors > 0:
            print("\n❌ Security check failed - critical issues found")
            sys.exit(1)
        elif total_warnings > 5:  # Allow some warnings but not too many
            print("\n⚠️  Security check failed - too many warnings")
            sys.exit(1)
        else:
            print("\n✅ Security check passed with warnings")
    else:
        print("✅ Security check passed - no issues found")

    sys.exit(0)


if __name__ == "__main__":
    main()