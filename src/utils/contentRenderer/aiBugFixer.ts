import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/services/ai/aiService';

export interface BugFixResult {
  success: boolean;
  fixedCode: string;
  issuesFound: string[];
  fixesApplied: string[];
  confidence: number;
  executionTime: number;
}

export interface CodeAnalysis {
  syntaxErrors: string[];
  runtimeErrors: string[];
  logicIssues: string[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AIBugFixer {
  private static instance: AIBugFixer;
  private fixHistory: Map<string, BugFixResult[]> = new Map();
  
  static getInstance(): AIBugFixer {
    if (!AIBugFixer.instance) {
      AIBugFixer.instance = new AIBugFixer();
    }
    return AIBugFixer.instance;
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: `Analyze this ${language} code for bugs, syntax errors, and issues:

${code}

Please respond with JSON in this format:
{
  "syntaxErrors": ["error descriptions"],
  "runtimeErrors": ["error descriptions"], 
  "logicIssues": ["issue descriptions"],
  "suggestions": ["improvement suggestions"],
  "severity": "low|medium|high|critical"
}`,
          systemPrompt: 'You are a code analysis expert. Identify all types of errors and issues in code accurately.',
          parameters: {
            temperature: 0.2,
            max_tokens: 800
          }
        }
      });

      if (error) {
        throw new Error(`Code analysis failed: ${error.message}`);
      }

