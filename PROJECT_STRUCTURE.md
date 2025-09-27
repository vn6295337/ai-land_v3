# AI Models Dashboard - Project Structure

## Overview

This document outlines the actual project structure and file organization for the AI Models Dashboard, including current naming conventions and recent architectural decisions.

## Naming Conventions

### Folder Naming
Folders use descriptive names without numbering:

**Current Structure:**
- `docs/`       - Project documentation, specs, requirements
- `config/`     - Build, environment, and quality configurations
- `scripts/`    - Automation, build, deployment scripts
- `security/`   - Security policies, audits, compliance
- `deployment/` - Infrastructure, CI/CD, release configs
- `database/`   - Database schemas and migrations
- `cypress/`    - E2E testing framework
- `src/`        - Application source code
- `public/`     - Static assets

### File Naming

#### Documentation Files (docs/)
Use numbered naming pattern: `[00-99]-[descriptive-name].[extension]`

**Examples:**
- ✅ `01-project-overview.txt`
- ✅ `02-current-state.txt`
- ✅ `03-solution-approach.txt`

#### Other Files
Use descriptive names following standard conventions:
- Configuration files : `vite.config.ts`, `package.json`
- Source code         : `ModelGrid.tsx`, `modelsStore.ts`
- Test files          : `ModelGrid.test.tsx`, `SearchBar.integration.test.tsx`

### File Extension Guidelines

| Folder | Common Extensions | Purpose |
|--------|------------------|----------|
| `docs/` | `.txt`, `.md` | Documentation files |
| `config/` | `.ts`, `.js`, `.json`, `.yml`, `.yaml` | Configuration files |
| `scripts/` | `.py`, `.js`, `.ts`, `.sh`, `.yml` | Automation scripts |
| `security/` | `.txt`, `.md`, `.yml`, `.json` | Security policies |
| `deployment/` | `.json`, `.yml`, `.yaml`, `.sh` | Deployment configs |
| `cypress/` | `.ts`, `.js`, `.json` | E2E test files |
| `src/` | `.tsx`, `.ts`, `.js`, `.css` | Source code files |

## Validation & Configuration

### Pre-commit Validation
Automatically validates:
- Documentation file naming patterns (numbered)
- File extension appropriateness for folder type
- Security and quality checks
- Code formatting and linting

**Emergency bypass:** `git commit --no-verify` (use sparingly)

**Configuration file:** `scripts/02-naming-config.yml`

## Current Project Structure

### Root Directory Layout
/
├── config/                  Build, environment, and quality configurations
│   ├── build/               Vite and Vitest configurations
│   ├── environment/         Environment-specific settings
│   ├── quality/             ESLint, pre-commit configurations
│   └── typescript/          TypeScript configurations
├── cypress/                 E2E testing framework
│   ├── cypress.config.ts    Cypress configuration (moved from root)
│   ├── e2e/                 End-to-end test specs
│   ├── fixtures/            Test data files
│   └── support/             Cypress support files
├── database/                Database schemas and migrations
│   └── supabase/            Supabase-specific configurations
├── deployment/              Deployment configurations
│   ├── vercel.json          Vercel deployment config (moved from root)
│   └── .github/             GitHub Actions workflows
├── docs/                    Project documentation
├── public/                  Static assets
├── scripts/                 Build and utility scripts
├── security/                Security policies and configurations
├── src/                     Application source code
│   ├── components/          React components with __tests__ subdirs
│   ├── hooks/               Custom React hooks
│   ├── lib/                 Utility libraries
│   ├── services/            Business logic and API services
│   ├── stores/              Zustand state management
│   ├── types/               TypeScript type definitions
│   └── test/                Test data and utilities
├── package.json             NPM package configuration (root-required)
└── package-lock.json        NPM lock file (root-required)

## File Organization Decisions

### Recent Changes
- **cypress.config.ts:** Moved from root → `cypress/` (updated package.json scripts)
- **vercel.json:** Moved from root → `deployment/` (auto-detected by Vercel)
- **package.json/package-lock.json:** Kept in root (NPM ecosystem requirement)

### Architecture Notes
- Store-integrated components use integration tests vs unit tests
- Services layer maintains 100% unit test coverage
- E2E tests validate complete user journeys
- Configuration files grouped by purpose rather than type

