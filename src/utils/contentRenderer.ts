
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
  
  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  // Enhanced content detection with smarter parsing
  detectContentType(code: string): ContentBlock['type'] {
    if (!code || typeof code !== 'string') return 'html';
    
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
      // Enhanced error boundary for React components
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
          
          // Send error to parent window
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'react-error',
              message: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack
            }, '*');
          }
        }

        render() {
          if (this.state.hasError) {
            return React.createElement('div', {
              className: 'error-display'
            }, [
              React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
              React.createElement('p', { key: 'message' }, this.state.error)
            ]);
          }
          return this.props.children;
        }
      }
    `;
  }

  private getConsoleCapture(): string {
    return `
      // Enhanced console capture with error prevention
      (function() {
        try {
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };
          
          window.capturedLogs = [];
          
          ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = function(...args) {
              try {
                const message = args.map(arg => {
                  try {
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                  } catch (e) {
                    return '[Circular or Non-serializable Object]';
                  }
                }).join(' ');
                
                window.capturedLogs.push({
                  type: method,
                  message,
                  timestamp: Date.now()
                });
                
                // Send to parent window safely
                if (window.parent !== window) {
                  window.parent.postMessage({
                    type: 'console-' + method,
                    message,
                    logs: window.capturedLogs
                  }, '*');
                }
                
                originalConsole[method].apply(console, args);
              } catch (e) {
                // Fallback to original console if anything fails
                originalConsole[method].apply(console, args);
              }
            };
          });
          
          // Enhanced error handling
          window.addEventListener('error', (event) => {
            try {
              if (window.parent !== window) {
                window.parent.postMessage({
                  type: 'runtime-error',
                  message: event.message || 'Unknown error',
                  filename: event.filename || '',
                  lineno: event.lineno || 0,
                  colno: event.colno || 0,
                  error: event.error ? event.error.stack : null
                }, '*');
              }
            } catch (e) {
              // Silently fail if postMessage fails
            }
          });
          
          window.addEventListener('unhandledrejection', (event) => {
            try {
              if (window.parent !== window) {
                window.parent.postMessage({
                  type: 'promise-rejection',
                  message: event.reason ? String(event.reason) : 'Unhandled promise rejection'
                }, '*');
              }
            } catch (e) {
              // Silently fail if postMessage fails
            }
          });
        } catch (e) {
          // If anything fails in console setup, just continue
        }
      })();
    `;
  }

  private generateReactDocument(content: ContentBlock, baseStyles: string, errorBoundary: string, consoleScript: string): string {
    // Escape content code for safe injection
    const escapedCode = content.code.replace(/`/g, '\\`').replace(/\${/g, '\\${');
    
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
    try {
      ${errorBoundary}
      
      // Component code
      ${content.code}
      
      // Enhanced component rendering with multiple strategies
      const rootElement = document.getElementById('root');
      
      const renderComponent = () => {
        try {
          // Strategy 1: Look for App component
          if (typeof App !== 'undefined') {
            ReactDOM.render(
              React.createElement(ErrorBoundary, null, React.createElement(App)),
              rootElement
            );
            return true;
          }
          
          // Strategy 2: Look for default export
          if (typeof module !== 'undefined' && module.exports && typeof module.exports.default !== 'undefined') {
            ReactDOM.render(
              React.createElement(ErrorBoundary, null, React.createElement(module.exports.default)),
              rootElement
            );
            return true;
          }
          
          // Strategy 3: Find any function that looks like a component
          const componentRegex = /(?:export\\s+default\\s+|export\\s+|const\\s+|function\\s+)(\\w+)/g;
          let match;
          while ((match = componentRegex.exec(\`${escapedCode}\`)) !== null) {
            const componentName = match[1];
            if (typeof window[componentName] === 'function') {
              ReactDOM.render(
                React.createElement(ErrorBoundary, null, React.createElement(window[componentName])),
                rootElement
              );
              return true;
            }
          }
          
          return false;
        } catch (e) {
          console.error('Component rendering failed:', e);
          return false;
        }
      };
      
      // Try rendering with a delay to ensure all code is parsed
      setTimeout(() => {
        if (!renderComponent()) {
          rootElement.innerHTML = '<div class="error-display"><h3>⚠️ No Renderable Component</h3><p>Could not find a valid React component. Please ensure you have an "App" component or properly exported component.</p></div>';
        }
      }, 100);
      
    } catch (error) {
      console.error('Failed to parse React component:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Parse Error</h3>
          <p>\${error.message}</p>
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
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  }

  private generateMixedDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Mixed Content'}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="content-wrapper">
    <pre><code>${content.code}</code></pre>
  </div>
  <script>${consoleScript}</script>
</body>
</html>`;
  }

  private generateSpecialDocument(content: ContentBlock, baseStyles: string, consoleScript: string): string {
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
    <pre><code>${content.code}</code></pre>
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
