
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Sandbox } from "npm:@e2b/code-interpreter@^1.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionRequest {
  code: string;
  language?: string;
  packages?: string[];
  timeout?: number;
  enableFileSystem?: boolean;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  files?: FileInfo[];
  logs: string[];
}

interface FileInfo {
  name: string;
  content: string;
  path: string;
  size: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language = 'python', packages = [], timeout = 30000, enableFileSystem = false }: ExecutionRequest = await req.json();
    
    if (!code) {
      throw new Error('Code is required');
    }

    const startTime = Date.now();
    const logs: string[] = [];
    const e2bApiKey = Deno.env.get('E2B_API_KEY');

    if (!e2bApiKey) {
      throw new Error('E2B API key is not configured');
    }

    logs.push(`Starting E2B execution for ${language} code...`);

    // Create sandbox
    const sandbox = await Sandbox.create({
      apiKey: e2bApiKey,
      timeoutMs: timeout
    });

    try {
      // Install packages if specified
      if (packages.length > 0) {
        logs.push(`Installing packages: ${packages.join(', ')}`);
        
        for (const pkg of packages) {
          if (language === 'python') {
            await sandbox.runCode(`!pip install ${pkg}`);
          } else if (language === 'javascript' || language === 'typescript') {
            await sandbox.runCode(`!npm install ${pkg}`);
          }
        }
      }

      // Execute the main code
      logs.push('Executing user code...');
      const execution = await sandbox.runCode(code, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr.line}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout.line}`)
      });

      const executionTime = Date.now() - startTime;

      // Check for execution errors
      if (execution.error) {
        const result: ExecutionResult = {
          success: false,
          output: execution.results.map(r => r.text || '').join('\n') || '',
          error: `${execution.error.name}: ${execution.error.value}`,
          executionTime,
          logs
        };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Get file system contents if requested
      let files: FileInfo[] = [];
      if (enableFileSystem) {
        try {
          const fileListExecution = await sandbox.runCode('!find . -type f -name "*" | head -20');
          
          if (fileListExecution.results && fileListExecution.results.length > 0) {
            const output = fileListExecution.results.map(r => r.text || '').join('\n');
            const filePaths = output.split('\n').filter(path => path.trim());
            
            for (const filePath of filePaths) {
              try {
                const content = await sandbox.files.read(filePath);
                files.push({
                  name: filePath.split('/').pop() || filePath,
                  content,
                  path: filePath,
                  size: content.length
                });
              } catch (error) {
                logs.push(`Failed to read file ${filePath}: ${error}`);
              }
            }
          }
        } catch (error) {
          logs.push(`Failed to read file system: ${error}`);
        }
      }

      const result: ExecutionResult = {
        success: true,
        output: execution.results.map(r => r.text || '').join('\n') || 'Code executed successfully',
        executionTime,
        files,
        logs
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } finally {
      // Always close the sandbox
      await sandbox.kill();
    }

  } catch (error) {
    console.error('E2B execution error:', error);
    
    const result: ExecutionResult = {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now(),
      logs: [`Execution failed: ${error}`]
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
