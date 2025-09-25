import { z } from 'zod';

// Zod schema for environment variable validation
export const EnvironmentSchema = z.object({
  // Core required variables
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .regex(/^https:\/\/[a-z0-9-]+\.supabase\.co$/, 'SUPABASE_URL must be a valid Supabase URL'),

  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY is required')
    .regex(/^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/, 'SUPABASE_ANON_KEY must be a valid JWT token'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Optional Supabase variables
  SUPABASE_SERVICE_KEY: z
    .string()
    .regex(/^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/, 'SUPABASE_SERVICE_KEY must be a valid JWT token')
    .optional(),

  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters')
    .optional(),

  SUPABASE_DB_URL: z
    .string()
    .url('SUPABASE_DB_URL must be a valid URL')
    .regex(/^postgres(ql)?:\/\//, 'SUPABASE_DB_URL must be a PostgreSQL connection string')
    .optional(),

  // Application configuration
  APP_NAME: z
    .string()
    .min(1, 'APP_NAME must not be empty')
    .max(100, 'APP_NAME must be less than 100 characters')
    .default('AI Models Dashboard'),

  APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-\w+)?$/, 'APP_VERSION must be a valid semantic version (e.g., 1.0.0)')
    .optional(),

  APP_URL: z
    .string()
    .url('APP_URL must be a valid URL')
    .optional(),

  API_BASE_URL: z
    .string()
    .url('API_BASE_URL must be a valid URL')
    .optional(),

  // Feature flags (boolean validation)
  ENABLE_ANALYTICS: z
    .string()
    .default('true')
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_ANALYTICS must be true/false, 1/0, or yes/no');
    }),

  ENABLE_DEBUG_MODE: z
    .string()
    .default('false')
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_DEBUG_MODE must be true/false, 1/0, or yes/no');
    }),

  ENABLE_TELEMETRY: z
    .string()
    .default('true')
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_TELEMETRY must be true/false, 1/0, or yes/no');
    }),

  ENABLE_ERROR_REPORTING: z
    .string()
    .default('true')
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_ERROR_REPORTING must be true/false, 1/0, or yes/no');
    }),

  // Third-party service IDs
  VERCEL_ANALYTICS_ID: z
    .string()
    .min(1, 'VERCEL_ANALYTICS_ID must not be empty')
    .optional(),

  SENTRY_DSN: z
    .string()
    .url('SENTRY_DSN must be a valid URL')
    .regex(/^https:\/\/[a-f0-9]+@[a-f0-9]+\.ingest\.sentry\.io\/[0-9]+$/, 'SENTRY_DSN must be a valid Sentry DSN')
    .optional(),

  LOGROCKET_ID: z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, 'LOGROCKET_ID must be in format "org/app"')
    .optional(),

  GOOGLE_ANALYTICS_ID: z
    .string()
    .regex(/^G-[A-Z0-9]{10}$/, 'GOOGLE_ANALYTICS_ID must be in format G-XXXXXXXXXX')
    .optional(),

  // Performance settings (numeric validation)
  MAX_BUNDLE_SIZE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('MAX_BUNDLE_SIZE must be a number');
      return num;
    })
    .pipe(z.number().min(500000, 'MAX_BUNDLE_SIZE must be at least 500KB').max(10000000, 'MAX_BUNDLE_SIZE must be less than 10MB'))
    .default('2000000')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),

  // Rate limiting (numeric validation)
  RATE_LIMIT_REQUESTS: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('RATE_LIMIT_REQUESTS must be a number');
      return num;
    })
    .pipe(z.number().min(1, 'RATE_LIMIT_REQUESTS must be at least 1').max(1000, 'RATE_LIMIT_REQUESTS must be less than 1000'))
    .default('100')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),

  RATE_LIMIT_WINDOW: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('RATE_LIMIT_WINDOW must be a number');
      return num;
    })
    .pipe(z.number().min(60, 'RATE_LIMIT_WINDOW must be at least 60 seconds').max(86400, 'RATE_LIMIT_WINDOW must be less than 24 hours'))
    .default('3600')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),

  // Caching settings
  CACHE_MAX_AGE: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('CACHE_MAX_AGE must be a number');
      return num;
    })
    .pipe(z.number().min(0, 'CACHE_MAX_AGE must be non-negative').max(604800, 'CACHE_MAX_AGE must be less than 1 week'))
    .default('3600')
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),

  // Array validation for CORS origins
  CORS_ORIGINS: z
    .string()
    .transform((val) => {
      if (!val || val.trim() === '') return [];

      const origins = val.split(',').map(origin => origin.trim());

      // Validate each origin is a valid URL or domain pattern
      for (const origin of origins) {
        if (origin === '*') continue; // Allow wildcard

        try {
          new URL(origin);
        } catch {
          // Check if it's a domain pattern (e.g., *.example.com)
          if (!/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(origin)) {
            throw new Error(`Invalid CORS origin: ${origin}`);
          }
        }
      }

      return origins;
    })
    .default('')
    .transform((val) => typeof val === 'string' ? (val === '' ? [] : val.split(',').map(s => s.trim())) : val),

  // Port validation
  PORT: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('PORT must be a number');
      return num;
    })
    .pipe(z.number().min(1, 'PORT must be at least 1').max(65535, 'PORT must be less than 65535'))
    .optional(),

  // Development settings
  ENABLE_HOT_RELOAD: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_HOT_RELOAD must be true/false, 1/0, or yes/no');
    })
    .default('true')
    .transform((val) => val === 'true'),

  ENABLE_SOURCE_MAPS: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_SOURCE_MAPS must be true/false, 1/0, or yes/no');
    })
    .default('true')
    .transform((val) => val === 'true'),

  // Security settings
  ENABLE_CSP: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_CSP must be true/false, 1/0, or yes/no');
    })
    .default('true')
    .transform((val) => val === 'true'),

  ENABLE_HSTS: z
    .string()
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      throw new Error('ENABLE_HSTS must be true/false, 1/0, or yes/no');
    })
    .default('true')
    .transform((val) => val === 'true'),
});

