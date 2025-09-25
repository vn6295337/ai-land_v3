import { EnvironmentValidator } from './01-environment';
import { validateEnvironmentWithZod, safeValidateEnvironment, validateSecurityPatterns, type ValidatedEnvironment } from './07-zod-validation';
import { validateServiceUrl } from '../../src/lib/validators/url';

export interface EnhancedValidationResult {
  isValid: boolean;
  data?: ValidatedEnvironment;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
  timestamp: Date;
  validationDuration: number;
}

export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  lastValidationTime: Date;
  securityIssuesDetected: number;
}

export class EnhancedEnvironmentValidator {
  private static instance: EnhancedEnvironmentValidator | null = null;
  private baseValidator: EnvironmentValidator;
  private metrics: ValidationMetrics;

  private constructor() {
    this.baseValidator = EnvironmentValidator.getInstance();
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      lastValidationTime: new Date(),
      securityIssuesDetected: 0
    };
  }

  public static getInstance(): EnhancedEnvironmentValidator {
    if (!EnhancedEnvironmentValidator.instance) {
      EnhancedEnvironmentValidator.instance = new EnhancedEnvironmentValidator();
    }
    return EnhancedEnvironmentValidator.instance;
  }

  public async validateComprehensive(): Promise<EnhancedValidationResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Get environment variables from both import.meta.env and process.env
      const env = this.gatherEnvironmentVariables();

      // Run Zod validation
      const zodResult = safeValidateEnvironment(env);

      // Run security pattern validation
      const securityResult = validateSecurityPatterns(env);

      // Additional service-specific validations
      const serviceValidationWarnings = await this.validateServiceUrls(env);

      // Validate numeric ranges and types
      const typeValidationWarnings = this.validateTypes(env);

      // Combine results
      const result: EnhancedValidationResult = {
        isValid: zodResult.success && securityResult.isSecure,
        data: zodResult.data,
        errors: zodResult.errors || [],
        warnings: [
          ...serviceValidationWarnings,
          ...typeValidationWarnings,
          ...securityResult.warnings
        ],
        securityIssues: securityResult.warnings,
        timestamp,
        validationDuration: Date.now() - startTime
      };

      // Update metrics
      this.updateMetrics(result);

      return result;
    } catch (error) {
      const result: EnhancedValidationResult = {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
        securityIssues: [],
        timestamp,
        validationDuration: Date.now() - startTime
      };

      this.updateMetrics(result);
      return result;
    }
  }

  private gatherEnvironmentVariables(): Record<string, string | undefined> {
    const env: Record<string, string | undefined> = {};

    // Get from import.meta.env (Vite)
    if (typeof import !== 'undefined' && import.meta?.env) {
      Object.assign(env, import.meta.env);
    }

    // Get from process.env (Node.js)
    if (typeof process !== 'undefined' && process.env) {
      Object.assign(env, process.env);
    }

    // Convert undefined to empty string for consistent validation
    Object.keys(env).forEach(key => {
      if (env[key] === undefined) {
        env[key] = '';
      }
    });

    return env;
  }

  private async validateServiceUrls(env: Record<string, string | undefined>): Promise<string[]> {
    const warnings: string[] = [];

    // Validate Supabase URL
    if (env.SUPABASE_URL) {
      const supabaseValidation = validateServiceUrl(env.SUPABASE_URL, 'supabase');
      if (!supabaseValidation.isValid) {
        warnings.push(`SUPABASE_URL validation: ${supabaseValidation.error}`);
      }
    }

    // Validate Sentry DSN
    if (env.SENTRY_DSN) {
      const sentryValidation = validateServiceUrl(env.SENTRY_DSN, 'sentry');
      if (!sentryValidation.isValid) {
        warnings.push(`SENTRY_DSN validation: ${sentryValidation.error}`);
      }
    }

    // Validate PostgreSQL URL
    if (env.SUPABASE_DB_URL) {
      const postgresValidation = validateServiceUrl(env.SUPABASE_DB_URL, 'postgres');
      if (!postgresValidation.isValid) {
        warnings.push(`SUPABASE_DB_URL validation: ${postgresValidation.error}`);
      }
    }

    // Validate generic URLs
    const urlFields = ['APP_URL', 'API_BASE_URL'];
    urlFields.forEach(field => {
      if (env[field]) {
        const urlValidation = validateServiceUrl(env[field]!, 'generic');
        if (!urlValidation.isValid) {
          warnings.push(`${field} validation: ${urlValidation.error}`);
        }
      }
    });

    return warnings;
  }

  private validateTypes(env: Record<string, string | undefined>): string[] {
    const warnings: string[] = [];

    // Validate numeric fields
    const numericFields = ['MAX_BUNDLE_SIZE', 'RATE_LIMIT_REQUESTS', 'RATE_LIMIT_WINDOW', 'CACHE_MAX_AGE', 'PORT'];
    numericFields.forEach(field => {
      const value = env[field];
      if (value && value !== '') {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          warnings.push(`${field} must be a valid number, got: ${value}`);
        } else {
          // Field-specific range validation
          switch (field) {
            case 'MAX_BUNDLE_SIZE':
              if (num < 500000 || num > 10000000) {
                warnings.push(`${field} should be between 500KB and 10MB, got: ${num}`);
              }
              break;
            case 'RATE_LIMIT_REQUESTS':
              if (num < 1 || num > 1000) {
                warnings.push(`${field} should be between 1 and 1000, got: ${num}`);
              }
              break;
            case 'RATE_LIMIT_WINDOW':
              if (num < 60 || num > 86400) {
                warnings.push(`${field} should be between 60 and 86400 seconds, got: ${num}`);
              }
              break;
            case 'CACHE_MAX_AGE':
              if (num < 0 || num > 604800) {
                warnings.push(`${field} should be between 0 and 604800 seconds, got: ${num}`);
              }
              break;
            case 'PORT':
              if (num < 1 || num > 65535) {
                warnings.push(`${field} should be between 1 and 65535, got: ${num}`);
              }
              break;
          }
        }
      }
    });

    // Validate boolean fields
    const booleanFields = [
      'ENABLE_ANALYTICS', 'ENABLE_DEBUG_MODE', 'ENABLE_TELEMETRY', 'ENABLE_ERROR_REPORTING',
      'ENABLE_HOT_RELOAD', 'ENABLE_SOURCE_MAPS', 'ENABLE_CSP', 'ENABLE_HSTS'
    ];

    booleanFields.forEach(field => {
      const value = env[field];
      if (value && value !== '') {
        const lower = value.toLowerCase();
        const validValues = ['true', 'false', '1', '0', 'yes', 'no'];
        if (!validValues.includes(lower)) {
          warnings.push(`${field} must be one of: ${validValues.join(', ')}, got: ${value}`);
        }
      }
    });

    // Validate enum fields
    if (env.NODE_ENV && env.NODE_ENV !== '') {
      const validEnvs = ['development', 'production', 'test'];
      if (!validEnvs.includes(env.NODE_ENV)) {
        warnings.push(`NODE_ENV must be one of: ${validEnvs.join(', ')}, got: ${env.NODE_ENV}`);
      }
    }

    // Validate array fields (CORS_ORIGINS)
    if (env.CORS_ORIGINS && env.CORS_ORIGINS !== '') {
      const origins = env.CORS_ORIGINS.split(',').map(origin => origin.trim());
      origins.forEach(origin => {
        if (origin !== '*') {
          try {
            new URL(origin);
          } catch {
            // Check domain pattern
            if (!/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(origin)) {
              warnings.push(`Invalid CORS origin: ${origin}`);
            }
          }
        }
      });
    }

    return warnings;
  }

  private updateMetrics(result: EnhancedValidationResult): void {
    this.metrics.totalValidations++;
    this.metrics.lastValidationTime = result.timestamp;

    if (result.isValid) {
      this.metrics.successfulValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    if (result.securityIssues.length > 0) {
      this.metrics.securityIssuesDetected += result.securityIssues.length;
    }

    // Update average validation time
    const totalTime = (this.metrics.averageValidationTime * (this.metrics.totalValidations - 1)) + result.validationDuration;
    this.metrics.averageValidationTime = totalTime / this.metrics.totalValidations;
  }

  public getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      duration: number;
    }>;
    overall: {
      duration: number;
      timestamp: Date;
    };
  }> {
    const startTime = Date.now();
    const checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      duration: number;
    }> = [];

    // Check 1: Basic environment validation
    const basicCheckStart = Date.now();
    try {
      this.baseValidator.validateAndLoadConfig();
      checks.push({
        name: 'Basic Environment Validation',
        status: 'pass',
        message: 'All required environment variables are present and valid',
        duration: Date.now() - basicCheckStart
      });
    } catch (error) {
      checks.push({
        name: 'Basic Environment Validation',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Basic validation failed',
        duration: Date.now() - basicCheckStart
      });
    }

    // Check 2: Comprehensive validation
    const comprehensiveCheckStart = Date.now();
    const comprehensiveResult = await this.validateComprehensive();
    if (comprehensiveResult.isValid) {
      checks.push({
        name: 'Comprehensive Validation',
        status: comprehensiveResult.warnings.length > 0 ? 'warn' : 'pass',
        message: comprehensiveResult.warnings.length > 0
          ? `Validation passed with ${comprehensiveResult.warnings.length} warnings`
          : 'All validations passed',
        duration: Date.now() - comprehensiveCheckStart
      });
    } else {
      checks.push({
        name: 'Comprehensive Validation',
        status: 'fail',
        message: `Validation failed: ${comprehensiveResult.errors.join(', ')}`,
        duration: Date.now() - comprehensiveCheckStart
      });
    }

    // Check 3: Security validation
    const securityCheckStart = Date.now();
    const env = this.gatherEnvironmentVariables();
    const securityResult = validateSecurityPatterns(env);
    checks.push({
      name: 'Security Validation',
      status: securityResult.isSecure ? 'pass' : 'warn',
      message: securityResult.isSecure
        ? 'No security issues detected'
        : `Security issues detected: ${securityResult.warnings.join(', ')}`,
      duration: Date.now() - securityCheckStart
    });

    // Check 4: Service connectivity (basic URL validation)
    const serviceCheckStart = Date.now();
    const serviceWarnings = await this.validateServiceUrls(env);
    checks.push({
      name: 'Service URL Validation',
      status: serviceWarnings.length === 0 ? 'pass' : 'warn',
      message: serviceWarnings.length === 0
        ? 'All service URLs are valid'
        : `Service URL issues: ${serviceWarnings.join(', ')}`,
      duration: Date.now() - serviceCheckStart
    });

    // Determine overall status
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');

    let status: 'healthy' | 'warning' | 'critical';
    if (hasFailures) {
      status = 'critical';
    } else if (hasWarnings) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks,
      overall: {
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    };
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const successRate = metrics.totalValidations > 0
      ? ((metrics.successfulValidations / metrics.totalValidations) * 100).toFixed(1)
      : '0';

    return `
Environment Validation Report
============================

Metrics:
- Total Validations: ${metrics.totalValidations}
- Success Rate: ${successRate}%
- Failed Validations: ${metrics.failedValidations}
- Average Validation Time: ${metrics.averageValidationTime.toFixed(2)}ms
- Security Issues Detected: ${metrics.securityIssuesDetected}
- Last Validation: ${metrics.lastValidationTime.toISOString()}

Status: ${metrics.failedValidations === 0 ? '✅ All validations passing' : '❌ Some validations failing'}
    `.trim();
  }

  public static reset(): void {
    EnhancedEnvironmentValidator.instance = null;
  }
}