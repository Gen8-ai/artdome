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
  iterationContext?: {
    previousCode?: string;
    feedback?: string;
    errorMessages?: string[];
  };
}

export interface AIGenerationResult {
  code: string;
  explanation?: string;
  suggestions?: string[];
  confidence: number;
  validationResults?: {
    syntaxValid: boolean;
    securityIssues: string[];
    recommendations: string[];
  };
}

export class AIGeneration {
  private iterationHistory: Map<string, AIGenerationResult[]> = new Map();

  async generateCode(request: AIGenerationRequest): Promise<AIGenerationResult> {
    try {
      console.log('Generating code with AI:', request);

      const systemPrompt = this.buildAdvancedSystemPrompt(request);
      const userPrompt = this.buildContextualUserPrompt(request);

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          model: 'gpt-4o',
          temperature: request.type === 'react' ? 0.3 : 0.7, // Lower temperature for React code
          max_tokens: 2000
        }
      });

      if (error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }

      const response = data.choices[0].message.content;
      const result = this.parseAIResponse(response);
      
      // Validate the generated code
      result.validationResults = await this.validateGeneratedCode(result.code, request.type);
      
      // Store iteration history for feedback loops
      this.storeIterationResult(request.prompt, result);
      
      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  async improveCode(
    originalRequest: AIGenerationRequest, 
    feedback: string, 
    errorMessages: string[] = []
  ): Promise<AIGenerationResult> {
    const iterativeRequest: AIGenerationRequest = {
      ...originalRequest,
      iterationContext: {
        previousCode: this.getLastGeneratedCode(originalRequest.prompt),
        feedback,
        errorMessages
      }
    };

    return this.generateCode(iterativeRequest);
  }

  private buildAdvancedSystemPrompt(request: AIGenerationRequest): string {
    const basePrompts = {
      react: `You are an expert React developer specializing in modern functional components with TypeScript.
        
        REQUIREMENTS:
        - Use React 18+ with hooks (useState, useEffect, etc.)
        - Include proper TypeScript types and interfaces
        - Follow React best practices and performance optimizations
        - Use proper error boundaries and loading states
        - Ensure accessibility with proper ARIA labels
        - Use modern CSS-in-JS or Tailwind CSS for styling
        
        CODE STRUCTURE:
        - Export as default function component
        - Use descriptive variable and function names
        - Include JSDoc comments for complex logic
        - Handle edge cases and error states`,

      html: `You are an expert HTML developer focusing on semantic, accessible markup.
        
        REQUIREMENTS:
        - Use semantic HTML5 elements
        - Include proper meta tags and document structure
        - Ensure WCAG 2.1 AA accessibility compliance
        - Optimize for SEO and performance
        - Use progressive enhancement principles
        
        CODE STRUCTURE:
        - Valid HTML5 doctype and structure
        - Proper heading hierarchy (h1-h6)
        - Alt text for images, labels for forms
        - Clean, indented markup`,

      css: `You are an expert CSS developer specializing in modern, responsive design.
        
        REQUIREMENTS:
        - Use modern CSS features (Grid, Flexbox, Custom Properties)
        - Create responsive designs with mobile-first approach
        - Follow BEM methodology or similar for class naming
        - Optimize for performance and maintainability
        - Include hover states and transitions
        
        CODE STRUCTURE:
        - Organized with clear sections and comments
        - Consistent spacing and indentation
        - Use relative units (rem, em, %, vw/vh)
        - Include fallbacks for older browsers`,

      javascript: `You are an expert JavaScript developer using modern ES6+ features.
        
        REQUIREMENTS:
        - Use modern JavaScript (ES2020+)
        - Include proper error handling with try/catch
        - Use async/await for asynchronous operations
        - Follow functional programming principles where appropriate
        - Include input validation and sanitization
        
        CODE STRUCTURE:
        - Use const/let instead of var
        - Descriptive function and variable names
        - Modular code with clear separation of concerns
        - Include JSDoc comments for functions`
    };

    let prompt = basePrompts[request.type] || basePrompts.javascript;

    // Add framework-specific instructions
    if (request.preferences?.framework) {
      prompt += `\n\nFRAMEWORK: Use ${request.preferences.framework} patterns and conventions.`;
    }

    // Add styling instructions
    if (request.preferences?.styling) {
      prompt += `\n\nSTYLING: Use ${request.preferences.styling} for all styling needs.`;
    }

    // Add complexity level
    if (request.preferences?.complexity) {
      const complexityInstructions = {
        simple: 'Keep the code simple and beginner-friendly with clear comments.',
        medium: 'Use intermediate patterns with good balance of features and simplicity.',
        complex: 'Use advanced patterns and optimizations, include comprehensive error handling.'
      };
      prompt += `\n\nCOMPLEXITY: ${complexityInstructions[request.preferences.complexity]}`;
    }

    // Add iteration context if available
    if (request.iterationContext) {
      prompt += `\n\nITERATION CONTEXT:
        - Previous code had issues that need to be addressed
        - User feedback: ${request.iterationContext.feedback || 'No specific feedback'}
        - Error messages: ${request.iterationContext.errorMessages?.join(', ') || 'None'}
        - Focus on fixing these specific issues while maintaining functionality`;
    }

    prompt += `\n\nRESPONSE FORMAT:
      Respond with JSON in this exact format:
      {
        "code": "// Your generated code here",
        "explanation": "Brief explanation of the code and key features",
        "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
        "confidence": 0.95
      }`;

    return prompt;
  }

  private buildContextualUserPrompt(request: AIGenerationRequest): string {
    let prompt = `Create ${request.type} code for: ${request.prompt}`;
    
    if (request.context) {
      prompt += `\n\nAdditional Context: ${request.context}`;
    }

    if (request.iterationContext?.previousCode) {
      prompt += `\n\nPrevious Code to Improve:\n\`\`\`${request.type}\n${request.iterationContext.previousCode}\n\`\`\``;
    }

    if (request.iterationContext?.feedback) {
      prompt += `\n\nUser Feedback: ${request.iterationContext.feedback}`;
    }

    if (request.iterationContext?.errorMessages?.length) {
      prompt += `\n\nErrors to Fix: ${request.iterationContext.errorMessages.join(', ')}`;
    }

    return prompt;
  }

  private async validateGeneratedCode(code: string, type: string): Promise<{
    syntaxValid: boolean;
    securityIssues: string[];
    recommendations: string[];
  }> {
    const securityIssues: string[] = [];
    const recommendations: string[] = [];
    let syntaxValid = true;

    // Basic syntax validation
    try {
      if (type === 'javascript' || type === 'react') {
        new Function(code);
      }
    } catch (error) {
      syntaxValid = false;
    }

    // Security checks
    const securityPatterns = [
      { pattern: /eval\s*\(/g, issue: 'Use of eval() detected - potential security risk' },
      { pattern: /innerHTML\s*=/g, issue: 'Use of innerHTML detected - consider using textContent or proper sanitization' },
      { pattern: /document\.write/g, issue: 'Use of document.write detected - not recommended in modern applications' },
      { pattern: /setTimeout\s*\(\s*["'].*["']/g, issue: 'String-based setTimeout detected - use function references instead' }
    ];

    securityPatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(code)) {
        securityIssues.push(issue);
      }
    });

    // Code quality recommendations
    if (type === 'react') {
      if (!code.includes('export default')) {
        recommendations.push('Consider adding a default export for the component');
      }
      if (code.includes('var ')) {
        recommendations.push('Consider using const or let instead of var');
      }
      if (!code.includes('PropTypes') && !code.includes(': React.FC')) {
        recommendations.push('Consider adding TypeScript types or PropTypes for better type safety');
      }
    }

    return {
      syntaxValid,
      securityIssues,
      recommendations
    };
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
      const codeMatch = response.match(/```(?:javascript|jsx|html|css|typescript|tsx)?\n([\s\S]*?)\n```/);
      return {
        code: codeMatch ? codeMatch[1] : response,
        explanation: 'Generated code (fallback parsing)',
        suggestions: [],
        confidence: 0.6
      };
    }
  }

  private storeIterationResult(prompt: string, result: AIGenerationResult): void {
    if (!this.iterationHistory.has(prompt)) {
      this.iterationHistory.set(prompt, []);
    }
    this.iterationHistory.get(prompt)!.push(result);
    
    // Keep only last 5 iterations
    const history = this.iterationHistory.get(prompt)!;
    if (history.length > 5) {
      this.iterationHistory.set(prompt, history.slice(-5));
    }
  }

  private getLastGeneratedCode(prompt: string): string | undefined {
    const history = this.iterationHistory.get(prompt);
    return history && history.length > 0 ? history[history.length - 1].code : undefined;
  }

  getIterationHistory(prompt: string): AIGenerationResult[] {
    return this.iterationHistory.get(prompt) || [];
  }
}

export const aiGeneration = new AIGeneration();
