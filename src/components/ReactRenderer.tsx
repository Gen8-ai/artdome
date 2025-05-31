
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ESLintErrorHandler } from '@/utils/eslintErrorHandler';
import { 
  Bug, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Code2
} from 'lucide-react';

interface ReactRendererProps {
  code: string;
  onCodeUpdate?: (newCode: string) => void;
}

const ReactRenderer: React.FC<ReactRendererProps> = ({ code, onCodeUpdate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasErrors, setHasErrors] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const { toast } = useToast();
  const errorHandler = ESLintErrorHandler.getInstance();

  const createReactIframeContent = (reactCode: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Component Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #fff;
    }
    .error-display {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 14px;
    }
    .console-override {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #1f2937;
      color: #f9fafb;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      max-width: 300px;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="console-output"></div>
  
  <script type="text/babel">
    // Enhanced console override for error capture
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    window.capturedErrors = [];
    
    console.error = function(...args) {
      const errorMsg = args.join(' ');
      window.capturedErrors.push({
        type: 'error',
        message: errorMsg,
        timestamp: Date.now()
      });
      
      // Send to parent window
      window.parent.postMessage({
        type: 'console-error',
        message: errorMsg,
        errors: window.capturedErrors
      }, '*');
      
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const warnMsg = args.join(' ');
      window.capturedErrors.push({
        type: 'warning',
        message: warnMsg,
        timestamp: Date.now()
      });
      
      window.parent.postMessage({
        type: 'console-warning',
        message: warnMsg
      }, '*');
      
      originalConsoleWarn.apply(console, args);
    };

    // Error boundary component
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error: error.message };
      }

      componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
        
        window.parent.postMessage({
          type: 'react-error',
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }, '*');
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            className: 'error-display'
          }, [
            React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
            React.createElement('p', { key: 'message' }, this.state.error)
          ]);
        }
        return this.props.children;
      }
    }

    try {
      ${reactCode}
      
      // Try to render the component
      const rootElement = document.getElementById('root');
      
      if (typeof App !== 'undefined') {
        ReactDOM.render(
          React.createElement(ErrorBoundary, null, React.createElement(App)),
          rootElement
        );
      } else {
        // Try to find any React component in the code
        const componentMatch = \`${reactCode}\`.match(/(?:const|function)\\s+(\\w+)\\s*[=\\(]/);
        if (componentMatch) {
          const ComponentName = componentMatch[1];
          if (typeof window[ComponentName] !== 'undefined') {
            ReactDOM.render(
              React.createElement(ErrorBoundary, null, React.createElement(window[ComponentName])),
              rootElement
            );
          } else {
            // Try to evaluate the component
            try {
              const Component = eval(ComponentName);
              ReactDOM.render(
                React.createElement(ErrorBoundary, null, React.createElement(Component)),
                rootElement
              );
            } catch (e) {
              console.error('Could not render component:', e);
            }
          }
        } else {
          rootElement.innerHTML = '<div class="error-display">No valid React component found. Make sure to export a component named "App" or define a function component.</div>';
        }
      }
    } catch (error) {
      console.error('Failed to render React component:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Render Error</h3>
          <p>\${error.message}</p>
          <pre>\${error.stack}</pre>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  };

  const handleFixErrors = async () => {
    if (!hasErrors) return;
    
    setIsFixing(true);
    try {
      const fixedCode = await errorHandler.fixErrorsWithAI(code);
      if (onCodeUpdate) {
        onCodeUpdate(fixedCode);
      }
      
      toast({
        title: "Code Fixed!",
        description: "AI has attempted to fix the detected errors.",
      });
      
      // Refresh the iframe with fixed code
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = createReactIframeContent(fixedCode);
        }
      }, 500);
      
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Could not fix errors automatically.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const refreshIframe = () => {
    if (iframeRef.current) {
      errorHandler.clearErrors();
      setHasErrors(false);
      setErrorCount(0);
      iframeRef.current.srcdoc = createReactIframeContent(code);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console-error' || event.data.type === 'react-error') {
        setHasErrors(true);
        setErrorCount(prev => prev + 1);
        
        // Add to error handler
        errorHandler.addError({
          line: 1, // We'd need more sophisticated parsing for actual line numbers
          column: 1,
          message: event.data.message,
          ruleId: event.data.type,
          severity: 2,
          source: code
        });
        
        toast({
          title: "Error Detected",
          description: event.data.message,
          variant: "destructive",
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [code, toast]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = createReactIframeContent(code);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Error Status Bar */}
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <div className="flex items-center space-x-2">
          {hasErrors ? (
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{errorCount} Error(s) Detected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">No Errors</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={refreshIframe}
            variant="ghost"
            size="sm"
            className="h-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {hasErrors && (
            <Button
              onClick={handleFixErrors}
              disabled={isFixing}
              variant="default"
              size="sm"
              className="h-8"
            >
              {isFixing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Bug className="w-4 h-4" />
              )}
              {isFixing ? 'Fixing...' : 'Fix with AI'}
            </Button>
          )}
        </div>
      </div>

      {/* React Component Iframe */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="React Component Preview"
      />
    </div>
  );
};

export default ReactRenderer;
