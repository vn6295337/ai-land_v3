import React, { ReactNode } from 'react';
import { StartupValidationProvider, ValidationStatus } from './03-startup-validator';
import { EnvironmentErrorBoundary } from './04-environment-error-boundary';

interface AppWrapperProps {
  children: ReactNode;
  enableValidation?: boolean;
  validationOptions?: {
    terminateOnFailure?: boolean;
    showDebugInfo?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
  };
}

export const AppWrapper: React.FC<AppWrapperProps> = ({
  children,
  enableValidation = true,
  validationOptions = {}
}) => {
  // If validation is disabled, just render children with error boundary
  if (!enableValidation) {
    return (
      <EnvironmentErrorBoundary>
        {children}
      </EnvironmentErrorBoundary>
    );
  }

  const defaultOptions = {
    terminateOnFailure: true,
    showDebugInfo: process.env.NODE_ENV === 'development' || import.meta.env?.DEV,
    retryAttempts: 3,
    retryDelay: 1000,
    ...validationOptions
  };

  return (
    <EnvironmentErrorBoundary
      onError={(error, errorInfo) => {
        // Log detailed error information for debugging
        console.error('🚨 Application Error in Environment Boundary:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        });

        // In production, you might want to send this to an error tracking service
        if (!defaultOptions.showDebugInfo) {
          // Example: Sentry.captureException(error, { contexts: { errorInfo } });
        }
      }}
    >
      <StartupValidationProvider
        options={defaultOptions}
        fallback={<ValidationLoadingFallback />}
      >
        <>
          {children}
          <ValidationStatus />
        </>
      </StartupValidationProvider>
    </EnvironmentErrorBoundary>
  );
};

const ValidationLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
    <div className="text-center space-y-6 max-w-md">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl">⚙️</div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Initializing Application
        </h2>
        <p className="text-muted-foreground">
          Validating environment configuration...
        </p>
      </div>

      <div className="flex justify-center space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-100"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-200"></div>
      </div>

      <p className="text-xs text-muted-foreground">
        This should only take a moment
      </p>
    </div>
  </div>
);

// Higher-order component for easy integration
export function withEnvironmentValidation<P extends object>(
  Component: React.ComponentType<P>,
  options?: AppWrapperProps['validationOptions']
) {
  return function WrappedComponent(props: P) {
    return (
      <AppWrapper validationOptions={options}>
        <Component {...props} />
      </AppWrapper>
    );
  };
}

// Hook for accessing validation status in components
export { useValidation } from './03-startup-validator';