
export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'npm' | 'cdn' | 'builtin';
  isRequired: boolean;
  source: 'import' | 'require' | 'global';
}

export class DependencyAnalyzer {
  private builtinModules = new Set([
    'react', 'react-dom', 'react-router-dom',
    'lucide-react', '@radix-ui', 'tailwindcss'
  ]);

  analyzeCode(code: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    // Extract ES6 imports
    const importMatches = code.matchAll(/import\s+(?:.*?from\s+)?['"`]([^'"`]+)['"`]/g);
    for (const match of importMatches) {
      dependencies.push(this.createDependencyInfo(match[1], 'import'));
    }

    // Extract CommonJS requires
    const requireMatches = code.matchAll(/require\(['"`]([^'"`]+)['"`]\)/g);
    for (const match of requireMatches) {
      dependencies.push(this.createDependencyInfo(match[1], 'require'));
    }

    // Extract CDN script sources (for HTML content)
    const scriptMatches = code.matchAll(/<script[^>]+src=['"`]([^'"`]+)['"`]/g);
    for (const match of scriptMatches) {
      const url = match[1];
      if (url.includes('unpkg.com') || url.includes('cdn.') || url.includes('jsdelivr.net')) {
        const pkgName = this.extractPackageFromCDN(url);
        if (pkgName) {
          dependencies.push({
            name: pkgName,
            type: 'cdn',
            isRequired: true,
            source: 'global'
          });
        }
      }
    }

    // Remove duplicates
    return this.deduplicateDependencies(dependencies);
  }

  private createDependencyInfo(moduleName: string, source: 'import' | 'require'): DependencyInfo {
    const isBuiltin = this.builtinModules.has(moduleName) || moduleName.startsWith('@radix-ui');
    
    return {
      name: moduleName,
      type: isBuiltin ? 'builtin' : 'npm',
      isRequired: true,
      source
    };
  }

  private extractPackageFromCDN(url: string): string | null {
    // Extract package name from CDN URLs
    const patterns = [
      /unpkg\.com\/([^@/]+)(?:@[^/]+)?/,
      /cdn\.jsdelivr\.net\/npm\/([^@/]+)(?:@[^/]+)?/,
      /cdn\.tailwindcss\.com/ // Special case for Tailwind
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || 'tailwindcss';
      }
    }

    return null;
  }

  private deduplicateDependencies(deps: DependencyInfo[]): DependencyInfo[] {
    const seen = new Set<string>();
    return deps.filter(dep => {
      if (seen.has(dep.name)) return false;
      seen.add(dep.name);
      return true;
    });
  }

  getRequiredPackages(dependencies: DependencyInfo[]): string[] {
    return dependencies
      .filter(dep => dep.type === 'npm' && dep.isRequired)
      .map(dep => dep.name);
  }

  getCDNResources(dependencies: DependencyInfo[]): string[] {
    return dependencies
      .filter(dep => dep.type === 'cdn')
      .map(dep => dep.name);
  }
}

export const dependencyAnalyzer = new DependencyAnalyzer();
