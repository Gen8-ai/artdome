import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AIService, ErrorSuggestion } from '@/services/ai/aiService';
import { e2bService } from '@/services/e2bService';

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
        return React.createElement(FallbackComponent, { 
          error: this.state.error, 
          retry: this.handleRetry 
        });
      }

      return React.createElement('div', { className: 'error-boundary-fallback' }, [
        React.createElement('h3', { key: 'title' }, 'Something went wrong'),
        React.createElement('p', { key: 'message' }, this.state.error.message),
        React.createElement('button', { 
          key: 'retry', 
          onClick: this.handleRetry 
        }, 'Try again')
      ]);
    }

    return this.props.children;
  }
}

export class ErrorBoundaryManager {
  private static instance: ErrorBoundaryManager;
  private errorReports: Map<string, number> = new Map();
  private aiService: AIService | null = null;
  private e2bErrorPatterns: Map<string, string> = new Map();

  static getInstance(): ErrorBoundaryManager {
    if (!ErrorBoundaryManager.instance) {
      ErrorBoundaryManager.instance = new ErrorBoundaryManager();
    }
    return ErrorBoundaryManager.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
    this.initializeE2BErrorPatterns();
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Convert error to string for reporting
      const errorMessage = typeof event.reason === 'string' 
        ? event.reason 
        : (event.reason instanceof Error ? event.reason.message : String(event.reason));
      
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

  private initializeE2BErrorPatterns() {
    this.e2bErrorPatterns.set('E2B_TIMEOUT', 'Code execution timeout - consider optimizing your code or breaking it into smaller chunks');
    this.e2bErrorPatterns.set('E2B_MEMORY', 'Memory limit exceeded - try processing data in smaller batches');
    this.e2bErrorPatterns.set('E2B_NETWORK', 'Network connectivity issue - check your connection and try again');
    this.e2bErrorPatterns.set('E2B_SETUP', 'Development environment setup failed - verify package names and dependencies');
    this.e2bErrorPatterns.set('E2B_SYNTAX', 'Code syntax error - check your code formatting and syntax');
  }

  setAIService(aiService: AIService): void {
    this.aiService = aiService;
  }

  reportError(message: string, stack?: string): void {
    // Track error frequency
    const count = this.errorReports.get(message) || 0;
    this.errorReports.set(message, count + 1);
    
    // Enhanced logging with E2B context
    console.error(`Error reported (${count + 1}x): ${message}`, {
      stack: stack || '',
      timestamp: new Date().toISOString(),
      e2bErrors: e2bService.getRecentErrors(3)
    });
    
    // Check if this is an E2B-related error
    const isE2BError = this.isE2BRelatedError(message);
    if (isE2BError) {
      console.log('E2B-related error detected, checking service status...');
      this.handleE2BError(message);
    }
    
    // If error happens frequently, consider sending to analytics
    if (count >= 3) {
      this.sendErrorToAnalytics(message, stack, isE2BError);
    }
  }

  private isE2BRelatedError(message: string): boolean {
    const e2bKeywords = ['E2B_', 'sandbox', 'execution', 'code-interpreter', 'edge function'];
    return e2bKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
  }

  private handleE2BError(message: string): void {
    // Extract error pattern from message
    for (const [pattern, suggestion] of this.e2bErrorPatterns.entries()) {
      if (message.includes(pattern)) {
        console.log(`E2B Error Pattern Detected: ${pattern}`);
        console.log(`Suggestion: ${suggestion}`);
        break;
      }
    }
    
    // Log recent E2B execution history for context
    const recentErrors = e2bService.getRecentErrors(5);
    if (recentErrors.length > 0) {
      console.log('Recent E2B errors:', recentErrors);
    }
  }

  private sendErrorToAnalytics(message: string, stack?: string, isE2BError: boolean = false): void {
    // Enhanced analytics reporting with E2B context
    console.log('Sending error to analytics:', {
      message,
      stack,
      isE2BError,
      frequency: this.errorReports.get(message) || 1,
      timestamp: new Date().toISOString(),
      e2bContext: isE2BError ? {
        recentErrors: e2bService.getRecentErrors(3),
        errorHistory: e2bService.getErrorHistory().slice(-10)
      } : null
    });
  }

  async generateErrorSuggestions(error: Error, code?: string): Promise<ErrorSuggestion[]> {
    if (!this.aiService) {
      // Check if it's an E2B error and provide specific suggestions
      const isE2BError = this.isE2BRelatedError(error.message);
      if (isE2BError) {
        return this.generateE2BSpecificSuggestions(error.message);
      }
      
      return [{
        type: 'logic',
        description: 'No AI service available for error suggestions',
        confidence: 0.1
      }];
    }

    try {
      // Enhanced error analysis with E2B context
      let enhancedErrorMessage = error.message;
      const isE2BError = this.isE2BRelatedError(error.message);
      
      if (isE2BError) {
        const recentE2BErrors = e2bService.getRecentErrors(3);
        enhancedErrorMessage += `\n\nE2B Context:\n${recentE2BErrors.map(e => `- ${e.type}: ${e.details}`).join('\n')}`;
      }
      
      const suggestions = await this.aiService.generateErrorSuggestions(enhancedErrorMessage, code);
      
      // Add E2B-specific suggestions if relevant
      if (isE2BError) {
        const e2bSuggestions = this.generateE2BSpecificSuggestions(error.message);
        return [...suggestions, ...e2bSuggestions];
      }
      
      return suggestions;
    } catch (err) {
      console.error('Failed to generate error suggestions:', err);
      return [{
        type: 'logic',
        description: 'Failed to generate suggestions',
        confidence: 0.1
      }];
    }
  }

  private generateE2BSpecificSuggestions(errorMessage: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    
    for (const [pattern, suggestion] of this.e2bErrorPatterns.entries()) {
      if (errorMessage.includes(pattern)) {
        suggestions.push({
          type: 'runtime',
          description: suggestion,
          confidence: 0.8,
          code: this.getE2BFixCode(pattern)
        });
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'runtime',
        description: 'E2B execution error - check code syntax and try again',
        confidence: 0.6
      });
    }
    
    return suggestions;
  }

  private getE2BFixCode(pattern: string): string | undefined {
    switch (pattern) {
      case 'E2B_TIMEOUT':
        return `
# Optimize code for better performance
import time

# Break large operations into smaller chunks
def process_in_chunks(data, chunk_size=1000):
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        # Process chunk
        yield chunk
`;
      case 'E2B_MEMORY':
        return `
# Process data in batches to reduce memory usage
def process_large_dataset(data):
    batch_size = 100
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        # Process batch and clear memory
        del batch
`;
      case 'E2B_SETUP':
        return `
# Install packages individually to identify issues
try:
    import package_name
except ImportError:
    !pip install package_name
    import package_name
`;
      default:
        return undefined;
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

  private attemptE2BAutoRecovery(errorMessage: string, code: string): string | null {
    // Simple auto-recovery for common E2B errors
    if (errorMessage.includes('E2B_TIMEOUT')) {
      // Add time.sleep() calls to prevent timeouts
      return code.replace(/for /g, 'for ').replace(/\n/g, '\n    time.sleep(0.01)\n');
    }
    
    if (errorMessage.includes('E2B_MEMORY')) {
      // Add garbage collection
      return `import gc\n${code}\ngc.collect()`;
    }
    
    return null;
  }

  createErrorBoundary(fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>): typeof ErrorBoundary {
    const BoundaryWithFallback = (props: ErrorBoundaryProps) => 
      React.createElement(ErrorBoundary, { ...props, fallback: fallbackComponent });
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
