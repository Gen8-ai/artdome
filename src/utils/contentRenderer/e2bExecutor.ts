
import { CodeInterpreter } from '@e2b/code-interpreter';
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
  private activeInterpreters = new Map<string, CodeInterpreter>();

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
      logs.push('Starting E2B code interpreter...');

      // Create or get existing interpreter
      const interpreter = await this.getOrCreateInterpreter();
      
      // Install packages if specified
      if (options.packages && options.packages.length > 0) {
        logs.push(`Installing packages: ${options.packages.join(', ')}`);
        await this.installPackages(interpreter, options.packages, language);
      }

      // Execute the code
      logs.push('Executing code...');
      const execution = await interpreter.notebook.execCell(code, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout}`)
      });

      const executionTime = Date.now() - startTime;

      // Check for errors
      if (execution.error) {
        return {
          success: false,
          output: execution.text || '',
          error: execution.error.name + ': ' + execution.error.value,
          executionTime,
          logs
        };
      }

      // Get file system contents if enabled
      let files: FileInfo[] = [];
      if (options.enableFileSystem) {
        files = await this.getFileSystemContents(interpreter);
      }

      return {
        success: true,
        output: execution.text || 'Code executed successfully',
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
      const interpreter = await this.getOrCreateInterpreter();

      // Write all files to the interpreter
      for (const [filename, content] of Object.entries(files)) {
        logs.push(`Writing file: ${filename}`);
        await interpreter.filesystem.write(filename, content);
      }

      // Execute the entry point
      logs.push(`Executing entry point: ${entryPoint}`);
      const execution = await interpreter.notebook.execCell(`exec(open('${entryPoint}').read())`, {
        onStderr: (stderr) => logs.push(`STDERR: ${stderr}`),
        onStdout: (stdout) => logs.push(`STDOUT: ${stdout}`)
      });

      const executionTime = Date.now() - startTime;

      if (execution.error) {
        return {
          success: false,
          output: execution.text || '',
          error: execution.error.name + ': ' + execution.error.value,
          executionTime,
          logs
        };
      }

      const fileContents = await this.getFileSystemContents(interpreter);

      return {
        success: true,
        output: execution.text || 'Project executed successfully',
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

  private async getOrCreateInterpreter(): Promise<CodeInterpreter> {
    const sessionId = 'default';
    
    if (this.activeInterpreters.has(sessionId)) {
      return this.activeInterpreters.get(sessionId)!;
    }

    if (!this.config.apiKey) {
      throw new Error('E2B API key is required. Please set VITE_E2B_API_KEY environment variable.');
    }

    const interpreter = await CodeInterpreter.create({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout
    });

    this.activeInterpreters.set(sessionId, interpreter);
    return interpreter;
  }

  private async installPackages(
    interpreter: CodeInterpreter, 
    packages: string[], 
    language: SupportedLanguage
  ): Promise<void> {
    switch (language) {
      case 'python':
        for (const pkg of packages) {
          await interpreter.notebook.execCell(`!pip install ${pkg}`);
        }
        break;
      case 'javascript':
      case 'typescript':
        for (const pkg of packages) {
          await interpreter.notebook.execCell(`!npm install ${pkg}`);
        }
        break;
      default:
        console.warn(`Package installation not supported for language: ${language}`);
    }
  }

  private async getFileSystemContents(interpreter: CodeInterpreter): Promise<FileInfo[]> {
    try {
      const files: FileInfo[] = [];
      const fileList = await interpreter.filesystem.list('/');
      
      for (const file of fileList) {
        if (file.type === 'file') {
          const content = await interpreter.filesystem.read(file.path);
          files.push({
            name: file.name,
            content,
            path: file.path,
            size: content.length
          });
        }
      }
      
      return files;
    } catch (error) {
      console.warn('Failed to read file system contents:', error);
      return [];
    }
  }

  async closeSession(sessionId: string = 'default'): Promise<void> {
    const interpreter = this.activeInterpreters.get(sessionId);
    if (interpreter) {
      await interpreter.close();
      this.activeInterpreters.delete(sessionId);
    }
  }

  async closeAllSessions(): Promise<void> {
    const closePromises = Array.from(this.activeInterpreters.values()).map(
      interpreter => interpreter.close()
    );
    await Promise.all(closePromises);
    this.activeInterpreters.clear();
  }

  updateConfig(newConfig: Partial<E2BConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): E2BConfig {
    return { ...this.config };
  }
}

export const e2bExecutor = E2BExecutor.getInstance();
