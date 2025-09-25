import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RuntimeEnvironmentValidator, ValidationResult } from './02-runtime-validator';

interface ValidationContextType {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  error: string | null;
  retry: () => Promise<void>;
}

const ValidationContext = createContext<ValidationContextType | null>(null);

interface StartupValidationProviderProps {
  children: ReactNode;
  options?: {
    terminateOnFailure?: boolean;
    showDebugInfo?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
  };
  fallback?: ReactNode;
}

export const StartupValidationProvider: React.FC<StartupValidationProviderProps> = ({
  children,
  options,
  fallback
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validator] = useState(() => RuntimeEnvironmentValidator.getInstance(options));

  const performValidation = async () => {
    try {
      setIsValidating(true);
      setError(null);

      const result = await validator.validateWithRetry();
      setValidationResult(result);

      if (result.isValid) {
        validator.logValidationResult();
      } else {
        validator.logValidationResult();

        if (validator.shouldTerminateApplication()) {
          setError(validator.createErrorBoundaryMessage());
          return;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
      setError(errorMessage);
      console.error('🚨 Startup validation failed:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const retry = async () => {
    await performValidation();
  };

  useEffect(() => {
    performValidation();
  }, []);

  const contextValue: ValidationContextType = {
    isValidating,
    validationResult,
    error,
    retry
  };

  // Show loading state during validation
  if (isValidating) {
    return fallback || <ValidationLoadingScreen />;
  }

  // Show error state if validation failed and should terminate
  if (error && validator.shouldTerminateApplication()) {
    return <ValidationErrorScreen error={error} onRetry={retry} />;
  }

  // Validation passed or non-critical failure - render app
  return (
    <ValidationContext.Provider value={contextValue}>
      {children}
    </ValidationContext.Provider>
  );
};

const ValidationLoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <h2 className="text-xl font-semibold">Validating Environment</h2>
      <p className="text-muted-foreground">Checking system configuration...</p>
    </div>
  </div>
);

interface ValidationErrorScreenProps {
  error: string;
  onRetry: () => Promise<void>;
}

const ValidationErrorScreen: React.FC<ValidationErrorScreenProps> = ({ error, onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="text-6xl mb-4">🚨</div>

        <h1 className="text-2xl font-bold text-destructive">
          Configuration Error
        </h1>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-left">
          <pre className="text-sm whitespace-pre-wrap text-destructive font-mono">
            {error}
          </pre>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center space-x-2"
          >
            {retrying && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            )}
            <span>{retrying ? 'Retrying...' : 'Retry'}</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Reload Page
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          If this error persists, please check the console for additional details.
        </p>
      </div>
    </div>
  );
};

export const useValidation = (): ValidationContextType => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a StartupValidationProvider');
  }
  return context;
};

// Development validation status component
export const ValidationStatus: React.FC = () => {
  const { validationResult } = useValidation();

  // Only show in development
  if (!import.meta.env?.DEV && process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!validationResult) {
    return null;
  }

  const hasWarnings = validationResult.warnings.length > 0;
  const statusColor = validationResult.isValid
    ? hasWarnings ? 'bg-yellow-500' : 'bg-green-500'
    : 'bg-red-500';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${statusColor} text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2`}>
        <div className={`w-2 h-2 rounded-full bg-white ${!validationResult.isValid ? 'animate-pulse' : ''}`}></div>
        <span>
          {validationResult.isValid ? 'ENV OK' : 'ENV ERROR'}
          {hasWarnings && ' (⚠️)'}
        </span>
      </div>
    </div>
  );
};