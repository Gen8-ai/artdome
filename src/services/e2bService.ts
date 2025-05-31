import { supabase } from '@/integrations/supabase/client';

export interface ExecutionRequest {
  code: string;
  language?: string;
  packages?: string[];
  timeout?: number;
  enableFileSystem?: boolean;
  setupDevEnvironment?: boolean;
}

export interface ExecutionResult {
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

export interface FileInfo {
  name: string;
  content: string;
  path: string;
  size: number;
}

export interface E2BError {
  type: 'setup' | 'execution' | 'timeout' | 'resource' | 'network' | 'unknown';
  code?: string;
  details: string;
  suggestion: string;
  timestamp: Date;
}

export class E2BService {
  private static instance: E2BService;
  private executionHistory: Map<string, ExecutionResult[]> = new Map();
  private errorHistory: E2BError[] = [];

  static getInstance(): E2BService {
    if (!E2BService.instance) {
      E2BService.instance = new E2BService();
    }
    return E2BService.instance;
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const sessionId = `session-${Date.now()}`;
    
    try {
      console.log('Executing code via E2B edge function...', {
        language: request.language,
        packageCount: request.packages?.length || 0,
        devEnvironment: request.setupDevEnvironment
      });

      const { data, error } = await supabase.functions.invoke('e2b-execute', {
        body: {
          ...request,
          setupDevEnvironment: request.setupDevEnvironment || false
        }
      });

      if (error) {
        const e2bError = this.createE2BError('network', error.message, 'Check your internet connection and Supabase configuration');
        this.recordError(e2bError);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data) {
        const e2bError = this.createE2BError('unknown', 'No response from E2B service', 'Try again or check service status');
        this.recordError(e2bError);
        throw new Error('No response from E2B service');
      }

      const result = data as ExecutionResult;
      
      // Record successful execution
      this.recordExecution(sessionId, result);
      
      // Log execution details
      console.log('E2B execution completed:', {
        success: result.success,
        executionTime: result.executionTime,
        outputLength: result.output?.length || 0,
        errorPresent: !!result.error,
        filesCount: result.files?.length || 0
      });

      return result;

    } catch (error) {
      console.error('E2B service error:', error);
      
      const e2bError = this.createE2BError(
        'execution',
        error instanceof Error ? error.message : 'Unknown error occurred',
        'Review your code and try again'
      );
      this.recordError(e2bError);
      
      return {
        success: false,
        output: '',
        error: e2bError.details,
        executionTime: 0,
        logs: [`Service error: ${error}`]
      };
    }
  }

  async executeWithDevEnvironment(
    code: string,
    language: string = 'python',
    packages: string[] = []
  ): Promise<ExecutionResult> {
    return this.executeCode({
      code,
      language,
      packages,
      enableFileSystem: true,
      setupDevEnvironment: true,
      timeout: 120000 // 2 minutes for dev environment setup
    });
  }

  async executeMultiFileProject(
    files: { [filename: string]: string },
    entryPoint: string,
    language: string = 'python'
  ): Promise<ExecutionResult> {
    try {
      // Create a setup script that writes all files and then executes the entry point
      const fileSetupCommands = Object.entries(files).map(([filename, content]) => {
        const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        
        if (language === 'python') {
          return `
with open("${filename}", "w") as f:
    f.write("""${content}""")
print(f"✓ Created {filename}")`;
        } else {
          return `
const fs = require('fs');
fs.writeFileSync("${filename}", \`${content}\`);
console.log("✓ Created ${filename}");`;
        }
      });

      const setupCode = fileSetupCommands.join('\n');
      const executionCode = language === 'python' 
        ? `\nexec(open("${entryPoint}").read())`
        : `\nrequire("./${entryPoint}")`;

      const fullCode = `${setupCode}${executionCode}`;

      return await this.executeCode({
        code: fullCode,
        language,
        enableFileSystem: true,
        setupDevEnvironment: true,
        timeout: 60000
      });

    } catch (error) {
      console.error('Multi-file project execution error:', error);
      
      const e2bError = this.createE2BError(
        'setup',
        'Multi-file project setup failed',
        'Check file structure and entry point'
      );
      this.recordError(e2bError);
      
      return {
        success: false,
        output: '',
        error: e2bError.details,
        executionTime: 0,
        logs: [`Multi-file execution error: ${error}`]
      };
    }
  }

  async executeWithAIBugFixing(
    code: string,
    language: string = 'python',
    packages: string[] = []
  ): Promise<ExecutionResult & { aiBugFix?: any; wasAutoFixed?: boolean }> {
    try {
      console.log('Executing with AI bug fixing enabled...');

      const { data, error } = await supabase.functions.invoke('e2b-execute', {
        body: {
          code,
          language,
          packages,
          enableFileSystem: true,
          setupDevEnvironment: true,
          enableAIBugFixing: true,
          timeout: 90000 // Extra time for AI processing
        }
      });

      if (error) {
        const e2bError = this.createE2BError('execution', error.message, 'AI bug fixing failed to resolve the issue');
        this.recordError(e2bError);
        throw new Error(`AI-enhanced execution failed: ${error.message}`);
      }

      const result = data as ExecutionResult & { aiBugFix?: any; wasAutoFixed?: boolean };
      
      // Log AI bug fixing results
      if (result.aiBugFix) {
        console.log('AI Bug Fix Results:', {
          wasAutoFixed: result.wasAutoFixed,
          issuesFound: result.aiBugFix.issuesFound?.length || 0,
          fixesApplied: result.aiBugFix.fixesApplied?.length || 0,
          confidence: result.aiBugFix.confidence
        });
      }

      this.recordExecution('ai-enhanced', result);
      return result;

    } catch (error) {
      console.error('AI-enhanced execution error:', error);
      
      const e2bError = this.createE2BError(
        'execution',
        error instanceof Error ? error.message : 'AI bug fixing execution failed',
        'Check code syntax and try manual debugging'
      );
      this.recordError(e2bError);
      
      return {
        success: false,
        output: '',
        error: e2bError.details,
        executionTime: 0,
        logs: [`AI-enhanced execution error: ${error}`],
        wasAutoFixed: false
      };
    }
  }

