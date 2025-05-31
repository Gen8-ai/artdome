
import { supabase } from '@/integrations/supabase/client';

export interface CompilationResult {
  compiledCode: string;
  sourceMap?: string;
  error?: string;
  dependencies?: string[];
  cssCode?: string;
}

export interface CompilationOptions {
  includeSourceMap?: boolean;
  minify?: boolean;
  includeTailwind?: boolean;
  includeLucideIcons?: boolean;
  includeShadcnUI?: boolean;
}

export class CodeCompiler {
  private static instance: CodeCompiler;
  private cache = new Map<string, CompilationResult>();

  static getInstance(): CodeCompiler {
    if (!CodeCompiler.instance) {
      CodeCompiler.instance = new CodeCompiler();
    }
    return CodeCompiler.instance;
  }

  async compileCode(
    code: string, 
    type: 'react' | 'javascript' | 'html' | 'css',
    options: CompilationOptions = {}
  ): Promise<CompilationResult> {
    // Create cache key
    const cacheKey = this.createCacheKey(code, type, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('Returning cached compilation result');
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log(`Compiling ${type} code via edge function...`);
      
      const { data, error } = await supabase.functions.invoke('compile-code', {
        body: {
          code,
          type,
          options: {
            ...options,
            includeTailwind: true,
            includeLucideIcons: true,
            includeShadcnUI: true
          }
        }
      });

      if (error) {
        throw new Error(`Compilation service error: ${error.message}`);
      }

      const result: CompilationResult = data;
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Cache successful compilation
      this.cache.set(cacheKey, result);
      
      console.log('Code compiled successfully');
      return result;
      
    } catch (error) {
      console.error('Compilation failed:', error);
      
      // Return fallback result
      const fallbackResult: CompilationResult = {
        compiledCode: code, // Use original code as fallback
        error: error instanceof Error ? error.message : 'Compilation failed'
      };
      
      return fallbackResult;
    }
  }

  private createCacheKey(code: string, type: string, options: CompilationOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${type}_${this.hashCode(code + optionsStr)}`;
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const codeCompiler = CodeCompiler.getInstance();
