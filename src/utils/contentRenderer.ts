
export interface ContentBlock {
  id: string;
  type: 'html' | 'react' | 'canvas' | 'artifact' | 'css' | 'javascript' | 'mixed';
  code: string;
  title?: string;
  description?: string;
  language?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface RenderingOptions {
  theme?: 'light' | 'dark' | 'auto';
  enableConsoleCapture?: boolean;
  enableErrorBoundary?: boolean;
  sandboxPolicy?: string[];
  timeout?: number;
}

export class ContentRenderer {
  private static instance: ContentRenderer;
  private cdnCache = new Map<string, boolean>();
  
  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  // Enhanced content detection with smarter parsing
  detectContentType(code: string): ContentBlock['type'] {
    // Remove comments and strings for better analysis
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/["'`][\s\S]*?["'`]/g, '');
    
    // React/JSX detection
    if (this.isReactContent(cleanCode)) return 'react';
    
    // HTML detection
    if (this.isHtmlContent(cleanCode)) return 'html';
    
    // Canvas content (OpenAI format)
    if (this.isCanvasContent(code)) return 'canvas';
    
    // Artifact detection (Claude format)
    if (this.isArtifactContent(code)) return 'artifact';
    
    // CSS detection
    if (this.isCssContent(cleanCode)) return 'css';
    
    // JavaScript detection
    if (this.isJavaScriptContent(cleanCode)) return 'javascript';
    
    // Mixed content detection
    if (this.isMixedContent(code)) return 'mixed';
    
    return 'html'; // Default fallback
  }

  private isReactContent(code: string): boolean {
    const reactPatterns = [
      /import\s+.*\s+from\s+['"]react['"]/, // React imports
      /React\.(createElement|Component|Fragment)/, // React API usage
      /useState|useEffect|useContext/, // React hooks
      /<[A-Z][A-Za-z0-9]*/, // JSX components
      /jsx|tsx/, // File extensions in comments
      /export\s+(default\s+)?(function|const|class).*\s*\{[\s\S]*return[\s\S]*</, // Component exports
    ];
    
    return reactPatterns.some(pattern => pattern.test(code));
  }

  private isHtmlContent(code: string): boolean {
    return /^\s*<!DOCTYPE|<html|<head|<body/i.test(code) || 
           /<\/?(html|head|body|div|span|p|h[1-6])/i.test(code);
  }

  private isCanvasContent(code: string): boolean {
    return /```canvas|Canvas\]|canvas-content/i.test(code);
  }

  private isArtifactContent(code: string): boolean {
    return /<artifact[^>]*>|```artifact|artifact-content/i.test(code);
  }

  private isCssContent(code: string): boolean {
    return /^\s*[.#]?[\w-]+\s*\{[\s\S]*\}|@media|@keyframes/m.test(code);
  }

  private isJavaScriptContent(code: string): boolean {
    const jsPatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /console\.(log|error|warn)/,
      /document\.(getElementById|querySelector)/,
    ];
    
    return jsPatterns.some(pattern => pattern.test(code));
  }

  private isMixedContent(code: string): boolean {
    const hasHtml = this.isHtmlContent(code);
    const hasCss = this.isCssContent(code);
    const hasJs = this.isJavaScriptContent(code);
    
    return (hasHtml && hasCss) || (hasHtml && hasJs) || (hasCss && hasJs);
  }

  // Standardized HTML template generator
  generateHtmlDocument(content: ContentBlock, options: RenderingOptions = {}): string {
    const { theme = 'light', enableConsoleCapture = true, enableErrorBoundary = true } = options;
    
    const baseStyles = this.getBaseStyles(theme);
    const errorBoundaryScript = enableErrorBoundary ? this.getErrorBoundaryScript() : '';
    const consoleScript = enableConsoleCapture ? this.getConsoleCapture() : '';
    
    switch (content.type) {
      case 'react':
        return this.generateReactDocument(content, baseStyles, errorBoundaryScript, consoleScript);
      case 'html':
        return this.generatePlainHtmlDocument(content, baseStyles, consoleScript);
      case 'css':
        return this.generateCssDocument(content, baseStyles);
      case 'javascript':
        return this.generateJsDocument(content, baseStyles, consoleScript);
      case 'mixed':
        return this.generateMixedDocument(content, baseStyles, consoleScript);
      case 'canvas':
      case 'artifact':
        return this.generateSpecialDocument(content, baseStyles, consoleScript);
      default:
        return this.generateFallbackDocument(content, baseStyles);
    }
  }

  private getBaseStyles(theme: string): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: ${theme === 'dark' ? '#ffffff' : '#333333'};
        background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        padding: 1rem;
        min-height: 100vh;
      }
      
      .error-display {
        background: ${theme === 'dark' ? '#dc2626' : '#fef2f2'};
        border: 1px solid ${theme === 'dark' ? '#ef4444' : '#fecaca'};
        color: ${theme === 'dark' ? '#ffffff' : '#dc2626'};
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
      }
      
      .loading-display {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
      }
      
      .content-wrapper {
        max-width: 100%;
        overflow-x: auto;
      }
      
      pre {
        background: ${theme === 'dark' ? '#374151' : '#f9fafb'};
        border: 1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'};
        border-radius: 0.375rem;
        padding: 1rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    `;
  }

  private getErrorBoundaryScript(): string {
    return `
      class ErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null, errorInfo: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error: error.message };
        }

        componentDidCatch(error, errorInfo) {
          this.setState({ error: error.message, errorInfo });
          
          window.parent.postMessage({
            type: 'react-error',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          }, '*');
        }

        render() {
          if (this.state.hasError) {
            return React.createElement('div', {
              className: 'error-display'
            }, [
              React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
              React.createElement('p', { key: 'message' }, this.state.error),
              this.state.errorInfo && React.createElement('details', { key: 'details' }, [
                React.createElement('summary', { key: 'summary' }, 'Error Details'),
                React.createElement('pre', { key: 'stack' }, this.state.errorInfo.componentStack)
              ])
            ]);
          }
          return this.props.children;
        }
      }
    `;
  }

  private getConsoleCapture(): string {
    return `
      (function() {
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
        };
        
        window.capturedLogs = [];
        
        ['log', 'error', 'warn', 'info'].forEach(method => {
          console[method] = function(...args) {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            window.capturedLogs.push({
              type: method,
              message,
              timestamp: Date.now()
            });
            
            window.parent.postMessage({
              type: 'console-' + method,
              message,
              logs: window.capturedLogs
            }, '*');
            
            originalConsole[method].apply(console, args);
          };
        });
        
        window.addEventListener('error', (event) => {
          window.parent.postMessage({
            type: 'runtime-error',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error ? event.error.stack : null
          }, '*');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          window.parent.postMessage({
            type: 'promise-rejection',
            message: event.reason ? String(event.reason) : 'Unhandled promise rejection'
          }, '*');
        });
      })();
    `;
  }

  private generateReactDocument(content: ContentBlock, baseStyles: string, errorBoundary: string, consoleScript: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'React Component'}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${baseStyles}</style>
</head>
<body>
  <div id="root">
    <div class="loading-display">Loading React component...</div>
  </div>
  
  <script>
    ${consoleScript}
  </script>
  
  <script type="text/babel">
    ${errorBoundary}
    
    try {
      ${content.code}
      
      const rootElement = document.getElementById('root');
      
      // Enhanced component detection and rendering
      const renderComponent = () => {
        if (typeof App !== 'undefined') {
          ReactDOM.render(
            React.createElement(ErrorBoundary, null, React.createElement(App)),
            rootElement
          );
        } else {
          // Try to find any exported component
          const componentMatch = \`${content.code}\`.match(/export\\s+(default\\s+)?(function|const|class)\\s+(\\w+)/);
          if (componentMatch) {
            const ComponentName = componentMatch[3];
            if (typeof window[ComponentName] !== 'undefined') {
              ReactDOM.render(
                React.createElement(ErrorBoundary, null, React.createElement(window[ComponentName])),
                rootElement
              );
            } else {
              try {
                const Component = eval(ComponentName);
                ReactDOM.render(
                  React.createElement(ErrorBoundary, null, React.createElement(Component)),
                  rootElement
                );
              } catch (e) {
                console.error('Could not render component:', ComponentName, e);
                rootElement.innerHTML = '<div class="error-display">Could not find or render component: ' + ComponentName + '</div>';
              }
            }
          } else {
            rootElement.innerHTML = '<div class="error-display">No valid React component found. Please export a component named "App" or use a proper component export.</div>';
          }
        }
      };
      
      // Render with a small delay to ensure all code is parsed
      setTimeout(renderComponent, 100);
      
    } catch (error) {
      console.error('Failed to parse/render React component:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Parse Error</h3>
          <p>\${error.message}</p>
          <details>
            <summary>Stack Trace</summary>
            <pre>\${error.stack}</pre>
          </details>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  }

  private generatePlainHtmlDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
    // If it's already a complete HTML document, just inject our scripts
    if (content.code.includes('<!DOCTYPE') || content.code.includes('<html')) {
      return content.code.replace(
        '</head>',
        `<style>${baseStyles}</style><script>${consoleScript}</script></head>`
      );
    }
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'HTML Content'}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="content-wrapper">
    ${content.code}
  </div>
  <script>${consoleScript}</script>
</body>
</html>`;
  }

  private generateCssDocument(content: ContentBlock, baseStyles: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'CSS Preview'}</title>
  <style>${baseStyles}</style>
  <style>${content.code}</style>
