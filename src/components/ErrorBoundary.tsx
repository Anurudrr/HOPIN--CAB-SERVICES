import { Component, ReactNode, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  static getDerivedStateFromProps(props: Props, state: State): State {
    if (props.error && !state.hasError) {
      return { hasError: true, error: props.error, errorInfo: null };
    }
    return state;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
    this.props.resetErrorBoundary?.();
  };

  render() {
    const hasError = this.state.hasError || !!this.props.error;
    const error = this.state.error || this.props.error;

    if (hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center bg-white border-b-2 border-black px-4 py-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md text-center">
            <div className="mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white font-black text-2xl">
                !
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-black border-b-2 border-black pb-4">
              Error
            </h1>

            <p className="text-lg text-black font-medium mb-2">
              {error?.message || 'Something went wrong'}
            </p>

            {import.meta.env.DEV && error?.stack && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-mono text-gray-600 hover:text-black">
                  Stack trace (dev only)
                </summary>
                <pre className="mt-2 overflow-auto bg-gray-100 p-2 text-xs border border-gray-300 rounded">
                  {error.stack}
                </pre>
              </details>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-white hover:text-black transition-colors shadow-soft"
                aria-label="Try again"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-black hover:text-white transition-colors shadow-soft"
                aria-label="Return to home"
              >
                Go Home
              </button>
            </div>

            <p className="mt-8 text-sm text-gray-600 border-t-2 border-black pt-4">
              If this problem persists, please{' '}
              <a href="/contact" className="font-bold underline hover:no-underline">
                contact support
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for route-level error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
