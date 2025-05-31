
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { contentRenderer, ContentBlock, RenderingOptions } from '@/utils/contentRenderer';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Bug,
  Eye,
  Code2
} from 'lucide-react';

interface UniversalRendererProps {
  block: ContentBlock;
  options?: RenderingOptions;
  onError?: (error: any) => void;
  onSuccess?: () => void;
}

const UniversalRenderer: React.FC<UniversalRendererProps> = ({ 
  block, 
  options = {}, 
  onError, 
  onSuccess 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [showCode, setShowCode] = useState(false);
  const { toast } = useToast();

  const defaultOptions: RenderingOptions = {
    theme: 'light',
    enableConsoleCapture: true,
    enableErrorBoundary: true,
    sandboxPolicy: ['allow-scripts', 'allow-same-origin', 'allow-forms'],
    timeout: 10000,
    ...options
  };

  const renderContent = () => {
    if (!iframeRef.current || !block) return;
    
    setIsLoading(true);
    setHasErrors(false);
    setErrorLogs([]);
    setConsoleLogs([]);

    try {
      const htmlContent = contentRenderer.generateHtmlDocument(block, defaultOptions);
      iframeRef.current.srcdoc = htmlContent;
      
      // Set a timeout to stop loading state
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
        onSuccess?.();
      }, Math.min(defaultOptions.timeout || 5000, 5000));

      // Clear timeout on unmount
      return () => clearTimeout(loadingTimeout);
    } catch (error) {
      console.error('Failed to render content:', error);
      setHasErrors(true);
      setIsLoading(false);
      onError?.(error);
      
      toast({
        title: "Rendering Error",
        description: error instanceof Error ? error.message : "Failed to render content",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    renderContent();
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    onSuccess?.();
  };

  const handleMessage = (event: MessageEvent) => {
    // Only handle messages from our iframe
    if (event.source !== iframeRef.current?.contentWindow) {
      return;
    }

    const { data } = event;
    
    if (!data || typeof data !== 'object') {
      return;
    }
    
    if (data.type?.startsWith('console-')) {
      setConsoleLogs(prev => [...prev, data]);
      
      if (data.type === 'console-error') {
        setHasErrors(true);
        setErrorLogs(prev => [...prev, data]);
        
        toast({
          title: "Console Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } else if (data.type === 'react-error' || data.type === 'runtime-error') {
      setHasErrors(true);
      setErrorLogs(prev => [...prev, data]);
      
      toast({
        title: "Runtime Error",
        description: data.message,
        variant: "destructive",
      });
    } else if (data.type === 'promise-rejection') {
      setHasErrors(true);
      setErrorLogs(prev => [...prev, data]);
      
      toast({
        title: "Promise Rejection",
        description: data.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    renderContent();
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [block]);

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (hasErrors) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (hasErrors) return `${errorLogs.length} Error(s)`;
    return 'Ready';
  };

  if (!block) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No content to render</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
          <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
            {block.type.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            onClick={() => setShowCode(!showCode)}
            variant={showCode ? "default" : "ghost"}
            size="sm"
            className="h-8"
          >
            {showCode ? <Eye className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="h-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {hasErrors && (
            <Button
              onClick={() => {
                console.log('Error Logs:', errorLogs);
                console.log('Console Logs:', consoleLogs);
              }}
              variant="destructive"
              size="sm"
              className="h-8"
            >
              <Bug className="w-4 h-4" />
              Debug
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {showCode ? (
        <div className="flex-1 p-4 bg-muted/30">
          <div className="mb-2">
            <h3 className="text-sm font-semibold">{block.title}</h3>
            {block.description && (
              <p className="text-xs text-muted-foreground">{block.description}</p>
            )}
          </div>
          <pre className="bg-background p-3 rounded border text-sm overflow-auto h-full">
            <code>{block.code}</code>
          </pre>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          className="flex-1 w-full border-0"
          sandbox={defaultOptions.sandboxPolicy?.join(' ') || 'allow-scripts allow-same-origin allow-forms'}
          title={block.title || `${block.type} Content`}
          onLoad={handleIframeLoad}
        />
      )}
    </div>
  );
};

export default UniversalRenderer;
