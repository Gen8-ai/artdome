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
  useCompilation?: boolean;
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

  private extractImports(code: string): { imports: string[], cleanCode: string } {
    const importLines: string[] = [];
    const lines = code.split('\n');
    let inImportBlock = false;
    const cleanLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect import statements
      if (line.startsWith('import ') && !inImportBlock) {
        inImportBlock = true;
        importLines.push(lines[i]);
      } else if (inImportBlock && (line.startsWith('import ') || line === '' || line.startsWith('//'))) {
        if (line.startsWith('import ')) {
          importLines.push(lines[i]);
        }
        // Skip empty lines and comments in import block
      } else {
        inImportBlock = false;
        cleanLines.push(lines[i]);
      }
    }

    return {
      imports: importLines,
      cleanCode: cleanLines.join('\n').trim()
    };
  }

  private transformImportsToGlobals(imports: string[]): string {
    // Transform import statements to use global React/ReactDOM
    const transformations: string[] = [];
    
    imports.forEach(importLine => {
      // Handle React default import: import React from 'react'
      const reactDefaultMatch = importLine.match(/import\s+(\w+)\s+from\s+['"]react['"]/);
      if (reactDefaultMatch && reactDefaultMatch[1] !== 'React') {
        transformations.push(`const ${reactDefaultMatch[1]} = React;`);
      }
      
      // Handle React named imports: import { useState, useEffect } from 'react'
      const reactNamedMatch = importLine.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
      if (reactNamedMatch) {
        const namedImports = reactNamedMatch[1].split(',').map(imp => imp.trim());
        namedImports.forEach(namedImport => {
          const [importName, alias] = namedImport.split(' as ').map(s => s.trim());
          const finalName = alias || importName;
          transformations.push(`const ${finalName} = React.${importName};`);
        });
      }
      
      // Handle ReactDOM imports: import ReactDOM from 'react-dom'
      const reactDOMMatch = importLine.match(/import\s+(\w+)\s+from\s+['"]react-dom['"]/);
      if (reactDOMMatch && reactDOMMatch[1] !== 'ReactDOM') {
        transformations.push(`const ${reactDOMMatch[1]} = ReactDOM;`);
      }
    });
    
    return transformations.join('\n');
  }

  // Standardized HTML template generator
  async generateHtmlDocument(content: ContentBlock, options: RenderingOptions = {}): Promise<string> {
    const { 
      theme = 'light', 
      enableConsoleCapture = true, 
      enableErrorBoundary = true,
      useCompilation = true
    } = options;
    
    const baseStyles = this.getBaseStyles(theme);
    const errorBoundaryScript = enableErrorBoundary ? this.getErrorBoundaryScript() : '';
    const consoleScript = enableConsoleCapture ? this.getConsoleCapture() : '';
    
    switch (content.type) {
      case 'react':
        return useCompilation 
          ? await this.generateCompiledReactDocument(content, baseStyles, errorBoundaryScript, consoleScript)
          : this.generateReactDocument(content, baseStyles, errorBoundaryScript, consoleScript);
      case 'html':
        return this.generatePlainHtmlDocument(content, baseStyles, consoleScript);
      case 'css':
        return this.generateCssDocument(content, baseStyles);
      case 'javascript':
        return useCompilation
          ? await this.generateCompiledJsDocument(content, baseStyles, consoleScript)
          : this.generateJsDocument(content, baseStyles, consoleScript);
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
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Mobile optimizations */
      @media (max-width: 768px) {
        body {
          padding: 0.5rem;
          font-size: 14px;
        }
        
        pre, code {
          font-size: 12px !important;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .content-wrapper {
          max-width: 100%;
          overflow-x: auto;
        }
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
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .loading-display {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
        text-align: center;
        padding: 1rem;
      }
      
      .content-wrapper {
        max-width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      pre {
        background: ${theme === 'dark' ? '#374151' : '#f9fafb'};
        border: 1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'};
        border-radius: 0.375rem;
        padding: 1rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Better mobile touch targets */
      @media (max-width: 768px) {
        button, .button, input, select, textarea {
          min-height: 44px;
        }
      }
      
      /* Responsive images and media */
      img, video, canvas {
        max-width: 100%;
        height: auto;
      }
    `;
  }

  private getErrorBoundaryScript(): string {
    return `
      // Enhanced error boundary for React components with mobile considerations
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
          
          // Enhanced error reporting
          const errorData = {
            type: 'react-error',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          };
          
          console.error('[ErrorBoundary] Component error:', errorData);
          
          // Send error to parent window with retry logic
          const sendError = () => {
            try {
              if (window.parent !== window) {
                window.parent.postMessage(errorData, '*');
              }
            } catch (e) {
              console.warn('[ErrorBoundary] Failed to send error to parent:', e);
            }
          };
          
          sendError();
        }

        render() {
          if (this.state.hasError) {
            return React.createElement('div', {
              className: 'error-display',
              style: { 
                margin: '1rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626'
              }
            }, [
              React.createElement('h3', { 
                key: 'title',
                style: { marginBottom: '0.5rem', fontSize: '1rem' }
              }, '⚠️ Component Error'),
              React.createElement('p', { 
                key: 'message',
                style: { fontSize: '0.875rem', wordWrap: 'break-word' }
              }, this.state.error),
              React.createElement('button', {
                key: 'retry',
                onClick: () => window.location.reload(),
                style: {
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  minHeight: '44px'
                }
              }, 'Retry')
            ]);
          }
          return this.props.children;
        }
      }
    `;
  }

  private getConsoleCapture(): string {
    return `
      // Enhanced console capture with mobile optimizations and performance considerations
      (function() {
        try {
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };
          
          window.capturedLogs = [];
          let messageBuffer = [];
          let sendTimeout = null;
          
          // Throttled message sending to prevent spam
          const sendBufferedMessages = () => {
            if (messageBuffer.length === 0) return;
            
            try {
              if (window.parent !== window) {
                messageBuffer.forEach(data => {
                  window.parent.postMessage(data, '*');
                });
              }
              messageBuffer = [];
            } catch (e) {
              console.warn('[ConsoleCapture] Failed to send messages:', e);
            }
          };
          
          const throttledSend = (data) => {
            messageBuffer.push(data);
            
            if (sendTimeout) {
              clearTimeout(sendTimeout);
            }
            
            sendTimeout = setTimeout(sendBufferedMessages, 100); // Batch messages
          };
          
          ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = function(...args) {
              try {
                const message = args.map(arg => {
                  try {
                    if (typeof arg === 'object' && arg !== null) {
                      // Limit object stringification for performance
                      if (arg.toString !== Object.prototype.toString) {
                        return String(arg);
                      }
                      return JSON.stringify(arg, null, 2).slice(0, 1000); // Limit size
                    }
                    return String(arg);
                  } catch (e) {
                    return '[Non-serializable Object]';
                  }
                }).join(' ');
                
                const logData = {
                  type: 'console-' + method,
                  message: message.slice(0, 500), // Limit message length
                  timestamp: Date.now(),
                  level: method
                };
                
                window.capturedLogs.push(logData);
                
                // Keep only last 50 logs for performance
                if (window.capturedLogs.length > 50) {
                  window.capturedLogs = window.capturedLogs.slice(-50);
                }
                
                throttledSend(logData);
                originalConsole[method].apply(console, args);
              } catch (e) {
                // Fallback to original console if anything fails
                originalConsole[method].apply(console, args);
              }
            };
          });
          
          // Enhanced error handling with better mobile support
          window.addEventListener('error', (event) => {
            try {
              const errorData = {
                type: 'runtime-error',
                message: event.message || 'Unknown error',
                filename: event.filename || '',
                lineno: event.lineno || 0,
                colno: event.colno || 0,
                error: event.error ? event.error.stack : null,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
              };
              
              throttledSend(errorData);
            } catch (e) {
              // Silently fail if postMessage fails
            }
          });
          
          window.addEventListener('unhandledrejection', (event) => {
            try {
              const rejectionData = {
                type: 'promise-rejection',
                message: event.reason ? String(event.reason).slice(0, 500) : 'Unhandled promise rejection',
                timestamp: Date.now()
              };
              
              throttledSend(rejectionData);
            } catch (e) {
              // Silently fail if postMessage fails
            }
          });
          
          // Mobile-specific optimizations
          if ('ontouchstart' in window) {
            // Add touch event error handling
            window.addEventListener('touchstart', function() {
              // Touch start tracking for mobile debugging
            }, { passive: true });
          }
          
        } catch (e) {
          // If anything fails in console setup, just continue
          console.warn('[ConsoleCapture] Setup failed:', e);
        }
      })();
    `;
  }

  private generateReactDocument(content: ContentBlock, baseStyles: string, errorBoundary: string, consoleScript: string): string {
    // Extract imports and clean code
    const { imports, cleanCode } = this.extractImports(content.code);
    
    // Transform imports to use global React/ReactDOM
    const globalTransforms = this.transformImportsToGlobals(imports);
    
    // Escape content code for safe injection
    const escapedCode = cleanCode.replace(/`/g, '\\`').replace(/\${/g, '\\${');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${content.title || 'React Component'}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${baseStyles}</style>
</head>
<body>
  <div id="root">
    <div class="loading-display">
      <div>Loading React component...</div>
    </div>
  </div>
  
  <script>
    ${consoleScript}
  </script>
  
  <script type="text/babel">
    // Global React setup - imports are handled at top level
    ${globalTransforms}
    
    // Error boundary component
    ${errorBoundary}
    
    // Component code (imports removed and handled above)
    try {
      ${cleanCode}
      
      // Enhanced component rendering with multiple strategies and better error handling
      const rootElement = document.getElementById('root');
      
      const renderComponent = () => {
        try {
          console.log('[React] Attempting to render component...');
          
          // Strategy 1: Look for App component
          if (typeof App !== 'undefined') {
            console.log('[React] Found App component, rendering...');
            ReactDOM.render(
              React.createElement(ErrorBoundary, null, React.createElement(App)),
              rootElement
            );
            return true;
          }
          
          // Strategy 2: Look for default export
          if (typeof module !== 'undefined' && module.exports && typeof module.exports.default !== 'undefined') {
            console.log('[React] Found default export, rendering...');
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
            console.log('[React] Checking component:', componentName);
            if (typeof window[componentName] === 'function') {
              console.log('[React] Found component function:', componentName);
              ReactDOM.render(
                React.createElement(ErrorBoundary, null, React.createElement(window[componentName])),
                rootElement
              );
              return true;
            }
          }
          
          console.warn('[React] No renderable component found');
          return false;
        } catch (e) {
          console.error('[React] Component rendering failed:', e);
          return false;
        }
      };
      
      // Try rendering with a delay to ensure all code is parsed
      setTimeout(() => {
        if (!renderComponent()) {
          rootElement.innerHTML = \`
            <div class="error-display">
              <h3>⚠️ No Renderable Component</h3>
              <p>Could not find a valid React component. Please ensure you have an "App" component or properly exported component.</p>
              <details style="margin-top: 1rem;">
                <summary style="cursor: pointer;">Debug Info</summary>
                <pre style="margin-top: 0.5rem; font-size: 0.75rem;">Available globals: \${Object.keys(window).filter(k => k[0] === k[0].toUpperCase()).join(', ')}</pre>
              </details>
            </div>
          \`;
        }
      }, 100);
      
    } catch (error) {
      console.error('[React] Failed to parse React component:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Parse Error</h3>
          <p>\${error.message}</p>
          <button onclick="window.location.reload()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.25rem; cursor: pointer; min-height: 44px;">Retry</button>
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

  private async generateCompiledReactDocument(content: ContentBlock, baseStyles: string, errorBoundary: string, consoleScript: string): Promise<string> {
    const { codeCompiler } = await import('./codeCompiler');
    
    try {
      const compilationResult = await codeCompiler.compileCode(content.code, 'react');
      
      if (compilationResult.error) {
        console.warn('Compilation failed, falling back to client-side:', compilationResult.error);
        return this.generateReactDocument(content, baseStyles, errorBoundary, consoleScript);
      }

      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${content.title || 'React Component'}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <style>${baseStyles}</style>
</head>
<body>
  <div id="root">
    <div class="loading-display">
      <div>Loading compiled React component...</div>
    </div>
  </div>
  
  <script>
    ${consoleScript}
    
    // Error boundary component
    ${errorBoundary}
  </script>
  
  <script>
    try {
      ${compilationResult.compiledCode}
      
      // Enhanced component rendering
      const rootElement = document.getElementById('root');
      
      const renderComponent = () => {
        try {
          console.log('[React] Attempting to render compiled component...');
          
          if (typeof App !== 'undefined') {
            console.log('[React] Found App component, rendering...');
            ReactDOM.render(
              React.createElement(ErrorBoundary, null, React.createElement(App)),
              rootElement
            );
            return true;
          }
          
          // Try to find any component function
          const componentRegex = /(?:const\\s+|function\\s+)(\\w+)/g;
          let match;
          while ((match = componentRegex.exec(\`${compilationResult.compiledCode.replace(/`/g, '\\`')}\`)) !== null) {
            const componentName = match[1];
            if (typeof window[componentName] === 'function') {
              console.log('[React] Found component function:', componentName);
              ReactDOM.render(
                React.createElement(ErrorBoundary, null, React.createElement(window[componentName])),
                rootElement
              );
              return true;
            }
          }
          
          console.warn('[React] No renderable component found');
          return false;
        } catch (e) {
          console.error('[React] Component rendering failed:', e);
          return false;
        }
      };
      
      setTimeout(() => {
        if (!renderComponent()) {
          rootElement.innerHTML = \`
            <div class="error-display">
              <h3>⚠️ No Renderable Component</h3>
              <p>Could not find a valid React component after compilation.</p>
            </div>
          \`;
        }
      }, 100);
      
    } catch (error) {
      console.error('[React] Failed to execute compiled code:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Execution Error</h3>
          <p>\${error.message}</p>
          <button onclick="window.location.reload()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.25rem; cursor: pointer; min-height: 44px;">Retry</button>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
    } catch (error) {
      console.error('Compilation service error:', error);
      return this.generateReactDocument(content, baseStyles, errorBoundary, consoleScript);
    }
  }

  private async generateCompiledJsDocument(content: ContentBlock, baseStyles: string, consoleScript: string): Promise<string> {
    const { codeCompiler } = await import('./codeCompiler');
    
    try {
      const compilationResult = await codeCompiler.compileCode(content.code, 'javascript');
      
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
      ${compilationResult.compiledCode}
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
    } catch (error) {
      console.error('JavaScript compilation error:', error);
      return this.generateJsDocument(content, baseStyles, consoleScript);
    }
  }
}

export const contentRenderer = ContentRenderer.getInstance();
