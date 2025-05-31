
import { useState, useEffect } from 'react';

export const useCodeExtraction = (content: string) => {
  const [extractedCode, setExtractedCode] = useState<string[]>([]);
  const [reactComponents, setReactComponents] = useState<string[]>([]);

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

  return { extractedCode, reactComponents, setReactComponents };
};
