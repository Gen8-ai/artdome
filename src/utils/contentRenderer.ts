
import { CodeCompiler, codeCompiler } from './codeCompiler';

export interface ContentBlock {
  type: 'html' | 'css' | 'javascript' | 'react' | 'artifact';
  code: string;
  title?: string;
  description?: string;
  language?: string;
  id?: string;
  metadata?: {
    originalPattern?: string;
    matchIndex?: number;
    isFullContent?: boolean;
  };
}

export interface RenderingOptions {
  useCompilation?: boolean;
  includeTailwind?: boolean;
  includeLucideIcons?: boolean;
  includeShadcnUI?: boolean;
  theme?: 'light' | 'dark' | 'system';
  enableConsoleCapture?: boolean;
  enableErrorBoundary?: boolean;
}

export class ContentRenderer {
  private static instance: ContentRenderer;
  
  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  detectContentType(code: string): 'html' | 'css' | 'javascript' | 'react' | 'artifact' {
    // Remove comments and whitespace for better detection
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
    
    // Check for React/JSX patterns
    if (
      cleanCode.includes('React') ||
      cleanCode.includes('useState') ||
      cleanCode.includes('useEffect') ||
      cleanCode.includes('jsx') ||
      /<[A-Z]/.test(cleanCode) ||
      /function\s+[A-Z]/.test(cleanCode) ||
      /const\s+[A-Z]\w*\s*=/.test(cleanCode)
    ) {
      return 'react';
    }

    // Check for HTML patterns
    if (
      cleanCode.includes('<!DOCTYPE') ||
      cleanCode.includes('<html') ||
      cleanCode.includes('<body') ||
      (cleanCode.includes('<div') && !cleanCode.includes('function'))
    ) {
      return 'html';
    }

    // Check for CSS patterns
    if (
      cleanCode.includes('{') && cleanCode.includes('}') &&
      (cleanCode.includes(':') || cleanCode.includes(';')) &&
      !cleanCode.includes('function') &&
      !cleanCode.includes('const') &&
      !cleanCode.includes('let')
    ) {
      return 'css';
    }

    // Check for artifact patterns
    if (cleanCode.includes('<artifact') || cleanCode.includes('artifact>')) {
      return 'artifact';
    }

    // Default to JavaScript
    return 'javascript';
  }

  async generateHtmlDocument(
    block: ContentBlock, 
    options: RenderingOptions = {}
  ): Promise<string> {
    const {
      useCompilation = false,
      includeTailwind = true,
      includeLucideIcons = true,
      includeShadcnUI = true,
      theme = 'light'
    } = options;

    let processedCode = block.code;
    let additionalCSS = '';

    // Compile code if requested
    if (useCompilation && (block.type === 'react' || block.type === 'javascript')) {
      try {
        const result = await codeCompiler.compileCode(block.code, block.type, {
          includeTailwind,
          includeLucideIcons,
          includeShadcnUI
        });
        
        if (!result.error) {
          processedCode = result.compiledCode;
          additionalCSS = result.cssCode || '';
        }
      } catch (error) {
        console.warn('Compilation failed, using original code:', error);
      }
    }

    return this.createHTMLTemplate({
      code: processedCode,
      type: block.type,
      title: block.title || 'Preview',
      additionalCSS,
      includeTailwind,
      includeLucideIcons,
      includeShadcnUI,
      theme
    });
  }

