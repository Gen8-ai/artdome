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
  enableAIBugFixing?: boolean;
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
  aiBugFix?: {
    fixedCode: string;
    issuesFound: string[];
    fixesApplied: string[];
    confidence: number;
    executionTime: number;
  };
  wasAutoFixed: boolean;
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
      setupDevEnvironment = false,
      enableAIBugFixing = false
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
    logs.push(`AI Bug Fixing: ${enableAIBugFixing ? 'enabled' : 'disabled'}`);

    let processedCode = code;
    let aiBugFixResult = null;

    // AI Bug Fixing preprocessing
    if (enableAIBugFixing) {
      logs.push('Running AI bug analysis...');
      try {
        aiBugFixResult = await performAIBugFixing(code, language);
        if (aiBugFixResult?.success && aiBugFixResult?.confidence > 0.5) {
          processedCode = aiBugFixResult.fixedCode;
          logs.push(`AI applied ${aiBugFixResult.fixesApplied?.length || 0} fixes`);
        }
      } catch (error) {
        logs.push(`AI bug fixing failed: ${error}`);
        // Continue with original code
      }
    }

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
    logs.push('Executing processed code...');
    let execution;
    
    try {
      execution = await sandbox.runCode(processedCode, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr.line}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout.line}`)
      });
    } catch (error) {
      // If execution fails and AI bug fixing is enabled, try emergency fix
      if (enableAIBugFixing && !aiBugFixResult) {
        logs.push('Execution failed, attempting emergency AI fix...');
        try {
          const emergencyFix = await performAIBugFixing(code, language, error.message);
          if (emergencyFix?.success) {
            logs.push('Emergency fix applied, retrying...');
            execution = await sandbox.runCode(emergencyFix.fixedCode, {
              onStderr: (stderr) => logs.push(`RETRY STDERR: ${stderr.line}`),
              onStdout: (stdout) => logs.push(`RETRY STDOUT: ${stdout.line}`)
            });
            aiBugFixResult = emergencyFix;
            processedCode = emergencyFix.fixedCode;
          }
        } catch (fixError) {
          logs.push(`Emergency fix failed: ${fixError}`);
          throw error; // Re-throw original error
        }
      } else {
        throw error;
      }
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
        },
        aiBugFix: aiBugFixResult,
        wasAutoFixed: aiBugFixResult?.success || false
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
      sandboxInfo,
      aiBugFix: aiBugFixResult,
      wasAutoFixed: aiBugFixResult?.success || false
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

async function performAIBugFixing(code: string, language: string, errorMessage?: string): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured for AI bug fixing');
  }

  const fixPrompt = `Fix all bugs and syntax errors in this ${language} code:

CODE:
${code}

${errorMessage ? `ERROR: ${errorMessage}` : ''}

Please provide:
1. The complete fixed code
2. List of issues found
3. List of fixes applied

Respond in JSON format:
{
  "fixedCode": "...",
  "issuesFound": ["..."],
  "fixesApplied": ["..."],
  "confidence": 0.8
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert ${language} developer. Fix code issues while maintaining original functionality.`
          },
          {
            role: 'user',
            content: fixPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(aiResponse);
      return {
        success: true,
        fixedCode: parsed.fixedCode || code,
        issuesFound: parsed.issuesFound || [],
        fixesApplied: parsed.fixesApplied || [],
        confidence: parsed.confidence || 0.6,
        executionTime: 0
      };
    } catch (parseError) {
      // Fallback: extract code from response
      const codeMatch = aiResponse.match(/```(?:javascript|python|typescript)?\n([\s\S]*?)\n```/);
      return {
        success: true,
        fixedCode: codeMatch ? codeMatch[1] : code,
        issuesFound: ['Parsing issues detected'],
        fixesApplied: ['AI auto-fix applied'],
        confidence: 0.5,
        executionTime: 0
      };
    }
  } catch (error) {
    console.error('AI bug fixing error:', error);
    return {
      success: false,
      fixedCode: code,
      issuesFound: [error.message],
      fixesApplied: [],
      confidence: 0,
      executionTime: 0
    };
  }
}

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
