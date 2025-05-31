
import React, { useRef, useEffect } from 'react';

interface ArtifactRendererProps {
  code: string;
  title?: string;
  description?: string;
}

const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ code, title, description }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const createArtifactContent = (artifactCode: string) => {
    // Detect if it's HTML, React, or other content
    if (artifactCode.includes('<html') || artifactCode.includes('<!DOCTYPE')) {
      return artifactCode;
    }

    // If it looks like React/JSX
    if (artifactCode.includes('React') || artifactCode.includes('jsx') || artifactCode.includes('useState')) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Artifact'}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #fff;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifactCode}
    
    const rootElement = document.getElementById('root');
    if (typeof App !== 'undefined') {
      ReactDOM.render(<App />, rootElement);
    } else {
      const componentMatch = \`${artifactCode}\`.match(/(?:const|function)\\s+(\\w+)\\s*[=\\(]/);
      if (componentMatch) {
        const ComponentName = componentMatch[1];
        try {
          const Component = eval(ComponentName);
          ReactDOM.render(<Component />, rootElement);
        } catch (e) {
          console.error('Could not render component:', e);
        }
      }
    }
  </script>
</body>
</html>`;
    }

    // For other content types, wrap in basic HTML
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Artifact'}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    pre { 
      background: #f5f5f5; 
      padding: 16px; 
      border-radius: 8px; 
      overflow-x: auto; 
    }
  </style>
</head>
<body>
  <h1>${title || 'Artifact'}</h1>
  ${description ? `<p style="color: #666;">${description}</p>` : ''}
  <pre><code>${artifactCode}</code></pre>
</body>
</html>`;
  };

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = createArtifactContent(code);
    }
  }, [code, title, description]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms"
      title={title || 'Artifact Preview'}
    />
  );
};

export default ArtifactRenderer;
