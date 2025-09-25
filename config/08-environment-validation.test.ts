/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  getValidationConfig,
  createUrlSchema,
  createApiKeySchema,
  createStringSchema,
  createBooleanSchema,
  createNumberSchema,
  validateDatabaseConfig,
  validateApiConfig,
  validateSecurityConfig,
  validateLoggingConfig,
  validateEnvironmentConfiguration,
  type Environment,
  type EnvironmentValidationConfig
} from './08-environment-validation';

describe('Environment-Specific Validation', () => {
  describe('getValidationConfig', () => {
    it('should return strict config for production', () => {
      const config = getValidationConfig('production');

      expect(config.environment).toBe('production');
      expect(config.strictMode).toBe(true);
      expect(config.allowTestValues).toBe(false);
      expect(config.allowLocalhost).toBe(false);
      expect(config.requireHttps).toBe(true);
      expect(config.requireSecurePasswords).toBe(true);
      expect(config.allowPlaceholders).toBe(false);
    });

    it('should return permissive config for development', () => {
      const config = getValidationConfig('development');

      expect(config.environment).toBe('development');
      expect(config.strictMode).toBe(false);
      expect(config.allowTestValues).toBe(true);
      expect(config.allowLocalhost).toBe(true);
      expect(config.requireHttps).toBe(false);
      expect(config.requireSecurePasswords).toBe(false);
      expect(config.allowPlaceholders).toBe(true);
    });

    it('should return appropriate config for test environment', () => {
      const config = getValidationConfig('test');

      expect(config.environment).toBe('test');
      expect(config.strictMode).toBe(false);
      expect(config.allowTestValues).toBe(true);
      expect(config.maxStringLength).toBe(10000);
    });
  });

  describe('createUrlSchema', () => {
    it('should require HTTPS in production', () => {
      const prodConfig = getValidationConfig('production');
      const schema = createUrlSchema(prodConfig);

      expect(schema.safeParse('http://example.com').success).toBe(false);
      expect(schema.safeParse('https://example.com').success).toBe(true);
    });

    it('should allow HTTP in development', () => {
      const devConfig = getValidationConfig('development');
      const schema = createUrlSchema(devConfig);

      expect(schema.safeParse('http://localhost:3000').success).toBe(true);
      expect(schema.safeParse('https://example.com').success).toBe(true);
    });

    it('should block localhost in production', () => {
      const prodConfig = getValidationConfig('production');
      const schema = createUrlSchema(prodConfig);

      expect(schema.safeParse('https://localhost:3000').success).toBe(false);
      expect(schema.safeParse('https://127.0.0.1:3000').success).toBe(false);
      expect(schema.safeParse('https://example.com').success).toBe(true);
    });

    it('should allow localhost in development', () => {
      const devConfig = getValidationConfig('development');
      const schema = createUrlSchema(devConfig);

      expect(schema.safeParse('http://localhost:3000').success).toBe(true);
      expect(schema.safeParse('http://127.0.0.1:3000').success).toBe(true);
    });
  });

  describe('createApiKeySchema', () => {
    it('should reject test values in production', () => {
      const prodConfig = getValidationConfig('production');
      const schema = createApiKeySchema(prodConfig);

      expect(schema.safeParse('test-api-key').success).toBe(false);
      expect(schema.safeParse('demo-key').success).toBe(false);
      expect(schema.safeParse('placeholder').success).toBe(false);
      expect(schema.safeParse('sk-1234567890abcdef').success).toBe(true);
    });

    it('should allow test values in development', () => {
      const devConfig = getValidationConfig('development');
      const schema = createApiKeySchema(devConfig);

      expect(schema.safeParse('test-api-key').success).toBe(true);
      expect(schema.safeParse('demo-key').success).toBe(true);
      expect(schema.safeParse('sk-1234567890abcdef').success).toBe(true);
    });

    it('should respect string length limits', () => {
      const prodConfig = getValidationConfig('production');
      const schema = createApiKeySchema(prodConfig);

      const longKey = 'sk-' + 'a'.repeat(1500); // Exceeds production limit
      expect(schema.safeParse(longKey).success).toBe(false);
    });
  });

  describe('createStringSchema', () => {
    it('should create required schema by default', () => {
      const config = getValidationConfig('production');
      const schema = createStringSchema(config, 'Test Field');

      expect(schema.safeParse('').success).toBe(false);
      expect(schema.safeParse('valid value').success).toBe(true);
    });

    it('should create optional schema when specified', () => {
      const config = getValidationConfig('production');
      const schema = createStringSchema(config, 'Test Field', { required: false });

      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse('valid value').success).toBe(true);
    });

    it('should reject placeholders in production strict mode', () => {
      const prodConfig = getValidationConfig('production');
      const schema = createStringSchema(prodConfig, 'Test Field');

      expect(schema.safeParse('placeholder-value').success).toBe(false);
      expect(schema.safeParse('valid-value').success).toBe(true);
    });
  });

  describe('createBooleanSchema', () => {
    it('should create boolean schema with default', () => {
      const config = getValidationConfig('production');
      const schema = createBooleanSchema(config, 'Test Flag', true);

      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse(undefined).data).toBe(true);
      expect(schema.safeParse(false).data).toBe(false);
    });

    it('should create boolean schema without default', () => {
      const config = getValidationConfig('production');
      const schema = createBooleanSchema(config, 'Test Flag');

      expect(schema.safeParse(undefined).success).toBe(false);
      expect(schema.safeParse(true).success).toBe(true);
    });
  });

  describe('createNumberSchema', () => {
    it('should validate number ranges', () => {
      const config = getValidationConfig('production');
      const schema = createNumberSchema(config, 'Test Number', { min: 1, max: 100 });

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(50).success).toBe(true);
      expect(schema.safeParse(101).success).toBe(false);
    });

    it('should enforce integer requirement', () => {
      const config = getValidationConfig('production');
      const schema = createNumberSchema(config, 'Test Integer', { integer: true });

      expect(schema.safeParse(3.14).success).toBe(false);
      expect(schema.safeParse(42).success).toBe(true);
    });

    it('should enforce positive requirement', () => {
      const config = getValidationConfig('production');
      const schema = createNumberSchema(config, 'Test Positive', { positive: true });

      expect(schema.safeParse(-5).success).toBe(false);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(5).success).toBe(true);
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should require SSL in production', () => {
      const prodConfig = getValidationConfig('production');
      const dbConfig = {
        url: 'postgres://user:pass@localhost:5432/db',
        ssl: false
      };

      const result = validateDatabaseConfig(prodConfig, dbConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Localhost database connections are not allowed in production');
      expect(result.errors).toContain('SSL cannot be disabled for database connections in production');
    });

    it('should allow localhost in development', () => {
      const devConfig = getValidationConfig('development');
      const dbConfig = {
        url: 'postgres://user:pass@localhost:5432/db',
        ssl: false
      };

      const result = validateDatabaseConfig(devConfig, dbConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Consider enabling SSL for database connections even in development');
    });

    it('should validate port ranges', () => {
      const config = getValidationConfig('production');
      const dbConfig = {
        port: 99999 // Invalid port
      };

      const result = validateDatabaseConfig(config, dbConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('port'))).toBe(true);
    });
  });

  describe('validateApiConfig', () => {
    it('should validate API configuration in production', () => {
      const prodConfig = getValidationConfig('production');
      const apiConfig = {
        baseUrl: 'http://localhost:3000', // Should fail localhost and HTTPS checks
        apiKey: 'test-key', // Should not be test value
        timeout: 60000 // Should warn about long timeout
      };

      const result = validateApiConfig(prodConfig, apiConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Localhost URLs are not allowed'))).toBe(true);
      expect(result.errors.some(error => error.includes('Test or placeholder'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('timeout over 30 seconds'))).toBe(true);
    });

    it('should require HTTPS for API base URLs in production', () => {
      const prodConfig = getValidationConfig('production');
      const apiConfig = {
        baseUrl: 'http://example.com' // Should require HTTPS
      };

      const result = validateApiConfig(prodConfig, apiConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('HTTPS is required'))).toBe(true);
    });

    it('should allow flexible configuration in development', () => {
      const devConfig = getValidationConfig('development');
      const apiConfig = {
        baseUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        timeout: 5000
      };

      const result = validateApiConfig(devConfig, apiConfig);

      expect(result.isValid).toBe(true);
    });

    it('should validate numeric ranges', () => {
      const config = getValidationConfig('production');
      const apiConfig = {
        retries: -1, // Invalid
        rateLimit: 0 // Invalid
      };

      const result = validateApiConfig(config, apiConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('retries'))).toBe(true);
      expect(result.errors.some(error => error.includes('rate limit'))).toBe(true);
    });
  });

  describe('validateSecurityConfig', () => {
    it('should enforce security requirements in production', () => {
      const prodConfig = getValidationConfig('production');
      const securityConfig = {
        jwtSecret: 'short', // Too short
        corsOrigins: ['*'], // Wildcard not allowed
        csrfEnabled: false, // Cannot be disabled
        helmetEnabled: false // Cannot be disabled
      };

      const result = validateSecurityConfig(prodConfig, securityConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('JWT secret'))).toBe(true);
      expect(result.errors.some(error => error.includes('Wildcard CORS'))).toBe(true);
      expect(result.errors.some(error => error.includes('CSRF protection'))).toBe(true);
      expect(result.errors.some(error => error.includes('Helmet'))).toBe(true);
    });

    it('should provide warnings for production best practices', () => {
      const prodConfig = getValidationConfig('production');
      const securityConfig = {
        jwtSecret: 'a'.repeat(40), // Meets minimum but not recommended
        rateLimitEnabled: false
      };

      const result = validateSecurityConfig(prodConfig, securityConfig);

      expect(result.warnings.some(warning => warning.includes('64 characters'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Rate limiting'))).toBe(true);
    });

    it('should be more permissive in development', () => {
      const devConfig = getValidationConfig('development');
      const securityConfig = {
        jwtSecret: 'development-secret-key-1234567890',
        corsOrigins: ['*'],
        csrfEnabled: false
      };

      const result = validateSecurityConfig(devConfig, securityConfig);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateLoggingConfig', () => {
    it('should validate log levels', () => {
      const config = getValidationConfig('production');
      const loggingConfig = {
        level: 'invalid-level',
        transports: ['invalid-transport']
      };

      const result = validateLoggingConfig(config, loggingConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Log level'))).toBe(true);
      expect(result.errors.some(error => error.includes('Transport'))).toBe(true);
    });

    it('should warn about debug logging in production', () => {
      const prodConfig = getValidationConfig('production');
      const loggingConfig = {
        level: 'debug',
        transports: ['console'],
        sensitiveDataRedaction: false // Not allowed in production
      };

      const result = validateLoggingConfig(prodConfig, loggingConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Sensitive data redaction'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Debug/trace logging'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('persistent storage'))).toBe(true);
    });

    it('should recommend structured logging for production', () => {
      const prodConfig = getValidationConfig('production');
      const loggingConfig = {
        structured: false
      };

      const result = validateLoggingConfig(prodConfig, loggingConfig);

      expect(result.warnings.some(warning => warning.includes('Structured logging'))).toBe(true);
    });
  });

  describe('validateEnvironmentConfiguration', () => {
    it('should validate complete configuration', () => {
      const configurations = {
        database: {
          url: 'postgres://user:pass@localhost:5432/db',
          ssl: false
        },
        api: {
          baseUrl: 'http://localhost:3000',
          apiKey: 'test-key'
        },
        security: {
          jwtSecret: 'short',
          corsOrigins: ['*']
        },
        logging: {
          level: 'invalid',
          sensitiveDataRedaction: false
        }
      };

      const result = validateEnvironmentConfiguration('production', configurations);

      expect(result.isValid).toBe(false);
      expect(result.environment).toBe('production');
      expect(result.config.strictMode).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should pass validation for proper development configuration', () => {
      const configurations = {
        database: {
          url: 'postgres://user:pass@localhost:5432/db',
          ssl: false
        },
        api: {
          baseUrl: 'http://localhost:3000',
          apiKey: 'dev-api-key'
        },
        security: {
          jwtSecret: 'development-secret-key-1234567890',
          corsOrigins: ['http://localhost:3000']
        },
        logging: {
          level: 'debug',
          transports: ['console']
        }
      };

      const result = validateEnvironmentConfiguration('development', configurations);

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('development');
      expect(result.config.strictMode).toBe(false);
    });

    it('should handle empty configuration sections', () => {
      const result = validateEnvironmentConfiguration('production', {});

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });
});