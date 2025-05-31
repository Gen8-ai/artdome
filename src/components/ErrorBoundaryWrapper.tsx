
import React from 'react';
import { errorBoundaryManager } from '@/utils/contentRenderer/errorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Code } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => {
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const errorSuggestions = await errorBoundaryManager.generateErrorSuggestions(error);
        setSuggestions(errorSuggestions);
      } catch (err) {
        console.error('Failed to load error suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="max-w-md w-full space-y-4">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Something went wrong</h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-mono">{error.message}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-muted-foreground">Analyzing error...</span>
          </div>
        ) : suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Code className="w-4 h-4 mr-2" />
              AI Suggestions
            </h4>
            {suggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">{suggestion.type.toUpperCase()}:</span> {suggestion.description}
                </p>
                {suggestion.code && (
                  <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-x-auto">
                    <code>{suggestion.code}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-2">
          <Button onClick={retry} variant="outline" size="sm" className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({ children }) => {
  const ErrorBoundary = errorBoundaryManager.createErrorBoundary(ErrorFallback);
  
  return React.createElement(ErrorBoundary, {}, children);
};

export default ErrorBoundaryWrapper;
