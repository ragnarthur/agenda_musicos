import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Sentry } from '../lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Sentry
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
    this.setState({ eventId });

    // Always log to console for debugging
    console.error('[ErrorBoundary]', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[100svh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ops! Algo deu errado
            </h1>
            <p className="text-muted mb-6">
              Desculpe, encontramos um erro inesperado. Nossa equipe foi notificada.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex min-h-[44px] items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar página
            </button>
            {this.state.eventId && (
              <p className="mt-4 text-xs text-gray-400">ID do erro: {this.state.eventId}</p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