// Type inference from the schema
export type ValidatedEnvironment = z.infer<typeof EnvironmentSchema>;

// Validation function with comprehensive error handling
export function validateEnvironmentWithZod(env: Record<string, string | undefined>): ValidatedEnvironment {
  try {
    return EnvironmentSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });

      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }

    throw error;
  }
}

// Safe validation function that returns success/error result
export function safeValidateEnvironment(env: Record<string, string | undefined>): {
  success: boolean;
  data?: ValidatedEnvironment;
  errors?: string[];
} {
  try {
    const data = EnvironmentSchema.parse(env);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }

    return { success: false, errors: ['Unknown validation error'] };
  }
}

// Validation function for partial environment updates
export const PartialEnvironmentSchema = EnvironmentSchema.partial();

export function validatePartialEnvironment(env: Record<string, string | undefined>): Partial<ValidatedEnvironment> {
  return PartialEnvironmentSchema.parse(env);
}

// Helper function to get environment variable type information
export function getEnvironmentVariableInfo(key: keyof ValidatedEnvironment): {
  required: boolean;
  type: string;
  hasDefault: boolean;
  description?: string;
} {
  const shape = EnvironmentSchema.shape[key];

  if (!shape) {
    return { required: false, type: 'unknown', hasDefault: false };
  }

  // Check if it's optional
  const isOptional = shape.isOptional();

  // Check if it has a default
  const hasDefault = shape._def.defaultValue !== undefined;

  // Determine type
  let type = 'string';
  if (shape._def.innerType) {
    const innerType = shape._def.innerType;
    if (innerType === z.number()) type = 'number';
    if (innerType === z.boolean()) type = 'boolean';
  }

  return {
    required: !isOptional && !hasDefault,
    type,
    hasDefault,
  };
}

// Security validation helpers
export function containsSqlInjectionPatterns(value: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\/\*|\*\/|;|\||&)/g,
    /(union|concat|script|javascript|vbscript)/gi,
    /('|"|`|\\)/g
  ];

  return sqlPatterns.some(pattern => pattern.test(value));
}

export function containsXssPatterns(value: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<[^>]*?\s(on\w+|href|src)\s*=\s*["']?[^"']*?["']?[^>]*>/gi
  ];

  return xssPatterns.some(pattern => pattern.test(value));
}

export function validateSecurityPatterns(env: Record<string, string | undefined>): {
  isSecure: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  Object.entries(env).forEach(([key, value]) => {
    if (!value) return;

    if (containsSqlInjectionPatterns(value)) {
      warnings.push(`${key} contains potential SQL injection patterns`);
    }

    if (containsXssPatterns(value)) {
      warnings.push(`${key} contains potential XSS patterns`);
    }

    // Check for hardcoded secrets
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
      if (value.length < 16) {
        warnings.push(`${key} appears to be too short for a secure secret`);
      }
    }
  });

  return {
    isSecure: warnings.length === 0,
    warnings
  };
}