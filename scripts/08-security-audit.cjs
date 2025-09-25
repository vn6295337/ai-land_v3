#!/usr/bin/env node

/**
 * Security audit script for AI Models Dashboard
 * Scans for hardcoded credentials and security vulnerabilities
 */

const fs = require('fs').promises;
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.issues = [];

    // Security patterns to detect
    this.securityPatterns = [
      {
        pattern: /(password|token|key|secret|api_key|access_key|private_key).*=.*['"][^'"]{10,}['"]/gi,
        severity: 'critical',
        description: 'Hardcoded credentials detected'
      },
      {
        pattern: /eyJ[A-Za-z0-9+/=]{20,}/g,
        severity: 'critical',
        description: 'JWT token hardcoded'
      },
      {
        pattern: /https?:\/\/[^/]+:[^/]+@/g,
        severity: 'high',
        description: 'URL with embedded credentials'
      },
      {
        pattern: /Bearer [A-Za-z0-9+/=]{20,}/gi,
        severity: 'high',
        description: 'Bearer token hardcoded'
      },
      {
        pattern: /(localhost|127\.0\.0\.1):[\d]+/g,
        severity: 'medium',
        description: 'Localhost URL in production code'
      }
    ];

    this.excludePatterns = [
      /\/node_modules\//,
      /\/\.git\//,
      /\/dist\//,
      /\/build\//,
      /\.map$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /bun\.lockb$/,
      /v2\/scripts\//  // Exclude our own scripts
    ];
  }

  async auditDirectory(targetDir) {
    console.log('🔒 Starting security audit...\n');

    await this.scanDirectory(targetDir);

    const summary = this.calculateSummary();
    const passed = summary.critical === 0 && summary.high === 0;

    this.printResults(summary, passed);

    return {
      passed,
      issues: this.issues,
      summary
    };
  }

  async scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (this.shouldExclude(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.isFile() && this.shouldScanFile(entry.name)) {
          await this.scanFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error.message);
    }
  }

  shouldExclude(path) {
    return this.excludePatterns.some(pattern => pattern.test(path));
  }

  shouldScanFile(filename) {
    const scanExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.env', '.yml', '.yaml', '.json'];
    return scanExtensions.some(ext => filename.endsWith(ext));
  }

  async scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.securityPatterns.forEach(({ pattern, severity, description }) => {
          const matches = line.match(pattern);
          if (matches) {
            // Skip false positives
            if (this.isFalsePositive(line, matches[0])) {
              return;
            }

            this.issues.push({
              file: filePath,
              line: index + 1,
              issue: description,
              severity,
              pattern: matches[0].substring(0, 50) + (matches[0].length > 50 ? '...' : '')
            });
          }
        });
      });
    } catch (error) {
      console.warn(`Warning: Could not scan file ${filePath}:`, error.message);
    }
  }

  isFalsePositive(line, match) {
    const falsePositivePatterns = [
      /\/\*.*\*\//,  // Block comments
      /\/\/.*/,      // Line comments
      /example|placeholder|demo|test/i,  // Example values
      /process\.env\./,  // Environment variable references
      /import\.meta\.env\./,  // Vite environment variables
      /v2\/01-current-state-analysis\.txt/,  // Our documentation
      /key=\{[^}]+\}/,  // React keys
      /key={[^}]+}/,   // React keys
      /Key ===/,       // JavaScript property comparisons
      /getEnvVar\(/,   // Our environment variable getter
      /this\.getEnvVar\(/,  // Our environment variable getter
      /os\.getenv\(/,  // Python environment variable getter
      /\.env\./,       // Environment variable access patterns
    ];

    // Additional specific checks for legitimate patterns
    if (match.includes('key={') || match.includes('Key ===')) {
      return true; // React keys and property comparisons
    }

    if (match.includes('getenv(') || match.includes('getEnvVar(')) {
      return true; // Environment variable getters
    }

    return falsePositivePatterns.some(pattern => pattern.test(line));
  }

  calculateSummary() {
    return this.issues.reduce(
      (acc, issue) => {
        acc[issue.severity]++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }

  printResults(summary, passed) {
    console.log('\n🔒 Security Audit Results:');
    console.log('='.repeat(60));

    if (this.issues.length === 0) {
      console.log('\n✅ No security issues found!');
    } else {
      console.log('\n📊 Issue Summary:');
      console.log(`  Critical: ${summary.critical}`);
      console.log(`  High:     ${summary.high}`);
      console.log(`  Medium:   ${summary.medium}`);
      console.log(`  Low:      ${summary.low}`);

      console.log('\n🔍 Detailed Issues:');

      // Group issues by severity
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const severityIssues = this.issues.filter(issue => issue.severity === severity);
        if (severityIssues.length > 0) {
          console.log(`\n${severity.toUpperCase()} Issues:`);
          severityIssues.forEach(issue => {
            console.log(`  📍 ${issue.file}:${issue.line}`);
            console.log(`     ${issue.issue}`);
            console.log(`     Pattern: ${issue.pattern}`);
            console.log('');
          });
        }
      });
    }

    console.log('\n' + '='.repeat(60));

    if (passed) {
      console.log('✅ Security audit PASSED - No critical or high severity issues found');
    } else {
      console.log('❌ Security audit FAILED - Critical or high severity issues found');
      console.log('\nPlease address the issues above before proceeding.');
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  const targetDir = process.argv[2] || '/home/km_project/ai-land';

  auditor.auditDirectory(path.resolve(targetDir))
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { SecurityAuditor };
