/**
 * Environment-specific validation rules
 * Applies different validation strictness based on NODE_ENV
 */

import { z } from 'zod';

export type Environment = 'development' | 'production' | 'test' | 'staging';

export interface EnvironmentValidationConfig {
  environment: Environment;
  strictMode: boolean;
  allowTestValues: boolean;
  allowLocalhost: boolean;
  requireHttps: boolean;
  maxStringLength: number;
  requireSecurePasswords: boolean;
  allowPlaceholders: boolean;
}

/**
 * Gets validation configuration based on environment
 */
export function getValidationConfig(environment: Environment): EnvironmentValidationConfig {
  switch (environment) {
    case 'production':
      return {
        environment,
        strictMode: true,
        allowTestValues: false,
        allowLocalhost: false,
        requireHttps: true,
        maxStringLength: 1000,
        requireSecurePasswords: true,
        allowPlaceholders: false
      };

    case 'staging':
      return {
        environment,
        strictMode: true,
        allowTestValues: false,
        allowLocalhost: false,
        requireHttps: true,
        maxStringLength: 2000,
        requireSecurePasswords: true,
        allowPlaceholders: false
      };

    case 'test':
      return {
        environment,
        strictMode: false,
        allowTestValues: true,
        allowLocalhost: true,
        requireHttps: false,
        maxStringLength: 10000,
        requireSecurePasswords: false,
        allowPlaceholders: true
      };

    case 'development':
    default:
      return {
        environment,
        strictMode: false,
        allowTestValues: true,
        allowLocalhost: true,
        requireHttps: false,
        maxStringLength: 5000,
        requireSecurePasswords: false,
        allowPlaceholders: true
      };
  }
}

/**
 * Creates environment-aware URL validation schema
 */
export function createUrlSchema(config: EnvironmentValidationConfig): z.ZodString {
  let schema = z.string()
    .min(1, 'URL cannot be empty')
    .max(config.maxStringLength, `URL too long (max ${config.maxStringLength} characters)`);

  if (config.strictMode) {
    schema = schema.url('Must be a valid URL');
  }

  if (!config.allowLocalhost) {
    schema = schema.refine(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
      'Localhost URLs are not allowed in this environment'
    );
  }

  if (config.requireHttps) {
    schema = schema.refine(
      (url) => url.startsWith('https://'),
      'HTTPS is required in this environment'
    );
  }

  return schema;
}

/**
 * Creates environment-aware API key validation schema
 */
export function createApiKeySchema(config: EnvironmentValidationConfig): z.ZodString {
  let schema = z.string()
    .min(1, 'API key cannot be empty')
    .max(config.maxStringLength, `API key too long (max ${config.maxStringLength} characters)`);

  if (!config.allowTestValues) {
    const testValues = ['test', 'demo', 'placeholder', 'your-api-key', 'api-key-here', 'xxx'];
    schema = schema.refine(
      (key) => !testValues.some(test => key.toLowerCase().includes(test)),
      'Test or placeholder API keys are not allowed in this environment'
    );
  }

  if (!config.allowPlaceholders) {
    schema = schema.refine(
      (key) => !key.toLowerCase().includes('placeholder'),
      'Placeholder values are not allowed in this environment'
    );
  }

  return schema;
}

/**
 * Creates environment-aware string validation schema
 */
export function createStringSchema(
  config: EnvironmentValidationConfig,
  fieldName: string,
  options: {
    minLength?: number;
    required?: boolean;
    allowEmpty?: boolean;
  } = {}
): z.ZodString | z.ZodOptional<z.ZodString> {
  const minLength = options.minLength || 1;
  const required = options.required !== false;
  const allowEmpty = options.allowEmpty || false;

  let schema = z.string();

  if (!allowEmpty) {
    schema = schema.min(minLength, `${fieldName} must be at least ${minLength} characters`);
  }

  schema = schema.max(
    config.maxStringLength,
    `${fieldName} too long (max ${config.maxStringLength} characters)`
  );

  if (config.strictMode && !config.allowPlaceholders) {
    schema = schema.refine(
      (value) => !value.toLowerCase().includes('placeholder'),
      `${fieldName} cannot contain placeholder values in this environment`
    );
  }

  return required ? schema : schema.optional();
}

/**
 * Creates environment-aware boolean validation schema
 */
export function createBooleanSchema(
  config: EnvironmentValidationConfig,
  fieldName: string,
  defaultValue?: boolean
): z.ZodBoolean | z.ZodDefault<z.ZodBoolean> {
  const schema = z.boolean({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a boolean`
  });

  return typeof defaultValue !== 'undefined' ? schema.default(defaultValue) : schema;
}

/**
 * Creates environment-aware number validation schema
 */
export function createNumberSchema(
  config: EnvironmentValidationConfig,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  } = {}
): z.ZodNumber {
  let schema = z.number({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a number`
  });

  if (options.integer) {
    schema = schema.int(`${fieldName} must be an integer`);
  }

  if (options.positive) {
    schema = schema.positive(`${fieldName} must be positive`);
  }

  if (typeof options.min !== 'undefined') {
    schema = schema.min(options.min, `${fieldName} must be at least ${options.min}`);
  }

  if (typeof options.max !== 'undefined') {
    schema = schema.max(options.max, `${fieldName} must be at most ${options.max}`);
  }

  return schema;
}

