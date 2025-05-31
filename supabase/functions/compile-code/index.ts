
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompileRequest {
  code: string;
  type: 'react' | 'javascript' | 'html' | 'css';
  options?: {
    includeSourceMap?: boolean;
    minify?: boolean;
    includeTailwind?: boolean;
    includeLucideIcons?: boolean;
    includeShadcnUI?: boolean;
  };
}

interface CompileResponse {
  compiledCode: string;
  sourceMap?: string;
  error?: string;
  dependencies?: string[];
  cssCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, type, options = {} }: CompileRequest = await req.json();
    
    console.log(`Compiling ${type} code...`);

    let compiledCode = code;
    let dependencies: string[] = [];
    let cssCode = '';
    
    if (type === 'react') {
      // Extract imports and transform for browser compatibility
      const { imports, cleanCode, transformedImports } = extractAndTransformImports(code);
      dependencies = extractDependencies(imports);
      
      // Add Tailwind CSS if requested
      if (options.includeTailwind) {
        cssCode = generateTailwindCSS();
        dependencies.push('tailwindcss');
      }
      
      // Create the final compiled code structure
      compiledCode = `
        // Global React setup
        ${transformedImports}
        
        // Tailwind CSS utilities (if needed)
        ${options.includeTailwind ? generateTailwindUtilities() : ''}
        
        // Lucide React icons setup (if needed)
        ${options.includeLucideIcons ? generateLucideSetup() : ''}
        
        // shadcn/ui components setup (if needed)
        ${options.includeShadcnUI ? generateShadcnSetup() : ''}
        
        // Component code
        ${cleanCode}
      `;
      
      console.log('React code compiled successfully');
    } else if (type === 'javascript') {
      // For vanilla JS, just clean up and validate
      compiledCode = code;
      console.log('JavaScript code processed');
    } else if (type === 'css') {
      // Process CSS and add Tailwind if requested
      compiledCode = code;
      if (options.includeTailwind) {
        compiledCode = generateTailwindCSS() + '\n' + code;
      }
      console.log('CSS code processed');
    }

    const response: CompileResponse = {
      compiledCode,
      dependencies,
      cssCode,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Compilation error:', error);
    
    const errorResponse: CompileResponse = {
      compiledCode: '',
      error: error instanceof Error ? error.message : 'Unknown compilation error'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function extractAndTransformImports(code: string): { imports: string[], cleanCode: string, transformedImports: string } {
  const importLines: string[] = [];
  const lines = code.split('\n');
  let inImportBlock = false;
  const cleanLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('import ') && !inImportBlock) {
      inImportBlock = true;
      importLines.push(lines[i]);
    } else if (inImportBlock && (line.startsWith('import ') || line === '' || line.startsWith('//'))) {
      if (line.startsWith('import ')) {
        importLines.push(lines[i]);
      }
    } else {
      inImportBlock = false;
      cleanLines.push(lines[i]);
    }
  }

  const transformedImports = transformImportsToGlobals(importLines);

  return {
    imports: importLines,
    cleanCode: cleanLines.join('\n').trim(),
    transformedImports
  };
}

