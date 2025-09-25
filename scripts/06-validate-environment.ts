#!/usr/bin/env node

/**
 * Build-time environment validation script
 * Ensures all required environment variables are present before build
 */

import { envConfig } from '../config/env';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

class BuildTimeValidator {
  private result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  public validate(): ValidationResult {
    console.log('🔍 Validating environment configuration...\n');

    try {
      // Test environment configuration loading
      const config = envConfig.getConfig();

      this.validateSupabaseConfig(config);
      this.validateNodeEnvironment(config);
      this.checkOptionalConfig(config);
      this.performSecurityChecks();

    } catch (error) {
      this.result.success = false;
      this.result.errors.push(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.printResults();
    return this.result;
  }

  private validateSupabaseConfig(config: any): void {
    if (!config.supabaseUrl) {
      this.result.errors.push('VITE_SUPABASE_URL is required but not found');
    } else {
      try {
        const url = new URL(config.supabaseUrl);
        if (!url.hostname.includes('supabase')) {
          this.result.warnings.push('VITE_SUPABASE_URL does not appear to be a Supabase URL');
        }
      } catch {
        this.result.errors.push('VITE_SUPABASE_URL is not a valid URL');
      }
    }

    if (!config.supabaseAnonKey) {
      this.result.errors.push('VITE_SUPABASE_ANON_KEY is required but not found');
    } else {
      // Validate JWT format
      const parts = config.supabaseAnonKey.split('.');
      if (parts.length !== 3) {
        this.result.errors.push('VITE_SUPABASE_ANON_KEY is not a valid JWT format');
      }
    }
  }

  private validateNodeEnvironment(config: any): void {
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(config.nodeEnv)) {
      this.result.warnings.push(`NODE_ENV "${config.nodeEnv}" is not a standard environment`);
    }

    if (config.nodeEnv === 'production') {
      this.validateProductionRequirements(config);
    }
  }

  private validateProductionRequirements(config: any): void {
    if (!config.apiSecretKey) {
      this.result.warnings.push('AI_MODELS_DISCOVERY_API_SECRET_KEY not set for production environment');
    }

    // Additional production checks
    if (config.supabaseUrl && config.supabaseUrl.includes('localhost')) {
      this.result.errors.push('Production build should not use localhost Supabase URL');
    }
  }

  private checkOptionalConfig(config: any): void {
    if (!config.apiSecretKey) {
      this.result.warnings.push('AI_MODELS_DISCOVERY_API_SECRET_KEY not configured (optional)');
    }
  }

  private performSecurityChecks(): void {
    // Check for potential hardcoded secrets in environment
    const sensitivePatterns = [
      { pattern: /hardcoded|placeholder|example|test123|password123/i, message: 'Detected placeholder/test values in environment' },
      { pattern: /^(abc|test|demo)/i, message: 'Environment values appear to use test/demo format' }
    ];

    try {
      const config = envConfig.getConfig();

      sensitivePatterns.forEach(({ pattern, message }) => {
        if (pattern.test(config.supabaseUrl) || pattern.test(config.supabaseAnonKey)) {
          this.result.errors.push(message);
        }
      });
    } catch {
      // Config loading already failed, error already reported
    }
  }

  private printResults(): void {
    console.log('\n📋 Validation Results:');
    console.log('='.repeat(50));

    if (this.result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (this.result.success && this.result.errors.length === 0) {
      console.log('\n✅ Environment validation passed!');
    } else {
      console.log('\n❌ Environment validation failed!');
      console.log('\nPlease fix the errors above before proceeding with the build.');
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new BuildTimeValidator();
  const result = validator.validate();

  // Exit with error code if validation failed
  process.exit(result.success && result.errors.length === 0 ? 0 : 1);
}

export { BuildTimeValidator };