/**
 * Validates database connection settings based on environment
 */
export function validateDatabaseConfig(
  config: EnvironmentValidationConfig,
  dbConfig: {
    url?: string;
    host?: string;
    port?: number;
    database?: string;
    ssl?: boolean;
  }
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // URL validation
  if (dbConfig.url) {
    const urlSchema = createUrlSchema(config);
    const urlResult = urlSchema.safeParse(dbConfig.url);
    if (!urlResult.success) {
      errors.push(`Database URL: ${urlResult.error.issues[0].message}`);
    }

    // Check for production-specific requirements
    if (config.environment === 'production') {
      if (!dbConfig.url.includes('ssl=true') && !dbConfig.ssl) {
        errors.push('SSL is required for database connections in production');
      }

      if (dbConfig.url.includes('localhost') || dbConfig.url.includes('127.0.0.1')) {
        errors.push('Localhost database connections are not allowed in production');
      }
    }
  }

  // Host validation
  if (dbConfig.host) {
    if (config.environment === 'production' &&
        (dbConfig.host === 'localhost' || dbConfig.host === '127.0.0.1')) {
      errors.push('Localhost database host is not allowed in production');
    }
  }

  // Port validation
  if (dbConfig.port) {
    const portSchema = createNumberSchema(config, 'Database port', {
      min: 1,
      max: 65535,
      integer: true,
      positive: true
    });
    const portResult = portSchema.safeParse(dbConfig.port);
    if (!portResult.success) {
      errors.push(`Database port: ${portResult.error.issues[0].message}`);
    }
  }

  // SSL validation
  if (config.environment === 'production' && dbConfig.ssl === false) {
    errors.push('SSL cannot be disabled for database connections in production');
  }

  if (config.environment === 'development' && (dbConfig.ssl === undefined || dbConfig.ssl === false)) {
    warnings.push('Consider enabling SSL for database connections even in development');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates API configuration based on environment
 */
export function validateApiConfig(
  config: EnvironmentValidationConfig,
  apiConfig: {
    baseUrl?: string;
    apiKey?: string;
    timeout?: number;
    retries?: number;
    rateLimit?: number;
  }
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Base URL validation
  if (apiConfig.baseUrl) {
    const urlSchema = createUrlSchema(config);
    const urlResult = urlSchema.safeParse(apiConfig.baseUrl);
    if (!urlResult.success) {
      errors.push(`API Base URL: ${urlResult.error.issues[0].message}`);
    }
  }

  // API Key validation
  if (apiConfig.apiKey) {
    const apiKeySchema = createApiKeySchema(config);
    const keyResult = apiKeySchema.safeParse(apiConfig.apiKey);
    if (!keyResult.success) {
      errors.push(`API Key: ${keyResult.error.issues[0].message}`);
    }
  }

  // Timeout validation
  if (apiConfig.timeout) {
    const timeoutSchema = createNumberSchema(config, 'API timeout', {
      min: 1000,
      max: 300000, // 5 minutes max
      integer: true,
      positive: true
    });
    const timeoutResult = timeoutSchema.safeParse(apiConfig.timeout);
    if (!timeoutResult.success) {
      errors.push(`API timeout: ${timeoutResult.error.issues[0].message}`);
    }

    // Environment-specific timeout recommendations
    if (config.environment === 'production' && apiConfig.timeout > 30000) {
      warnings.push('API timeout over 30 seconds may cause user experience issues in production');
    }
  }

  // Retries validation
  if (apiConfig.retries !== undefined) {
    const retriesSchema = createNumberSchema(config, 'API retries', {
      min: 0,
      max: 10,
      integer: true
    });
    const retriesResult = retriesSchema.safeParse(apiConfig.retries);
    if (!retriesResult.success) {
      errors.push(`API retries: ${retriesResult.error.issues[0].message}`);
    }
  }

  // Rate limit validation
  if (apiConfig.rateLimit !== undefined) {
    const rateLimitSchema = createNumberSchema(config, 'API rate limit', {
      min: 1,
      max: 10000,
      integer: true,
      positive: true
    });
    const rateLimitResult = rateLimitSchema.safeParse(apiConfig.rateLimit);
    if (!rateLimitResult.success) {
      errors.push(`API rate limit: ${rateLimitResult.error.issues[0].message}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates security configuration based on environment
 */
export function validateSecurityConfig(
  config: EnvironmentValidationConfig,
  securityConfig: {
    jwtSecret?: string;
    sessionSecret?: string;
    corsOrigins?: string[];
    csrfEnabled?: boolean;
    helmetEnabled?: boolean;
    rateLimitEnabled?: boolean;
  }
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // JWT Secret validation
  if (securityConfig.jwtSecret) {
    const jwtSecretSchema = createStringSchema(config, 'JWT secret', { minLength: 32 });
    const jwtResult = jwtSecretSchema.safeParse(securityConfig.jwtSecret);
    if (!jwtResult.success) {
      errors.push(`JWT secret: ${jwtResult.error.issues[0].message}`);
    }

    if (config.environment === 'production' && securityConfig.jwtSecret.length < 64) {
      warnings.push('JWT secret should be at least 64 characters in production');
    }
  }

  // Session Secret validation
  if (securityConfig.sessionSecret) {
    const sessionSecretSchema = createStringSchema(config, 'Session secret', { minLength: 32 });
    const sessionResult = sessionSecretSchema.safeParse(securityConfig.sessionSecret);
    if (!sessionResult.success) {
      errors.push(`Session secret: ${sessionResult.error.issues[0].message}`);
    }
  }

  // CORS Origins validation
  if (securityConfig.corsOrigins) {
    securityConfig.corsOrigins.forEach((origin, index) => {
      if (origin !== '*') {
        const originSchema = createUrlSchema(config);
        const originResult = originSchema.safeParse(origin);
        if (!originResult.success) {
          errors.push(`CORS origin ${index + 1}: ${originResult.error.issues[0].message}`);
        }
      }
    });

    if (config.environment === 'production' && securityConfig.corsOrigins.includes('*')) {
      errors.push('Wildcard CORS origins (*) are not allowed in production');
    }
  }

  // Security feature validation for production
  if (config.environment === 'production') {
    if (securityConfig.csrfEnabled === false) {
      errors.push('CSRF protection cannot be disabled in production');
    }

    if (securityConfig.helmetEnabled === false) {
      errors.push('Helmet security headers cannot be disabled in production');
    }

    if (securityConfig.rateLimitEnabled === false) {
      warnings.push('Rate limiting should be enabled in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates logging configuration based on environment
 */
export function validateLoggingConfig(
  config: EnvironmentValidationConfig,
  loggingConfig: {
    level?: string;
    transports?: string[];
    sensitiveDataRedaction?: boolean;
    structured?: boolean;
    maxFiles?: number;
    maxSize?: string;
  }
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Log level validation
  if (loggingConfig.level) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(loggingConfig.level.toLowerCase())) {
      errors.push(`Log level must be one of: ${validLevels.join(', ')}`);
    }

    if (config.environment === 'production' &&
        ['debug', 'trace'].includes(loggingConfig.level.toLowerCase())) {
      warnings.push('Debug/trace logging may impact performance in production');
    }
  }

  // Transports validation
  if (loggingConfig.transports) {
    const validTransports = ['console', 'file', 'database', 'external'];
    loggingConfig.transports.forEach((transport, index) => {
      if (!validTransports.includes(transport.toLowerCase())) {
        errors.push(`Transport ${index + 1} must be one of: ${validTransports.join(', ')}`);
      }
    });

    if (config.environment === 'production' &&
        loggingConfig.transports.includes('console') &&
        !loggingConfig.transports.includes('file')) {
      warnings.push('Production logging should include persistent storage (file/database)');
    }
  }

  // Sensitive data redaction
  if (config.environment === 'production' && loggingConfig.sensitiveDataRedaction === false) {
    errors.push('Sensitive data redaction cannot be disabled in production');
  }

  // Structured logging recommendation
  if (config.environment === 'production' && loggingConfig.structured === false) {
    warnings.push('Structured logging is recommended for production environments');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main environment validation function
 * Validates all configuration aspects based on environment
 */
export function validateEnvironmentConfiguration(
  environment: Environment,
  configurations: {
    database?: any;
    api?: any;
    security?: any;
    logging?: any;
  }
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: Environment;
  config: EnvironmentValidationConfig;
} {
  const config = getValidationConfig(environment);
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate each configuration section
  if (configurations.database) {
    const dbResult = validateDatabaseConfig(config, configurations.database);
    allErrors.push(...dbResult.errors);
    allWarnings.push(...dbResult.warnings);
  }

  if (configurations.api) {
    const apiResult = validateApiConfig(config, configurations.api);
    allErrors.push(...apiResult.errors);
    allWarnings.push(...apiResult.warnings);
  }

  if (configurations.security) {
    const securityResult = validateSecurityConfig(config, configurations.security);
    allErrors.push(...securityResult.errors);
    allWarnings.push(...securityResult.warnings);
  }

  if (configurations.logging) {
    const loggingResult = validateLoggingConfig(config, configurations.logging);
    allErrors.push(...loggingResult.errors);
    allWarnings.push(...loggingResult.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    environment,
    config
  };
}