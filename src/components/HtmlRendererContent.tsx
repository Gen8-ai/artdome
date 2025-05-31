
import React, { useRef } from 'react';
import ReactRenderer from './ReactRenderer';
import CanvasRenderer from './CanvasRenderer';
import ArtifactRenderer from './ArtifactRenderer';
import { ExtractedContent } from '@/hooks/useCodeExtraction';

interface HtmlRendererContentProps {
  isCodeView: boolean;
  currentContent: ExtractedContent;
  currentPage: number;
  onCodeUpdate: (newCode: string) => void;
  onRefresh: () => void;
}

const HtmlRendererContent: React.FC<HtmlRendererContentProps> = ({
  isCodeView,
  currentContent,
  currentPage,
  onCodeUpdate,
  onRefresh
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    onRefresh();
  };

  if (isCodeView) {
    return (
      <div className="h-full p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{currentContent.title}</h3>
          {currentContent.description && (
            <p className="text-sm text-muted-foreground">{currentContent.description}</p>
          )}
          <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded mt-2">
            {currentContent.type.toUpperCase()}
          </span>
        </div>
        <pre className="bg-muted p-4 rounded-lg h-full overflow-auto text-sm">
          <code>{currentContent.code}</code>
        </pre>
      </div>
    );
  }

  // Render based on content type
  switch (currentContent.type) {
    case 'react':
      return (
        <ReactRenderer 
          code={currentContent.code}
          onCodeUpdate={onCodeUpdate}
        />
      );
    
    case 'canvas':
      return (
        <CanvasRenderer 
          code={currentContent.code}
          title={currentContent.title}
          description={currentContent.description}
        />
      );
    
    case 'artifact':
      return (
        <ArtifactRenderer 
          code={currentContent.code}
          title={currentContent.title}
          description={currentContent.description}
        />
      );
    
    case 'html':
    default:
      return (
        <iframe
          ref={iframeRef}
          srcDoc={currentContent.code}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title={currentContent.title || `Rendered HTML ${currentPage + 1}`}
        />
      );
  }
};

export default HtmlRendererContent;
