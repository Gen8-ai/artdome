
import { supabase } from '@/integrations/supabase/client';

export interface ErrorSuggestion {
  type: 'syntax' | 'runtime' | 'logic' | 'dependency';
  description: string;
  code?: string;
  confidence: number;
}

export class AIService {
  private static instance: AIService;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateErrorSuggestions(errorMessage: string, code?: string): Promise<ErrorSuggestion[]> {
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: `Analyze this error and provide 2-3 specific suggestions to fix it:
Error: ${errorMessage}
${code ? `Code context: ${code.substring(0, 1000)}` : ''}

Please respond with JSON array of suggestions with this format:
[{"type": "syntax|runtime|logic|dependency", "description": "specific fix description", "code": "example fix code if applicable", "confidence": 0.9}]`,
          systemPrompt: 'You are a code debugging assistant. Provide concise, actionable suggestions for fixing errors.',
          parameters: {
            temperature: 0.3,
            max_tokens: 500
          }
        }
      });

      if (error) {
        console.error('AI service error:', error);
        return this.getFallbackSuggestions(errorMessage);
      }

      try {
        const suggestions = JSON.parse(data.message);
        return Array.isArray(suggestions) ? suggestions : this.getFallbackSuggestions(errorMessage);
      } catch (parseError) {
        console.error('Failed to parse AI suggestions:', parseError);
        return this.getFallbackSuggestions(errorMessage);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions(errorMessage);
    }
  }

  async fixCode(code: string, errorMessage: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: `Fix this code that has the following error:
Error: ${errorMessage}
Code:
${code}

Please respond with only the corrected code, no explanations.`,
          systemPrompt: 'You are a code fixing assistant. Return only the corrected code without explanations.',
          parameters: {
            temperature: 0.1,
            max_tokens: 1000
          }
        }
      });

      if (error) {
        console.error('Code fixing error:', error);
        return null;
      }

      return data.message || null;
    } catch (error) {
      console.error('Error fixing code:', error);
      return null;
    }
  }

  private getFallbackSuggestions(errorMessage: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];

    if (errorMessage.includes('Cannot find module')) {
      suggestions.push({
        type: 'dependency',
        description: 'Check if the import path is correct and the module exists',
        confidence: 0.8
      });
    }

    if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      suggestions.push({
        type: 'runtime',
        description: 'Add null/undefined checks before accessing properties',
        code: 'if (variable && variable.property) { /* use variable.property */ }',
        confidence: 0.7
      });
    }

    if (errorMessage.includes('syntax') || errorMessage.includes('Unexpected')) {
      suggestions.push({
        type: 'syntax',
        description: 'Check for missing brackets, semicolons, or incorrect syntax',
        confidence: 0.9
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'logic',
        description: 'Review the error context and check recent code changes',
        confidence: 0.5
      });
    }

    return suggestions;
  }
}

export const aiService = AIService.getInstance();