  private createHTMLTemplate({
    code,
    type,
    title,
    additionalCSS = '',
    includeTailwind = true,
    includeLucideIcons = true,
    includeShadcnUI = true,
    theme = 'light'
  }: {
    code: string;
    type: string;
    title: string;
    additionalCSS?: string;
    includeTailwind?: boolean;
    includeLucideIcons?: boolean;
    includeShadcnUI?: boolean;
    theme?: string;
  }): string {
    const tailwindCSS = includeTailwind ? this.getTailwindCSS() : '';
    const themeClasses = theme === 'dark' ? 'dark' : '';

    return `<!DOCTYPE html>
<html lang="en" class="${themeClasses}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  ${includeTailwind ? `<script src="https://cdn.tailwindcss.com"></script>` : ''}
  
  <style>
    ${tailwindCSS}
    ${additionalCSS}
    
    /* Custom CSS variables for theming */
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --border: 214.3 31.8% 91.4%;
      --input: 214.3 31.8% 91.4%;
      --ring: 221.2 83.2% 53.3%;
    }
    
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --primary: 217.2 91.2% 59.8%;
      --primary-foreground: 222.2 47.4% 11.2%;
      --secondary: 217.2 32.6% 17.5%;
      --secondary-foreground: 210 40% 98%;
      --muted: 217.2 32.6% 17.5%;
      --muted-foreground: 215 20.2% 65.1%;
      --accent: 217.2 32.6% 17.5%;
      --accent-foreground: 210 40% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 210 40% 98%;
      --border: 217.2 32.6% 17.5%;
      --input: 217.2 32.6% 17.5%;
      --ring: 217.2 91.2% 59.8%;
    }
    
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
  </style>
</head>
<body>
  <div id="root">${type === 'html' ? code : ''}</div>
  
  <!-- Global setup script must come first -->
  <script>
    // Setup global exports object for CommonJS compatibility
    window.exports = {};
    window.module = { exports: {} };
    
    // Console capture setup
    window.capturedErrors = [];
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = function(...args) {
      const errorMsg = args.join(' ');
      window.capturedErrors.push({
        type: 'error',
        message: errorMsg,
        timestamp: Date.now()
      });
      
      // Send to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'console-error',
          message: errorMsg,
          errors: window.capturedErrors
        }, '*');
      }
      
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const warnMsg = args.join(' ');
      window.capturedErrors.push({
        type: 'warning',
        message: warnMsg,
        timestamp: Date.now()
      });
      
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'console-warning',
          message: warnMsg
        }, '*');
      }
      
      originalConsoleWarn.apply(console, args);
    };
  </script>
  
  ${type === 'react' || type === 'javascript' ? `
    <!-- Load React dependencies first -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    ${includeLucideIcons ? `<script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>` : ''}
    
    <!-- Setup global variables after libraries load -->
    <script>
      // Ensure React globals are available
      window.React = window.React || React;
      window.ReactDOM = window.ReactDOM || ReactDOM;
      
      ${includeLucideIcons ? `
      // Setup Lucide icons globally
      if (window.LucideReact) {
        window.LucideReact = window.LucideReact;
      }
      ` : ''}
      
      ${includeShadcnUI ? `
      // Setup shadcn/ui components globally
      window.ShadcnUI = {
        Button: function({ children, className = '', variant = 'default', size = 'default', ...props }) {
          const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
          const variantClasses = {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline'
          };
          const sizeClasses = {
            default: 'h-10 px-4 py-2',
            sm: 'h-9 rounded-md px-3',
            lg: 'h-11 rounded-md px-8',
            icon: 'h-10 w-10'
          };
          
          return React.createElement('button', {
            className: \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`,
            ...props
          }, children);
        }
      };
      ` : ''}
      
      // Error boundary component
      window.ErrorBoundary = class extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error: error.message };
        }

        componentDidCatch(error, errorInfo) {
          console.error('React Error Boundary caught an error:', error, errorInfo);
          
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
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '6px',
                margin: '10px 0',
                fontFamily: 'monospace',
                fontSize: '14px'
              }
            }, [
              React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
              React.createElement('p', { key: 'message' }, this.state.error)
            ]);
          }
          return this.props.children;
        }
      };
    </script>
  ` : ''}
  
  ${type === 'react' ? `
    <!-- Load Babel for JSX transformation -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- User code execution -->
    <script type="text/babel">
      try {
        ${code}
        
        // Try to render the component
        const rootElement = document.getElementById('root');
        
        if (typeof App !== 'undefined') {
          ReactDOM.render(
            React.createElement(window.ErrorBoundary, null, React.createElement(App)),
            rootElement
          );
        } else if (typeof Component !== 'undefined') {
          ReactDOM.render(
            React.createElement(window.ErrorBoundary, null, React.createElement(Component)),
            rootElement
          );
        } else {
          // Try to find any React component in the code
          const componentMatch = \`${code}\`.match(/(?:const|function)\\s+(\\w+)\\s*[=\\(]/);
          if (componentMatch) {
            const ComponentName = componentMatch[1];
            if (typeof window[ComponentName] !== 'undefined') {
              ReactDOM.render(
                React.createElement(window.ErrorBoundary, null, React.createElement(window[ComponentName])),
                rootElement
              );
            } else {
              try {
                const Component = eval(ComponentName);
                ReactDOM.render(
                  React.createElement(window.ErrorBoundary, null, React.createElement(Component)),
                  rootElement
                );
              } catch (e) {
                console.error('Could not render component:', e);
                rootElement.innerHTML = '<div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin: 10px 0; font-family: monospace; font-size: 14px;"><h3>⚠️ Render Error</h3><p>No valid React component found. Make sure to export a component named "App" or define a function component.</p></div>';
              }
            }
          } else {
            rootElement.innerHTML = '<div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin: 10px 0; font-family: monospace; font-size: 14px;"><h3>⚠️ Render Error</h3><p>No valid React component found. Make sure to export a component named "App" or define a function component.</p></div>';
          }
        }
      } catch (error) {
        console.error('Failed to render React component:', error);
        document.getElementById('root').innerHTML = \`
          <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin: 10px 0; font-family: monospace; font-size: 14px;">
            <h3>⚠️ Render Error</h3>
            <p>\${error.message}</p>
            <pre style="font-size: 12px; margin-top: 8px;">\${error.stack}</pre>
          </div>
        \`;
      }
    </script>
  ` : ''}
  
  ${type === 'javascript' ? `
    <script>
      try {
        ${code}
      } catch (error) {
        console.error('JavaScript execution error:', error);
        document.getElementById('root').innerHTML = \`
          <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin: 10px 0; font-family: monospace; font-size: 14px;">
            <h3>⚠️ JavaScript Error</h3>
            <p>\${error.message}</p>
            <pre style="font-size: 12px; margin-top: 8px;">\${error.stack}</pre>
          </div>
        \`;
      }
    </script>
  ` : ''}
  
  ${type === 'css' ? `
    <style>
      ${code}
    </style>
  ` : ''}
</body>
</html>`;
  }

  private getTailwindCSS(): string {
    return `
      /* Basic Tailwind reset and utilities */
      * { box-sizing: border-box; }
      .flex { display: flex; }
      .inline-flex { display: inline-flex; }
      .grid { display: grid; }
      .hidden { display: none; }
      .w-full { width: 100%; }
      .h-full { height: 100%; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 0.5rem; }
      .gap-4 { gap: 1rem; }
      .p-2 { padding: 0.5rem; }
      .p-4 { padding: 1rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .text-sm { font-size: 0.875rem; }
      .text-lg { font-size: 1.125rem; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .rounded { border-radius: 0.25rem; }
      .rounded-md { border-radius: 0.375rem; }
      .border { border-width: 1px; }
      .bg-primary { background-color: hsl(var(--primary)); }
      .bg-secondary { background-color: hsl(var(--secondary)); }
      .text-primary-foreground { color: hsl(var(--primary-foreground)); }
      .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
      .hover\\:bg-primary\\/90:hover { background-color: hsl(var(--primary) / 0.9); }
    `;
  }
}

export const contentRenderer = ContentRenderer.getInstance();
