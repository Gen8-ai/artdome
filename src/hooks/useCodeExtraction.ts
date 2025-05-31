
import { useState, useEffect } from 'react';

export interface ExtractedContent {
  type: 'html' | 'react' | 'canvas' | 'artifact';
  code: string;
  title?: string;
  description?: string;
}

export const useCodeExtraction = (content: string) => {
  const [extractedContent, setExtractedContent] = useState<ExtractedContent[]>([]);
  const [reactComponents, setReactComponents] = useState<string[]>([]);

  useEffect(() => {
    const contentItems: ExtractedContent[] = [];
    const reactBlocks = [];

    // Detect OpenAI Canvas content
    const canvasMatches = content.match(/```canvas\n([\s\S]*?)```/g) || 
                         content.match(/\[Canvas\]([\s\S]*?)\[\/Canvas\]/g);
    
    // Detect Claude Artifacts
    const artifactMatches = content.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/g) ||
                           content.match(/```artifact\n([\s\S]*?)```/g);

    // Extract HTML blocks
    const htmlMatches = content.match(/```html([\s\S]*?)```/g);
    
    // Extract JSX/React blocks
    const jsxMatches = content.match(/```jsx([\s\S]*?)```/g);
    const reactMatches = content.match(/```react([\s\S]*?)```/g);
    
    // Extract CSS and JS
    const cssMatches = content.match(/```css([\s\S]*?)```/g);
    const jsMatches = content.match(/```javascript([\s\S]*?)```/g);

    // Process Canvas content
    if (canvasMatches) {
      canvasMatches.forEach(match => {
        const code = match.replace(/```canvas\n?/, '').replace(/```$/, '')
                         .replace(/\[Canvas\]/, '').replace(/\[\/Canvas\]/, '');
        contentItems.push({
          type: 'canvas',
          code,
          title: 'Canvas Content',
          description: 'OpenAI Canvas-style content'
        });
      });
    }

    // Process Artifact content
    if (artifactMatches) {
      artifactMatches.forEach(match => {
        let code = match;
        let title = 'Artifact';
        let description = 'Claude Artifact';

        // Extract title and type from artifact tag
        const titleMatch = match.match(/title="([^"]*)"/);
        const typeMatch = match.match(/type="([^"]*)"/);
        
        if (titleMatch) title = titleMatch[1];
        if (typeMatch) description = `${typeMatch[1]} Artifact`;

        code = match.replace(/<artifact[^>]*>/, '').replace(/<\/artifact>/, '')
                   .replace(/```artifact\n?/, '').replace(/```$/, '');

        contentItems.push({
          type: 'artifact',
          code,
          title,
          description
        });
      });
    }

    // Process HTML blocks
    if (htmlMatches) {
      htmlMatches.forEach(match => {
        const code = match.replace(/```html\n?/, '').replace(/```$/, '');
        contentItems.push({
          type: 'html',
          code,
          title: 'HTML Content'
        });
      });
    }

    // Process React/JSX blocks
    if (jsxMatches || reactMatches) {
      const allReactMatches = [...(jsxMatches || []), ...(reactMatches || [])];
      allReactMatches.forEach(match => {
        const code = match.replace(/```(?:jsx|react)\n?/, '').replace(/```$/, '');
        reactBlocks.push(code);
        
        contentItems.push({
          type: 'react',
          code,
          title: 'React Component'
        });

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
        
        contentItems.push({
          type: 'html',
          code: htmlCode,
          title: 'React Component (HTML)'
        });
      });
    }

    // Process CSS and JS combinations
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
      
      contentItems.push({
        type: 'html',
        code: combinedCode,
        title: 'CSS/JS Content'
      });
    }

    setExtractedContent(contentItems);
    setReactComponents(reactBlocks);
  }, [content]);

  return { extractedContent, reactComponents, setReactComponents };
};
