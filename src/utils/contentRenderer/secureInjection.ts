
export class SecureInjection {
  private static readonly CSP_HEADERS = {
    'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.tailwindcss.com; connect-src *;"
  };

  static sanitizeCode(code: string): string {
    // Remove potentially dangerous code patterns
    const dangerousPatterns = [
      /eval\s*\(/g,
      /Function\s*\(/g,
      /document\.write/g,
      /innerHTML\s*=/g,
      /outerHTML\s*=/g,
      /setTimeout\s*\(/g,
      /setInterval\s*\(/g,
      /<script[^>]*>.*?<\/script>/gis,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    let sanitizedCode = code;
    dangerousPatterns.forEach(pattern => {
      sanitizedCode = sanitizedCode.replace(pattern, '/* REMOVED_UNSAFE_CODE */');
    });

    return sanitizedCode;
  }

  static createSecureTemplate(content: string, options: { nonce?: string } = {}): string {
    const { nonce = this.generateNonce() } = options;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${this.CSP_HEADERS['Content-Security-Policy']}">
  <meta name="nonce" content="${nonce}">
  ${content}
</head>
</html>`;
  }

  private static generateNonce(): string {
    return btoa(Math.random().toString()).substring(0, 16);
  }

  static validateCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for dangerous patterns first
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
      { pattern: /Function\s*\(/g, message: 'Function constructor is not allowed' },
      { pattern: /document\.write/g, message: 'document.write is not allowed' }
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        errors.push(message);
      }
    });

    // For syntax validation, check if it contains modern JS features that Function() can't parse
    const hasModernSyntax = /(?:import\s+|export\s+|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*|async\s+|await\s+)/i.test(code);
    
    if (!hasModernSyntax) {
      // Only try Function constructor validation for simple code
      try {
        new Function(code);
      } catch (error) {
        // Only add syntax error if it's not related to imports/exports
        const errorMsg = error instanceof Error ? error.message : 'Unknown syntax error';
        if (!errorMsg.includes('import') && !errorMsg.includes('export')) {
          errors.push(`Syntax error: ${errorMsg}`);
        }
      }
    }
    // For modern syntax, we skip Function constructor validation as it's expected to fail

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
