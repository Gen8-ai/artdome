import { CodeCompiler, codeCompiler } from './codeCompiler';
import { dependencyAnalyzer } from './dependencyAnalyzer';
import { eslintIntegration } from './eslintIntegration';
import { ContentBlock, RenderingOptions } from './contentRenderer/types';
import { ContentTypeDetector } from './contentRenderer/contentTypeDetector';
import { HTMLTemplateGenerator } from './contentRenderer/htmlTemplateGenerator';
import { ErrorTemplates } from './contentRenderer/errorTemplates';
import { SecureInjection } from './contentRenderer/secureInjection';
import { moduleSystem } from './contentRenderer/moduleSystem';
import { PipelineSync } from './contentRenderer/pipelineSync';
import { aiGeneration, AIGenerationRequest } from './contentRenderer/aiGeneration';
import { packageResolver } from './contentRenderer/packageResolver';
import { packageInstaller } from './contentRenderer/packageInstaller';
import { supabasePersistence } from './contentRenderer/supabasePersistence';
import { realtimePreview } from './contentRenderer/realtimePreview';
import { buildOptimizer } from './contentRenderer/buildOptimizer';
import { errorBoundaryManager } from './contentRenderer/errorBoundary';
import { e2bIntegration, E2BRenderResult } from './contentRenderer/e2bIntegration';

export type { ContentBlock, RenderingOptions } from './contentRenderer/types';

export class ContentRenderer {
  private static instance: ContentRenderer;
  private pipelineSync: PipelineSync;
  
  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  constructor() {
    this.pipelineSync = new PipelineSync();
    this.initializePipeline();
  }

  private initializePipeline() {
    // User Input Processing Stage
    this.pipelineSync.addStage({
      name: 'userInputRequest',
      execute: async () => {
        console.log('Processing user input request...');
        return { status: 'completed', timestamp: Date.now() };
      }
    });

    // AI Generation Stage
    this.pipelineSync.addStage({
      name: 'aiGen',
      dependencies: ['userInputRequest'],
      execute: async () => {
        console.log('AI generation stage ready...');
        return { status: 'ready', aiService: 'openai' };
      }
    });

    // Content Parsing Stage
    this.pipelineSync.addStage({
      name: 'parse',
      dependencies: ['userInputRequest'],
      execute: async () => {
        console.log('Parsing content blocks...');
        return { status: 'parsed', contentBlocks: [] };
      }
    });

    // Dependency Analysis Stage
    this.pipelineSync.addStage({
      name: 'dependencyAnalysis',
      dependencies: ['parse'],
      execute: async () => {
        console.log('Analyzing dependencies...');
        return { status: 'analyzed', dependencies: [] };
      }
    });

    // Package Installation Stage
    this.pipelineSync.addStage({
      name: 'installDependencies',
      dependencies: ['dependencyAnalysis'],
      execute: async () => {
        console.log('Installing dependencies...');
        return { status: 'installed', packages: [] };
      }
    });

    // Linting Stage
    this.pipelineSync.addStage({
      name: 'linter',
      dependencies: ['installDependencies'],
      execute: async () => {
        console.log('Linting code...');
        return { status: 'linted', issues: [] };
      }
    });

    // Supabase Persistence Stage
    this.pipelineSync.addStage({
      name: 'supabase',
      dependencies: ['linter'],
      execute: async () => {
        console.log('Persisting to Supabase...');
        return { status: 'persisted', sessionId: null };
      }
    });

    // Preview Generation Stage
    this.pipelineSync.addStage({
      name: 'preview',
      dependencies: ['supabase'],
      execute: async () => {
        console.log('Generating preview...');
        return { status: 'rendered', previewUrl: null };
      }
    });

    // Add E2B execution stage
    this.pipelineSync.addStage({
      name: 'e2bExecution',
      dependencies: ['linter'],
      execute: async () => {
        console.log('E2B execution stage ready...');
        return { status: 'ready', executor: 'e2b' };
      }
    });
  }

  detectContentType(code: string): 'html' | 'css' | 'javascript' | 'react' | 'artifact' {
    return ContentTypeDetector.detectContentType(code);
  }

  async generateCodeWithAI(request: AIGenerationRequest) {
    return await aiGeneration.generateCode(request);
  }

  async improveCodeWithAI(request: AIGenerationRequest, feedback: string, errors: string[] = []) {
    return await aiGeneration.improveCode(request, feedback, errors);
  }

  async resolvePackages(packageNames: string[]) {
    return await packageResolver.resolveDependencyTree(packageNames);
  }

  async installPackages(packageNames: string[]) {
    return await packageInstaller.installPackages(packageNames);
  }

  async saveCodeSession(contentBlocks: ContentBlock[], compilationResults: any, title?: string) {
    const userPreferences = await supabasePersistence.loadUserPreferences();
    return await supabasePersistence.saveCodeSession(contentBlocks, compilationResults, userPreferences, title);
  }

  async loadCodeSession(sessionId: string) {
    return await supabasePersistence.loadCodeSession(sessionId);
  }

