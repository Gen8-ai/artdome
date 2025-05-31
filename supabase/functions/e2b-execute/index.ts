
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
  setupDevEnvironment?: boolean;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  files?: FileInfo[];
  logs: string[];
  sandboxInfo?: {
    id: string;
    uptime: number;
    memoryUsage?: number;
  };
}

interface FileInfo {
  name: string;
  content: string;
  path: string;
  size: number;
}

interface ErrorDetail {
  type: 'setup' | 'execution' | 'timeout' | 'resource' | 'network' | 'unknown';
  code?: string;
  details: string;
  suggestion: string;
}

class E2BErrorHandler {
  static categorizeError(error: any): ErrorDetail {
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes('timeout') || errorMsg.includes('deadline')) {
      return {
        type: 'timeout',
        code: 'E2B_TIMEOUT',
        details: 'Execution exceeded time limit',
        suggestion: 'Try breaking down your code into smaller chunks or optimize for performance'
      };
    }
    
    if (errorMsg.includes('memory') || errorMsg.includes('OOM')) {
      return {
        type: 'resource',
        code: 'E2B_MEMORY',
        details: 'Insufficient memory for execution',
        suggestion: 'Reduce memory usage or process data in smaller batches'
      };
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('connection')) {
      return {
        type: 'network',
        code: 'E2B_NETWORK',
        details: 'Network connectivity issue',
        suggestion: 'Check your internet connection and try again'
      };
    }
    
    if (errorMsg.includes('pip install') || errorMsg.includes('npm install')) {
      return {
        type: 'setup',
        code: 'E2B_SETUP',
        details: 'Package installation failed',
        suggestion: 'Verify package names and try installing one at a time'
      };
    }
    
    if (errorMsg.includes('SyntaxError') || errorMsg.includes('IndentationError')) {
      return {
        type: 'execution',
        code: 'E2B_SYNTAX',
        details: 'Code syntax error',
        suggestion: 'Check your code syntax and indentation'
      };
    }
    