function transformImportsToGlobals(imports: string[]): string {
  const transformations: string[] = [];
  
  imports.forEach(importLine => {
    // Handle React default import
    const reactDefaultMatch = importLine.match(/import\s+(\w+)\s+from\s+['"]react['"]/);
    if (reactDefaultMatch && reactDefaultMatch[1] !== 'React') {
      transformations.push(`const ${reactDefaultMatch[1]} = React;`);
    }
    
    // Handle React named imports
    const reactNamedMatch = importLine.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
    if (reactNamedMatch) {
      const namedImports = reactNamedMatch[1].split(',').map(imp => imp.trim());
      namedImports.forEach(namedImport => {
        const [importName, alias] = namedImport.split(' as ').map(s => s.trim());
        const finalName = alias || importName;
        transformations.push(`const ${finalName} = React.${importName};`);
      });
    }
    
    // Handle ReactDOM imports
    const reactDOMMatch = importLine.match(/import\s+(\w+)\s+from\s+['"]react-dom['"]/);
    if (reactDOMMatch && reactDOMMatch[1] !== 'ReactDOM') {
      transformations.push(`const ${reactDOMMatch[1]} = ReactDOM;`);
    }

    // Handle Lucide React imports
    const lucideMatch = importLine.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
    if (lucideMatch) {
      const lucideImports = lucideMatch[1].split(',').map(imp => imp.trim());
      lucideImports.forEach(iconImport => {
        const [iconName, alias] = iconImport.split(' as ').map(s => s.trim());
        const finalName = alias || iconName;
        transformations.push(`const ${finalName} = LucideReact.${iconName};`);
      });
    }

    // Handle shadcn/ui imports
    const shadcnMatch = importLine.match(/import\s+\{([^}]+)\}\s+from\s+['"]@\/components\/ui\/([^'"]+)['"]/);
    if (shadcnMatch) {
      const [, imports, componentPath] = shadcnMatch;
      const componentImports = imports.split(',').map(imp => imp.trim());
      componentImports.forEach(compImport => {
        const [compName, alias] = compImport.split(' as ').map(s => s.trim());
        const finalName = alias || compName;
        transformations.push(`const ${finalName} = ShadcnUI.${compName};`);
      });
    }
  });
  
  return transformations.join('\n');
}

function extractDependencies(imports: string[]): string[] {
  const deps: string[] = [];
  
  imports.forEach(importLine => {
    const match = importLine.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      deps.push(match[1]);
    }
  });
  
  return deps;
}

function generateTailwindCSS(): string {
  return `
/* Tailwind CSS Base */
*, ::before, ::after {
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: #e5e7eb;
}

html {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -moz-tab-size: 4;
  tab-size: 4;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
}

body {
  margin: 0;
  line-height: inherit;
}
  `;
}

function generateTailwindUtilities(): string {
  return `
// Tailwind utility functions available globally
window.cn = function(...classes) {
  return classes.filter(Boolean).join(' ');
};
  `;
}

function generateLucideSetup(): string {
  return `
// Lucide React icons setup
window.LucideReact = {
  // Common icons
  Home: function(props) {
    return React.createElement('svg', {
      ...props,
      xmlns: 'http://www.w3.org/2000/svg',
      width: props.size || 24,
      height: props.size || 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: props.color || 'currentColor',
      strokeWidth: props.strokeWidth || 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, React.createElement('path', { d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }), React.createElement('polyline', { points: '9,22 9,12 15,12 15,22' }));
  },
  Search: function(props) {
    return React.createElement('svg', {
      ...props,
      xmlns: 'http://www.w3.org/2000/svg',
      width: props.size || 24,
      height: props.size || 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: props.color || 'currentColor',
      strokeWidth: props.strokeWidth || 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, React.createElement('circle', { cx: '11', cy: '11', r: '8' }), React.createElement('path', { d: 'm21 21-4.35-4.35' }));
  },
  Menu: function(props) {
    return React.createElement('svg', {
      ...props,
      xmlns: 'http://www.w3.org/2000/svg',
      width: props.size || 24,
      height: props.size || 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: props.color || 'currentColor',
      strokeWidth: props.strokeWidth || 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, React.createElement('line', { x1: '4', x2: '20', y1: '12', y2: '12' }), React.createElement('line', { x1: '4', x2: '20', y1: '6', y2: '6' }), React.createElement('line', { x1: '4', x2: '20', y1: '18', y2: '18' }));
  }
};
  `;
}

function generateShadcnSetup(): string {
  return `
// shadcn/ui components setup
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
  },
  
  Input: function({ className = '', type = 'text', ...props }) {
    return React.createElement('input', {
      type,
      className: \`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 \${className}\`,
      ...props
    });
  }
};
  `;
}

serve(handler);
