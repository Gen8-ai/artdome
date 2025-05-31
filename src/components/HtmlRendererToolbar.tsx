
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  RotateCcw, 
  Download, 
  Copy, 
  Maximize, 
  Minimize, 
  ChevronLeft, 
  ChevronRight,
  Code,
  Play
} from 'lucide-react';

interface HtmlRendererToolbarProps {
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isCodeView: boolean;
  onToggleCodeView: () => void;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
  onCopy: () => void;
  onDownload: () => void;
  isReactComponent: boolean;
}

const HtmlRendererToolbar: React.FC<HtmlRendererToolbarProps> = ({
  onClose,
  isFullscreen,
  onToggleFullscreen,
  isCodeView,
  onToggleCodeView,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onRefresh,
  onCopy,
  onDownload,
  isReactComponent
}) => {
  const getRendererTitle = () => {
    if (isReactComponent) return 'React Component Renderer';
    return 'Universal Content Renderer';
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center space-x-2">
        <Button onClick={onClose} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
        <div className="text-sm font-medium">
          {getRendererTitle()}
        </div>
        {totalPages > 1 && (
          <div className="text-xs text-muted-foreground">
            {currentPage + 1} of {totalPages}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Button 
              onClick={onPrevPage} 
              variant="ghost" 
              size="sm" 
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              onClick={onNextPage} 
              variant="ghost" 
              size="sm" 
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* View Toggle */}
        <Button 
          onClick={onToggleCodeView} 
          variant={isCodeView ? "default" : "ghost"} 
          size="sm"
        >
          {isCodeView ? <Play className="w-4 h-4" /> : <Code className="w-4 h-4" />}
        </Button>

        {/* Utility Buttons */}
        <Button onClick={onRefresh} variant="ghost" size="sm">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button onClick={onCopy} variant="ghost" size="sm">
          <Copy className="w-4 h-4" />
        </Button>
        <Button onClick={onDownload} variant="ghost" size="sm">
          <Download className="w-4 h-4" />
        </Button>
        <Button onClick={onToggleFullscreen} variant="ghost" size="sm">
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default HtmlRendererToolbar;
