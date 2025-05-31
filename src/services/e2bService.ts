
import { supabase } from '@/integrations/supabase/client';

export interface ExecutionRequest {
  code: string;
  language?: string;
  packages?: string[];
  timeout?: number;
  enableFileSystem?: boolean;
}

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

export class E2BService {
  private static instance: E2BService;

  static getInstance(): E2BService {
    if (!E2BService.instance) {
      E2BService.instance = new E2BService();
    }
    return E2BService.instance;
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      console.log('Executing code via E2B edge function...', request);

      const { data, error } = await supabase.functions.invoke('e2b-execute', {
        body: request
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response from E2B service');
      }

      return data as ExecutionResult;
    } catch (error) {
      console.error('E2B service error:', error);
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: 0,
        logs: [`Service error: ${error}`]
      };
    }
  }

  async executeMultiFileProject(
    files: { [filename: string]: string },
    entryPoint: string,
    language: string = 'python'
  ): Promise<ExecutionResult> {
    try {
      // Create a setup script that writes all files and then executes the entry point
      const fileSetupCommands = Object.entries(files).map(([filename, content]) => {
        // Escape the content properly for the target language
        const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return language === 'python' 
          ? `with open("${filename}", "w") as f: f.write("${escapedContent}")`
          : `require('fs').writeFileSync("${filename}", "${escapedContent}")`;
      });

      const setupCode = fileSetupCommands.join('\n');
      const executionCode = language === 'python' 
        ? `exec(open("${entryPoint}").read())`
        : `require("./${entryPoint}")`;

      const fullCode = `${setupCode}\n${executionCode}`;

      return await this.executeCode({
        code: fullCode,
        language,
        enableFileSystem: true,
        timeout: 60000
      });
    } catch (error) {
      console.error('Multi-file project execution error:', error);
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Multi-file execution failed',
        executionTime: 0,
        logs: [`Multi-file execution error: ${error}`]
      };
    }
  }
}

export const e2bService = E2BService.getInstance();
