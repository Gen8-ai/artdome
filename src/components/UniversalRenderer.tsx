
import React, { useRef, useEffect, useState } from 'react';
import { ContentBlock, RenderingOptions, contentRenderer } from '@/utils/contentRenderer';
import { pipelineManager } from '@/utils/pipelineManager';
import ReactRenderer from './ReactRenderer';

interface UniversalRendererProps {
  block: ContentBlock;
  options?: RenderingOptions;
  onCompilationStart?: () => void;
  onCompilationEnd?: () => void;
}

const UniversalRenderer: React.FC<UniversalRendererProps> = ({ 
  block, 
  options = {},
  onCompilationStart,
  onCompilationEnd
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIframeMounted, setIsIframeMounted] = useState(false);

  useEffect(() => {
    const renderContent = async () => {
      // Wait for iframe to be mounted
      if (!isIframeMounted || !iframeRef.current) {
        console.log('Iframe not ready, waiting...');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        onCompilationStart?.();

        console.log('Starting content compilation for type:', block.type);
        
        // Use pipeline manager to execute rendering steps
        const htmlContent = await pipelineManager.executeStage('preview', async () => {
          // Special handling for artifact type
          if (block.type === 'artifact') {
            return await renderArtifactContent(block);
          } else {
            return await contentRenderer.generateHtmlDocument(block, {
              ...options,
              useCompilation: true
            });
          }
        });

        // Double-check the ref is still valid before setting srcdoc
        if (iframeRef.current && htmlContent) {
          iframeRef.current.srcdoc = htmlContent;
          console.log('Content rendered successfully');
        }
      } catch (err) {
        console.error('Rendering error:', err);
        setError(err instanceof Error ? err.message : 'Rendering failed');
        
        // Set error content in iframe
        if (iframeRef.current) {
          iframeRef.current.srcdoc = createErrorContent(err instanceof Error ? err.message : 'Rendering failed');
        }
      } finally {
        setIsLoading(false);
        onCompilationEnd?.();
      }
    };

    renderContent();
  }, [block, options, isIframeMounted, onCompilationStart, onCompilationEnd]);

  // Handle iframe mount/unmount
  const handleIframeRef = (iframe: HTMLIFrameElement | null) => {
    if (iframe) {
      setIsIframeMounted(true);
    } else {
      setIsIframeMounted(false);
    }
  };

  // Handle special cases
  if (block.type === 'react' && !options.useCompilation) {
    return <ReactRenderer code={block.code} />;
  }

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Rendering Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setIsLoading(false);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Compiling and rendering...</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={(iframe) => {
        iframeRef.current = iframe;
        handleIframeRef(iframe);
      }}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-forms allow-same-origin"
      title={`${block.type} content preview`}
    />
  );
};

// Helper function to render artifact content with secure injection
async function renderArtifactContent(block: ContentBlock): Promise<string> {
  const { code, title, description } = block;
  
  // Detect if it's HTML, React, or other content
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return code;
  }

  // If it looks like React/JSX
  if (code.includes('React') || code.includes('jsx') || code.includes('useState')) {
    // Use safe JSON encoding to prevent syntax errors
    const safeCode = JSON.stringify(code);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Artifact'}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
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
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      // Safely inject code using JSON.stringify
      const userCode = ${safeCode};
      eval(userCode);
      
      const rootElement = document.getElementById('root');
      if (typeof App !== 'undefined') {
        ReactDOM.render(React.createElement(App), rootElement);
      } else {
        const componentMatch = userCode.match(/(?:const|function)\\s+(\\w+)\\s*[=\\(]/);
        if (componentMatch) {
          const ComponentName = componentMatch[1];
          try {
            const Component = eval(ComponentName);
            if (typeof Component === 'function') {
              ReactDOM.render(React.createElement(Component), rootElement);
            }
          } catch (e) {
            console.error('Could not render component:', e);
            rootElement.innerHTML = '<div class="error-display">Error rendering component: ' + e.message + '</div>';
          }
        } else {
          rootElement.innerHTML = '<div class="error-display">No valid React component found</div>';
        }
      }
    } catch (error) {
      console.error('Artifact render error:', error);
      document.getElementById('root').innerHTML = '<div class="error-display">Render Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`;
  }

  // For other content types, wrap in basic HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Artifact'}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    pre { 
      background: #f5f5f5; 
      padding: 16px; 
      border-radius: 8px; 
      overflow-x: auto; 
    }
  </style>
</head>
<body>
  <h1>${title || 'Artifact'}</h1>
  ${description ? `<p style="color: #666;">${description}</p>` : ''}
  <pre><code>${code}</code></pre>
</body>
</html>`;
}

// Helper function to create error content
function createErrorContent(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #fef2f2;
      color: #dc2626;
    }
    .error-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h3>⚠️ Rendering Error</h3>
    <p>${errorMessage}</p>
  </div>
</body>
</html>`;
}

export default UniversalRenderer;