</head>
<body>
  <div class="content-wrapper">
    <h1>CSS Preview</h1>
    <p>This is a preview of your CSS styles.</p>
    <div class="demo-content">
      <h2>Sample heading</h2>
      <p>Sample paragraph with some text to demonstrate your styles.</p>
      <button>Sample button</button>
    </div>
  </div>
</body>
</html>`;
  }

  private generateJsDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'JavaScript Preview'}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div id="output" class="content-wrapper">
    <h1>JavaScript Output</h1>
    <div id="console-output"></div>
  </div>
  
  <script>${consoleScript}</script>
  <script>
    try {
      ${content.code}
    } catch (error) {
      document.getElementById('output').innerHTML += \`
        <div class="error-display">
          <h3>⚠️ JavaScript Error</h3>
          <p>\${error.message}</p>
          <pre>\${error.stack}</pre>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  }

  private generateMixedDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
    // Extract CSS and JS from mixed content
    const cssMatches = content.code.match(/```css\n([\s\S]*?)```/g) || [];
    const jsMatches = content.code.match(/```javascript\n([\s\S]*?)```/g) || [];
    const htmlMatches = content.code.match(/```html\n([\s\S]*?)```/g) || [];
    
    const css = cssMatches.map(match => match.replace(/```css\n?/, '').replace(/```$/, '')).join('\n');
    const js = jsMatches.map(match => match.replace(/```javascript\n?/, '').replace(/```$/, '')).join('\n');
    const html = htmlMatches.map(match => match.replace(/```html\n?/, '').replace(/```$/, '')).join('\n');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Mixed Content'}</title>
  <style>${baseStyles}</style>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
  <div class="content-wrapper">
    ${html || '<div id="content">Mixed content preview</div>'}
  </div>
  
  <script>${consoleScript}</script>
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
  }

  private generateSpecialDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
    let processedCode = content.code;
    
    // Process Canvas content
    if (content.type === 'canvas') {
      processedCode = processedCode.replace(/```canvas\n?/, '').replace(/```$/, '')
                                 .replace(/\[Canvas\]/, '').replace(/\[\/Canvas\]/, '');
    }
    
    // Process Artifact content
    if (content.type === 'artifact') {
      processedCode = processedCode.replace(/<artifact[^>]*>/, '').replace(/<\/artifact>/, '')
                                 .replace(/```artifact\n?/, '').replace(/```$/, '');
    }
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || content.type.charAt(0).toUpperCase() + content.type.slice(1)}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="content-wrapper">
    ${content.description ? `<p style="color: #666; margin-bottom: 1rem;">${content.description}</p>` : ''}
    <pre><code>${processedCode}</code></pre>
  </div>
  <script>${consoleScript}</script>
</body>
</html>`;
  }

  private generateFallbackDocument(content: ContentBlock, baseStyles: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Content Preview'}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="content-wrapper">
    <h1>Content Preview</h1>
    <p>Content type: <strong>${content.type}</strong></p>
    <pre><code>${content.code}</code></pre>
  </div>
</body>
</html>`;
  }
}

export const contentRenderer = ContentRenderer.getInstance();
