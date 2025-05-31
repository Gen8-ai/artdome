
export interface ModuleValidationResult {
  isValid: boolean;
  hasModuleImports: boolean;
  errors: string[];
  sanitizedCode: string;
}

export class ModuleImportValidator {
  private static instance: ModuleImportValidator;

  static getInstance(): ModuleImportValidator {
    if (!ModuleImportValidator.instance) {
      ModuleImportValidator.instance = new ModuleImportValidator();
    }
    return ModuleImportValidator.instance;
  }

  validateCode(code: string): ModuleValidationResult {
    const errors: string[] = [];
    let sanitizedCode = code;
    let hasModuleImports = false;

    // Check for ES6 import statements
    const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?$/gm;
    const exportRegex = /^export\s+/gm;
    
    const importMatches = code.match(importRegex);
    const exportMatches = code.match(exportRegex);
    
    if (importMatches || exportMatches) {
      hasModuleImports = true;
      
      // Convert ES6 imports to require statements for non-module context
      sanitizedCode = this.convertImportsToRequire(code);
      
      // If conversion fails, add error
      if (sanitizedCode.includes('import ') && !this.isInModuleContext(code)) {
        errors.push('Syntax error: Cannot use import statement outside a module');
      }
    }

    // Check for other module-specific syntax
    if (code.includes('import.meta')) {
      errors.push('import.meta is not available in non-module context');
    }

    return {
      isValid: errors.length === 0,
      hasModuleImports,
      errors,
      sanitizedCode
    };
  }

  private convertImportsToRequire(code: string): string {
    let convertedCode = code;

    // Convert named imports: import { name } from 'module' -> const { name } = require('module')
    convertedCode = convertedCode.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"];?/g,
      'const { $1 } = require("$2");'
    );

    // Convert default imports: import name from 'module' -> const name = require('module')
    convertedCode = convertedCode.replace(
      /import\s+(\w+)\s+from\s*['"]([^'"]+)['"];?/g,
      'const $1 = require("$2");'
    );

    // Convert namespace imports: import * as name from 'module' -> const name = require('module')
    convertedCode = convertedCode.replace(
      /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"];?/g,
      'const $1 = require("$2");'
    );

    // Remove export statements for now (they would need module context)
    convertedCode = convertedCode.replace(/^export\s+/gm, '// export ');

    return convertedCode;
  }

  private isInModuleContext(code: string): boolean {
    // Check if code is already wrapped in module context
    return code.includes('<script type="module">') || 
           code.includes('type="module"') ||
           code.includes('import(');
  }

  wrapInModuleContext(code: string, title?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Module Execution'}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    .error { 
      background: #fef2f2; 
      border: 1px solid #fecaca; 
      color: #dc2626; 
      padding: 12px; 
      border-radius: 6px; 
      margin: 10px 0; 
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    try {
      ${code}
    } catch (error) {
      console.error('Module execution error:', error);
      document.getElementById('root').innerHTML = 
        '<div class="error">Module Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`;
  }
}

export const moduleImportValidator = ModuleImportValidator.getInstance();
