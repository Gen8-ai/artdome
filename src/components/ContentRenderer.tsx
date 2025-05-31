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
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentRendererProps {
  content: string;
  onClose: () => void;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content, onClose }) => {
  const { blocks, isLoading, error, hasContent, contentTypes } = useContentParser(content);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  if (isLoading || isCompiling) {
    return (
      <div className={`fixed inset-0 bg-background z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : isMobile ? 'p-2' : 'p-4'}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isLoading ? 'Parsing content...' : 'Compiling code...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !hasContent) {
    return (
      <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : isMobile ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border-b border-border`}>
          <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>Content Renderer</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center ${isMobile ? 'max-w-sm px-4' : 'max-w-md'}`}>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>
              {error ? 'Parsing Error' : 'No Renderable Content'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The message doesn\'t contain any supported content types (HTML, React, CSS, JavaScript, Canvas, or Artifacts).'}
            </p>
            {error && (
              <details className={`text-left bg-muted p-3 rounded ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className={`mt-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>{error}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : isMobile ? 'p-1' : 'p-4'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border-b border-border bg-background/95 backdrop-blur`}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold truncate`}>Content Renderer</h2>
            <div className={`flex items-center space-x-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              <span>{blocks.length} block(s)</span>
              <span>•</span>
              <span className="truncate">{contentTypes.join(', ')}</span>
              <span>•</span>
              <span className="text-green-600">Server Compiled</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Navigation - Always visible but compact on mobile */}
          {blocks.length > 1 && (
            <>
              <Button 
                onClick={handlePrevious} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === 0}
                className={isMobile ? 'h-8 w-8 p-0' : ''}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className={`${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} bg-muted rounded whitespace-nowrap`}>
                {currentIndex + 1} / {blocks.length}
              </span>
              
              <Button 
                onClick={handleNext} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === blocks.length - 1}
                className={isMobile ? 'h-8 w-8 p-0' : ''}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Actions - Use dropdown on mobile */}
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-4 h-4 mr-2" />
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize className="w-4 h-4 mr-2" />
                      Fullscreen
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button onClick={handleCopy} variant="ghost" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
              
              <Button onClick={handleDownload} variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              
              <Button onClick={() => setIsFullscreen(!isFullscreen)} variant="ghost" size="sm">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentBlock && (
          <UniversalRenderer 
            block={currentBlock}
            options={{
              theme: 'light',
              useCompilation: true
            }}
            onCompilationStart={() => setIsCompiling(true)}
            onCompilationEnd={() => setIsCompiling(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ContentRenderer;