  async analyzeCodeForBugs(code: string, language: string = 'python'): Promise<any> {
    try {
      // Import the AI bug fixer
      const { aiBugFixer } = await import('../utils/contentRenderer/aiBugFixer');
      return await aiBugFixer.analyzeCode(code, language);
    } catch (error) {
      console.error('Code analysis error:', error);
      return {
        syntaxErrors: [],
        runtimeErrors: [],
        logicIssues: ['Analysis failed'],
        suggestions: ['Try manual code review'],
        severity: 'unknown'
      };
    }
  }

  async getAIFixSuggestions(code: string, language: string = 'python', errorMessage?: string): Promise<any> {
    try {
      const { aiBugFixer } = await import('../utils/contentRenderer/aiBugFixer');
      return await aiBugFixer.fixAndValidate(code, language, errorMessage);
    } catch (error) {
      console.error('AI fix suggestions error:', error);
      return {
        success: false,
        fixedCode: code,
        issuesFound: ['AI fixing unavailable'],
        fixesApplied: [],
        confidence: 0,
        executionTime: 0
      };
    }
  }

  async createDevelopmentSandbox(language: string): Promise<string> {
    const sandboxCode = this.getDevSandboxSetupCode(language);
    
    const result = await this.executeWithDevEnvironment(
      sandboxCode,
      language,
      this.getDefaultPackages(language)
    );

    if (!result.success) {
      throw new Error(`Failed to create development sandbox: ${result.error}`);
    }

    return result.sandboxInfo?.id || 'unknown-sandbox';
  }

  private getDevSandboxSetupCode(language: string): string {
    switch (language) {
      case 'python':
        return `
import sys
import os
import subprocess

print("🚀 Setting up Python development sandbox...")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Create project structure
os.makedirs("src", exist_ok=True)
os.makedirs("tests", exist_ok=True)
os.makedirs("docs", exist_ok=True)

# Create basic files
with open("README.md", "w") as f:
    f.write("# E2B Development Sandbox\\n\\nReady for Python development!")

with open("requirements.txt", "w") as f:
    f.write("# Add your dependencies here\\n")

with open("src/__init__.py", "w") as f:
    f.write("# Your Python package")

print("✅ Python development sandbox ready!")
print("Available tools: pip, black, flake8, pytest, ipython")
print("Project structure created with src/, tests/, docs/ directories")
`;

      case 'javascript':
      case 'node':
        return `
console.log("🚀 Setting up Node.js development sandbox...");

const fs = require('fs');
const path = require('path');

// Create project structure
const dirs = ['src', 'tests', 'docs', 'public'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(\`✓ Created \${dir}/ directory\`);
});

// Create package.json
const packageJson = {
  "name": "e2b-dev-project",
  "version": "1.0.0",
  "description": "E2B Development Sandbox Project",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest tests/",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "keywords": ["e2b", "sandbox", "development"],
  "license": "MIT"
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

// Create basic files
fs.writeFileSync('README.md', '# E2B Development Sandbox\\n\\nReady for Node.js development!');
fs.writeFileSync('src/index.js', 'console.log("Hello from E2B sandbox!");\\n');
fs.writeFileSync('.gitignore', 'node_modules/\\n.env\\n*.log\\n');

console.log("✅ Node.js development sandbox ready!");
console.log("Available tools: npm, eslint, prettier, jest, nodemon");
console.log("Project structure created with src/, tests/, docs/, public/ directories");
`;

      default:
        return `echo "Development sandbox for ${language} is ready!"`;
    }
  }

  private getDefaultPackages(language: string): string[] {
    switch (language) {
      case 'python':
        return ['requests', 'numpy', 'pandas', 'matplotlib', 'black', 'flake8', 'pytest'];
      case 'javascript':
      case 'node':
        return ['lodash', 'axios', 'express', 'cors', 'eslint', 'prettier', 'jest'];
      case 'react':
        return ['react', 'react-dom', 'axios', 'styled-components'];
      default:
        return [];
    }
  }

  private createE2BError(type: E2BError['type'], details: string, suggestion: string): E2BError {
    return {
      type,
      details,
      suggestion,
      timestamp: new Date()
    };
  }

  private recordError(error: E2BError): void {
    this.errorHistory.push(error);
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }
  }

  private recordExecution(sessionId: string, result: ExecutionResult): void {
    if (!this.executionHistory.has(sessionId)) {
      this.executionHistory.set(sessionId, []);
    }
    
    const history = this.executionHistory.get(sessionId)!;
    history.push(result);
    
    // Keep only last 10 executions per session
    if (history.length > 10) {
      history.shift();
    }
  }

  getExecutionHistory(sessionId: string): ExecutionResult[] {
    return this.executionHistory.get(sessionId) || [];
  }

  getErrorHistory(): E2BError[] {
    return [...this.errorHistory];
  }

  getRecentErrors(limit: number = 5): E2BError[] {
    return this.errorHistory.slice(-limit);
  }

  clearHistory(): void {
    this.executionHistory.clear();
    this.errorHistory.length = 0;
  }
}

export const e2bService = E2BService.getInstance();
