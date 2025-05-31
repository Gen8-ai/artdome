
import { supabase } from '@/integrations/supabase/client';

export interface ESLintError {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: number;
  source: string;
}

export class ESLintErrorHandler {
  private static instance: ESLintErrorHandler;
  private errors: ESLintError[] = [];

  static getInstance(): ESLintErrorHandler {
    if (!ESLintErrorHandler.instance) {
      ESLintErrorHandler.instance = new ESLintErrorHandler();
    }
    return ESLintErrorHandler.instance;
  }

  addError(error: ESLintError) {
    this.errors.push(error);
    console.log('ESLint Error Added:', error);
  }

  clearErrors() {
    this.errors = [];
  }

  getErrors(): ESLintError[] {
    return [...this.errors];
  }

  async fixErrorsWithAI(code: string): Promise<string> {
    if (this.errors.length === 0) return code;

    const errorSummary = this.errors.map(error => 
      `Line ${error.line}, Column ${error.column}: ${error.message} (${error.ruleId})`
    ).join('\n');

    const prompt = `Fix the following ESLint errors in this code:

ERRORS:
${errorSummary}

CODE:
${code}

Please return only the corrected code without any explanations or markdown formatting.`;

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: prompt,
          modelId: 'gpt-4o-mini',
          systemPrompt: 'You are a code fixing assistant. Return only the corrected code without any explanations, comments, or markdown formatting.'
        }
      });

      if (error) throw error;

      const fixedCode = data.choices[0]?.message?.content || code;
      console.log('AI Fixed Code:', fixedCode);
      
      // Clear errors after fixing
      this.clearErrors();
      
      return fixedCode;
    } catch (error) {
      console.error('Error fixing code with AI:', error);
      return code;
    }
  }
}
