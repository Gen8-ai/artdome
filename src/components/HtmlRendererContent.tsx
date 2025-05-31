
import React, { useRef } from 'react';
import ReactRenderer from './ReactRenderer';

interface HtmlRendererContentProps {
  isCodeView: boolean;
  isReactComponent: boolean;
  currentCode: string;
  currentReactCode: string;
  currentPage: number;
  onCodeUpdate: (newCode: string) => void;
  onRefresh: () => void;
}

const HtmlRendererContent: React.FC<HtmlRendererContentProps> = ({
  isCodeView,
  isReactComponent,
  currentCode,
  currentReactCode,
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
        <pre className="bg-muted p-4 rounded-lg h-full overflow-auto text-sm">
          <code>{isReactComponent ? currentReactCode : currentCode}</code>
        </pre>
      </div>
    );
  }

  if (isReactComponent) {
    return (
      <ReactRenderer 
        code={currentReactCode}
        onCodeUpdate={onCodeUpdate}
      />
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={currentCode}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms"
      title={`Rendered HTML ${currentPage + 1}`}
    />
  );
};

export default HtmlRendererContent;
