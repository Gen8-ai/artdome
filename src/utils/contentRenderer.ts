
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
    // AI Generation Stage
    this.pipelineSync.addStage({
      name: 'aiGen',
      execute: async () => {
        // This will be called when AI generation is needed
        return null;
      }
    });

    // User Input Processing Stage
    this.pipelineSync.addStage({
      name: 'userInputRequest',
      execute: async () => {
        // Process user input
        return null;
      }
    });

    // Content Parsing Stage
    this.pipelineSync.addStage({
      name: 'parse',
      dependencies: ['userInputRequest'],
      execute: async () => {
        // Parse content blocks
        return null;
      }
    });

    // Dependency Analysis Stage
    this.pipelineSync.addStage({
      name: 'dependencyAnalysis',
      dependencies: ['parse'],
      execute: async () => {
        // Analyze dependencies
        return null;
      }
    });

    // Package Installation Stage
    this.pipelineSync.addStage({
      name: 'installDependencies',
      dependencies: ['dependencyAnalysis'],
      execute: async () => {
        // Install required packages
        return null;
      }
    });

    // Linting Stage
    this.pipelineSync.addStage({
      name: 'linter',
      dependencies: ['installDependencies'],
      execute: async () => {
        // Lint code
        return null;
      }
    });

    // Supabase Persistence Stage
    this.pipelineSync.addStage({
      name: 'supabase',
      dependencies: ['linter'],
      execute: async () => {
        // Save to Supabase
        return null;
      }
    });

    // Preview Generation Stage
    this.pipelineSync.addStage({
      name: 'preview',
      dependencies: ['supabase'],
      execute: async () => {
        // Generate preview
        return null;
      }
    });
  }

  detectContentType(code: string): 'html' | 'css' | 'javascript' | 'react' | 'artifact' {
    return ContentTypeDetector.detectContentType(code);
  }

  async generateCodeWithAI(request: AIGenerationRequest) {
    return await aiGeneration.generateCode(request);
  }

  async resolvePackages(packageNames: string[]) {
    return await packageResolver.resolveDependencyTree(packageNames);
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

      // Analyze dependencies
      const dependencies = dependencyAnalyzer.analyzeCode(block.code);
      console.log('Detected dependencies:', dependencies);

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
}

export const contentRenderer = ContentRenderer.getInstance();
