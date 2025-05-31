
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
  
  ${type === 'react' || type === 'javascript' ? `
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    ${includeLucideIcons ? `<script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>` : ''}
  ` : ''}
  
  ${type === 'react' ? `
    <script type="text/babel">
      ${code}
      
      // Render the component if it's a default export
      if (typeof Component !== 'undefined') {
        ReactDOM.render(React.createElement(Component), document.getElementById('root'));
      } else {
        // Try to find any React component in the code
        const componentMatch = code.match(/const\\s+(\\w+)\\s*=\\s*\\(/);
        if (componentMatch) {
          const componentName = componentMatch[1];
          if (window[componentName]) {
            ReactDOM.render(React.createElement(window[componentName]), document.getElementById('root'));
          }
        }
      }
    </script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ` : ''}
  
  ${type === 'javascript' ? `
    <script>
      ${code}
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
