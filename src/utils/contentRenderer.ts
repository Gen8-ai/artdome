
import { CodeCompiler, codeCompiler } from './codeCompiler';
import { dependencyAnalyzer } from './dependencyAnalyzer';
import { eslintIntegration } from './eslintIntegration';
import { ContentBlock, RenderingOptions } from './contentRenderer/types';
import { ContentTypeDetector } from './contentRenderer/contentTypeDetector';
import { HTMLTemplateGenerator } from './contentRenderer/htmlTemplateGenerator';
import { ErrorTemplates } from './contentRenderer/errorTemplates';

export { ContentBlock, RenderingOptions } from './contentRenderer/types';

export class ContentRenderer {
  private static instance: ContentRenderer;
  
  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  detectContentType(code: string): 'html' | 'css' | 'javascript' | 'react' | 'artifact' {
    return ContentTypeDetector.detectContentType(code);
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

    let processedCode = block.code;
    let additionalCSS = '';

    // Analyze dependencies
    const dependencies = dependencyAnalyzer.analyzeCode(block.code);
    console.log('Detected dependencies:', dependencies);

    // Lint code if it's React or JavaScript
    if (block.type === 'react' || block.type === 'javascript') {
      const lintResult = await eslintIntegration.lintCode(block.code, block.type);
      if (!lintResult.valid && lintResult.fixedCode) {
        console.log('Code has lint issues, using auto-fixed version');
        processedCode = lintResult.fixedCode;
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

    try {
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

      return htmlContent;
    } catch (error) {
      console.error('HTML template generation failed:', error);
      return ErrorTemplates.createErrorTemplate(error instanceof Error ? error.message : 'Template generation failed');
    }
  }
}

export const contentRenderer = ContentRenderer.getInstance();
