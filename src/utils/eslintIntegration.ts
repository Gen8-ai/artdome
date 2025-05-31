
export interface LintResult {
  valid: boolean;
  errors: LintError[];
  warnings: LintWarning[];
  fixedCode?: string;
}

export interface LintError {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning';
}

export interface LintWarning extends LintError {
  severity: 'warning';
}

export class ESLintIntegration {
  private rules = {
    // React specific rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    
    // JavaScript rules
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'no-debugger': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single']
  };

  async lintCode(code: string, type: 'react' | 'javascript' | 'typescript' = 'react'): Promise<LintResult> {
    try {
      // Simulate linting - in production you'd use actual ESLint
      const errors: LintError[] = [];
      const warnings: LintWarning[] = [];

      // Check for common React issues
      if (type === 'react') {
        this.checkReactIssues(code, errors, warnings);
      }

      // Check for common JavaScript issues
      this.checkJavaScriptIssues(code, errors, warnings);

      // Check for syntax issues
      this.checkSyntaxIssues(code, errors);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        fixedCode: errors.length === 0 ? undefined : this.autoFixCode(code, errors)
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          line: 1,
          column: 1,
          message: `Linting failed: ${error instanceof Error ? error.message : String(error)}`,
          ruleId: 'lint-error',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  private checkReactIssues(code: string, errors: LintError[], warnings: LintWarning[]) {
    // Check for missing React import
    if (code.includes('React.') && !code.includes('import React')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'React must be imported when using JSX',
        ruleId: 'react/jsx-uses-react',
        severity: 'error'
      });
    }

    // Check for missing keys in lists
    const mapMatches = code.matchAll(/\.map\([^)]+\)/g);
    for (const match of mapMatches) {
      if (!match[0].includes('key=')) {
        warnings.push({
          line: this.getLineNumber(code, match.index || 0),
          column: 1,
          message: 'Missing key prop in list item',
          ruleId: 'react/jsx-key',
          severity: 'warning'
        });
      }
    }
  }

  private checkJavaScriptIssues(code: string, errors: LintError[], warnings: LintWarning[]) {
    // Check for console.log
    const consoleMatches = code.matchAll(/console\.log/g);
    for (const match of consoleMatches) {
      warnings.push({
        line: this.getLineNumber(code, match.index || 0),
        column: 1,
        message: 'Unexpected console statement',
        ruleId: 'no-console',
        severity: 'warning'
      });
    }

    // Check for debugger
    if (code.includes('debugger')) {
      errors.push({
        line: this.getLineNumber(code, code.indexOf('debugger')),
        column: 1,
        message: 'Unexpected debugger statement',
        ruleId: 'no-debugger',
        severity: 'error'
      });
    }
  }

  private checkSyntaxIssues(code: string, errors: LintError[]) {
    // Check for unmatched brackets
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (Object.keys(brackets).includes(char)) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          errors.push({
            line: this.getLineNumber(code, i),
            column: 1,
            message: 'Unmatched bracket',
            ruleId: 'syntax-error',
            severity: 'error'
          });
        }
      }
    }

    if (stack.length > 0) {
      errors.push({
        line: this.getLineNumber(code, code.length - 1),
        column: 1,
        message: 'Unclosed bracket',
        ruleId: 'syntax-error',
        severity: 'error'
      });
    }
  }

  private autoFixCode(code: string, errors: LintError[]): string {
    let fixedCode = code;

    for (const error of errors) {
      if (error.ruleId === 'react/jsx-uses-react' && !fixedCode.includes('import React')) {
        fixedCode = `import React from 'react';\n${fixedCode}`;
      }
    }

    return fixedCode;
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }
}

export const eslintIntegration = new ESLintIntegration();
