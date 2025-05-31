
import { e2bExecutor, ExecutionResult, ExecutionOptions } from './e2bExecutor';
import { ContentBlock } from './types';
import { detectLanguage, supportedLanguages } from './e2bConfig';

export interface E2BRenderResult {
  html: string;
  executionResult: ExecutionResult;
  useIframe: boolean;
}

export class E2BIntegration {
  private static instance: E2BIntegration;

  static getInstance(): E2BIntegration {
    if (!E2BIntegration.instance) {
      E2BIntegration.instance = new E2BIntegration();
    }
    return E2BIntegration.instance;
  }

  shouldUseE2B(block: ContentBlock): boolean {
    // Use E2B for supported languages, except React/JSX which should use iframe
    if (block.type === 'react' || block.type === 'html') {
      return false;
    }

    const detectedLanguage = detectLanguage(block.code);
    return supportedLanguages.includes(detectedLanguage);
  }

  async renderWithE2B(
    block: ContentBlock,
    options: ExecutionOptions = {}
  ): Promise<E2BRenderResult> {
    try {
      console.log('Rendering with E2B executor...');

      // Execute code using E2B
      const executionResult = await e2bExecutor.executeCode(block.code, {
        language: detectLanguage(block.code),
        timeout: 30000,
        enableFileSystem: true,
        ...options
      });

      // Create HTML representation of the execution result
      const html = this.createExecutionHTML(block, executionResult);

      return {
        html,
        executionResult,
        useIframe: false
      };

    } catch (error) {
      console.error('E2B execution failed:', error);
      
      // Fallback to error display
      const errorResult: ExecutionResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
        logs: [`E2B execution failed: ${error}`]
      };

      return {
        html: this.createExecutionHTML(block, errorResult),
        executionResult: errorResult,
        useIframe: false
      };
    }
  }

  private createExecutionHTML(block: ContentBlock, result: ExecutionResult): string {
    const { success, output, error, executionTime, files = [], logs = [] } = result;

    const statusColor = success ? '#10b981' : '#ef4444';
    const statusText = success ? 'Success' : 'Error';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${block.title || 'Code Execution'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .status {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: ${statusColor};
    }
    .execution-time {
      color: #6b7280;
      font-size: 14px;
      margin-left: 12px;
    }
    .section {
      background: white;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-header {
      background: #f3f4f6;
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 1px solid #e5e7eb;
    }
    .section-content {
      padding: 16px;
    }
    .output, .error {
      background: #1f2937;
      color: #f9fafb;
      padding: 16px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .error {
      background: #7f1d1d;
      color: #fecaca;
    }
    .logs {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      max-height: 200px;
      overflow-y: auto;
    }
    .log-line {
      margin: 2px 0;
      color: #4b5563;
    }
    .files-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .file-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .file-header {
      background: #f9fafb;
      padding: 8px 12px;
      font-weight: 500;
      font-size: 14px;
      border-bottom: 1px solid #e5e7eb;
    }
    .file-content {
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      background: #fafafa;
    }
    .empty-state {
      text-align: center;
      color: #6b7280;
      padding: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${block.title || 'Code Execution Result'}</h1>
      <div>
        <span class="status">${statusText}</span>
        <span class="execution-time">Executed in ${executionTime}ms</span>
      </div>
    </div>

    ${output ? `
    <div class="section">
      <div class="section-header">Output</div>
      <div class="section-content">
        <div class="output">${this.escapeHtml(output)}</div>
      </div>
    </div>
    ` : ''}

    ${error ? `
    <div class="section">
      <div class="section-header">Error</div>
      <div class="section-content">
        <div class="error">${this.escapeHtml(error)}</div>
      </div>
    </div>
    ` : ''}

    ${files.length > 0 ? `
    <div class="section">
      <div class="section-header">Generated Files (${files.length})</div>
      <div class="section-content">
        <div class="files-grid">
          ${files.map(file => `
            <div class="file-item">
              <div class="file-header">${this.escapeHtml(file.name)} (${file.size} bytes)</div>
              <div class="file-content">${this.escapeHtml(file.content.substring(0, 500))}${file.content.length > 500 ? '...' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : ''}

    ${logs.length > 0 ? `
    <div class="section">
      <div class="section-header">Execution Logs</div>
      <div class="section-content">
        <div class="logs">
          ${logs.map(log => `<div class="log-line">${this.escapeHtml(log)}</div>`).join('')}
        </div>
      </div>
    </div>
    ` : ''}

    ${!output && !error && files.length === 0 ? `
    <div class="section">
      <div class="empty-state">
        <h3>No output generated</h3>
        <p>The code executed successfully but didn't produce any output.</p>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async renderMultiFileProject(
    files: { [filename: string]: string },
    entryPoint: string,
    title?: string
  ): Promise<E2BRenderResult> {
    try {
      console.log('Rendering multi-file project with E2B...');

      const executionResult = await e2bExecutor.executeMultiFileProject(
        files,
        entryPoint,
        { enableFileSystem: true, timeout: 60000 }
      );

      const block: ContentBlock = {
        type: 'artifact',
        code: `Multi-file project with entry point: ${entryPoint}`,
        title: title || 'Multi-File Project'
      };

      const html = this.createExecutionHTML(block, executionResult);

      return {
        html,
        executionResult,
        useIframe: false
      };

    } catch (error) {
      console.error('Multi-file project execution failed:', error);
      
      const errorResult: ExecutionResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
        logs: [`Multi-file execution failed: ${error}`]
      };

      const block: ContentBlock = {
        type: 'artifact',
        code: 'Multi-file project execution failed',
        title: title || 'Multi-File Project'
      };

      return {
        html: this.createExecutionHTML(block, errorResult),
        executionResult: errorResult,
        useIframe: false
      };
    }
  }

  cleanup(): void {
    e2bExecutor.closeAllSessions();
  }
}

export const e2bIntegration = E2BIntegration.getInstance();
