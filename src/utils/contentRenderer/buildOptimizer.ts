
export interface BuildConfig {
  enableCodeSplitting: boolean;
  enableMinification: boolean;
  enableTreeShaking: boolean;
  enableLazyLoading: boolean;
  bundleAnalysis: boolean;
  targetBrowsers: string[];
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  warnings: string[];
  recommendations: string[];
  chunks: BundleChunk[];
}

export interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  isAsync: boolean;
}

export class BuildOptimizer {
  private static instance: BuildOptimizer;

  static getInstance(): BuildOptimizer {
    if (!BuildOptimizer.instance) {
      BuildOptimizer.instance = new BuildOptimizer();
    }
    return BuildOptimizer.instance;
  }

  // Code splitting and lazy loading implementation
  async implementCodeSplitting(code: string, config: BuildConfig): Promise<string> {
    if (!config.enableCodeSplitting) return code;

    console.log('Implementing code splitting...');

    // Detect dynamic imports and component lazy loading opportunities
    const dynamicImports = this.extractDynamicImports(code);
    const lazyComponents = this.identifyLazyLoadingCandidates(code);

    let optimizedCode = code;

    // Convert static imports to dynamic imports where beneficial
    lazyComponents.forEach((component) => {
      const lazyImport = `const ${component.name} = React.lazy(() => import('${component.path}'));`;
      optimizedCode = optimizedCode.replace(component.originalImport, lazyImport);
    });

    // Wrap lazy components in Suspense
    if (lazyComponents.length > 0) {
      optimizedCode = this.wrapInSuspense(optimizedCode, lazyComponents);
    }

    return optimizedCode;
  }

  // Tree shaking implementation
  async performTreeShaking(code: string, config: BuildConfig): Promise<string> {
    if (!config.enableTreeShaking) return code;

    console.log('Performing tree shaking...');

    // Analyze used exports and imports
    const usedExports = this.analyzeUsedExports(code);
    const unusedImports = this.identifyUnusedImports(code, usedExports);

    let optimizedCode = code;

    // Remove unused imports
    unusedImports.forEach((unusedImport) => {
      optimizedCode = optimizedCode.replace(unusedImport.statement, '');
    });

    // Remove unused function declarations
    const unusedFunctions = this.identifyUnusedFunctions(optimizedCode);
    unusedFunctions.forEach((func) => {
      optimizedCode = optimizedCode.replace(func.declaration, '');
    });

    return optimizedCode.replace(/\n\s*\n/g, '\n'); // Clean up extra newlines
  }

  // Minification implementation
  async minifyCode(code: string, config: BuildConfig): Promise<string> {
    if (!config.enableMinification) return code;

    console.log('Minifying code...');

    // Simple minification (in production, use tools like Terser)
    let minified = code
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove unnecessary semicolons
      .replace(/;\s*}/g, '}')
      // Remove spaces around operators
      .replace(/\s*([{}()[\],;:])\s*/g, '$1')
      .trim();

