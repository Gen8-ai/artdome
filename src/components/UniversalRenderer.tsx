
import React, { useRef, useEffect, useState } from 'react';
import { ContentBlock, RenderingOptions, contentRenderer } from '@/utils/contentRenderer';
import ReactRenderer from './ReactRenderer';
import ArtifactRenderer from './ArtifactRenderer';

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

  useEffect(() => {
    const renderContent = async () => {
      // Add null check for iframe ref
      if (!iframeRef.current) {
        console.log('Iframe ref not ready, skipping render');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        onCompilationStart?.();

        console.log('Starting content compilation...');
        const htmlContent = await contentRenderer.generateHtmlDocument(block, {
          ...options,
          useCompilation: true
        });

        // Double-check the ref is still valid before setting srcdoc
        if (iframeRef.current) {
          iframeRef.current.srcdoc = htmlContent;
          console.log('Content rendered successfully');
        }
      } catch (err) {
        console.error('Rendering error:', err);
        setError(err instanceof Error ? err.message : 'Rendering failed');
      } finally {
        setIsLoading(false);
        onCompilationEnd?.();
      }
    };

    // Add a small delay to ensure the iframe is mounted
    const timeoutId = setTimeout(() => {
      renderContent();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [block, options, onCompilationStart, onCompilationEnd]);

  // Handle special cases
  if (block.type === 'react' && !options.useCompilation) {
    return <ReactRenderer code={block.code} />;
  }

  if (block.type === 'artifact') {
    return (
      <ArtifactRenderer 
        code={block.code}
        title={block.title}
        description={block.description}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Rendering Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
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
      ref={iframeRef}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-forms"
      title={`${block.type} content preview`}
    />
  );
};

export default UniversalRenderer;
