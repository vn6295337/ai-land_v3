/**
 * Environment Validator - Singleton class for environment variable validation
 * Tasks 1-9: Complete environment validation system implementation
 */

// Task 2: Define EnvironmentConfig interface with required properties
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  nodeEnv: 'development' | 'production' | 'test';
}

// Task 1: Create EnvironmentValidator class with singleton pattern
export class EnvironmentValidator {
  private static instance: EnvironmentValidator | null = null;
  private config: EnvironmentConfig | null = null;

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  // Task 7: Add getInstance() static method ensuring single instance creation
  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  // Task 3: Implement getEnvVar method handling both Vite and Node environments
  public getEnvVar(key: string, defaultValue?: string): string {
    let value: string | undefined;

    // Handle Vite environment (import.meta.env)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      value = import.meta.env[key];
    }
    // Handle Node environment (process.env)
    else if (typeof process !== 'undefined' && process.env) {
      value = process.env[key];
    }

    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is not defined`);
    }

    return value;
  }

  // Task 4: Create isValidUrl method using URL constructor with try-catch validation
  public isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Task 5: Create isValidJWT method checking 3-part structure separated by dots
  public isValidJWT(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Task 6: Implement validateAndLoadConfig method with descriptive errors
  public validateAndLoadConfig(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    const errors: string[] = [];
    let supabaseUrl = '';
    let supabaseAnonKey = '';
    let nodeEnv = 'development';

    // Validate SUPABASE_URL
    try {
      supabaseUrl = this.getEnvVar('SUPABASE_URL');
      if (!this.isValidUrl(supabaseUrl)) {
        errors.push(`SUPABASE_URL "${supabaseUrl}" is not a valid URL`);
      }
    } catch (error) {
      errors.push('SUPABASE_URL is required but not defined');
    }

    // Validate SUPABASE_ANON_KEY
    try {
      supabaseAnonKey = this.getEnvVar('SUPABASE_ANON_KEY');
      if (!this.isValidJWT(supabaseAnonKey)) {
        errors.push('SUPABASE_ANON_KEY is not a valid JWT token format');
      }
    } catch (error) {
      errors.push('SUPABASE_ANON_KEY is required but not defined');
    }

    // Validate NODE_ENV
    try {
      nodeEnv = this.getEnvVar('NODE_ENV', 'development');
      if (!['development', 'production', 'test'].includes(nodeEnv)) {
        errors.push(`NODE_ENV "${nodeEnv}" must be one of: development, production, test`);
      }
    } catch (error) {
      errors.push('NODE_ENV validation failed');
    }

    // Throw descriptive errors if validation fails
    if (errors.length > 0) {
      const errorMessage = [
        'Environment validation failed:',
        ...errors.map(error => `  - ${error}`),
        '',
        'Required environment variables:',
        '  - SUPABASE_URL: Valid URL to Supabase project',
        '  - SUPABASE_ANON_KEY: Valid JWT token for Supabase anonymous access'
      ].join('\n');

      throw new Error(errorMessage);
    }

    // Cache validated configuration
    this.config = {
      supabaseUrl,
      supabaseAnonKey,
      nodeEnv: nodeEnv as 'development' | 'production' | 'test'
    };

    return this.config;
  }

  // Task 8: Create getSupabaseUrl() getter method
  public getSupabaseUrl(): string {
    const config = this.validateAndLoadConfig();
    return config.supabaseUrl;
  }

  // Task 8: Create getSupabaseAnonKey() getter method
  public getSupabaseAnonKey(): string {
    const config = this.validateAndLoadConfig();
    return config.supabaseAnonKey;
  }

  // Task 8: Create isProduction() getter method
  public isProduction(): boolean {
    const config = this.validateAndLoadConfig();
    return config.nodeEnv === 'production';
  }

  // Reset method for testing
  public static resetInstance(): void {
    EnvironmentValidator.instance = null;
  }
}

// Export singleton instance getter
export default EnvironmentValidator.getInstance;

// Export validated environment configuration
export const env = {
  get SUPABASE_URL() {
    return EnvironmentValidator.getInstance().getSupabaseUrl();
  },
  get SUPABASE_ANON_KEY() {
    return EnvironmentValidator.getInstance().getSupabaseAnonKey();
  },
  get NODE_ENV() {
    return EnvironmentValidator.getInstance().validateAndLoadConfig().nodeEnv;
  },
  get isProduction() {
    return EnvironmentValidator.getInstance().isProduction();
  }
};
