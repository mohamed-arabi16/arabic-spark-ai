import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Functional wrapper for translations
function ErrorFallbackUI({ 
  error, 
  onRetry, 
  onGoHome 
}: { 
  error: Error | null; 
  onRetry: () => void;
  onGoHome: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <div 
      className={`min-h-screen flex items-center justify-center bg-background p-4 ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t('errors.boundary.title', 'Something went wrong')}
          </h1>
          <p className="text-muted-foreground">
            {t('errors.boundary.description', 'An unexpected error occurred. Please try again.')}
          </p>
        </div>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="bg-muted/50 rounded-lg p-4 text-start">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('errors.boundary.retry', 'Try Again')}
          </Button>
          <Button 
            variant="outline"
            onClick={onGoHome}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            {t('errors.boundary.home', 'Go Home')}
          </Button>
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // In production, you could send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackUI 
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