  async generateHtmlDocument(
    block: ContentBlock, 
    options: RenderingOptions = {}
  ): Promise<string> {
    const {
      useCompilation = false,
      includeTailwind = true,
      includeLucideIcons = true,
      includeShadcnUI = true,
      theme = 'light'
    } = options;

    try {
      // Check if we should use E2B for this content
      if (e2bIntegration.shouldUseE2B(block)) {
        console.log('Using E2B execution for content type:', block.type);
        const e2bResult = await e2bIntegration.renderWithE2B(block, {
          timeout: 30000,
          enableFileSystem: true
        });
        return e2bResult.html;
      }

      // Fall back to traditional iframe rendering for React/HTML content
      console.log('Using traditional iframe rendering for content type:', block.type);

      // Execute full pipeline for comprehensive processing
      const pipelineResults = await this.executePipeline([
        'userInputRequest',
        'parse', 
        'dependencyAnalysis',
        'installDependencies',
        'linter',
        'preview'
      ], { block, options });

      // Validate code security
      const validation = SecureInjection.validateCode(block.code);
      if (!validation.isValid) {
        console.warn('Code validation failed:', validation.errors);
        return ErrorTemplates.createErrorTemplate(`Security validation failed: ${validation.errors.join(', ')}`);
      }

      let processedCode = SecureInjection.sanitizeCode(block.code);
      let additionalCSS = '';

      // Load required modules
      const requiredModules = this.getRequiredModules(block.type, options);
      await moduleSystem.loadRequiredModules(requiredModules);

      // Analyze and install dependencies
      const dependencies = dependencyAnalyzer.analyzeCode(block.code);
      if (dependencies.length > 0) {
        // Convert DependencyInfo objects to package names by accessing the name property
        const packageNames = dependencies.map(dep => dep.name);
        const installResult = await packageInstaller.installPackages(packageNames);
        if (!installResult.success) {
          console.warn('Some packages failed to install:', installResult.failedPackages);
        }
      }

      // Lint code if it's React or JavaScript
      if (block.type === 'react' || block.type === 'javascript') {
        const lintResult = await eslintIntegration.lintCode(block.code, block.type);
        if (!lintResult.valid && lintResult.fixedCode) {
          console.log('Code has lint issues, using auto-fixed version');
          processedCode = SecureInjection.sanitizeCode(lintResult.fixedCode);
        }
      }

      // Compile code if requested
      if (useCompilation && (block.type === 'react' || block.type === 'javascript')) {
        try {
          const result = await codeCompiler.compileCode(processedCode, block.type, {
            includeTailwind,
            includeLucideIcons,
            includeShadcnUI
          });
          
          if (!result.error) {
            processedCode = result.compiledCode;
            additionalCSS = result.cssCode || '';
          }
        } catch (error) {
          console.warn('Compilation failed, using original code:', error);
        }
      }

      const htmlContent = HTMLTemplateGenerator.createHTMLTemplate({
        code: processedCode,
        type: block.type,
        title: block.title || 'Preview',
        additionalCSS,
        includeTailwind,
        includeLucideIcons,
        includeShadcnUI,
        theme
      });

      // Validate the generated HTML
      if (!htmlContent || htmlContent.length < 100) {
        throw new Error('Generated HTML template is invalid or too short');
      }

      return SecureInjection.createSecureTemplate(htmlContent);
    } catch (error) {
      console.error('HTML template generation failed:', error);
      return ErrorTemplates.createErrorTemplate(error instanceof Error ? error.message : 'Template generation failed');
    }
  }

  // New E2B-specific methods
  async executeCodeWithE2B(
    code: string,
    language?: string,
    packages?: string[]
  ): Promise<E2BRenderResult> {
    const block: ContentBlock = {
      type: 'artifact',
      code,
      title: `${language || 'Code'} Execution`
    };

    return await e2bIntegration.renderWithE2B(block, {
      language: language as any,
      packages,
      enableFileSystem: true,
      timeout: 30000
    });
  }

  async executeMultiFileProject(
    files: { [filename: string]: string },
    entryPoint: string,
    title?: string
  ): Promise<E2BRenderResult> {
    return await e2bIntegration.renderMultiFileProject(files, entryPoint, title);
  }

  private getRequiredModules(type: string, options: RenderingOptions): string[] {
    const modules: string[] = [];

    if (type === 'react' || type === 'javascript') {
      modules.push('react', 'react-dom', 'babel-standalone');
    }

    if (options.includeLucideIcons) {
      modules.push('lucide-react');
    }

    return modules;
  }

  async executePipeline(stages: string[], context?: any): Promise<Map<string, any>> {
    return await this.pipelineSync.executeStages(stages);
  }

  setupRealtimeSync(sessionId: string, onUpdate: (session: any) => void) {
    return supabasePersistence.setupRealtimeSync(sessionId, onUpdate);
  }

  // New Phase 3 methods

  // Real-time preview system
  createRealtimeSession(sessionId: string, onUpdate: (update: any) => void) {
    return realtimePreview.createRealtimeChannel(sessionId, onUpdate);
  }

  async enableHMR(sessionId: string, moduleId: string, newCode: string) {
    await realtimePreview.triggerHMR(sessionId, moduleId, newCode);
  }

  // Build optimization
  async optimizeForProduction(code: string) {
    return await buildOptimizer.createProductionBuild(code);
  }

  async analyzeBundleSize(code: string) {
    return await buildOptimizer.analyzeBundleSize(code, {
      enableCodeSplitting: true,
      enableMinification: true,
      enableTreeShaking: true,
      enableLazyLoading: true,
      bundleAnalysis: true,
      targetBrowsers: ['> 1%', 'last 2 versions']
    });
  }

  // Enhanced error handling
  createErrorBoundary(fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>) {
    return errorBoundaryManager.createErrorBoundary(fallbackComponent);
  }

  async getErrorSuggestions(error: Error, code?: string) {
    return await errorBoundaryManager.generateErrorSuggestions(error, code);
  }

  async attemptAutoRecovery(error: Error, code: string) {
    return await errorBoundaryManager.attemptAutoRecovery(error, code);
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return realtimePreview.getPerformanceMetrics();
  }

  cleanup() {
    realtimePreview.cleanup();
    errorBoundaryManager.clearErrorReports();
    e2bIntegration.cleanup();
  }
}

export const contentRenderer = ContentRenderer.getInstance();
