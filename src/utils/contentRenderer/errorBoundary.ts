
import React, { ErrorInfo } from 'react';
import { aiGeneration } from './aiGeneration';

export interface ErrorReport {
  error: Error;
  errorInfo: ErrorInfo;
  componentStack: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  code?: string;
}

export interface ErrorSuggestion {
  type: 'fix' | 'workaround' | 'refactor';
  description: string;
  code?: string;
  confidence: number;
}

export class ErrorBoundaryManager {
  private static instance: ErrorBoundaryManager;
  private errorReports: ErrorReport[] = [];
  private errorPatterns = new Map<string, ErrorSuggestion[]>();

  static getInstance(): ErrorBoundaryManager {
    if (!ErrorBoundaryManager.instance) {
      ErrorBoundaryManager.instance = new ErrorBoundaryManager();
    }
    return ErrorBoundaryManager.instance;
  }

  constructor() {
    this.initializeErrorPatterns();
    this.setupGlobalErrorHandling();
  }

  // Comprehensive error boundaries
  createErrorBoundary(fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>) {
    return class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        
        // Report error to manager
        ErrorBoundaryManager.getInstance().reportError({
          error,
          errorInfo,
          componentStack: errorInfo.componentStack,
          timestamp: Date.now()
        });
      }

      retry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      };

      render() {
        if (this.state.hasError && this.state.error) {
          if (fallbackComponent) {
            const FallbackComponent = fallbackComponent;
            return React.createElement(FallbackComponent, {
              error: this.state.error,
              retry: this.retry
            });
          }

          return React.createElement('div', {
            style: {
              padding: '20px',
              border: '1px solid #ff6b6b',
              borderRadius: '8px',
              backgroundColor: '#fff5f5',
              color: '#c92a2a',
              fontFamily: 'monospace'
            }
          }, [
            React.createElement('h3', { key: 'title' }, '⚠️ Something went wrong'),
            React.createElement('p', { key: 'message' }, this.state.error.message),
            React.createElement('button', {
              key: 'retry',
              onClick: this.retry,
              style: {
                padding: '8px 16px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }
            }, 'Try Again')
          ]);
        }

        return this.props.children;
      }
    };
  }

  // AI-powered error resolution suggestions
  async generateErrorSuggestions(error: Error, code?: string): Promise<ErrorSuggestion[]> {
    console.log('Generating AI-powered error suggestions for:', error.message);

    // Check for known patterns first
    const knownSuggestions = this.getKnownSuggestions(error.message);
    if (knownSuggestions.length > 0) {
      return knownSuggestions;
    }

    // Use AI to generate suggestions
    try {
      const prompt = `
        Analyze this JavaScript/React error and provide 3 specific suggestions to fix it:
        
        Error: ${error.message}
        Stack: ${error.stack}
        ${code ? `Code context: ${code.substring(0, 1000)}` : ''}
        
        Provide suggestions in this format:
        1. [TYPE]: Description - Code example (if applicable)
        2. [TYPE]: Description - Code example (if applicable)
        3. [TYPE]: Description - Code example (if applicable)
        
        Types can be: FIX (direct solution), WORKAROUND (temporary solution), REFACTOR (structural change)
      `;

      const response = await aiGeneration.generateCode({
        prompt,
        context: { error: error.message, code: code || '' },
        maxTokens: 800
      });

      return this.parseAISuggestions(response.code);
    } catch (aiError) {
      console.error('Failed to generate AI suggestions:', aiError);
      return this.getFallbackSuggestions(error);
    }
  }

  // Automatic error recovery
  async attemptAutoRecovery(error: Error, code: string): Promise<string | null> {
    console.log('Attempting automatic error recovery...');

    const suggestions = await this.generateErrorSuggestions(error, code);
    const fixSuggestions = suggestions.filter(s => s.type === 'fix' && s.confidence > 0.8);

    if (fixSuggestions.length > 0 && fixSuggestions[0].code) {
      console.log('Applying automatic fix:', fixSuggestions[0].description);
      return this.applyAutoFix(code, fixSuggestions[0]);
    }

    return null;
  }

  // Detailed debugging information
  generateDebugInfo(error: Error, code?: string): object {
    return {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        codePreview: code ? code.substring(0, 500) : 'N/A'
      },
      suggestions: this.getKnownSuggestions(error.message),
      similarErrors: this.findSimilarErrors(error.message)
    };
  }

  reportError(report: ErrorReport): void {
    this.errorReports.push(report);
    
    // Keep only last 50 error reports
    if (this.errorReports.length > 50) {
      this.errorReports = this.errorReports.slice(-50);
    }

    console.error('Error reported:', report);
    
    // Generate suggestions asynchronously
    this.generateErrorSuggestions(report.error, report.code).then(suggestions => {
      console.log('Generated suggestions:', suggestions);
    });
  }

  private initializeErrorPatterns(): void {
    // Common React/JavaScript error patterns and their solutions
    this.errorPatterns.set('Cannot read property', [
      {
        type: 'fix',
        description: 'Add null/undefined check before accessing property',
        code: 'object?.property || object && object.property',
        confidence: 0.9
      }
    ]);

    this.errorPatterns.set('is not a function', [
      {
        type: 'fix',
        description: 'Check if the variable is actually a function before calling',
        code: 'typeof func === "function" && func()',
        confidence: 0.85
      }
    ]);

    this.errorPatterns.set('Cannot read properties of undefined', [
      {
        type: 'fix',
        description: 'Use optional chaining or null checks',
        code: 'object?.property?.nestedProperty',
        confidence: 0.9
      }
    ]);

    this.errorPatterns.set('Each child in a list should have a unique "key"', [
      {
        type: 'fix',
        description: 'Add unique key prop to list items',
        code: 'items.map((item, index) => <Item key={item.id || index} />)',
        confidence: 0.95
      }
    ]);
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.reportError({
          error: event.error,
          errorInfo: { componentStack: '' },
          componentStack: '',
          timestamp: Date.now()
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.reportError({
          error: new Error(String(event.reason)),
          errorInfo: { componentStack: '' },
          componentStack: '',
          timestamp: Date.now()
        });
      });
    }
  }

  private getKnownSuggestions(errorMessage: string): ErrorSuggestion[] {
    for (const [pattern, suggestions] of this.errorPatterns.entries()) {
      if (errorMessage.includes(pattern)) {
        return suggestions;
      }
    }
    return [];
  }

  private parseAISuggestions(aiResponse: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    const lines = aiResponse.split('\n');

    lines.forEach(line => {
      const match = line.match(/\d+\.\s*\[(\w+)\]:\s*(.+?)(?:\s*-\s*(.+))?/);
      if (match) {
        const [, type, description, code] = match;
        suggestions.push({
          type: type.toLowerCase() as 'fix' | 'workaround' | 'refactor',
          description: description.trim(),
          code: code?.trim(),
          confidence: 0.7
        });
      }
    });

    return suggestions;
  }

  private getFallbackSuggestions(error: Error): ErrorSuggestion[] {
    return [
      {
        type: 'workaround',
        description: 'Try refreshing the page or restarting the application',
        confidence: 0.3
      },
      {
        type: 'fix',
        description: 'Check the browser console for more detailed error information',
        confidence: 0.5
      }
    ];
  }

  private applyAutoFix(code: string, suggestion: ErrorSuggestion): string {
    // Simplified auto-fix application
    if (suggestion.code) {
      // This would need more sophisticated AST manipulation in production
      return code.replace(/object\.property/g, 'object?.property');
    }
    return code;
  }

  private findSimilarErrors(errorMessage: string): ErrorReport[] {
    return this.errorReports.filter(report => 
      report.error.message.includes(errorMessage.split(' ')[0]) ||
      errorMessage.includes(report.error.message.split(' ')[0])
    ).slice(0, 3);
  }

  getErrorReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  clearErrorReports(): void {
    this.errorReports = [];
  }
}

export const errorBoundaryManager = ErrorBoundaryManager.getInstance();
