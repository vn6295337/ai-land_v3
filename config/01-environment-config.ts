/**
 * Environment variable configuration with comprehensive TypeScript interfaces
 * Removes hardcoded credentials and enforces proper environment setup
 */

// Core environment configuration interface
export interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  nodeEnv: 'development' | 'production' | 'test';
}

// Extended environment configuration with all possible variables
export interface ExtendedEnvironmentConfig extends EnvironmentConfig {
  // Supabase Configuration
  supabaseServiceKey?: string;
  supabaseJwtSecret?: string;
  supabaseDbUrl?: string;

  // Application Configuration
  appName?: string;
  appVersion?: string;
  appUrl?: string;
  apiBaseUrl?: string;

  // Feature Flags
  enableAnalytics?: boolean;
  enableDebugMode?: boolean;
  enableTelemetry?: boolean;
  enableErrorReporting?: boolean;

  // Third-party Services
  vercelAnalyticsId?: string;
  sentryDsn?: string;
  logRocketId?: string;
  googleAnalyticsId?: string;

  // Performance & Monitoring
  enablePerformanceMonitoring?: boolean;
  enableWebVitalsTracking?: boolean;
  maxBundleSize?: number;

  // Development Settings
  enableHotReload?: boolean;
  enableSourceMaps?: boolean;
  enableReactDevTools?: boolean;

  // Security Settings
  enableCsp?: boolean;
  enableHsts?: boolean;
  corsOrigins?: string[];

  // Rate Limiting
  rateLimitRequests?: number;
  rateLimitWindow?: number;

  // Caching
  cacheMaxAge?: number;
  enableServiceWorker?: boolean;
}

// Type definitions for environment variable values
export type EnvironmentValue = string | number | boolean;

export interface EnvironmentVariableDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'jwt';
  required: boolean;
  defaultValue?: EnvironmentValue;
  description: string;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    enum?: EnvironmentValue[];
  };
}

// Helper type to get required environment variables
export type RequiredEnvironmentKeys = {
  [K in keyof ExtendedEnvironmentConfig]: K extends 'supabaseUrl' | 'supabaseAnonKey' | 'nodeEnv' ? K : never;
}[keyof ExtendedEnvironmentConfig];

// Helper type to get optional environment variables
export type OptionalEnvironmentKeys = {
  [K in keyof ExtendedEnvironmentConfig]: K extends RequiredEnvironmentKeys ? never : K;
}[keyof ExtendedEnvironmentConfig];

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.validateAndLoadConfig();
  }

  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  private validateAndLoadConfig(): EnvironmentConfig {
    const errors: string[] = [];

    // Required environment variables
    const supabaseUrl = this.getEnvVar('SUPABASE_URL');
    const supabaseAnonKey = this.getEnvVar('SUPABASE_ANON_KEY');
    const nodeEnv = this.getEnvVar('NODE_ENV', 'development');

    // Optional environment variables
    const apiSecretKey = this.getOptionalEnvVar('AI_MODELS_DISCOVERY_API_SECRET_KEY');

    // Validation rules
    if (!supabaseUrl) {
      errors.push('SUPABASE_URL is required');
    } else if (!this.isValidUrl(supabaseUrl)) {
      errors.push('SUPABASE_URL must be a valid URL');
    }

    if (!supabaseAnonKey) {
      errors.push('SUPABASE_ANON_KEY is required');
    } else if (!this.isValidJWT(supabaseAnonKey)) {
      errors.push('SUPABASE_ANON_KEY must be a valid JWT token');
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return {
      supabaseUrl,
      supabaseAnonKey,
      apiSecretKey,
      nodeEnv
    };
  }

  private getEnvVar(key: string, defaultValue?: string): string {
    // Handle both Vite and Node.js environments
    const value = typeof import !== 'undefined' && import.meta?.env
      ? import.meta.env[key]
      : process.env[key];

    if (!value && !defaultValue) {
      return '';
    }

    return value || defaultValue || '';
  }

  private getOptionalEnvVar(key: string): string | undefined {
    const value = typeof import !== 'undefined' && import.meta?.env
      ? import.meta.env[key]
      : process.env[key];

    return value || undefined;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidJWT(token: string): boolean {
    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public getSupabaseUrl(): string {
    return this.config.supabaseUrl;
  }

  public getSupabaseAnonKey(): string {
    return this.config.supabaseAnonKey;
  }

  public getApiSecretKey(): string | undefined {
    return this.config.apiSecretKey;
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }
}

// Export singleton instance
export const envConfig = EnvironmentValidator.getInstance();

// Export type for TypeScript consumers
export type { EnvironmentConfig };
