import React, { useState, useRef, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import ReactRenderer from './ReactRenderer';

interface HtmlRendererProps {
  content: string;
  onClose: () => void;
}

const HtmlRenderer: React.FC<HtmlRendererProps> = ({ content, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [extractedCode, setExtractedCode] = useState<string[]>([]);
  const [reactComponents, setReactComponents] = useState<string[]>([]);
  const [isCodeView, setIsCodeView] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Extract code blocks from the content
    const codeBlocks = [];
    const reactBlocks = [];
    const htmlMatches = content.match(/```html([\s\S]*?)```/g);
    const jsxMatches = content.match(/```jsx([\s\S]*?)```/g);
    const reactMatches = content.match(/```react([\s\S]*?)```/g);
    const cssMatches = content.match(/```css([\s\S]*?)```/g);
    const jsMatches = content.match(/```javascript([\s\S]*?)```/g);

    if (htmlMatches) {
      htmlMatches.forEach(match => {
        const code = match.replace(/```html\n?/, '').replace(/```$/, '');
        codeBlocks.push(code);
      });
    }

    if (jsxMatches || reactMatches) {
      const allReactMatches = [...(jsxMatches || []), ...(reactMatches || [])];
      allReactMatches.forEach(match => {
        const code = match.replace(/```(?:jsx|react)\n?/, '').replace(/```$/, '');
        reactBlocks.push(code);
        
        // Also create HTML version for fallback
        const htmlCode = `
<!DOCTYPE html>
<html>
<head>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body { margin: 0; padding: 20px; font-family: system-ui; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    
    // Try to render if there's a component
    const rootElement = document.getElementById('root');
    if (typeof App !== 'undefined') {
      ReactDOM.render(<App />, rootElement);
    } else {
      // Try to find any React component in the code
      const componentMatch = code.match(/const\\s+(\\w+)\\s*=.*?=>/);
      if (componentMatch) {
        const ComponentName = componentMatch[1];
        ReactDOM.render(React.createElement(eval(ComponentName)), rootElement);
      }
    }
  </script>
</body>
</html>`;
        codeBlocks.push(htmlCode);
      });
    }

    if (cssMatches || jsMatches) {
      let combinedCode = '<!DOCTYPE html><html><head><style>body { margin: 0; padding: 20px; font-family: system-ui; }';
      
      if (cssMatches) {
        cssMatches.forEach(match => {
          const css = match.replace(/```css\n?/, '').replace(/```$/, '');
          combinedCode += css;
        });
      }
      
      combinedCode += '</style></head><body><div id="content">Preview</div>';
      
      if (jsMatches) {
        combinedCode += '<script>';
        jsMatches.forEach(match => {
          const js = match.replace(/```javascript\n?/, '').replace(/```$/, '');
          combinedCode += js;
        });
        combinedCode += '</script>';
      }
      
      combinedCode += '</body></html>';
      codeBlocks.push(combinedCode);
    }

    setExtractedCode(codeBlocks);
    setReactComponents(reactBlocks);
  }, [content]);

  const currentCode = extractedCode[currentPage] || '';
  const currentReactCode = reactComponents[currentPage] || '';
  const isReactComponent = currentReactCode.length > 0;

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
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

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center space-x-2">
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium">
            {isReactComponent ? 'React Component Renderer' : 'HTML Renderer'}
          </div>
          {extractedCode.length > 1 && (
            <div className="text-xs text-muted-foreground">
              {currentPage + 1} of {extractedCode.length}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Pagination */}
          {extractedCode.length > 1 && (
            <>
              <Button 
                onClick={prevPage} 
                variant="ghost" 
                size="sm" 
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                onClick={nextPage} 
                variant="ghost" 
                size="sm" 
                disabled={currentPage === extractedCode.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* View Toggle */}
          <Button 
            onClick={() => setIsCodeView(!isCodeView)} 
            variant={isCodeView ? "default" : "ghost"} 
            size="sm"
          >
            {isCodeView ? <Play className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          </Button>

          {/* Utility Buttons */}
          <Button onClick={handleRefresh} variant="ghost" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button onClick={handleCopy} variant="ghost" size="sm">
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={handleDownload} variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
          <Button onClick={toggleFullscreen} variant="ghost" size="sm">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isCodeView ? (
          <div className="h-full p-4">
            <pre className="bg-muted p-4 rounded-lg h-full overflow-auto text-sm">
              <code>{isReactComponent ? currentReactCode : currentCode}</code>
            </pre>
          </div>
        ) : (
          <>
            {isReactComponent ? (
              <ReactRenderer 
                code={currentReactCode}
                onCodeUpdate={(newCode) => {
                  // Update the react components array
                  const newReactComponents = [...reactComponents];
                  newReactComponents[currentPage] = newCode;
                  setReactComponents(newReactComponents);
                }}
              />
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={currentCode}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title={`Rendered HTML ${currentPage + 1}`}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HtmlRenderer;
