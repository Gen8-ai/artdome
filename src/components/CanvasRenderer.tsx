
import React from 'react';

interface CanvasRendererProps {
  code: string;
  title?: string;
  description?: string;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({ code, title, description }) => {
  // Canvas content is usually rich text or structured content
  // We'll render it as formatted content
  return (
    <div className="h-full p-6 bg-background overflow-auto">
      <div className="max-w-4xl mx-auto">
        {title && (
          <h1 className="text-3xl font-bold mb-2 text-foreground">{title}</h1>
        )}
        {description && (
          <p className="text-muted-foreground mb-6">{description}</p>
        )}
        
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg border">
            {code}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasRenderer;
