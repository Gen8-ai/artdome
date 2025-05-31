
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCodeExtraction } from '@/hooks/useCodeExtraction';
import HtmlRendererToolbar from './HtmlRendererToolbar';
import HtmlRendererContent from './HtmlRendererContent';

interface HtmlRendererProps {
  content: string;
  onClose: () => void;
}

const HtmlRenderer: React.FC<HtmlRendererProps> = ({ content, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCodeView, setIsCodeView] = useState(false);
  const { toast } = useToast();

  const { extractedContent, reactComponents, setReactComponents } = useCodeExtraction(content);

  const currentContent = extractedContent[currentPage];
  const isReactComponent = currentContent?.type === 'react';

  const handleRefresh = () => {
    // Refresh logic handled by content component
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent?.code || '');
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!currentContent) return;
    
    const blob = new Blob([currentContent.code], { 
      type: currentContent.type === 'html' ? 'text/html' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const extension = currentContent.type === 'html' ? 'html' : 
                     currentContent.type === 'react' ? 'jsx' : 'txt';
    a.download = `${currentContent.title?.toLowerCase().replace(/\s+/g, '-') || 'content'}.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const nextPage = () => {
    if (currentPage < extractedContent.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleCodeUpdate = (newCode: string) => {
    if (isReactComponent) {
      const newReactComponents = [...reactComponents];
      newReactComponents[currentPage] = newCode;
      setReactComponents(newReactComponents);
    }
  };

  if (!currentContent) {
    return (
      <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No renderable content found</h2>
            <p className="text-muted-foreground">The message doesn't contain any HTML, React, Canvas, or Artifact content.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <HtmlRendererToolbar
        onClose={onClose}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isCodeView={isCodeView}
        onToggleCodeView={() => setIsCodeView(!isCodeView)}
        currentPage={currentPage}
        totalPages={extractedContent.length}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onRefresh={handleRefresh}
        onCopy={handleCopy}
        onDownload={handleDownload}
        isReactComponent={isReactComponent}
      />

      <div className="flex-1 overflow-hidden">
        <HtmlRendererContent
          isCodeView={isCodeView}
          currentContent={currentContent}
          currentPage={currentPage}
          onCodeUpdate={handleCodeUpdate}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default HtmlRenderer;
