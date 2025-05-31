
import { supabase } from '@/integrations/supabase/client';

export interface AIGenerationRequest {
  prompt: string;
  type: 'react' | 'html' | 'css' | 'javascript';
  context?: string;
  preferences?: {
    framework?: string;
    styling?: string;
    complexity?: 'simple' | 'medium' | 'complex';
  };
}

export interface AIGenerationResult {
  code: string;
  explanation?: string;
  suggestions?: string[];
  confidence: number;
}

export class AIGeneration {
  async generateCode(request: AIGenerationRequest): Promise<AIGenerationResult> {
    try {
      console.log('Generating code with AI:', request);

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.type, request.preferences)
            },
            {
              role: 'user',
              content: this.formatUserPrompt(request)
            }
          ],
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2000
        }
      });

      if (error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }

      const response = data.choices[0].message.content;
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  private getSystemPrompt(type: string, preferences?: AIGenerationRequest['preferences']): string {
    const basePrompt = `You are an expert ${type} developer. Generate clean, functional, and well-structured code.`;
    
    const typeSpecificPrompts = {
      react: 'Use modern React hooks and functional components. Include proper TypeScript types.',
      html: 'Create semantic HTML with proper accessibility attributes.',
      css: 'Use modern CSS features and responsive design principles.',
      javascript: 'Write clean, modern JavaScript with proper error handling.'
    };

    let prompt = `${basePrompt} ${typeSpecificPrompts[type as keyof typeof typeSpecificPrompts] || ''}`;

    if (preferences?.framework) {
      prompt += ` Use ${preferences.framework} framework.`;
    }
    if (preferences?.styling) {
      prompt += ` Style with ${preferences.styling}.`;
    }

    prompt += '\n\nRespond with JSON in this format: {"code": "...", "explanation": "...", "suggestions": [...], "confidence": 0.9}';

    return prompt;
  }

  private formatUserPrompt(request: AIGenerationRequest): string {
    let prompt = `Create ${request.type} code for: ${request.prompt}`;
    
    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }

    return prompt;
  }

  private parseAIResponse(response: string): AIGenerationResult {
    try {
      const parsed = JSON.parse(response);
      return {
        code: parsed.code || '',
        explanation: parsed.explanation,
        suggestions: parsed.suggestions || [],
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      // Fallback: extract code from markdown blocks
      const codeMatch = response.match(/```(?:javascript|jsx|html|css)?\n([\s\S]*?)\n```/);
      return {
        code: codeMatch ? codeMatch[1] : response,
        explanation: 'Generated code',
        suggestions: [],
        confidence: 0.7
      };
    }
  }
}

export const aiGeneration = new AIGeneration();
