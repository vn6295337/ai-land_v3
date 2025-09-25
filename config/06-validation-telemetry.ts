import { ValidationResult } from './02-runtime-validator';

export interface ValidationTelemetryEvent {
  type: 'validation_success' | 'validation_failure' | 'validation_retry' | 'validation_recovery';
  timestamp: Date;
  environment: 'development' | 'production' | 'test';
  details: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    retryAttempt?: number;
    totalRetries?: number;
    validationDuration?: number;
    errors?: string[];
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
  };
}

export class ValidationTelemetry {
  private static instance: ValidationTelemetry | null = null;
  private sessionId: string;
  private isProduction: boolean;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production' && !import.meta.env?.DEV;
  }

  public static getInstance(): ValidationTelemetry {
    if (!ValidationTelemetry.instance) {
      ValidationTelemetry.instance = new ValidationTelemetry();
    }
    return ValidationTelemetry.instance;
  }

  public trackValidationResult(result: ValidationResult, duration?: number): void {
    const event: ValidationTelemetryEvent = {
      type: result.isValid ? 'validation_success' : 'validation_failure',
      timestamp: result.timestamp,
      environment: this.getEnvironmentType(),
      details: {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        validationDuration: duration,
        errors: this.isProduction ? undefined : result.errors,
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }
    };

    this.sendTelemetryEvent(event);
  }

  public trackValidationRetry(attemptNumber: number, totalAttempts: number, error?: string): void {
    const event: ValidationTelemetryEvent = {
      type: 'validation_retry',
      timestamp: new Date(),
      environment: this.getEnvironmentType(),
      details: {
        isValid: false,
        errorCount: error ? 1 : 0,
        warningCount: 0,
        retryAttempt: attemptNumber,
        totalRetries: totalAttempts,
        errors: this.isProduction || !error ? undefined : [error],
        sessionId: this.sessionId,
      }
    };

    this.sendTelemetryEvent(event);
  }

  public trackValidationRecovery(finalResult: ValidationResult, totalRetries: number): void {
    const event: ValidationTelemetryEvent = {
      type: 'validation_recovery',
      timestamp: finalResult.timestamp,
      environment: this.getEnvironmentType(),
      details: {
        isValid: finalResult.isValid,
        errorCount: finalResult.errors.length,
        warningCount: finalResult.warnings.length,
        totalRetries,
        sessionId: this.sessionId,
      }
    };

    this.sendTelemetryEvent(event);
  }

  private sendTelemetryEvent(event: ValidationTelemetryEvent): void {
    try {
      // In development, log to console
      if (!this.isProduction) {
        console.info('📊 Validation Telemetry:', event);
        return;
      }

      // In production, send to analytics service
      this.sendToAnalyticsService(event);

    } catch (error) {
      // Silently fail telemetry to not interfere with app functionality
      if (!this.isProduction) {
        console.warn('⚠️ Failed to send validation telemetry:', error);
      }
    }
  }

  private sendToAnalyticsService(event: ValidationTelemetryEvent): void {
    // Option 1: Send to Vercel Analytics (if available)
    if (typeof window !== 'undefined' && (window as any).va) {
      (window as any).va('track', 'Environment Validation', {
        type: event.type,
        environment: event.environment,
        isValid: event.details.isValid,
        errorCount: event.details.errorCount,
        warningCount: event.details.warningCount,
        retryAttempt: event.details.retryAttempt,
      });
    }

    // Option 2: Send to custom analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/telemetry/validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently ignore telemetry failures
      });
    }

    // Option 3: Send to third-party service (e.g., Sentry, LogRocket)
    this.sendToErrorTrackingService(event);
  }

  private sendToErrorTrackingService(event: ValidationTelemetryEvent): void {
    // Example: Sentry integration
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;

      if (event.type === 'validation_failure') {
        Sentry.captureMessage('Environment validation failed', {
          level: 'error',
          tags: {
            environment: event.environment,
            session: this.sessionId,
          },
          extra: event.details,
        });
      } else if (event.type === 'validation_recovery') {
        Sentry.addBreadcrumb({
          category: 'environment',
          message: 'Environment validation recovered',
          level: 'info',
          data: event.details,
        });
      }
    }
  }

  private getEnvironmentType(): 'development' | 'production' | 'test' {
    if (process.env.NODE_ENV === 'test' || import.meta.env?.MODE === 'test') {
      return 'test';
    }

    if (this.isProduction) {
      return 'production';
    }

    return 'development';
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get aggregated telemetry data for reporting
  public getSessionTelemetry(): { sessionId: string; environment: string; startTime: Date } {
    return {
      sessionId: this.sessionId,
      environment: this.getEnvironmentType(),
      startTime: new Date(), // In real implementation, this would be tracked
    };
  }

  // Method for cleanup
  public static reset(): void {
    ValidationTelemetry.instance = null;
  }
}

// Convenience functions for easy integration
export const trackValidationResult = (result: ValidationResult, duration?: number) => {
  ValidationTelemetry.getInstance().trackValidationResult(result, duration);
};

export const trackValidationRetry = (attemptNumber: number, totalAttempts: number, error?: string) => {
  ValidationTelemetry.getInstance().trackValidationRetry(attemptNumber, totalAttempts, error);
};

export const trackValidationRecovery = (finalResult: ValidationResult, totalRetries: number) => {
  ValidationTelemetry.getInstance().trackValidationRecovery(finalResult, totalRetries);
};