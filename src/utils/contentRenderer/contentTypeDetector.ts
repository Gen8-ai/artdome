
export class ContentTypeDetector {
  static detectContentType(code: string): 'html' | 'css' | 'javascript' | 'react' | 'artifact' {
    // Remove comments and whitespace for better detection
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
    
    // Check for React/JSX patterns
    if (
      cleanCode.includes('React') ||
      cleanCode.includes('useState') ||
      cleanCode.includes('useEffect') ||
      cleanCode.includes('jsx') ||
      /<[A-Z]/.test(cleanCode) ||
      /function\s+[A-Z]/.test(cleanCode) ||
      /const\s+[A-Z]\w*\s*=/.test(cleanCode)
    ) {
      return 'react';
    }

    // Check for HTML patterns
    if (
      cleanCode.includes('<!DOCTYPE') ||
      cleanCode.includes('<html') ||
      cleanCode.includes('<body') ||
      (cleanCode.includes('<div') && !cleanCode.includes('function'))
    ) {
      return 'html';
    }

    // Check for CSS patterns
    if (
      cleanCode.includes('{') && cleanCode.includes('}') &&
      (cleanCode.includes(':') || cleanCode.includes(';')) &&
      !cleanCode.includes('function') &&
      !cleanCode.includes('const') &&
      !cleanCode.includes('let')
    ) {
      return 'css';
    }

    // Check for artifact patterns
    if (cleanCode.includes('<artifact') || cleanCode.includes('artifact>')) {
      return 'artifact';
    }

    // Default to JavaScript
    return 'javascript';
  }
}
