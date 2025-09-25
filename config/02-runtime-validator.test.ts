import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RuntimeEnvironmentValidator, ValidationResult } from './02-runtime-validator';

// Mock the EnvironmentValidator
vi.mock('./01-environment', () => ({
  EnvironmentValidator: {
    getInstance: vi.fn(() => ({
      validateAndLoadConfig: vi.fn(),
      getSupabaseUrl: vi.fn(() => 'https://test.supabase.co'),
      getSupabaseAnonKey: vi.fn(() => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'),
      isProduction: vi.fn(() => false),
      isValidJWT: vi.fn(() => true),
      getEnvVar: vi.fn((key: string, defaultValue?: string) => {
        const envVars: Record<string, string> = {
          'NODE_ENV': 'test',
        };
        return envVars[key] || defaultValue || '';
      })
    }))
  }
}));

// Mock import.meta.env
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
      }
    }
  },
  writable: true
});

describe('RuntimeEnvironmentValidator', () => {
  let validator: RuntimeEnvironmentValidator;

  beforeEach(() => {
    // Reset singleton instance
    RuntimeEnvironmentValidator.reset();
    validator = RuntimeEnvironmentValidator.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    RuntimeEnvironmentValidator.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = RuntimeEnvironmentValidator.getInstance();
      const instance2 = RuntimeEnvironmentValidator.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = RuntimeEnvironmentValidator.getInstance();
      RuntimeEnvironmentValidator.reset();
      const instance2 = RuntimeEnvironmentValidator.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('validateEnvironment', () => {
    it('should return valid result when environment is properly configured', async () => {
      const result = await validator.validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return invalid result when validation fails', async () => {
      const mockValidator = validator['validator'];
      mockValidator.validateAndLoadConfig = vi.fn(() => {
        throw new Error('Missing SUPABASE_URL');
      });

      const result = await validator.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing SUPABASE_URL');
    });

    it('should add warnings for insecure configurations', async () => {
      const mockValidator = validator['validator'];
      mockValidator.getSupabaseUrl = vi.fn(() => 'http://insecure.supabase.co');

      const result = await validator.validateEnvironment();

      expect(result.warnings).toContain('Supabase URL should use HTTPS for security');
    });

    it('should detect invalid JWT tokens', async () => {
      const mockValidator = validator['validator'];
      mockValidator.isValidJWT = vi.fn(() => false);

      const result = await validator.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supabase anonymous key is not a valid JWT token format');
    });
  });

  describe('validateWithRetry', () => {
    it('should succeed on first attempt when validation passes', async () => {
      const result = await validator.validateWithRetry();

      expect(result.isValid).toBe(true);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockValidator = validator['validator'];
      let attempts = 0;

      mockValidator.validateAndLoadConfig = vi.fn(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
      });

      const result = await validator.validateWithRetry();

      expect(result.isValid).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should fail after max retry attempts', async () => {
      RuntimeEnvironmentValidator.reset();
      const validator = RuntimeEnvironmentValidator.getInstance({ retryAttempts: 2, retryDelay: 10 });
      const mockValidator = validator['validator'];

      mockValidator.validateAndLoadConfig = vi.fn(() => {
        throw new Error('Persistent failure');
      });

      const result = await validator.validateWithRetry();

      expect(result.isValid).toBe(false);
      expect(mockValidator.validateAndLoadConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('error messages', () => {
    it('should create detailed development error message', () => {
      const mockValidator = validator['validator'];
      mockValidator.isProduction = vi.fn(() => false);

      validator['validationResult'] = {
        isValid: false,
        errors: ['Missing SUPABASE_URL', 'Invalid SUPABASE_ANON_KEY'],
        warnings: [],
        timestamp: new Date()
      };

      const message = validator.createErrorBoundaryMessage();

      expect(message).toContain('Environment Configuration Error');
      expect(message).toContain('Missing SUPABASE_URL');
      expect(message).toContain('Create a .env file');
    });

    it('should create simplified production error message', () => {
      const mockValidator = validator['validator'];
      mockValidator.isProduction = vi.fn(() => true);

      validator['validationResult'] = {
        isValid: false,
        errors: ['Missing configuration'],
        warnings: [],
        timestamp: new Date()
      };

      const message = validator.createErrorBoundaryMessage();

      expect(message).toContain('Application Configuration Error');
      expect(message).toContain('contact your system administrator');
      expect(message).not.toContain('Create a .env file');
    });

    it('should return empty message for valid results', () => {
      validator['validationResult'] = {
        isValid: true,
        errors: [],
        warnings: [],
        timestamp: new Date()
      };

      const message = validator.createErrorBoundaryMessage();

      expect(message).toBe('');
    });
  });

  describe('shouldTerminateApplication', () => {
    it('should return true when terminateOnFailure is true and validation failed', () => {
      const validator = RuntimeEnvironmentValidator.getInstance({ terminateOnFailure: true });
      validator['validationResult'] = {
        isValid: false,
        errors: ['Error'],
        warnings: [],
        timestamp: new Date()
      };

      expect(validator.shouldTerminateApplication()).toBe(true);
    });

    it('should return false when terminateOnFailure is false', () => {
      RuntimeEnvironmentValidator.reset();
      const validator = RuntimeEnvironmentValidator.getInstance({ terminateOnFailure: false });
      validator['validationResult'] = {
        isValid: false,
        errors: ['Error'],
        warnings: [],
        timestamp: new Date()
      };

      expect(validator.shouldTerminateApplication()).toBe(false);
    });

    it('should return false when validation passed', () => {
      const validator = RuntimeEnvironmentValidator.getInstance({ terminateOnFailure: true });
      validator['validationResult'] = {
        isValid: true,
        errors: [],
        warnings: [],
        timestamp: new Date()
      };

      expect(validator.shouldTerminateApplication()).toBe(false);
    });
  });

  describe('logging', () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleInfoSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should log successful validation', () => {
      validator['validationResult'] = {
        isValid: true,
        errors: [],
        warnings: [],
        timestamp: new Date()
      };

      validator.logValidationResult();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation passed')
      );
    });

    it('should log failed validation with errors', () => {
      validator['validationResult'] = {
        isValid: false,
        errors: ['Test error'],
        warnings: ['Test warning'],
        timestamp: new Date()
      };

      validator.logValidationResult();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation failed')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💥 Validation errors:', ['Test error']
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Additional warnings:', ['Test warning']
      );
    });

    it('should warn when no validation result is available', () => {
      validator.logValidationResult();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No validation result available')
      );
    });
  });
});