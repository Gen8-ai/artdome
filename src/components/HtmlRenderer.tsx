
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

  const { extractedCode, reactComponents, setReactComponents } = useCodeExtraction(content);

  const currentCode = extractedCode[currentPage] || '';
  const currentReactCode = reactComponents[currentPage] || '';
  const isReactComponent = currentReactCode.length > 0;

  const handleRefresh = () => {
    // Refresh logic handled by content component
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
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
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rendered-code-${currentPage + 1}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const nextPage = () => {
    if (currentPage < extractedCode.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleCodeUpdate = (newCode: string) => {
    const newReactComponents = [...reactComponents];
    newReactComponents[currentPage] = newCode;
    setReactComponents(newReactComponents);
  };

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <HtmlRendererToolbar
        onClose={onClose}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isCodeView={isCodeView}
        onToggleCodeView={() => setIsCodeView(!isCodeView)}
        currentPage={currentPage}
        totalPages={extractedCode.length}
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
          isReactComponent={isReactComponent}
          currentCode={currentCode}
          currentReactCode={currentReactCode}
          currentPage={currentPage}
          onCodeUpdate={handleCodeUpdate}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default HtmlRenderer;
