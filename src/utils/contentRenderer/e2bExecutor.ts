
import { Sandbox } from '@e2b/code-interpreter';
import { E2BConfig, SupportedLanguage, detectLanguage, defaultE2BConfig } from './e2bConfig';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  files?: FileInfo[];
  logs: string[];
}

export interface FileInfo {
  name: string;
  content: string;
  path: string;
  size: number;
}

export interface ExecutionOptions {
  language?: SupportedLanguage;
  timeout?: number;
  enableFileSystem?: boolean;
  packages?: string[];
}

export class E2BExecutor {
  private static instance: E2BExecutor;
  private config: E2BConfig;
  private activeSandboxes = new Map<string, Sandbox>();

  static getInstance(): E2BExecutor {
    if (!E2BExecutor.instance) {
      E2BExecutor.instance = new E2BExecutor();
    }
    return E2BExecutor.instance;
  }

  constructor(config: E2BConfig = defaultE2BConfig) {
    this.config = config;
  }

  async executeCode(
    code: string, 
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const language = options.language || detectLanguage(code);
    const logs: string[] = [];

    try {
      logs.push(`Detected language: ${language}`);
      logs.push('Starting E2B sandbox...');

      // Create or get existing sandbox
      const sandbox = await this.getOrCreateSandbox();
      
      // Install packages if specified
      if (options.packages && options.packages.length > 0) {
        logs.push(`Installing packages: ${options.packages.join(', ')}`);
        await this.installPackages(sandbox, options.packages, language);
      }

      // Execute the code
      logs.push('Executing code...');
      const execution = await sandbox.runCode(language, code, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout}`)
      });

      const executionTime = Date.now() - startTime;

      // Check for errors
      if (execution.error) {
        return {
          success: false,
          output: execution.stdout || '',
          error: execution.stderr || execution.error,
          executionTime,
          logs
        };
      }

      // Get file system contents if enabled
      let files: FileInfo[] = [];
      if (options.enableFileSystem) {
        files = await this.getFileSystemContents(sandbox);
      }

      return {
        success: true,
        output: execution.stdout || 'Code executed successfully',
        executionTime,
        files,
        logs
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`Execution failed: ${error}`);

      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        logs
      };
    }
  }

  async executeMultiFileProject(
    files: { [filename: string]: string },
    entryPoint: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push('Creating multi-file project in E2B...');
      const sandbox = await this.getOrCreateSandbox();

      // Write all files to the sandbox
      for (const [filename, content] of Object.entries(files)) {
        logs.push(`Writing file: ${filename}`);
        await sandbox.writeFile(filename, content);
      }

      // Execute the entry point
      logs.push(`Executing entry point: ${entryPoint}`);
      const language = detectLanguage(files[entryPoint] || '');
      const execution = await sandbox.runCode(language, `exec(open('${entryPoint}').read())`, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout}`)
      });

      const executionTime = Date.now() - startTime;

      if (execution.error) {
        return {
          success: false,
          output: execution.stdout || '',
          error: execution.stderr || execution.error,
          executionTime,
          logs
        };
      }

      const fileContents = await this.getFileSystemContents(sandbox);

      return {
        success: true,
        output: execution.stdout || 'Project executed successfully',
        executionTime,
        files: fileContents,
        logs
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`Project execution failed: ${error}`);

      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        logs
      };
    }
  }

  private async getOrCreateSandbox(): Promise<Sandbox> {
    const sessionId = 'default';
    
    if (this.activeSandboxes.has(sessionId)) {
      return this.activeSandboxes.get(sessionId)!;
    }

    if (!this.config.apiKey) {
      throw new Error('E2B API key is required. Please set VITE_E2B_API_KEY environment variable.');
    }

    const sandbox = await Sandbox.create({
      apiKey: this.config.apiKey,
      timeoutMs: this.config.timeout
    });

    this.activeSandboxes.set(sessionId, sandbox);
    return sandbox;
  }

  private async installPackages(
    sandbox: Sandbox, 
    packages: string[], 
    language: SupportedLanguage
  ): Promise<void> {
    switch (language) {
      case 'python':
        for (const pkg of packages) {
          await sandbox.runCode('bash', `pip install ${pkg}`);
        }
        break;
      case 'javascript':
      case 'typescript':
        for (const pkg of packages) {
          await sandbox.runCode('bash', `npm install ${pkg}`);
        }
        break;
      default:
        console.warn(`Package installation not supported for language: ${language}`);
    }
  }

  private async getFileSystemContents(sandbox: Sandbox): Promise<FileInfo[]> {
    try {
      const files: FileInfo[] = [];
      const execution = await sandbox.runCode('bash', 'find . -type f -name "*" | head -20');
      
      if (execution.stdout) {
        const filePaths = execution.stdout.split('\n').filter(path => path.trim());
        
        for (const filePath of filePaths) {
          try {
            const content = await sandbox.readFile(filePath);
            files.push({
              name: filePath.split('/').pop() || filePath,
              content,
              path: filePath,
              size: content.length
            });
          } catch (error) {
            console.warn(`Failed to read file ${filePath}:`, error);
          }
        }
      }
      
      return files;
    } catch (error) {
      console.warn('Failed to read file system contents:', error);
      return [];
    }
  }

  async closeSession(sessionId: string = 'default'): Promise<void> {
    const sandbox = this.activeSandboxes.get(sessionId);
    if (sandbox) {
      await sandbox.close();
      this.activeSandboxes.delete(sessionId);
    }
  }

  async closeAllSessions(): Promise<void> {
    const closePromises = Array.from(this.activeSandboxes.values()).map(
      sandbox => sandbox.close()
    );
    await Promise.all(closePromises);
    this.activeSandboxes.clear();
  }

  updateConfig(newConfig: Partial<E2BConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): E2BConfig {
    return { ...this.config };
  }
}

export const e2bExecutor = E2BExecutor.getInstance();
