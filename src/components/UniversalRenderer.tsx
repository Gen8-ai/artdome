
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { contentRenderer, ContentBlock, RenderingOptions } from '@/utils/contentRenderer';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Bug,
  Eye,
  Code2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    setDebugInfo({
      renderTime: Date.now(),
      blockType: block.type,
      codeLength: block.code.length,
      hasMetadata: !!block.metadata
    });

    try {
      console.log(`[ContentRenderer] Rendering ${block.type} content:`, {
        id: block.id,
        type: block.type,
        codeLength: block.code.length,
        title: block.title
      });

      const htmlContent = contentRenderer.generateHtmlDocument(block, defaultOptions);
      
      console.log(`[ContentRenderer] Generated HTML document (${htmlContent.length} chars)`);
      
      iframeRef.current.srcdoc = htmlContent;
      
      // Set a timeout to stop loading state
      const loadingTimeout = setTimeout(() => {
        console.log(`[ContentRenderer] Loading timeout reached for ${block.type}`);
        setIsLoading(false);
        onSuccess?.();
      }, Math.min(defaultOptions.timeout || 5000, 5000));

      // Clear timeout on unmount
      return () => clearTimeout(loadingTimeout);
    } catch (error) {
      console.error('[ContentRenderer] Failed to render content:', error);
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
    console.log('[ContentRenderer] Manual refresh triggered');
    renderContent();
  };

  const handleIframeLoad = () => {
    console.log('[ContentRenderer] Iframe loaded successfully');
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
    
    console.log('[ContentRenderer] Received message:', data.type, data);
    
    if (data.type?.startsWith('console-')) {
      setConsoleLogs(prev => [...prev.slice(-19), data]); // Keep last 20 logs
      
      if (data.type === 'console-error') {
        setHasErrors(true);
        setErrorLogs(prev => [...prev.slice(-9), data]); // Keep last 10 errors
        
        if (!isMobile) { // Reduce toast spam on mobile
          toast({
            title: "Console Error",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } else if (data.type === 'react-error' || data.type === 'runtime-error') {
      setHasErrors(true);
      setErrorLogs(prev => [...prev.slice(-9), data]);
      
      toast({
        title: "Runtime Error",
        description: data.message,
        variant: "destructive",
      });
    } else if (data.type === 'promise-rejection') {
      setHasErrors(true);
      setErrorLogs(prev => [...prev.slice(-9), data]);
      
      toast({
        title: "Promise Rejection",
        description: data.message,
        variant: "destructive",
      });
    }
  };

  const handleDebugClick = () => {
    const debugData = {
      block,
      errorLogs,
      consoleLogs,
      debugInfo,
      iframeState: {
        src: iframeRef.current?.src,
        loaded: !isLoading
      }
    };
    
    console.group('[ContentRenderer] Debug Information');
    console.log('Block:', block);
    console.log('Error Logs:', errorLogs);
    console.log('Console Logs:', consoleLogs);
    console.log('Debug Info:', debugInfo);
    console.log('Full Debug Data:', debugData);
    console.groupEnd();
    
    toast({
      title: "Debug Info",
      description: `Check console for detailed debug information. Errors: ${errorLogs.length}, Logs: ${consoleLogs.length}`,
    });
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
      <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-2'} bg-muted border-b`}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate`}>{getStatusText()}</span>
          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground px-2 py-1 bg-background rounded flex-shrink-0`}>
            {block.type.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCode(!showCode)}>
                  {showCode ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      View Render
                    </>
                  ) : (
                    <>
                      <Code2 className="w-4 h-4 mr-2" />
                      View Code
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                {hasErrors && (
                  <DropdownMenuItem onClick={handleDebugClick}>
                    <Bug className="w-4 h-4 mr-2" />
                    Debug ({errorLogs.length})
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
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
                  onClick={handleDebugClick}
                  variant="destructive"
                  size="sm"
                  className="h-8"
                >
                  <Bug className="w-4 h-4" />
                  {!isMobile && <span className="ml-1">Debug</span>}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      {showCode ? (
        <div className={`flex-1 ${isMobile ? 'p-3' : 'p-4'} bg-muted/30 overflow-auto`}>
          <div className="mb-2">
            <h3 className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{block.title}</h3>
            {block.description && (
              <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>{block.description}</p>
            )}
          </div>
          <pre className={`bg-background p-3 rounded border ${isMobile ? 'text-xs' : 'text-sm'} overflow-auto h-full`}>
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
