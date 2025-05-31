
import React, { useState } from 'react';
import { useContentParser } from '@/hooks/useContentParser';
import UniversalRenderer from './UniversalRenderer';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight,
  X,
  Maximize,
  Minimize,
  Download,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContentRendererProps {
  content: string;
  onClose: () => void;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content, onClose }) => {
  const { blocks, isLoading, error, hasContent, contentTypes } = useContentParser(content);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  const currentBlock = blocks[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(blocks.length - 1, currentIndex + 1));
  };

  const handleCopy = async () => {
    if (!currentBlock) return;
    
    try {
      await navigator.clipboard.writeText(currentBlock.code);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!currentBlock) return;
    
    const blob = new Blob([currentBlock.code], { 
      type: getFileType(currentBlock.type)
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentBlock.title?.toLowerCase().replace(/\s+/g, '-') || 'content'}.${getFileExtension(currentBlock.type)}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileType = (type: string): string => {
    switch (type) {
      case 'html': return 'text/html';
      case 'react': 
      case 'javascript': return 'text/javascript';
      case 'css': return 'text/css';
      default: return 'text/plain';
    }
  };

  const getFileExtension = (type: string): string => {
    switch (type) {
      case 'html': return 'html';
      case 'react': return 'jsx';
      case 'javascript': return 'js';
      case 'css': return 'css';
      default: return 'txt';
    }
  };

  if (isLoading) {
    return (
      <div className={`fixed inset-0 bg-background z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Parsing content...</p>
        </div>
      </div>
    );
  }

  if (error || !hasContent) {
    return (
      <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Content Renderer</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2">
              {error ? 'Parsing Error' : 'No Renderable Content'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The message doesn\'t contain any supported content types (HTML, React, CSS, JavaScript, Canvas, or Artifacts).'}
            </p>
            {error && (
              <details className="text-left bg-muted p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 text-xs">{error}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center space-x-3">
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
          
          <div>
            <h2 className="text-lg font-semibold">Content Renderer</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{blocks.length} block(s)</span>
              <span>•</span>
              <span>{contentTypes.join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigation */}
          {blocks.length > 1 && (
            <>
              <Button 
                onClick={handlePrevious} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm px-3 py-1 bg-muted rounded">
                {currentIndex + 1} / {blocks.length}
              </span>
              
              <Button 
                onClick={handleNext} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === blocks.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Actions */}
          <Button onClick={handleCopy} variant="ghost" size="sm">
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button onClick={handleDownload} variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
          
          <Button onClick={() => setIsFullscreen(!isFullscreen)} variant="ghost" size="sm">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentBlock && (
          <UniversalRenderer 
            block={currentBlock}
            options={{
              theme: 'light',
              enableConsoleCapture: true,
              enableErrorBoundary: true
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ContentRenderer;
