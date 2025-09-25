import React, { ErrorInfo, ReactNode } from 'react';
import { RuntimeEnvironmentValidator } from './02-runtime-validator';

interface EnvironmentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isEnvironmentError: boolean;
}

interface EnvironmentErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class EnvironmentErrorBoundary extends React.Component<
  EnvironmentErrorBoundaryProps,
  EnvironmentErrorBoundaryState
> {
  private validator: RuntimeEnvironmentValidator;

  constructor(props: EnvironmentErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isEnvironmentError: false,
    };

    this.validator = RuntimeEnvironmentValidator.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<EnvironmentErrorBoundaryState> {
    const isEnvironmentError = EnvironmentErrorBoundary.isEnvironmentRelatedError(error);

    return {
      hasError: true,
      error,
      isEnvironmentError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log the error
    console.error('🚨 Environment Error Boundary caught an error:', error);
    console.error('📍 Error Info:', errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log environment validation state for debugging
    const validationResult = this.validator.getValidationResult();
    if (validationResult) {
      console.error('🔍 Current validation state:', validationResult);
    }
  }

  private static isEnvironmentRelatedError(error: Error): boolean {
    const environmentKeywords = [
      'environment',
      'env',
      'supabase',
      'configuration',
      'config',
      'variable',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'NODE_ENV'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';

    return environmentKeywords.some(keyword =>
      errorMessage.includes(keyword) ||
      errorName.includes(keyword) ||
      errorStack.includes(keyword)
    );
  }

  private handleRetry = async () => {
    try {
      // Attempt to re-validate environment
      const result = await this.validator.validateWithRetry();

      if (result.isValid) {
        // Reset error boundary state
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isEnvironmentError: false,
        });
      } else {
        console.error('🚨 Retry failed: Environment is still invalid');
      }
    } catch (error) {
      console.error('🚨 Retry failed with error:', error);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render different UI based on error type
      if (this.state.isEnvironmentError) {
        return <EnvironmentErrorFallback
          error={this.state.error!}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />;
      }

      // Generic error fallback
      return <GenericErrorFallback
        error={this.state.error!}
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onReload: () => void;
}

const EnvironmentErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onReload,
}) => {
  const validator = RuntimeEnvironmentValidator.getInstance();
  const isDevelopment = !validator.isProduction();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="text-6xl mb-4">⚙️</div>

        <h1 className="text-2xl font-bold text-destructive">
          Environment Configuration Issue
        </h1>

        <p className="text-muted-foreground">
          The application encountered an environment-related error and cannot continue.
        </p>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-destructive mb-2">Error Details:</h3>
          <pre className="text-sm whitespace-pre-wrap text-destructive font-mono">
            {error.message}
          </pre>

          {isDevelopment && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">
                Stack Trace (Development)
              </summary>
              <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
          <h3 className="font-semibold text-blue-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Check your .env file contains all required variables</li>
            <li>Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct</li>
            <li>Ensure environment variables are properly formatted</li>
            <li>Restart your development server</li>
          </ol>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry Validation
          </button>

          <button
            onClick={onReload}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Reload Application
          </button>
        </div>
      </div>
    </div>
  );
};

interface GenericErrorFallbackProps extends ErrorFallbackProps {
  errorInfo: ErrorInfo | null;
}

const GenericErrorFallback: React.FC<GenericErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReload,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env?.DEV;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="text-6xl mb-4">💥</div>

        <h1 className="text-2xl font-bold text-destructive">
          Something went wrong
        </h1>

        <p className="text-muted-foreground">
          An unexpected error occurred. This might be related to your environment configuration.
        </p>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-left">
          <pre className="text-sm whitespace-pre-wrap text-destructive font-mono">
            {error.message}
          </pre>

          {isDevelopment && errorInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">
                Component Stack (Development)
              </summary>
              <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>

          <button
            onClick={onReload}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Reload Page
          </button>
        </div>

        {isDevelopment && (
          <p className="text-xs text-muted-foreground">
            Check the console for additional debugging information.
          </p>
        )}
      </div>
    </div>
  );
};