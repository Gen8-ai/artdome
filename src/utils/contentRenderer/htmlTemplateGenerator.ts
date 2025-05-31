
import { HTMLTemplateOptions } from './types';
import { EscapeUtils } from './escapeUtils';
import { TailwindUtils } from './tailwindUtils';

export class HTMLTemplateGenerator {
  static createHTMLTemplate(options: HTMLTemplateOptions): string {
    const {
      code,
      type,
      title,
      additionalCSS = '',
      includeTailwind = true,
      includeLucideIcons = true,
      includeShadcnUI = true,
      theme = 'light'
    } = options;

    const tailwindCSS = includeTailwind ? TailwindUtils.getTailwindCSS() : '';
    const themeClasses = theme === 'dark' ? 'dark' : '';

    // Safely escape code for injection
    const safeCode = EscapeUtils.escapeForScript(code);
    
    // Pre-compute component detection safely
    const componentPattern = /(?:function|const)\s+([A-Z]\w*)\s*[=(]/;
    const componentMatch = code.match(componentPattern);
    const potentialComponentName = componentMatch ? componentMatch[1] : null;

    return `<!DOCTYPE html>
<html lang="en" class="${themeClasses}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${EscapeUtils.escapeHtml(title)}</title>
  
  ${includeTailwind ? `<script src="https://cdn.tailwindcss.com"></script>` : ''}
  
  <style>
    ${tailwindCSS}
    ${additionalCSS}
    
    /* CSS variables for theming */
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

    .error-display {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="root">${type === 'html' ? EscapeUtils.escapeHtml(code) : ''}</div>
  
  ${HTMLTemplateGenerator.getReactScripts(type, safeCode, potentialComponentName, includeLucideIcons, includeShadcnUI)}
  
  ${HTMLTemplateGenerator.getJavaScriptScripts(type, safeCode)}
  
  ${HTMLTemplateGenerator.getCSSStyles(type, code)}
</body>
</html>`;
  }

  private static getReactScripts(type: string, safeCode: string, potentialComponentName: string | null, includeLucideIcons: boolean, includeShadcnUI: boolean): string {
    if (type !== 'react' && type !== 'javascript') return '';

    return `
    <!-- Load React libraries with proper error handling -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Setup global environment with proper error handling -->
    <script>
      try {
        // Ensure React is available globally
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
          throw new Error('React libraries failed to load');
        }
        
        window.React = React;
        window.ReactDOM = ReactDOM;
        
        // Setup module compatibility
        window.exports = {};
        window.module = { exports: {} };
        
        // Mock require function
        window.require = function(module) {
          if (module === 'react') return window.React;
          if (module === 'react-dom') return window.ReactDOM;
          console.warn('Module not available:', module);
          return {};
        };
        
        ${HTMLTemplateGenerator.getLucideIconsSetup(includeLucideIcons)}
        
        ${HTMLTemplateGenerator.getShadcnUISetup(includeShadcnUI)}
        
        // Enhanced Error boundary
        window.ErrorBoundary = class extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false, error: null, errorInfo: null };
          }

          static getDerivedStateFromError(error) {
            return { hasError: true, error: error.message };
          }

          componentDidCatch(error, errorInfo) {
            console.error('React Error Boundary caught an error:', error, errorInfo);
            this.setState({ errorInfo: errorInfo.componentStack });
          }

          render() {
            if (this.state.hasError) {
              return React.createElement('div', {
                className: 'error-display'
              }, [
                React.createElement('h3', { key: 'title' }, '⚠️ Component Error'),
                React.createElement('p', { key: 'message' }, this.state.error),
                React.createElement('details', { key: 'details' }, [
                  React.createElement('summary', { key: 'summary' }, 'Error Details'),
                  React.createElement('pre', { key: 'stack', style: { fontSize: '12px', marginTop: '8px' } }, this.state.errorInfo)
                ])
              ]);
            }
            return this.props.children;
          }
        };
        
        console.log('Global environment setup complete');
      } catch (setupError) {
        console.error('Setup error:', setupError);
        document.getElementById('root').innerHTML = '<div class="error-display"><h3>⚠️ Setup Error</h3><p>' + setupError.message + '</p></div>';
      }
    </script>
    
    ${HTMLTemplateGenerator.getLucideIconsScript(includeLucideIcons)}
    
    <!-- User code execution with comprehensive error handling -->
    <script>
      try {
        // Wait for all dependencies to be ready
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
          throw new Error('React dependencies not loaded');
        }
        
        // Execute user code safely using properly escaped content
        console.log('Executing user code...');
        
        // Use eval with the escaped code directly (no Function constructor needed)
        ${safeCode}
        
        // Auto-detect and render component
        const rootElement = document.getElementById('root');
        let ComponentToRender = null;
        
        // Try different component detection strategies
        if (typeof App !== 'undefined') {
          ComponentToRender = App;
        } else if (typeof Component !== 'undefined') {
          ComponentToRender = Component;
        } else if (${potentialComponentName ? `typeof ${potentialComponentName} !== 'undefined'` : 'false'}) {
          ComponentToRender = ${potentialComponentName || 'null'};
        } else {
          // Scan global scope for React components
          const globalNames = Object.getOwnPropertyNames(window);
          for (const name of globalNames) {
            if (/^[A-Z]/.test(name) && typeof window[name] === 'function') {
              try {
                // Test if it's a valid React component
                const testElement = React.createElement(window[name]);
                if (testElement) {
                  ComponentToRender = window[name];
                  console.log('Found component:', name);
                  break;
                }
              } catch (e) {
                // Not a valid React component, continue
              }
            }
          }
        }
        
        if (ComponentToRender && typeof ComponentToRender === 'function') {
          console.log('Rendering component...');
          ReactDOM.render(
            React.createElement(window.ErrorBoundary, null, 
              React.createElement(ComponentToRender)
            ),
            rootElement
          );
          console.log('Component rendered successfully');
        } else {
          console.warn('No valid React component found');
          rootElement.innerHTML = '<div class="error-display"><h3>⚠️ No Component Found</h3><p>Make sure to define a React component function (e.g., App, Component, or any function starting with uppercase).</p><p>Available globals: ' + Object.getOwnPropertyNames(window).filter(n => /^[A-Z]/.test(n)).join(', ') + '</p></div>';
        }
      } catch (error) {
        console.error('Failed to render React component:', error);
        const rootElement = document.getElementById('root');
        if (rootElement) {
          rootElement.innerHTML = \`
            <div class="error-display">
              <h3>⚠️ Render Error</h3>
              <p>\${error.message}</p>
              <details style="margin-top: 8px;">
                <summary>Error Stack</summary>
                <pre style="font-size: 12px; margin-top: 8px; white-space: pre-wrap;">\${error.stack || 'No stack trace available'}</pre>
              </details>
            </div>
          \`;
        }
      }
    </script>`;
  }

  private static getLucideIconsSetup(includeLucideIcons: boolean): string {
    if (!includeLucideIcons) return '';
    
    return `
        // Setup Lucide icons placeholder
        window.setupLucideIcons = function() {
          if (window.LucideReact) {
            const iconNames = ['Home', 'Settings', 'User', 'Search', 'Menu', 'X', 'Plus', 'Minus', 'Edit', 'Delete', 'Save', 'Cancel', 'Check', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ArrowUp', 'ArrowDown'];
            iconNames.forEach(iconName => {
              if (window.LucideReact[iconName]) {
                window[iconName] = window.LucideReact[iconName];
              }
            });
          }
        };`;
  }

  private static getLucideIconsScript(includeLucideIcons: boolean): string {
    if (!includeLucideIcons) return '';
    
    return `
    <!-- Load Lucide icons with error handling -->
    <script>
      try {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js';
        script.onload = function() {
          if (window.setupLucideIcons) window.setupLucideIcons();
        };
        script.onerror = function() {
          console.warn('Failed to load Lucide icons');
        };
        document.head.appendChild(script);
      } catch (iconError) {
        console.warn('Icon loading error:', iconError);
      }
    </script>`;
  }

  private static getShadcnUISetup(includeShadcnUI: boolean): string {
    if (!includeShadcnUI) return '';
    
    return `
        // Setup shadcn/ui components
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
        };`;
  }

  private static getJavaScriptScripts(type: string, safeCode: string): string {
    if (type !== 'javascript') return '';
    
    return `
    <script>
      try {
        ${safeCode}
      } catch (error) {
        console.error('JavaScript execution error:', error);
        document.getElementById('root').innerHTML = \`
          <div class="error-display">
            <h3>⚠️ JavaScript Error</h3>
            <p>\${error.message}</p>
            <pre style="font-size: 12px; margin-top: 8px;">\${error.stack}</pre>
          </div>
        \`;
      }
    </script>`;
  }

  private static getCSSStyles(type: string, code: string): string {
    if (type !== 'css') return '';
    
    return `
    <style>
      ${EscapeUtils.escapeHtml(code)}
    </style>`;
  }
}
