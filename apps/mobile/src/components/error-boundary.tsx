import { Component, type ReactNode } from 'react';

import { reportError, type ErrorContext } from '@/lib/error-reporter';

import { ErrorFallback } from './error-fallback';

type ErrorBoundaryProps = {
  children: ReactNode;
  context?: ErrorContext;
  fallback?: ReactNode;
  onRetry?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * React class-component error boundary. Catches render errors in its
 * children, reports them via the error reporter, and renders a retry UI
 * instead of a blank screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    reportError(error, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.props.onRetry?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <ErrorFallback
        title="SOMETHING WENT WRONG"
        message={
          this.state.error?.message ??
          'The app hit an unexpected error. Tap retry to continue.'
        }
        actionLabel="TRY AGAIN"
        onRetry={this.handleRetry}
      />
    );
  }
}
