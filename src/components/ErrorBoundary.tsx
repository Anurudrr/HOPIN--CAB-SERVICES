import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  stack?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (Sentry, LogRocket, etc)
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload() {
    window.location.href = '/';
  }

  handleReloadPage() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center bg-white border-b-2 border-black px-4 py-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white font-black text-2xl">
                !
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-black border-b-2 border-black pb-4">
              Error
            </h1>

            {/* Error Message */}
            <p className="text-lg text-black font-medium mb-2">
              {this.state.message || 'Something went wrong'}
            </p>

            {/* Dev-only stack trace */}
            {import.meta.env.DEV && this.state.stack && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-mono text-gray-600 hover:text-black">
                  Stack trace (dev only)
                </summary>
                <pre className="mt-2 overflow-auto bg-gray-100 p-2 text-xs border border-gray-300 rounded">
                  {this.state.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => this.handleReloadPage()}
                className="flex-1 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-white hover:text-black transition-colors shadow-soft"
                aria-label="Reload the page"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.handleReload()}
                className="flex-1 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-black hover:text-white transition-colors shadow-soft"
                aria-label="Return to home"
              >
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-8 text-sm text-gray-600 border-t-2 border-black pt-4">
              If this problem persists, please{' '}
              <a
                href="/contact"
                className="font-bold underline hover:no-underline"
              >
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
