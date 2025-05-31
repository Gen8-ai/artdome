
export interface ContentBlock {
  type: 'html' | 'css' | 'javascript' | 'react' | 'artifact';
  code: string;
  title?: string;
  description?: string;
  language?: string;
  id?: string;
  metadata?: {
    originalPattern?: string;
    matchIndex?: number;
    isFullContent?: boolean;
  };
}

export interface RenderingOptions {
  useCompilation?: boolean;
  includeTailwind?: boolean;
  includeLucideIcons?: boolean;
  includeShadcnUI?: boolean;
  theme?: 'light' | 'dark' | 'system';
  enableConsoleCapture?: boolean;
  enableErrorBoundary?: boolean;
}

export interface HTMLTemplateOptions {
  code: string;
  type: string;
  title: string;
  additionalCSS?: string;
  includeTailwind?: boolean;
  includeLucideIcons?: boolean;
  includeShadcnUI?: boolean;
  theme?: string;
}
