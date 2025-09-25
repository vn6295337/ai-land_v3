# Security Policy

## Security Scanning Requirements

This repository has mandatory security checks that must pass before code can be merged:

### Required Checks

1. **Environment Validation** - Build must fail if required environment variables are missing
2. **Dependency Scanning** - npm audit must pass with no high/critical vulnerabilities
3. **Secret Scanning** - No hardcoded credentials or secrets allowed
4. **CodeQL Analysis** - Static security analysis must complete without critical findings

### Security Workflows

- `security-scan.yml` - Comprehensive security analysis on push/PR
- `secret-scan.yml` - Dedicated secret detection workflow

### Local Development

Before committing, run:
```bash
npm run security:scan  # Run all security checks
./v2/50-scripts/03-setup-git-secrets.sh  # Set up local secret scanning
```

### Security Scan Failure Conditions

Code will be blocked from merging if:
- npm audit reports high or critical vulnerabilities
- Hardcoded secrets/credentials are detected
- Environment validation fails
- Build process fails security checks

### Bypassing Security Checks

Security checks should **never** be bypassed. If a check needs to be updated:
1. Fix the underlying security issue
2. Update security patterns if needed
3. Get security team approval for any exceptions

### Reporting Security Issues

Please report security vulnerabilities by:
1. Creating a private security advisory on GitHub
2. Email: [security contact if available]
3. Include detailed reproduction steps and impact assessment

### Security Contact

For security-related questions or issues, contact the development team through GitHub issues (for non-sensitive matters) or private channels (for security vulnerabilities).

## Vulnerability Disclosure

We take security seriously. If you discover a security vulnerability, please:
1. Do not create a public GitHub issue
2. Report through GitHub's private vulnerability reporting
3. Provide detailed information to help us reproduce and fix the issue
4. Allow reasonable time for us to address the issue before public disclosure