    return {
      type: 'unknown',
      code: 'E2B_UNKNOWN',
      details: errorMsg,
      suggestion: 'Please check your code and try again'
    };
  }
  
  static formatError(errorDetail: ErrorDetail): string {
    return `[${errorDetail.type.toUpperCase()}] ${errorDetail.details}. ${errorDetail.suggestion}`;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let sandbox: Sandbox | null = null;

  try {
    const { 
      code, 
      language = 'python', 
      packages = [], 
      timeout = 30000, 
      enableFileSystem = false,
      setupDevEnvironment = false 
    }: ExecutionRequest = await req.json();
    
    if (!code) {
      throw new Error('Code is required');
    }

    const logs: string[] = [];
    const e2bApiKey = Deno.env.get('E2B_API_KEY');

    if (!e2bApiKey) {
      throw new Error('E2B API key is not configured');
    }

    logs.push(`Starting E2B execution for ${language} code...`);
    logs.push(`Packages to install: ${packages.join(', ') || 'none'}`);
    logs.push(`Development environment setup: ${setupDevEnvironment ? 'enabled' : 'disabled'}`);

    // Create sandbox with enhanced configuration
    try {
      sandbox = await Sandbox.create({
        apiKey: e2bApiKey,
        timeoutMs: timeout,
        metadata: {
          language,
          setupDevEnvironment: setupDevEnvironment.toString(),
          timestamp: new Date().toISOString()
        }
      });
      
      logs.push(`Sandbox created successfully: ${sandbox.sandboxId}`);
    } catch (error) {
      const errorDetail = E2BErrorHandler.categorizeError(error);
      throw new Error(`Sandbox creation failed: ${E2BErrorHandler.formatError(errorDetail)}`);
    }

    // Setup development environment if requested
    if (setupDevEnvironment) {
      logs.push('Setting up development environment...');
      try {
        const devSetupCode = getDevEnvironmentSetup(language, packages);
        const setupResult = await sandbox.runCode(devSetupCode, {
          onStderr: (stderr) => logs.push(`SETUP STDERR: ${stderr.line}`),
          onStdout: (stdout) => logs.push(`SETUP STDOUT: ${stdout.line}`)
        });
        
        if (setupResult.error) {
          logs.push(`Development setup warning: ${setupResult.error.name}: ${setupResult.error.value}`);
        } else {
          logs.push('Development environment setup completed');
        }
      } catch (error) {
        logs.push(`Development setup failed: ${error}`);
        // Continue with execution even if dev setup fails
      }
    }

    // Install packages if specified
    if (packages.length > 0) {
      logs.push(`Installing packages: ${packages.join(', ')}`);
      
      for (const pkg of packages) {
        try {
          let installCmd = '';
          if (language === 'python') {
            installCmd = `!pip install ${pkg}`;
          } else if (['javascript', 'typescript', 'node'].includes(language)) {
            installCmd = `!npm install ${pkg}`;
          }
          
          if (installCmd) {
            const installResult = await sandbox.runCode(installCmd, {
              onStderr: (stderr) => logs.push(`INSTALL STDERR: ${stderr.line}`),
              onStdout: (stdout) => logs.push(`INSTALL STDOUT: ${stdout.line}`)
            });
            
            if (installResult.error) {
              logs.push(`Failed to install ${pkg}: ${installResult.error.value}`);
            } else {
              logs.push(`Successfully installed ${pkg}`);
            }
          }
        } catch (error) {
          logs.push(`Package installation error for ${pkg}: ${error}`);
        }
      }
    }

    // Execute the main code with enhanced error handling
    logs.push('Executing user code...');
    let execution;
    
    try {
      execution = await sandbox.runCode(code, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr.line}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout.line}`)
      });
    } catch (error) {
      const errorDetail = E2BErrorHandler.categorizeError(error);
      throw new Error(`Code execution failed: ${E2BErrorHandler.formatError(errorDetail)}`);
    }

    const executionTime = Date.now() - startTime;

    // Handle execution errors with detailed categorization
    if (execution.error) {
      const errorDetail = E2BErrorHandler.categorizeError(execution.error);
      
      const result: ExecutionResult = {
        success: false,
        output: execution.results.map(r => r.text || '').join('\n') || '',
        error: E2BErrorHandler.formatError(errorDetail),
        executionTime,
        logs,
        sandboxInfo: {
          id: sandbox.sandboxId,
          uptime: executionTime
        }
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
        logs.push('Reading file system...');
        const fileListExecution = await sandbox.runCode('!find . -type f -name "*" | head -20');
        
        if (fileListExecution.results && fileListExecution.results.length > 0) {
          const output = fileListExecution.results.map(r => r.text || '').join('\n');
          const filePaths = output.split('\n').filter(path => path.trim() && !path.startsWith('./'));
          
          for (const filePath of filePaths.slice(0, 10)) { // Limit to 10 files
            try {
              const content = await sandbox.files.read(filePath);
              files.push({
                name: filePath.split('/').pop() || filePath,
                content: content.substring(0, 10000), // Limit content size
                path: filePath,
                size: content.length
              });
              logs.push(`Read file: ${filePath} (${content.length} bytes)`);
            } catch (error) {
              logs.push(`Failed to read file ${filePath}: ${error}`);
            }
          }
        }
      } catch (error) {
        logs.push(`Failed to read file system: ${error}`);
      }
    }

    // Collect sandbox metrics
    const sandboxInfo = {
      id: sandbox.sandboxId,
      uptime: executionTime,
      memoryUsage: undefined // Could be extended with actual memory monitoring
    };

    const result: ExecutionResult = {
      success: true,
      output: execution.results.map(r => r.text || '').join('\n') || 'Code executed successfully',
      executionTime,
      files,
      logs,
      sandboxInfo
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('E2B execution error:', error);
    
    const errorDetail = E2BErrorHandler.categorizeError(error);
    const executionTime = Date.now() - startTime;
    
    const result: ExecutionResult = {
      success: false,
      output: '',
      error: E2BErrorHandler.formatError(errorDetail),
      executionTime,
      logs: [`Execution failed: ${error}`],
      sandboxInfo: sandbox ? {
        id: sandbox.sandboxId,
        uptime: executionTime
      } : undefined
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  } finally {
    // Always close the sandbox
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (error) {
        console.error('Failed to cleanup sandbox:', error);
      }
    }
  }
});

function getDevEnvironmentSetup(language: string, additionalPackages: string[] = []): string {
  const common = `
import os
import sys
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print("Environment setup starting...")
`;

  switch (language) {
    case 'python':
      return `
${common}
import subprocess

# Install essential development tools
dev_packages = [
    'pip', 'setuptools', 'wheel', 'black', 'flake8', 
    'pytest', 'ipython', 'requests', 'numpy', 'pandas'
] + ${JSON.stringify(additionalPackages)}

for package in dev_packages:
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', package], 
                      check=True, capture_output=True, text=True)
        print(f"✓ Installed {package}")
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install {package}: {e}")

print("Python development environment ready!")
`;

    case 'javascript':
    case 'typescript':
    case 'node':
      return `
console.log("Setting up Node.js development environment...");

const fs = require('fs');
const { execSync } = require('child_process');

// Create package.json
const packageJson = {
  "name": "e2b-dev-sandbox",
  "version": "1.0.0",
  "description": "E2B Development Sandbox",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  }
};

try {
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log("✓ Created package.json");
} catch (error) {
  console.log("✗ Failed to create package.json:", error.message);
}

const devPackages = ['lodash', 'axios', 'express', ...${JSON.stringify(additionalPackages)}];

devPackages.forEach(pkg => {
  try {
    execSync(\`npm install \${pkg}\`, { stdio: 'inherit' });
    console.log(\`✓ Installed \${pkg}\`);
  } catch (error) {
    console.log(\`✗ Failed to install \${pkg}\`);
  }
});

console.log("Node.js development environment ready!");
`;

    default:
      return `echo "Basic development environment setup for ${language}"`;
  }
}