      try {
        return JSON.parse(data.message);
      } catch (parseError) {
        // Fallback analysis
        return this.performBasicAnalysis(code, language);
      }
    } catch (error) {
      console.error('AI code analysis error:', error);
      return this.performBasicAnalysis(code, language);
    }
  }

  async fixBugs(code: string, language: string, errorMessage?: string): Promise<BugFixResult> {
    const startTime = Date.now();
    console.log(`Starting AI bug fixing for ${language} code...`);

    try {
      // First analyze the code to understand issues
      const analysis = await this.analyzeCode(code, language);
      
      // Create comprehensive fix prompt
      const fixPrompt = this.buildFixPrompt(code, language, analysis, errorMessage);
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: fixPrompt,
          systemPrompt: this.getFixingSystemPrompt(language),
          parameters: {
            temperature: 0.1, // Low temperature for consistent fixes
            max_tokens: 2000
          }
        }
      });

      if (error) {
        throw new Error(`AI bug fixing failed: ${error.message}`);
      }

      const fixedCode = this.extractFixedCode(data.message, code);
      const executionTime = Date.now() - startTime;

      const result: BugFixResult = {
        success: true,
        fixedCode,
        issuesFound: [
          ...analysis.syntaxErrors,
          ...analysis.runtimeErrors,
          ...analysis.logicIssues
        ],
        fixesApplied: this.extractFixesApplied(data.message),
        confidence: this.calculateConfidence(analysis, fixedCode),
        executionTime
      };

      // Store fix history
      this.storeFix(code, result);
      
      console.log(`Bug fixing completed in ${executionTime}ms with confidence ${result.confidence}`);
      return result;

    } catch (error) {
      console.error('AI bug fixing error:', error);
      
      return {
        success: false,
        fixedCode: code,
        issuesFound: [error instanceof Error ? error.message : 'Unknown error'],
        fixesApplied: [],
        confidence: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  async fixAndValidate(code: string, language: string, errorMessage?: string): Promise<BugFixResult> {
    const fixResult = await this.fixBugs(code, language, errorMessage);
    
    if (fixResult.success && fixResult.confidence > 0.7) {
      // Validate the fixed code by analyzing it again
      const validation = await this.analyzeCode(fixResult.fixedCode, language);
      
      if (validation.severity === 'low' || validation.syntaxErrors.length === 0) {
        console.log('Fixed code validation passed');
        return fixResult;
      } else {
        console.log('Fixed code still has issues, attempting secondary fix...');
        return await this.performSecondaryFix(fixResult.fixedCode, language, validation);
      }
    }
    
    return fixResult;
  }

  private buildFixPrompt(code: string, language: string, analysis: CodeAnalysis, errorMessage?: string): string {
    let prompt = `Fix all bugs and issues in this ${language} code:

ORIGINAL CODE:
${code}

IDENTIFIED ISSUES:
- Syntax Errors: ${analysis.syntaxErrors.join(', ') || 'None'}
- Runtime Errors: ${analysis.runtimeErrors.join(', ') || 'None'}
- Logic Issues: ${analysis.logicIssues.join(', ') || 'None'}`;

    if (errorMessage) {
      prompt += `\n\nERROR MESSAGE:\n${errorMessage}`;
    }

    prompt += `\n\nPlease provide:
1. The complete fixed code
2. A list of fixes applied
3. Brief explanation of changes

Focus on making the code syntactically correct and functionally working.`;

    return prompt;
  }

  private getFixingSystemPrompt(language: string): string {
    const basePrompt = `You are an expert ${language} developer and bug fixer. Your task is to:

1. Fix all syntax errors and make code compile/run
2. Resolve runtime errors and exceptions
3. Fix logical issues that prevent proper functionality
4. Maintain the original intent and functionality
5. Use best practices and modern ${language} patterns

RULES:
- Always provide complete, working code
- Fix issues without changing core functionality
- Add error handling where appropriate
- Use proper syntax and formatting
- Ensure all imports and dependencies are correct`;

    // Add language-specific rules
    switch (language) {
      case 'python':
        return `${basePrompt}
- Use proper Python indentation (4 spaces)
- Handle common Python errors (IndentationError, NameError, etc.)
- Use appropriate Python idioms and conventions`;
      
      case 'javascript':
      case 'typescript':
        return `${basePrompt}
- Use modern ES6+ syntax
- Handle async/await properly
- Fix common JS/TS errors (undefined variables, type errors)
- Ensure proper import/export statements`;
      
      default:
        return basePrompt;
    }
  }

  private extractFixedCode(response: string, originalCode: string): string {
    // Try to extract code from markdown blocks
    const codeMatch = response.match(/```(?:javascript|python|typescript|jsx|tsx)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    
    // If no code block found, look for structured response
    const lines = response.split('\n');
    let inCodeSection = false;
    let code = '';
    
    for (const line of lines) {
      if (line.toLowerCase().includes('fixed code') || line.toLowerCase().includes('corrected code')) {
        inCodeSection = true;
        continue;
      }
      if (inCodeSection && (line.startsWith('##') || line.toLowerCase().includes('explanation'))) {
        break;
      }
      if (inCodeSection) {
        code += line + '\n';
      }
    }
    
    return code.trim() || originalCode;
  }

  private extractFixesApplied(response: string): string[] {
    const fixes: string[] = [];
    const lines = response.split('\n');
    let inFixesSection = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes('fixes applied') || line.toLowerCase().includes('changes made')) {
        inFixesSection = true;
        continue;
      }
      if (inFixesSection && line.startsWith('##')) {
        break;
      }
      if (inFixesSection && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
        fixes.push(line.replace(/^[-*\d.]\s*/, '').trim());
      }
    }
    
    return fixes.length > 0 ? fixes : ['Code automatically fixed by AI'];
  }

  private calculateConfidence(analysis: CodeAnalysis, fixedCode: string): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence based on severity
    switch (analysis.severity) {
      case 'critical': confidence -= 0.3; break;
      case 'high': confidence -= 0.2; break;
      case 'medium': confidence -= 0.1; break;
    }
    
    // Increase confidence if code seems complete
    if (fixedCode.length > 50 && fixedCode.includes('{') && fixedCode.includes('}')) {
      confidence += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async performSecondaryFix(code: string, language: string, validation: CodeAnalysis): Promise<BugFixResult> {
    console.log('Performing secondary fix attempt...');
    
    const secondaryPrompt = `This code was already fixed once but still has issues. Please fix the remaining problems:

CODE:
${code}

REMAINING ISSUES:
${validation.syntaxErrors.concat(validation.runtimeErrors).join(', ')}

Provide a completely corrected version that addresses all remaining issues.`;

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: secondaryPrompt,
          systemPrompt: 'You are fixing code that has already been partially fixed. Focus on remaining issues.',
          parameters: {
            temperature: 0.05,
            max_tokens: 1500
          }
        }
      });

      if (error) throw error;

      const finalCode = this.extractFixedCode(data.message, code);
      
      return {
        success: true,
        fixedCode: finalCode,
        issuesFound: validation.syntaxErrors.concat(validation.runtimeErrors),
        fixesApplied: ['Secondary AI fix applied'],
        confidence: 0.6,
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        fixedCode: code,
        issuesFound: ['Secondary fix failed'],
        fixesApplied: [],
        confidence: 0,
        executionTime: 0
      };
    }
  }

  private performBasicAnalysis(code: string, language: string): CodeAnalysis {
    const syntaxErrors: string[] = [];
    const runtimeErrors: string[] = [];
    const logicIssues: string[] = [];
    
    // Basic syntax checks based on language
    if (language === 'javascript' || language === 'typescript') {
      if (!code.includes('{') && code.includes('function')) {
        syntaxErrors.push('Missing opening brace after function declaration');
      }
      if ((code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length) {
        syntaxErrors.push('Mismatched braces');
      }
    }
    
    if (language === 'python') {
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.endsWith(':') && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine.trim() && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
            syntaxErrors.push(`Indentation error after line ${i + 1}`);
          }
        }
      }
    }
    
    return {
      syntaxErrors,
      runtimeErrors,
      logicIssues,
      suggestions: ['Enable AI auto-fixing for better error detection'],
      severity: syntaxErrors.length > 0 ? 'high' : 'low'
    };
  }

  private storeFix(originalCode: string, result: BugFixResult): void {
    const hash = this.hashCode(originalCode);
    if (!this.fixHistory.has(hash)) {
      this.fixHistory.set(hash, []);
    }
    this.fixHistory.get(hash)!.push(result);
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  getFixHistory(): Map<string, BugFixResult[]> {
    return new Map(this.fixHistory);
  }

  clearHistory(): void {
    this.fixHistory.clear();
  }
}

export const aiBugFixer = AIBugFixer.getInstance();
