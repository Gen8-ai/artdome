import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AIService } from '@/services/ai/aiService';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Component error caught by ErrorBoundary:', error, errorInfo);
    errorBoundaryManager.reportError(error.message, errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <div className="error-boundary-fallback">
          <h3>Something went wrong</h3>
          <p>{this.state.error.message}</p>
          <button onClick={this.handleRetry}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export class ErrorBoundaryManager {
  private static instance: ErrorBoundaryManager;
  private errorReports: Map<string, number> = new Map();
  private aiService: AIService | null = null;

  static getInstance(): ErrorBoundaryManager {
    if (!ErrorBoundaryManager.instance) {
      ErrorBoundaryManager.instance = new ErrorBoundaryManager();
    }
    return ErrorBoundaryManager.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Convert error to string for reporting
      const errorMessage = typeof event.reason === 'string' 
        ? event.reason 
        : event.reason?.message || String(event.reason);
      
      this.reportError(errorMessage);
      event.preventDefault();
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      this.reportError(event.message, event.error?.stack);
      event.preventDefault();
    });
  }

  setAIService(aiService: AIService): void {
    this.aiService = aiService;
  }

  reportError(message: string, stack?: string): void {
    // Track error frequency
    const count = this.errorReports.get(message) || 0;
    this.errorReports.set(message, count + 1);
    
    // Log to console with stack trace if available
    console.error(`Error reported (${count + 1}x): ${message}`, stack || '');
    
    // If error happens frequently, consider sending to analytics
    if (count >= 3) {
      this.sendErrorToAnalytics(message, stack);
    }
  }

  private sendErrorToAnalytics(message: string, stack?: string): void {
    // Implement analytics reporting here
    console.log('Sending error to analytics:', message);
    
    // Example implementation with a hypothetical analytics service
    try {
      // analyticsService.trackError({
      //   message,
      //   stack,
      //   timestamp: new Date().toISOString(),
      //   frequency: this.errorReports.get(message) || 1
      // });
    } catch (err) {
      console.error('Failed to send error to analytics:', err);
    }
  }

  async generateErrorSuggestions(error: Error, code?: string): Promise<string[]> {
    if (!this.aiService) {
      return ['No AI service available for error suggestions'];
    }

    try {
      const suggestions = await this.aiService.generateErrorSuggestions(error.message, code);
      return suggestions;
    } catch (err) {
      console.error('Failed to generate error suggestions:', err);
      return ['Failed to generate suggestions'];
    }
  }

  async attemptAutoRecovery(error: Error, code: string): Promise<string | null> {
    if (!this.aiService) {
      return null;
    }

    try {
      const fixedCode = await this.aiService.fixCode(code, error.message);
      return fixedCode;
    } catch (err) {
      console.error('Auto-recovery failed:', err);
      return null;
    }
  }

  createErrorBoundary(fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>): typeof ErrorBoundary {
    const BoundaryWithFallback = (props: ErrorBoundaryProps) => (
      <ErrorBoundary {...props} fallback={fallbackComponent} />
    );
    return BoundaryWithFallback as unknown as typeof ErrorBoundary;
  }

  clearErrorReports(): void {
    this.errorReports.clear();
  }

  getErrorReports(): Map<string, number> {
    return new Map(this.errorReports);
  }
}

export const errorBoundaryManager = ErrorBoundaryManager.getInstance();
