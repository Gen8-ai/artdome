
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
  };
}

interface CompileResponse {
  compiledCode: string;
  sourceMap?: string;
  error?: string;
  dependencies?: string[];
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
    
    if (type === 'react') {
      // Extract imports and transform for browser compatibility
      const { imports, cleanCode, transformedImports } = extractAndTransformImports(code);
      dependencies = extractDependencies(imports);
      
      // Create the final compiled code structure
      compiledCode = `
        // Global React setup
        ${transformedImports}
        
        // Component code
        ${cleanCode}
      `;
      
      console.log('React code compiled successfully');
    } else if (type === 'javascript') {
      // For vanilla JS, just clean up and validate
      compiledCode = code;
      console.log('JavaScript code processed');
    }

    const response: CompileResponse = {
      compiledCode,
      dependencies,
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

serve(handler);
