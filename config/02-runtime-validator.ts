import { EnvironmentValidator } from './01-environment';
import { ValidationTelemetry } from './06-validation-telemetry';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

export interface RuntimeValidatorOptions {
  terminateOnFailure: boolean;
  showDebugInfo: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export class RuntimeEnvironmentValidator {
  private static instance: RuntimeEnvironmentValidator | null = null;
  private validator: EnvironmentValidator;
  private options: RuntimeValidatorOptions;
  private validationResult: ValidationResult | null = null;
  private telemetry: ValidationTelemetry;

  private constructor(options: Partial<RuntimeValidatorOptions> = {}) {
    this.validator = EnvironmentValidator.getInstance();
    this.telemetry = ValidationTelemetry.getInstance();
    this.options = {
      terminateOnFailure: true,
      showDebugInfo: import.meta.env?.DEV || process.env.NODE_ENV === 'development',
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
  }

  public static getInstance(options?: Partial<RuntimeValidatorOptions>): RuntimeEnvironmentValidator {
    if (!RuntimeEnvironmentValidator.instance) {
      RuntimeEnvironmentValidator.instance = new RuntimeEnvironmentValidator(options);
    }
    return RuntimeEnvironmentValidator.instance;
  }

  public async validateEnvironment(): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      // Attempt to validate and load configuration
      this.validator.validateAndLoadConfig();

      // Additional runtime checks
      this.performRuntimeChecks(result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }

    const duration = Date.now() - startTime;
    this.validationResult = result;

    // Track telemetry
    this.telemetry.trackValidationResult(result, duration);

    return result;
  }

  public async validateWithRetry(): Promise<ValidationResult> {
    let lastResult: ValidationResult;

    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      lastResult = await this.validateEnvironment();

      if (lastResult.isValid) {
        if (this.options.showDebugInfo && attempt > 1) {
          console.info(`✅ Environment validation succeeded on attempt ${attempt}`);
        }

        // Track recovery if this wasn't the first attempt
        if (attempt > 1) {
          this.telemetry.trackValidationRecovery(lastResult, attempt - 1);
        }

        return lastResult;
      }

      if (attempt < this.options.retryAttempts) {
        if (this.options.showDebugInfo) {
          console.warn(`⚠️ Environment validation failed (attempt ${attempt}/${this.options.retryAttempts}), retrying in ${this.options.retryDelay}ms...`);
        }

        // Track retry attempt
        this.telemetry.trackValidationRetry(
          attempt,
          this.options.retryAttempts,
          lastResult.errors.length > 0 ? lastResult.errors[0] : undefined
        );

        await this.delay(this.options.retryDelay);
      }
    }

    return lastResult!;
  }

  private performRuntimeChecks(result: ValidationResult): void {
    try {
      // Check if Supabase URL is accessible (basic format check)
      const supabaseUrl = this.validator.getSupabaseUrl();
      if (!supabaseUrl.startsWith('https://')) {
        result.warnings.push('Supabase URL should use HTTPS for security');
      }

      // Check if we're in production with development settings
      if (this.validator.isProduction() && this.options.showDebugInfo) {
        result.warnings.push('Debug info is enabled in production environment');
      }

      // Validate JWT token format
      const supabaseKey = this.validator.getSupabaseAnonKey();
      if (!this.validator.isValidJWT(supabaseKey)) {
        result.errors.push('Supabase anonymous key is not a valid JWT token format');
        result.isValid = false;
      }

    } catch (error) {
      result.errors.push(`Runtime check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getValidationResult(): ValidationResult | null {
    return this.validationResult;
  }

  public logValidationResult(): void {
    if (!this.validationResult) {
      console.warn('⚠️ No validation result available. Run validateEnvironment() first.');
      return;
    }

    const { isValid, errors, warnings, timestamp } = this.validationResult;

    if (isValid) {
      console.info(`✅ Environment validation passed at ${timestamp.toISOString()}`);
      if (warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', warnings);
      }
    } else {
      console.error(`❌ Environment validation failed at ${timestamp.toISOString()}`);
      console.error('💥 Validation errors:', errors);
      if (warnings.length > 0) {
        console.warn('⚠️ Additional warnings:', warnings);
      }
    }

    if (this.options.showDebugInfo) {
      this.logDebugInfo();
    }
  }

  private logDebugInfo(): void {
    console.group('🔍 Environment Debug Info');
    try {
      console.info('NODE_ENV:', this.validator.getEnvVar('NODE_ENV', 'development'));
      console.info('Is Production:', this.validator.isProduction());
      console.info('Supabase URL:', this.validator.getSupabaseUrl());
      console.info('Supabase Key Set:', !!this.validator.getSupabaseAnonKey());
      console.info('Validation Options:', this.options);
    } catch (error) {
      console.error('Failed to log debug info:', error);
    }
    console.groupEnd();
  }

  public createErrorBoundaryMessage(): string {
    if (!this.validationResult || this.validationResult.isValid) {
      return '';
    }

    const isDevelopment = !this.validator.isProduction();

    if (isDevelopment) {
      return `
🚨 Environment Configuration Error

The application cannot start due to missing or invalid environment variables:

${this.validationResult.errors.map(error => `• ${error}`).join('\n')}

To fix this:
1. Create a .env file in your project root
2. Add the following variables:
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

3. Restart the development server

Need help? Check the README.md for setup instructions.
      `.trim();
    } else {
      return `
🚨 Application Configuration Error

The application is not properly configured for production deployment.

Please contact your system administrator or check the deployment configuration.

Error ID: ${this.validationResult.timestamp.getTime()}
      `.trim();
    }
  }

  public shouldTerminateApplication(): boolean {
    return this.options.terminateOnFailure &&
           this.validationResult !== null &&
           !this.validationResult.isValid;
  }

  public static reset(): void {
    RuntimeEnvironmentValidator.instance = null;
  }
}