    return minified;
  }

  // Bundle analysis
  async analyzeBundleSize(code: string, config: BuildConfig): Promise<OptimizationResult> {
    const originalSize = new Blob([code]).size;
    
    let optimizedCode = code;
    
    if (config.enableTreeShaking) {
      optimizedCode = await this.performTreeShaking(optimizedCode, config);
    }
    
    if (config.enableCodeSplitting) {
      optimizedCode = await this.implementCodeSplitting(optimizedCode, config);
    }
    
    if (config.enableMinification) {
      optimizedCode = await this.minifyCode(optimizedCode, config);
    }

    const optimizedSize = new Blob([optimizedCode]).size;
    const compressionRatio = (originalSize - optimizedSize) / originalSize;

    const chunks = this.analyzeChunks(optimizedCode);
    const warnings = this.generateWarnings(originalSize, optimizedSize);
    const recommendations = this.generateOptimizationRecommendations(code, config);

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      warnings,
      recommendations,
      chunks
    };
  }

  // Production build optimization
  async createProductionBuild(code: string): Promise<{
    optimizedCode: string;
    sourceMap: string;
    assets: string[];
  }> {
    const config: BuildConfig = {
      enableCodeSplitting: true,
      enableMinification: true,
      enableTreeShaking: true,
      enableLazyLoading: true,
      bundleAnalysis: true,
      targetBrowsers: ['> 1%', 'last 2 versions']
    };

    let optimizedCode = await this.performTreeShaking(code, config);
    optimizedCode = await this.implementCodeSplitting(optimizedCode, config);
    optimizedCode = await this.minifyCode(optimizedCode, config);

    // Generate source map (simplified)
    const sourceMap = this.generateSourceMap(code, optimizedCode);
    
    // Extract assets (images, fonts, etc.)
    const assets = this.extractAssets(code);

    return {
      optimizedCode,
      sourceMap,
      assets
    };
  }

  private extractDynamicImports(code: string): Array<{ statement: string; module: string }> {
    const imports = [];
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let match;

    while ((match = dynamicImportRegex.exec(code)) !== null) {
      imports.push({
        statement: match[0],
        module: match[1]
      });
    }

    return imports;
  }

  private identifyLazyLoadingCandidates(code: string): Array<{
    name: string;
    path: string;
    originalImport: string;
  }> {
    const candidates = [];
    const importRegex = /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const componentName = match[1];
      const path = match[2];
      
      // Only consider components that are likely to be large or conditionally rendered
      if (this.isLazyLoadingCandidate(componentName, code)) {
        candidates.push({
          name: componentName,
          path: path,
          originalImport: match[0]
        });
      }
    }

    return candidates;
  }

  private isLazyLoadingCandidate(componentName: string, code: string): boolean {
    // Check if component is used conditionally or in routes
    const conditionalUsage = new RegExp(`\\?.*${componentName}|${componentName}.*\\?`, 'g');
    const routeUsage = new RegExp(`<Route.*component.*${componentName}`, 'g');
    
    return conditionalUsage.test(code) || routeUsage.test(code);
  }

  private wrapInSuspense(code: string, lazyComponents: any[]): string {
    if (lazyComponents.length === 0) return code;

    // Add Suspense import if not present
    if (!code.includes('Suspense')) {
      code = code.replace(
        /import\s+React/,
        'import React, { Suspense }'
      );
    }

    // Wrap lazy components in Suspense (simplified)
    lazyComponents.forEach((component) => {
      const suspenseWrapper = `<Suspense fallback={<div>Loading...</div>}><${component.name} /></Suspense>`;
      code = code.replace(
        new RegExp(`<${component.name}\\s*/>`, 'g'),
        suspenseWrapper
      );
    });

    return code;
  }

  private analyzeUsedExports(code: string): Set<string> {
    const usedExports = new Set<string>();
    
    // Simple analysis - look for function calls and variable usage
    const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;

    while ((match = identifierRegex.exec(code)) !== null) {
      usedExports.add(match[1]);
    }

    return usedExports;
  }

  private identifyUnusedImports(code: string, usedExports: Set<string>): Array<{
    statement: string;
    imports: string[];
  }> {
    const unusedImports = [];
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"`][^'"`]+['"`]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const imports = match[1].split(',').map(imp => imp.trim());
      const unusedInThisImport = imports.filter(imp => !usedExports.has(imp));
      
      if (unusedInThisImport.length > 0) {
        unusedImports.push({
          statement: match[0],
          imports: unusedInThisImport
        });
      }
    }

    return unusedImports;
  }

  private identifyUnusedFunctions(code: string): Array<{ declaration: string; name: string }> {
    const functions = [];
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\}/g;
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const declaration = match[0];
      
      // Check if function is used elsewhere in the code
      const usageRegex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
      const usages = (code.match(usageRegex) || []).length;
      
      // If only one usage (the declaration itself), it's unused
      if (usages <= 1) {
        functions.push({
          declaration,
          name: functionName
        });
      }
    }

    return functions;
  }

  private analyzeChunks(code: string): BundleChunk[] {
    // Simplified chunk analysis
    return [
      {
        name: 'main',
        size: new Blob([code]).size,
        modules: ['index.js'],
        isAsync: false
      }
    ];
  }

  private generateWarnings(originalSize: number, optimizedSize: number): string[] {
    const warnings = [];
    
    if (originalSize > 1024 * 1024) { // 1MB
      warnings.push('Bundle size is large (>1MB). Consider code splitting.');
    }
    
    if (optimizedSize / originalSize > 0.8) {
      warnings.push('Optimization achieved minimal size reduction. Review code structure.');
    }

    return warnings;
  }

  private generateOptimizationRecommendations(code: string, config: BuildConfig): string[] {
    const recommendations = [];

    if (code.includes('lodash') && !code.includes('lodash-es')) {
      recommendations.push('Use lodash-es for better tree shaking');
    }

    if (code.includes('moment') && !config.enableCodeSplitting) {
      recommendations.push('Consider using date-fns instead of moment for smaller bundle size');
    }

    if (!config.enableLazyLoading && code.includes('Route')) {
      recommendations.push('Enable lazy loading for route components');
    }

    return recommendations;
  }

  private generateSourceMap(originalCode: string, optimizedCode: string): string {
    // Simplified source map generation
    return JSON.stringify({
      version: 3,
      sources: ['original.js'],
      names: [],
      mappings: '',
      sourcesContent: [originalCode]
    });
  }

  private extractAssets(code: string): string[] {
    const assets = [];
    const assetRegex = /['"`]([^'"`]+\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))['"`]/g;
    let match;

    while ((match = assetRegex.exec(code)) !== null) {
      assets.push(match[1]);
    }

    return assets;
  }
}

export const buildOptimizer = BuildOptimizer.getInstance();
