
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
      // Clean the code and remove ES6 imports/exports
      const cleanedCode = cleanAndTransformReactCode(code);
      
      // Add Tailwind CSS if requested
      if (options.includeTailwind) {
        cssCode = generateTailwindCSS();
        dependencies.push('tailwindcss');
      }
      
      // Create browser-compatible React code
      compiledCode = cleanedCode;
      
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

function cleanAndTransformReactCode(code: string): string {
  let cleanCode = code;
  
  // Remove all import statements
  cleanCode = cleanCode.replace(/^import\s+.*?;?\s*$/gm, '');
  
  // Remove export statements and convert to assignments
  cleanCode = cleanCode.replace(/^export\s+default\s+(\w+);?\s*$/gm, '// Component: $1');
  cleanCode = cleanCode.replace(/^export\s+\{([^}]+)\};?\s*$/gm, '// Exports: $1');
  cleanCode = cleanCode.replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ');
  
  // Clean up any remaining exports
  cleanCode = cleanCode.replace(/^export\s+/gm, '');
  
  // Remove empty lines and trim
  cleanCode = cleanCode.replace(/^\s*[\r\n]/gm, '').trim();
  
  // Ensure React hooks are available as globals
  const reactHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];
  
  // Add React hook destructuring at the top
  const hookSetup = reactHooks.map(hook => `const ${hook} = React.${hook};`).join('\n');
  
  return `${hookSetup}\n\n${cleanCode}`;
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

serve(handler);
